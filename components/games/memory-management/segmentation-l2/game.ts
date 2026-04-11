import Phaser from 'phaser';
import { openAIFeedbackChat } from '../../shared/aiFeedbackChat';

const ASSET_PATH = '/games/memory-management/segmentation/';

export type SegmentType = 'arcade' | 'hotdog' | 'vip' | 'mainstage';

interface SegmentConfig {
  id: string;
  type: SegmentType;
  baseAddr: number;
  limit: number;
  x: number;
  y: number;
  displayLabel: string;
  sprite?: Phaser.GameObjects.Sprite;
  labelText?: Phaser.GameObjects.Text;
  zone?: Phaser.Geom.Rectangle;
  baseScale: number;
}

interface AccessRequest {
  segId: string;
  offset: number;
  label: string;
  isOutOfBounds: boolean;
}

const SEGMENT_SPRITE_KEY: Record<SegmentType, string> = {
  arcade: 'arcade-tent',
  hotdog: 'hotdog-stand',
  vip: 'vip-lounge',
  mainstage: 'main-stage',
};

export class SegmentationGameL2 extends Phaser.Scene {
  private gamePhase: 'intro' | 'playing' | 'results' = 'intro';

  private clown!: Phaser.GameObjects.Sprite;
  // clown glow ring drawn with graphics
  private clownGlow!: Phaser.GameObjects.Graphics;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  } | null = null;
  private speed = 220;

  private segments: SegmentConfig[] = [];
  private bulldozer!: Phaser.GameObjects.Sprite;
  private bulldozerActive = false;

  private accessQueue: AccessRequest[] = [];
  private requestIndex = 0;
  private currentRequest: AccessRequest | null = null;
  private segFaults = 0;
  private successCount = 0;

  private requestBubble!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private controlsHint!: Phaser.GameObjects.Text;

  // tablet UI — drawn purely with Phaser graphics + text, no sprite container bugs
  private tabletBg!: Phaser.GameObjects.Graphics;
  private tabletRowTexts: Phaser.GameObjects.Text[] = [];
  private tabletRowBgs: Phaser.GameObjects.Graphics[] = [];
  // tablet panel position (top-left corner)
  private TAB_X = 0;
  private TAB_Y = 0;
  private TAB_W = 220;
  private TAB_H = 0; // computed

  private lastZoneCheck = 0;

  constructor() {
    super({ key: 'SegmentationGameL2' });
  }

  preload() {
    const p = ASSET_PATH;
    this.load.image('carnival-bg',    `${p}Carnival-Background.png`);
    this.load.image('arcade-tent',    `${p}Arcade-Tent.png`);
    this.load.image('arcade-tent-hl', `${p}Highlighted-Place-Picked-up-Tent.png`);
    this.load.image('hotdog-stand',   `${p}Hotdog-Stand.png`);
    this.load.image('vip-lounge',     `${p}VIP-Lounge.png`);
    this.load.image('main-stage',     `${p}Main-Stage.png`);
    this.load.image('clown',          `${p}Process_Clown_.png`);
    this.load.image('bulldozer',      `${p}Bulldozer.png`);
    this.load.image('alarm',          `${p}Alarm.png`);
  }

  create() {
    const { width, height } = this.cameras.main;

    // ── Background ───────────────────────────────────────────────────────────
    const bg = this.add.image(width / 2, height / 2, 'carnival-bg');
    const bgScale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(bgScale).setDepth(-100);

    // ── Input ────────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // ── Segment / tent placement ─────────────────────────────────────────────
    // Scales reduced so tents don't dominate the field
    this.segments = [
      {
        id: 'SEG_0', type: 'hotdog',
        baseAddr: 0x10000, limit: 0x4000,
        x: width * 0.16, y: height * 0.62,
        displayLabel: 'SEG_0 – Code\n(Hotdog Stand)',
        baseScale: 0.13,
      },
      {
        id: 'SEG_1', type: 'arcade',
        baseAddr: 0x14000, limit: 0x8000,
        x: width * 0.44, y: height * 0.28,
        displayLabel: 'SEG_1 – Stack\n(Arcade Tent)',
        baseScale: 0.15,
      },
      {
        id: 'SEG_2', type: 'vip',
        baseAddr: 0x1C000, limit: 0xC000,
        x: width * 0.68, y: height * 0.55,
        displayLabel: 'SEG_2 – Heap\n(VIP Lounge)',
        baseScale: 0.14,
      },
      {
        id: 'SEG_3', type: 'mainstage',
        baseAddr: 0x2C000, limit: 0x4C000,
        x: width * 0.28, y: height * 0.22,
        displayLabel: 'SEG_3 – Data\n(Main Stage)',
        baseScale: 0.17,
      },
    ];

    this.segments.forEach(seg => {
      const spr = this.add.sprite(seg.x, seg.y, SEGMENT_SPRITE_KEY[seg.type])
        .setScale(seg.baseScale)
        .setDepth(3)
        .setInteractive({ useHandCursor: true });

      spr.on('pointerdown', () => {
        if (this.gamePhase === 'playing') this.handleAccess(seg);
      });
      spr.on('pointerover', () =>
        this.tweens.add({ targets: spr, scaleX: seg.baseScale * 1.1, scaleY: seg.baseScale * 1.1, duration: 100 })
      );
      spr.on('pointerout', () =>
        this.tweens.add({ targets: spr, scaleX: seg.baseScale, scaleY: seg.baseScale, duration: 100 })
      );

      seg.sprite = spr;

      // hit zone sized relative to rendered sprite bounds (~half image size at that scale)
      const zw = 130;
      const zh = 110;
      seg.zone = new Phaser.Geom.Rectangle(seg.x - zw / 2, seg.y - zh / 2, zw, zh);

      // label badge below tent
      const labelOffsetY = spr.height * seg.baseScale * 0.55;
      seg.labelText = this.add.text(seg.x, seg.y + labelOffsetY, seg.displayLabel, {
        fontSize: '12px', color: '#FFD700',
        backgroundColor: '#000000BB', padding: { x: 6, y: 3 }, align: 'center',
      }).setOrigin(0.5).setDepth(6);
    });

    // ── Clown player — bigger & with a visible glow ring ────────────────────
    // glow ring (drawn under the clown sprite)
    this.clownGlow = this.add.graphics().setDepth(9);
    this.drawClownGlow(width * 0.5, height * 0.80);

    // clown sprite — scale 0.22 so it's clearly visible
    this.clown = this.add.sprite(width * 0.5, height * 0.80, 'clown')
      .setScale(0.22)
      .setDepth(10);

    // ── Bulldozer — smaller, starts offscreen ───────────────────────────────
    this.bulldozer = this.add.sprite(-200, height * 0.5, 'bulldozer')
      .setScale(0.15)
      .setDepth(8)
      .setVisible(false);

    // ── HUD texts ────────────────────────────────────────────────────────────
    this.phaseText = this.add.text(width / 2, 22, 'Phase: Intro', {
      fontSize: '16px', color: '#FFD700', fontStyle: 'bold',
      backgroundColor: '#000000CC', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(22);

    this.requestBubble = this.add.text(width / 2, 56, '', {
      fontSize: '14px', color: '#00FFCC', fontStyle: 'bold',
      backgroundColor: '#1a1a2eEE', padding: { x: 14, y: 6 }, align: 'center',
      wordWrap: { width: width * 0.55 },
    }).setOrigin(0.5).setDepth(22);

    this.instructionText = this.add.text(width / 2, height - 24, '', {
      fontSize: '13px', color: '#fff',
      backgroundColor: '#000000CC', padding: { x: 12, y: 5 }, align: 'center',
    }).setOrigin(0.5).setDepth(22);

    this.statsText = this.add.text(12, 22, '', {
      fontSize: '14px', color: '#fff',
      backgroundColor: '#000000AA', padding: { x: 8, y: 4 },
    }).setOrigin(0, 0).setDepth(22);

    this.controlsHint = this.add.text(width / 2, 96,
      'WASD / Arrows = MOVE   |   Walk into a tent or CLICK it = ACCESS', {
        fontSize: '12px', color: '#B0E0E6',
        backgroundColor: '#00000088', padding: { x: 12, y: 4 }, align: 'center',
      }
    ).setOrigin(0.5).setDepth(22).setVisible(false);

    // ── Tablet panel — drawn manually, no sprite container ───────────────────
    this.buildTabletUI(width, height);

    // ── Access queue then intro ───────────────────────────────────────────────
    this.buildAccessQueue();
    this.showIntro(width, height);
  }

  // ── Clown glow helper ──────────────────────────────────────────────────────

  private drawClownGlow(x: number, y: number) {
    this.clownGlow.clear();
    // outer soft glow
    this.clownGlow.fillStyle(0xFFD700, 0.18);
    this.clownGlow.fillCircle(x, y, 36);
    // inner bright ring
    this.clownGlow.lineStyle(3, 0xFFD700, 0.9);
    this.clownGlow.strokeCircle(x, y, 26);
  }

  // ── Tablet UI — pure Phaser graphics + text objects ───────────────────────
  // No containers or sprite rows; all drawn in world space at a fixed panel area.

  private buildTabletUI(width: number, height: number) {
    const PAD   = 10;
    const ROW_H = 26;
    const ROWS  = this.segments.length; // 4
    this.TAB_W  = 230;
    this.TAB_H  = PAD + 20 + 4 + ROW_H + 4 + ROWS * (ROW_H + 2) + PAD; // title+header+rows
    this.TAB_X  = width  - this.TAB_W - 8;
    this.TAB_Y  = height * 0.18;

    // panel background
    this.tabletBg = this.add.graphics().setDepth(18);
    this.tabletBg
      .fillStyle(0x0a0a1a, 0.92)
      .fillRoundedRect(this.TAB_X, this.TAB_Y, this.TAB_W, this.TAB_H, 10)
      .lineStyle(2, 0x00FFCC, 0.7)
      .strokeRoundedRect(this.TAB_X, this.TAB_Y, this.TAB_W, this.TAB_H, 10);

    const cx = this.TAB_X + this.TAB_W / 2;
    let curY = this.TAB_Y + PAD;

    // title
    this.add.text(cx, curY, 'SEGMENT TABLE', {
      fontSize: '11px', color: '#00FFCC', fontStyle: 'bold', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(19);
    curY += 20;

    // header separator
    this.add.graphics().setDepth(19)
      .lineStyle(1, 0x00FFCC, 0.5)
      .lineBetween(this.TAB_X + PAD, curY, this.TAB_X + this.TAB_W - PAD, curY);
    curY += 4;

    // column header row
    this.add.text(this.TAB_X + PAD, curY, 'SEG_ID  BASE_ADDR  LIMIT', {
      fontSize: '9px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0, 0).setDepth(19);
    curY += ROW_H;

    // separator
    this.add.graphics().setDepth(19)
      .lineStyle(1, 0x333333, 1)
      .lineBetween(this.TAB_X + PAD, curY, this.TAB_X + this.TAB_W - PAD, curY);
    curY += 4;

    // one row per segment — store refs so we can highlight them
    this.tabletRowBgs  = [];
    this.tabletRowTexts = [];

    this.segments.forEach((seg, i) => {
      const rowY = curY + i * (ROW_H + 2);

      // row background graphics (default = transparent, highlighted = green tint)
      const rowBg = this.add.graphics().setDepth(19);
      rowBg.fillStyle(0x003300, 0); // starts transparent
      rowBg.fillRoundedRect(this.TAB_X + 4, rowY, this.TAB_W - 8, ROW_H, 4);
      this.tabletRowBgs.push(rowBg);

      // row text: SEG_0  0x10000  0x4000
      const txt = this.add.text(
        this.TAB_X + PAD,
        rowY + ROW_H / 2,
        `${seg.id}    0x${seg.baseAddr.toString(16).toUpperCase()}    0x${seg.limit.toString(16).toUpperCase()}`,
        { fontSize: '10px', color: '#00FF88', fontFamily: 'monospace' }
      ).setOrigin(0, 0.5).setDepth(20);
      this.tabletRowTexts.push(txt);
    });
  }

  private setTableHighlight(segId: string | null) {
    this.segments.forEach((seg, i) => {
      const rowBg  = this.tabletRowBgs[i];
      const rowTxt = this.tabletRowTexts[i];
      if (!rowBg || !rowTxt) return;

      const isActive = seg.id === segId;
      rowBg.clear();
      if (isActive) {
        rowBg.fillStyle(0x00FF88, 0.20);
        const ROW_H = 26;
        const curY  = this.TAB_Y + 10 + 20 + 4 + ROW_H + 4 + i * (ROW_H + 2);
        rowBg.fillRoundedRect(this.TAB_X + 4, curY, this.TAB_W - 8, ROW_H, 4);
        rowTxt.setColor('#FFFFFF');
        rowTxt.setStyle({ fontStyle: 'bold' });
      } else {
        rowTxt.setColor('#00FF88');
        rowTxt.setStyle({ fontStyle: 'normal' });
      }
    });
  }

  // ── Access queue ──────────────────────────────────────────────────────────

  private buildAccessQueue() {
    this.accessQueue = [
      { segId: 'SEG_0', offset: 0x1000, label: 'Read snack menu\n→ SEG_0 + 0x1000',          isOutOfBounds: false },
      { segId: 'SEG_1', offset: 0x500,  label: 'Push game score\n→ SEG_1 + 0x500',            isOutOfBounds: false },
      { segId: 'SEG_2', offset: 0x3000, label: 'Alloc VIP seat\n→ SEG_2 + 0x3000',            isOutOfBounds: false },
      // deliberately out-of-bounds: 0x9999 > SEG_0 limit 0x4000
      { segId: 'SEG_0', offset: 0x9999, label: '⚠  Bad access!\n→ SEG_0 + 0x9999 (limit 0x4000!)', isOutOfBounds: true },
      { segId: 'SEG_3', offset: 0x200,  label: 'Load stage data\n→ SEG_3 + 0x200',            isOutOfBounds: false },
      { segId: 'SEG_1', offset: 0x2000, label: 'Pop stack frame\n→ SEG_1 + 0x2000',           isOutOfBounds: false },
    ];
  }

  // ── Intro screen ──────────────────────────────────────────────────────────

  private showIntro(width: number, height: number) {
    const overlay = this.add.graphics()
      .fillStyle(0x000000, 0.82)
      .fillRect(0, 0, width, height)
      .setDepth(30);

    const title = this.add.text(width / 2, height * 0.22, '🎪  Heist Protocol – Level 2', {
      fontSize: '26px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    const sub = this.add.text(width / 2, height * 0.31, 'The Carnival: Memory Segmentation', {
      fontSize: '17px', color: '#00FFCC',
    }).setOrigin(0.5).setDepth(31);

    const body = this.add.text(width / 2, height * 0.50,
      'You are the Clown Process 🤡 exploring a carnival.\n' +
      'Each tent = a Memory Segment (Code, Stack, Heap, Data).\n\n' +
      '📋 Right panel = Segment Table  (SEG_ID | BASE_ADDR | LIMIT)\n' +
      '🎯 Each turn: an access request appears at the top\n' +
      '✅ Walk into / click the CORRECT tent  →  Physical addr = BASE + offset\n' +
      '🚨 Wrong tent OR offset > LIMIT  →  Seg Fault! Bulldozer strikes!\n\n' +
      'MOVE: WASD or Arrow keys   |   ACCESS: Walk into tent or CLICK it',
      { fontSize: '13px', color: '#E0E0E0', align: 'center', lineSpacing: 5 }
    ).setOrigin(0.5).setDepth(31);

    const btn = this.add.text(width / 2, height * 0.76, '  START HEIST  ', {
      fontSize: '22px', color: '#000',
      backgroundColor: '#FFD700', padding: { x: 26, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31);

    btn.on('pointerdown', () => {
      [overlay, title, sub, body, btn].forEach(o => o.destroy());
      this.gamePhase = 'playing';
      this.phaseText.setText('Phase: Segmentation Walk');
      this.controlsHint.setVisible(true);
      this.nextRequest();
    });
  }

  // ── Request cycle ─────────────────────────────────────────────────────────

  private nextRequest() {
    if (this.requestIndex >= this.accessQueue.length) {
      this.triggerWin();
      return;
    }
    this.currentRequest = this.accessQueue[this.requestIndex];
    this.requestIndex++;
    this.setTableHighlight(this.currentRequest.segId);
    this.requestBubble.setText(
      `ACCESS ${this.requestIndex}/${this.accessQueue.length}:  ${this.currentRequest.label}`
    );
    this.instructionText.setText(`Navigate to tent "${this.currentRequest.segId}" and enter it.`);
    this.updateStats();
  }

  private handleAccess(seg: SegmentConfig) {
    if (!this.currentRequest || this.bulldozerActive) return;
    const req = this.currentRequest;
    const targetSeg = this.segments.find(s => s.id === req.segId)!;

    if (seg.id !== req.segId) {
      this.onFault(seg, `Wrong tent! "${seg.id}" ≠ "${req.segId}" → Segmentation Fault!`);
      return;
    }

    if (req.isOutOfBounds || req.offset > targetSeg.limit) {
      this.onFault(
        seg,
        `Offset 0x${req.offset.toString(16)} > limit 0x${targetSeg.limit.toString(16)} → Segmentation Fault!`
      );
      return;
    }

    this.onSuccess(seg, targetSeg, req);
  }

  private onFault(seg: SegmentConfig, msg: string) {
    this.segFaults++;
    this.currentRequest = null;
    this.showAlarm(seg.x, seg.y);
    this.instructionText.setText(msg);
    this.setTableHighlight(null);
    this.triggerBulldozer(seg);
    this.updateStats();
    this.time.delayedCall(2400, () => this.nextRequest());
  }

  private onSuccess(seg: SegmentConfig, targetSeg: SegmentConfig, req: AccessRequest) {
    this.successCount++;
    this.currentRequest = null;
    const physAddr = (targetSeg.baseAddr + req.offset).toString(16).toUpperCase();
    this.instructionText.setText(`✓ ${seg.id} accessed!  Physical addr = 0x${physAddr}`);
    this.setTableHighlight(null);
    this.flashGreen(seg);
    this.updateStats();
    this.time.delayedCall(1500, () => this.nextRequest());
  }

  // ── Visual feedback ───────────────────────────────────────────────────────

  private showAlarm(x: number, y: number) {
    const alarm = this.add.sprite(x, y - 80, 'alarm').setScale(0.10).setDepth(13);
    this.tweens.add({
      targets: alarm,
      scaleX: 0.14, scaleY: 0.14,
      yoyo: true, repeat: 4, duration: 110,
      onComplete: () => alarm.destroy(),
    });
    this.cameras.main.shake(260, 0.013);
  }

  private flashGreen(seg: SegmentConfig) {
    const flash = this.add.graphics()
      .fillStyle(0x00FF88, 0.35)
      .fillCircle(seg.x, seg.y, 80)
      .setDepth(11);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 700,
      onComplete: () => flash.destroy(),
    });
    if (seg.type === 'arcade' && seg.sprite) {
      seg.sprite.setTexture('arcade-tent-hl');
      this.time.delayedCall(650, () => seg.sprite!.setTexture('arcade-tent'));
    }
  }

  private triggerBulldozer(faultSeg: SegmentConfig) {
    if (this.bulldozerActive) return;
    this.bulldozerActive = true;
    this.bulldozer
      .setPosition(-200, faultSeg.y)
      .setVisible(true)
      .setFlipX(false);

    this.tweens.add({
      targets: this.bulldozer,
      x: faultSeg.x,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        if (faultSeg.sprite) {
          this.tweens.add({
            targets: faultSeg.sprite,
            x: faultSeg.x + 7, yoyo: true, repeat: 4, duration: 50,
            onComplete: () => { if (faultSeg.sprite) faultSeg.sprite.x = faultSeg.x; },
          });
        }
        this.time.delayedCall(400, () => {
          this.tweens.add({
            targets: this.bulldozer,
            x: -300,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
              this.bulldozer.setVisible(false);
              this.bulldozerActive = false;
            },
          });
        });
      },
    });
  }

  private updateStats() {
    this.statsText.setText(`✓ ${this.successCount}   🚨 Faults: ${this.segFaults}`);
  }

  // ── Win screen ────────────────────────────────────────────────────────────

  private triggerWin() {
    this.gamePhase = 'results';
    const { width, height } = this.cameras.main;
    this.phaseText.setText('Phase: Complete!');
    this.requestBubble.setText('All segments accessed!');
    this.submitScore();

    this.add.graphics()
      .fillStyle(0x000000, 0.76)
      .fillRect(0, 0, width, height)
      .setDepth(28);

    const grade =
      this.segFaults === 0 ? 'PERFECT RUN 🏆' :
      this.segFaults <= 2  ? 'GOOD JOB 👏'    :
      'NEEDS PRACTICE 📚';

    this.add.text(width / 2, height * 0.36,
      `🎪  Carnival Cleared!\n\nSegmentation Faults: ${this.segFaults}\nClean Accesses: ${this.successCount} / ${this.accessQueue.length}`,
      {
        fontSize: '22px', color: '#FFD700', align: 'center',
        backgroundColor: '#1a1a2eCC', padding: { x: 32, y: 22 }, lineSpacing: 8,
      }
    ).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height * 0.62, grade, {
      fontSize: '20px', color: '#00FFCC', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    const aiButton = this.add.text(width / 2 - 210, height * 0.74, '💬 Chat with AI', {
      fontSize: '18px', color: '#FFF',
      backgroundColor: '#4CAF50', padding: { x: 18, y: 10 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31);

    aiButton.on('pointerdown', () => {
      openAIFeedbackChat({
        gameType: this.scene.key,
        score: Math.max(0, 100 - this.segFaults * 10),
        wrongAttempts: this.segFaults,
        phase: this.gamePhase,
      });
    });

    const miniQuestButton = this.add.text(width / 2, height * 0.74, 'Mini-Quest', {
      fontSize: '18px', color: '#000',
      backgroundColor: '#00E5FF', padding: { x: 18, y: 10 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31);

    miniQuestButton.on('pointerdown', () => {
      window.location.assign('/modules/memory-management/mini-quest/segmentation');
    });

    const replayButton = this.add.text(width / 2 + 210, height * 0.74, 'Play Again', {
      fontSize: '18px', color: '#000',
      backgroundColor: '#FFD700', padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31)
      .on('pointerdown', () => this.scene.restart());
  }

  private async submitScore() {
    try {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'segmentation-l2',
          moduleId: 'memory-management',
          levelId: 'l2',
          score: Math.max(0, 100 - this.segFaults * 10),
          timeSpent: 1,
          accuracy: Math.max(0, 100 - this.segFaults * 10),
          wrongAttempts: this.segFaults,
          metadata: {
            segFaults: this.segFaults,
            cleanAccesses: this.successCount,
            totalAccesses: this.accessQueue.length,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to submit segmentation score:', error);
    }
  }

  // ── Update loop ───────────────────────────────────────────────────────────

  update(_t: number, dt: number) {
    if (this.gamePhase !== 'playing') return;

    const dx =
      (this.cursors.left.isDown  || this.wasd?.a.isDown ? -1 : 0) +
      (this.cursors.right.isDown || this.wasd?.d.isDown ?  1 : 0);
    const dy =
      (this.cursors.up.isDown   || this.wasd?.w.isDown ? -1 : 0) +
      (this.cursors.down.isDown || this.wasd?.s.isDown ?  1 : 0);

    if (dx !== 0 || dy !== 0) {
      this.clown.x += (dx * this.speed * dt) / 1000;
      this.clown.y += (dy * this.speed * dt) / 1000;
      this.clown.setFlipX(dx < 0);
    }

    const { width, height } = this.cameras.main;
    this.clown.x = Phaser.Math.Clamp(this.clown.x, 40, width - 40);
    this.clown.y = Phaser.Math.Clamp(this.clown.y, 40, height - 40);

    // keep glow ring tracking the clown
    this.drawClownGlow(this.clown.x, this.clown.y);

    // walk-into detection — 600 ms cooldown
    if (
      this.time.now - this.lastZoneCheck > 600 &&
      !this.bulldozerActive &&
      this.currentRequest
    ) {
      for (const seg of this.segments) {
        if (seg.zone && Phaser.Geom.Rectangle.Contains(seg.zone, this.clown.x, this.clown.y)) {
          this.lastZoneCheck = this.time.now;
          this.handleAccess(seg);
          break;
        }
      }
    }
  }
}