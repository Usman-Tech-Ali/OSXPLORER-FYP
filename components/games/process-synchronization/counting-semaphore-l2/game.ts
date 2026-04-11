import Phaser from 'phaser';
import { openAIFeedbackChat } from '../../shared/aiFeedbackChat';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Shared types & constants
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type DiverState = 'waiting' | 'jumping' | 'falling' | 'landed' | 'benched' | 'stuck';

interface Diver {
  id: number;
  sprite: Phaser.GameObjects.Image;
  state: DiverState;
  packSprite?: Phaser.GameObjects.Image;
  stuckTimer?: number;          // L3 only â€“ ms remaining before forced-land prompt
  stuckWarning?: Phaser.GameObjects.Text;
  benchIndex?: number;
}

interface LevelConfig {
  key: string;
  totalPacks: number;           // initial S value
  targetDivers: number;         // win condition
  spawnDelay: number;           // ms between auto-spawns
  fallDuration: number;         // ms for freefall tween
  enableBench: boolean;         // L2+
  enableStuck: boolean;         // L3 only
  stuckChance: number;          // 0-1, probability a diver gets stuck mid-air
  stuckHoldMs: number;          // how long a stuck diver holds before warning appears
  gameId: string;
  levelId: string;
}

const ASSET_PATH = '/games/process-synchronization/counting-semaphore/';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Base scene â€“ all game logic lives here
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class CountingSemaphoreBase extends Phaser.Scene {
  protected cfg!: LevelConfig;

  // semaphore state
  protected S: number = 0;
  protected blockedQueue: Diver[] = [];

  // divers
  protected divers: Diver[] = [];
  protected diverIdCounter = 0;
  protected diverLaunched = 0;   // successfully launched (used pack + jumped)
  protected diverLanded = 0;     // returned pack (signal done)

  // scene objects
  protected bg!: Phaser.GameObjects.Image;
  protected skyBg!: Phaser.GameObjects.Image;
  protected plane!: Phaser.GameObjects.Image;
  protected rack!: Phaser.GameObjects.Image;
  protected bench!: Phaser.GameObjects.Image;
  protected landingZone!: Phaser.GameObjects.Image;
  protected warningLight!: Phaser.GameObjects.Image;

  // HUD texts
  protected semaphoreText!: Phaser.GameObjects.Text;
  protected queueText!: Phaser.GameObjects.Text;
  protected progressText!: Phaser.GameObjects.Text;
  protected instructionText!: Phaser.GameObjects.Text;
  protected rackCountText!: Phaser.GameObjects.Text;

  // state
  protected gamePhase: 'intro' | 'playing' | 'completed' = 'intro';
  protected spawnTimer?: Phaser.Time.TimerEvent;
  protected gameStartTime = 0;
  protected wrongAttempts = 0;
  protected warningFlashing = false;

  constructor(cfg: LevelConfig) {
    super({ key: cfg.key });
    this.cfg = cfg;
    this.S = cfg.totalPacks;
  }

  // â”€â”€ preload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  preload() {
    this.load.image('sky-bg', `${ASSET_PATH}Sky-Background.png`);
    this.load.image('main-bg', `${ASSET_PATH}Sky-Background_1.png`);
    this.load.image('plane', `${ASSET_PATH}Jumper-Plane.png`);
    this.load.image('rack', `${ASSET_PATH}Parachute-Rack.png`);
    this.load.image('rack-numbers', `${ASSET_PATH}Parachute-Rack-Numbers.png`);
    this.load.image('bench', `${ASSET_PATH}Bench.png`);
    this.load.image('landing-zone', `${ASSET_PATH}Landing-Zone.png`);
    this.load.image('warning-light', `${ASSET_PATH}Active-State.png`);
    this.load.image('pack-side1', `${ASSET_PATH}Parachute-Side-1.png`);
    this.load.image('pack-side2', `${ASSET_PATH}Parachute-Side-2.png`);
    this.load.image('pack-back', `${ASSET_PATH}Parachute-Back.png`);
    this.load.image('diver-waiting', `${ASSET_PATH}Diver-Waiting.png`);
    this.load.image('diver-jumping', `${ASSET_PATH}Diver-Jumping.png`);
    this.load.image('diver-diving', `${ASSET_PATH}Diver-Diving.png`);
    this.load.image('diver-landed', `${ASSET_PATH}Diver-Landed.png`);
    this.load.image('ui-add-diver', `${ASSET_PATH}UI-Add-Diver.png`);
    this.load.image('ui-return', `${ASSET_PATH}UI-Landing_Return.png`);
    this.load.image('ui-status', `${ASSET_PATH}UI-Parachute-Status.png`);
  }

  // â”€â”€ create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  create() {
    const { width, height } = this.scale;
    this.S = this.cfg.totalPacks;
    this.blockedQueue = [];
    this.divers = [];
    this.diverIdCounter = 0;
    this.diverLaunched = 0;
    this.diverLanded = 0;
    this.wrongAttempts = 0;
    this.warningFlashing = false;
    this.gamePhase = 'intro';

    this.buildScene(width, height);
    this.buildHUD(width, height);
    this.showIntroModal();
  }

  // â”€â”€ scene layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private buildScene(width: number, height: number) {
    // backgrounds
    this.skyBg = this.add.image(width / 2, height / 2, 'sky-bg').setDisplaySize(width, height).setDepth(0);
    this.bg = this.add.image(width / 2, height * 0.85, 'main-bg').setDisplaySize(width, height * 0.35).setDepth(1);

    // landing zone â€“ bottom center
    this.landingZone = this.add.image(width / 2, height * 0.88, 'landing-zone')
      .setDisplaySize(160, 80).setDepth(2).setInteractive({ useHandCursor: true });
    this.landingZone.on('pointerdown', () => this.onLandingZoneClick());
    this.landingZone.on('pointerover', () => this.landingZone.setTint(0xaaffaa));
    this.landingZone.on('pointerout', () => this.landingZone.clearTint());

    // plane â€“ top right
    this.plane = this.add.image(width * 0.78, height * 0.12, 'plane')
      .setDisplaySize(220, 100).setDepth(3);

    // rack â€“ left side
    this.rack = this.add.image(width * 0.1, height * 0.52, 'rack')
      .setDisplaySize(80, 160).setDepth(3);

    // bench â€“ bottom left (L2+)
    this.bench = this.add.image(width * 0.18, height * 0.82, 'bench')
      .setDisplaySize(200, 70).setDepth(2)
      .setVisible(this.cfg.enableBench);

    // warning light â€“ top left (L3)
    this.warningLight = this.add.image(width * 0.05, height * 0.08, 'warning-light')
      .setDisplaySize(50, 60).setDepth(4)
      .setVisible(this.cfg.enableStuck)
      .setAlpha(0.3);

    // rack count overlay
    this.rackCountText = this.add.text(width * 0.1, height * 0.42, `${this.S}`, {
      fontSize: '28px', color: '#00FFFF', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5);
  }

  // â”€â”€ HUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private buildHUD(width: number, height: number) {
    const style = (size = '16px', color = '#ffffff') => ({
      fontSize: size, color, backgroundColor: '#000000CC',
      padding: { x: 8, y: 4 }, fontFamily: 'monospace',
    });

    this.semaphoreText = this.add.text(20, 20, '', style('18px', '#00FFFF')).setDepth(10);
    this.queueText = this.add.text(20, 52, '', style('16px', '#FFD700')).setDepth(10);
    this.progressText = this.add.text(width - 20, 20, '', style('16px', '#AAFFAA'))
      .setOrigin(1, 0).setDepth(10);
    this.instructionText = this.add.text(width / 2, height - 36, '', {
      fontSize: '15px', color: '#FFFFFF', backgroundColor: '#000000BB',
      padding: { x: 12, y: 6 }, align: 'center',
    }).setOrigin(0.5).setDepth(10);

    this.updateHUD();
  }

  protected updateHUD() {
    const inAir = this.divers.filter(d => d.state === 'falling' || d.state === 'stuck').length;
    const onLand = this.divers.filter(d => d.state === 'landed').length;
    this.semaphoreText.setText(`S (available packs) = ${this.S}`);
    this.queueText.setText(`Blocked queue: ${this.blockedQueue.length}  |  In air: ${inAir}  |  Landed: ${onLand}`);
    this.progressText.setText(`Launched: ${this.diverLaunched}/${this.cfg.targetDivers}`);
    this.rackCountText.setText(`${this.S}`);
    this.rackCountText.setColor(this.S === 0 ? '#FF4444' : '#00FFFF');
  }

  // â”€â”€ intro modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private showIntroModal() {
    const { width, height } = this.scale;
    const ov = this.add.graphics().setDepth(100);
    ov.fillStyle(0x000000, 0.85);
    ov.fillRect(0, 0, width, height);

    const bw = Math.min(680, width - 40), bh = 560;
    const bx = width / 2 - bw / 2, by = height / 2 - bh / 2;
    const box = this.add.graphics().setDepth(101);
    box.fillStyle(0x050a1a, 0.98);
    box.fillRoundedRect(bx, by, bw, bh, 18);
    box.lineStyle(3, 0x00DDFF, 1);
    box.strokeRoundedRect(bx, by, bw, bh, 18);

    this.add.text(width / 2, by + 44, 'ðŸª‚ COUNTING SEMAPHORE', {
      fontSize: '28px', color: '#00DDFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(width / 2, by + 82, this.levelSubtitle(), {
      fontSize: '17px', color: '#FFD700',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(bx + 40, by + 115, this.introBody(), {
      fontSize: '14px', color: '#E0E0E0', lineSpacing: 6, wordWrap: { width: bw - 80 },
    }).setDepth(102);

    // start button
    const btnW = 200, btnH = 50;
    const btnX = width / 2 - btnW / 2, btnY = by + bh - 75;
    const btn = this.add.graphics().setDepth(102);
    btn.fillStyle(0x00AAFF, 1);
    btn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    btn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    this.add.text(width / 2, btnY + 25, 'ðŸš€ START GAME', {
      fontSize: '20px', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(103);

    btn.on('pointerdown', () => {
      [ov, box, btn].forEach(o => o.destroy());
      this.children.list
        .filter(c => (c as any).depth >= 101 && (c as any).depth <= 103)
        .forEach(c => c.destroy());
      this.startGame();
    });
  }

  protected levelSubtitle(): string { return 'Skydiving Logistics'; }
  protected introBody(): string {
    return [
      'ðŸ“¦ COUNTING SEMAPHORE RULES:',
      `  S = ${this.cfg.totalPacks}  (available parachute packs = semaphore value)`,
      '  wait(S):   S-- â†’ diver grabs a pack and boards the plane',
      '  signal(S): S++ â†’ diver lands, returns pack, wakes next in queue',
      '',
      'ðŸŽ® HOW TO PLAY:',
      '  â€¢ Click the green [+] button (or a waiting diver) to spawn a diver â†’ wait()',
      `  â€¢ If S > 0: diver takes a pack and jumps immediately`,
      `  â€¢ If S = 0: diver sits on the bench (blocked queue)`,
      '  â€¢ When a diver lands on the landing zone, click it â†’ signal()',
      '  â€¢ Pack returns to rack, S++, and next queued diver auto-wakes',
      '',
      `ðŸŽ¯ GOAL: Successfully launch ${this.cfg.targetDivers} divers!`,
      '',
      this.cfg.enableStuck
        ? 'âš ï¸  L3: Some divers may get STUCK mid-air (resource leak!). Click the\n     warning light or the stuck diver to force-land them.'
        : '',
    ].join('\n');
  }

  // â”€â”€ game start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected startGame() {
    this.gamePhase = 'playing';
    this.gameStartTime = Date.now();
    this.instructionText.setText('Click [+] to send a diver â†’ wait(S)');

    // add-diver button
    const { width, height } = this.scale;
    const addBtn = this.add.image(width * 0.1, height * 0.3, 'ui-add-diver')
      .setDisplaySize(60, 60).setDepth(8).setInteractive({ useHandCursor: true });
    addBtn.on('pointerdown', () => this.spawnDiver());
    addBtn.on('pointerover', () => addBtn.setTint(0xaaffaa));
    addBtn.on('pointerout', () => addBtn.clearTint());
    this.add.text(width * 0.1, height * 0.3 + 40, 'wait(S)', {
      fontSize: '11px', color: '#AAFFAA', align: 'center',
    }).setOrigin(0.5).setDepth(8);

    // L3 warning light click
    if (this.cfg.enableStuck) {
      this.warningLight.setInteractive({ useHandCursor: true });
      this.warningLight.on('pointerdown', () => this.forceRecoverStuck());
    }

    // auto-spawn timer (gentle pacing)
    this.spawnTimer = this.time.addEvent({
      delay: this.cfg.spawnDelay,
      callback: () => {
        if (this.gamePhase === 'playing' && this.diverLaunched < this.cfg.targetDivers) {
          this.spawnDiver();
        }
      },
      loop: true,
    });
  }

  // â”€â”€ wait(S) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected spawnDiver() {
    if (this.gamePhase !== 'playing') return;

    const { width, height } = this.scale;
    const id = ++this.diverIdCounter;

    // spawn near plane
    const sx = width * 0.65 + Phaser.Math.Between(-20, 20);
    const sy = height * 0.22;
    const sprite = this.add.image(sx, sy, 'diver-waiting')
      .setDisplaySize(60, 80).setDepth(6).setInteractive({ useHandCursor: true });

    const diver: Diver = { id, sprite, state: 'waiting' };
    this.divers.push(diver);

    sprite.on('pointerdown', () => this.onDiverClick(diver));
    sprite.on('pointerover', () => { if (diver.state === 'waiting' || diver.state === 'landed') sprite.setTint(0xffff88); });
    sprite.on('pointerout', () => sprite.clearTint());

    // wait(S) logic
    this.performWait(diver);
  }

  protected performWait(diver: Diver) {
    if (this.S > 0) {
      // resource available â†’ decrement, launch
      this.S--;
      this.attachPack(diver);
      this.launchDiver(diver);
    } else {
      // S = 0 â†’ block
      diver.state = 'benched';
      this.blockedQueue.push(diver);
      this.moveToBench(diver);
    }
    this.updateHUD();
  }

  private attachPack(diver: Diver) {
    const pack = this.add.image(diver.sprite.x + 20, diver.sprite.y, 'pack-side1')
      .setDisplaySize(30, 40).setDepth((diver.sprite as any).depth + 0.1);
    diver.packSprite = pack;
  }

  private launchDiver(diver: Diver) {
    const { width, height } = this.scale;
    diver.state = 'jumping';
    this.diverLaunched++;

    diver.sprite.setTexture('diver-jumping');

    // float up to jump altitude
    this.tweens.add({
      targets: [diver.sprite, diver.packSprite].filter(Boolean),
      y: `-=${height * 0.15}`,
      duration: 800,
      ease: 'Power1',
      onComplete: () => this.beginFreeFall(diver),
    });

    this.showMessage(`wait(S) âœ“  S = ${this.S}  â€” pack acquired!`, '#00FFCC', 1800);
    this.updateHUD();

    if (this.diverLaunched >= this.cfg.targetDivers && this.blockedQueue.length === 0) {
      this.instructionText.setText('All divers launched! Wait for landingsâ€¦');
    }
  }

  private beginFreeFall(diver: Diver) {
    const { width, height } = this.scale;
    diver.state = 'falling';
    diver.sprite.setTexture('diver-diving');

    // L3: random chance of getting stuck
    if (this.cfg.enableStuck && Math.random() < this.cfg.stuckChance) {
      this.scheduleStuck(diver);
      return;
    }

    const targetX = width * 0.45 + Phaser.Math.Between(-60, 60);
    const targetY = height * 0.80;

    if (diver.packSprite) {
      this.tweens.add({ targets: diver.packSprite, alpha: 0, duration: 300 });
    }

    this.tweens.add({
      targets: diver.sprite,
      x: targetX, y: targetY,
      duration: this.cfg.fallDuration,
      ease: 'Power2',
      onComplete: () => this.diverLandsOnGround(diver),
    });
  }

  // â”€â”€ L3: stuck / resource-leak â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private scheduleStuck(diver: Diver) {
    diver.state = 'stuck';
    // diver floats in place
    this.tweens.add({
      targets: diver.sprite,
      y: `+=${30}`,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    diver.stuckTimer = this.time.addEvent({
      delay: this.cfg.stuckHoldMs,
      callback: () => this.showStuckWarning(diver),
    }) as unknown as number;
  }

  private showStuckWarning(diver: Diver) {
    diver.stuckWarning = this.add.text(diver.sprite.x, diver.sprite.y - 50, 'âš ï¸ STUCK!', {
      fontSize: '14px', color: '#FF4444', fontStyle: 'bold',
      backgroundColor: '#000000CC', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(20);

    if (!this.warningFlashing) {
      this.warningFlashing = true;
      this.warningLight.setAlpha(1);
      this.tweens.add({
        targets: this.warningLight, alpha: 0.2, duration: 400, yoyo: true, repeat: -1,
      });
    }

    diver.sprite.on('pointerdown', () => this.forceLandDiver(diver));
    this.instructionText.setText('âš ï¸ Diver stuck! Click them or the warning light to force-land â†’ signal(S)');
  }

  protected forceRecoverStuck() {
    const stuck = this.divers.find(d => d.state === 'stuck');
    if (stuck) this.forceLandDiver(stuck);
  }

  private forceLandDiver(diver: Diver) {
    if (diver.state !== 'stuck') return;
    diver.state = 'falling';
    diver.stuckWarning?.destroy();
    this.tweens.killTweensOf(diver.sprite);

    const { width, height } = this.scale;
    this.tweens.add({
      targets: diver.sprite,
      x: width * 0.45, y: height * 0.80,
      duration: 1200, ease: 'Power2',
      onComplete: () => this.diverLandsOnGround(diver),
    });

    const remaining = this.divers.filter(d => d.state === 'stuck').length - 1;
    if (remaining === 0) {
      this.warningFlashing = false;
      this.tweens.killTweensOf(this.warningLight);
      this.warningLight.setAlpha(0.3);
    }
  }

  // â”€â”€ diver lands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private diverLandsOnGround(diver: Diver) {
    diver.state = 'landed';
    diver.sprite.setTexture('diver-landed');
    diver.packSprite?.destroy();

    // show return button above diver
    const { width, height } = this.scale;
    const retBtn = this.add.image(diver.sprite.x, diver.sprite.y - 55, 'ui-return')
      .setDisplaySize(48, 48).setDepth(9).setInteractive({ useHandCursor: true });
    retBtn.on('pointerdown', () => {
      retBtn.destroy();
      this.performSignal(diver);
    });
    retBtn.on('pointerover', () => retBtn.setTint(0xaaffff));
    retBtn.on('pointerout', () => retBtn.clearTint());

    this.instructionText.setText('Diver landed! Click return button â†’ signal(S)');
  }

  private onLandingZoneClick() {
    const landed = this.divers.find(d => d.state === 'landed');
    if (landed) {
      // remove any floating return btn
      this.performSignal(landed);
    } else {
      this.showMessage('No diver has landed yet!', '#FF9900', 1200);
    }
  }

  private onDiverClick(diver: Diver) {
    if (diver.state === 'waiting') {
      // already handled by spawnDiver flow; no-op
    } else if (diver.state === 'stuck') {
      this.forceLandDiver(diver);
    }
  }

  // â”€â”€ signal(S) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected performSignal(diver: Diver) {
    diver.state = 'waiting'; // done

    this.S++;
    this.diverLanded++;
    this.showMessage(`signal(S) âœ“  S = ${this.S}  â€” pack returned!`, '#FFD700', 1800);

    // tween diver off-screen
    this.tweens.add({
      targets: diver.sprite, alpha: 0, y: diver.sprite.y + 30,
      duration: 600, onComplete: () => {
        diver.sprite.destroy();
        const idx = this.divers.indexOf(diver);
        if (idx > -1) this.divers.splice(idx, 1);
      },
    });

    // wake first blocked diver (FIFO)
    if (this.blockedQueue.length > 0 && this.S > 0) {
      const next = this.blockedQueue.shift()!;
      this.S--;
      this.attachPack(next);
      this.wakeFromBench(next);
    }

    this.updateHUD();
    this.checkWinCondition();
  }

  // â”€â”€ bench queue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private moveToBench(diver: Diver) {
    const { width, height } = this.scale;
    diver.benchIndex = this.blockedQueue.indexOf(diver);
    const targetX = width * 0.1 + diver.benchIndex! * 44;
    const targetY = height * 0.77;

    diver.sprite.setTexture('diver-waiting');
    this.tweens.add({
      targets: diver.sprite, x: targetX, y: targetY,
      duration: 600, ease: 'Power1',
    });

    this.showMessage(`S = 0  â†’ diver blocked, joins queue (${this.blockedQueue.length})`, '#FF9900', 1800);
    this.updateHUD();
  }

  private wakeFromBench(diver: Diver) {
    diver.state = 'jumping';
    this.diverLaunched++;
    diver.sprite.setTexture('diver-jumping');

    this.tweens.add({
      targets: diver.sprite,
      x: this.scale.width * 0.65,
      y: this.scale.height * 0.22,
      duration: 700, ease: 'Power1',
      onComplete: () => {
        this.tweens.add({
          targets: [diver.sprite, diver.packSprite].filter(Boolean),
          y: `-=${this.scale.height * 0.12}`,
          duration: 700, ease: 'Power1',
          onComplete: () => this.beginFreeFall(diver),
        });
      },
    });

    this.showMessage(`Blocked diver woke! S = ${this.S}`, '#AAFFAA', 1500);
    this.updateHUD();
  }

  // â”€â”€ win condition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private checkWinCondition() {
    if (this.diverLanded >= this.cfg.targetDivers) {
      this.time.delayedCall(600, () => this.gameWon());
    }
  }

  private gameWon() {
    if (this.gamePhase === 'completed') return;
    this.gamePhase = 'completed';
    this.spawnTimer?.remove();

    const aiFeedbackBtn = this.add.text(140, height - 36, '💬 Chat with AI', {
      fontSize: '16px',
      color: '#FFFFFF',
      backgroundColor: '#4CAF50',
      padding: { x: 12, y: 8 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(500).setInteractive({ useHandCursor: true });

    aiFeedbackBtn.on('pointerdown', () => {
      const sceneAny = this as any;
      openAIFeedbackChat({
        gameType: this.scene.key,
        score: sceneAny.totalScore ?? sceneAny.score ?? 0,
        wrongAttempts: sceneAny.wrongAttempts ?? 0,
        phase: sceneAny.gamePhase ?? 'results'
      });
    });
    this.showWinModal();
  }

  private showWinModal() {
    const { width, height } = this.scale;
    const ov = this.add.graphics().setDepth(200);
    ov.fillStyle(0x000000, 0.85); ov.fillRect(0, 0, width, height);

    const bw = 480, bh = 360;
    const bx = width / 2 - bw / 2, by = height / 2 - bh / 2;
    const box = this.add.graphics().setDepth(201);
    box.fillStyle(0x021a05, 0.98); box.fillRoundedRect(bx, by, bw, bh, 18);
    box.lineStyle(3, 0x00FF88, 1); box.strokeRoundedRect(bx, by, bw, bh, 18);

    this.add.text(width / 2, by + 50, 'ðŸŽ‰ LEVEL COMPLETE!', {
      fontSize: '30px', color: '#00FF88', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
    this.add.text(width / 2, by + 160, [
      `Divers launched: ${this.diverLanded}`,
      `Wrong actions:   ${this.wrongAttempts}`,
      `Time:            ${elapsed}s`,
    ].join('\n'), {
      fontSize: '18px', color: '#FFFFFF', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setDepth(202);

    const btnX = width / 2 - 90, btnY = by + bh - 78;
    const btn = this.add.graphics().setDepth(202);
    btn.fillStyle(0x00AA55, 1); btn.fillRoundedRect(btnX, btnY, 180, 48, 10);
    btn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, 180, 48), Phaser.Geom.Rectangle.Contains);
    this.add.text(width / 2, btnY + 24, 'ðŸ”„ PLAY AGAIN', {
      fontSize: '20px', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(203);
    btn.on('pointerdown', () => this.scene.restart());
  }

  // â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected showMessage(text: string, color: string, duration = 2000) {
    const { width, height } = this.scale;
    const msg = this.add.text(width / 2, height * 0.45, text, {
      fontSize: '18px', color, fontStyle: 'bold',
      backgroundColor: '#000000CC', padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: msg, alpha: 0, y: msg.y - 40,
      duration, onComplete: () => msg.destroy(),
    });
  }

  // â”€â”€ score submission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private async submitScore() {
    try {
      const timeSpent = Math.floor((Date.now() - this.gameStartTime) / 1000);
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: this.cfg.gameId,
          moduleId: 'process-synchronization',
          levelId: this.cfg.levelId,
          score: this.diverLanded * 10,
          timeSpent,
          accuracy: this.wrongAttempts === 0 ? 100 : Math.max(0, 100 - this.wrongAttempts * 5),
          wrongAttempts: this.wrongAttempts,
          metadata: { diverLanded: this.diverLanded, blockedMax: this.cfg.totalPacks },
        }),
      });
    } catch (e) {
      console.error('Score submit failed', e);
    }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Level 1 â€“ Clear Skies (Basic Allocation)
//  S=5, 5 packs, launch 5 divers, no bench
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class CountingSemaphoreL1Scene extends CountingSemaphoreBase {
  constructor() {
    super({
      key: 'CountingSemaphoreL1Scene',
      totalPacks: 5,
      targetDivers: 5,
      spawnDelay: 8000,
      fallDuration: 3500,
      enableBench: false,
      enableStuck: false,
      stuckChance: 0,
      stuckHoldMs: 0,
      gameId: 'counting-semaphore-l1',
      levelId: 'l1',
    });
  }

  protected levelSubtitle() { return 'Level 1 â€” Clear Skies: Basic Allocation'; }

  protected introBody(): string {
    return [
      'ðŸ“¦ COUNTING SEMAPHORE â€” BASICS:',
      '  S = 5  (5 parachute packs available)',
      '  wait(S):   S-- â†’ diver grabs pack and jumps',
      '  signal(S): S++ â†’ diver lands and returns pack',
      '',
      'ðŸŽ® HOW TO PLAY:',
      '  â€¢ Click the green [+] button to send a diver â†’ wait(S)',
      '  â€¢ Diver takes a pack (S decrements) and jumps from the plane',
      '  â€¢ After landing, click the return button â†’ signal(S)',
      '  â€¢ S increments â€” pack is back on the rack!',
      '',
      'ðŸŽ¯ GOAL: Launch all 5 divers successfully!',
      '',
      'ðŸ’¡ KEY INSIGHT: S tracks available resources.',
      '   You cannot jump without a pack!',
    ].join('\n');
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Level 2 â€“ The Hangar Jam (Blocked Queue)
//  S=3, 10 divers, bench enabled
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class CountingSemaphoreL2Scene extends CountingSemaphoreBase {
  constructor() {
    super({
      key: 'CountingSemaphoreL2Scene',
      totalPacks: 3,
      targetDivers: 10,
      spawnDelay: 5000,
      fallDuration: 2800,
      enableBench: true,
      enableStuck: false,
      stuckChance: 0,
      stuckHoldMs: 0,
      gameId: 'counting-semaphore-l2',
      levelId: 'l2',
    });
  }

  protected levelSubtitle() { return 'Level 2 â€” The Hangar Jam: Blocked Queue'; }

  protected introBody(): string {
    return [
      'ðŸ“¦ COUNTING SEMAPHORE â€” BLOCKED QUEUE:',
      '  S = 3  (only 3 packs for 10 divers!)',
      '  When S = 0: new divers BLOCK â†’ bench (wait queue)',
      '  signal(S): S++ â†’ wakes the first diver on the bench (FIFO)',
      '',
      'ðŸŽ® HOW TO PLAY:',
      '  â€¢ Divers auto-arrive â€” send them with wait(S)',
      '  â€¢ With only 3 packs, the 4th diver will block onto the bench',
      '  â€¢ Land a diver and click return â†’ signal(S)',
      '  â€¢ Pack returns, S++, bench diver auto-wakes and jumps!',
      '',
      'ðŸŽ¯ GOAL: Get all 10 divers through with only 3 packs!',
      '',
      'ðŸ’¡ KEY INSIGHT: When S â‰¤ 0, processes wait in a queue.',
      '   signal() always wakes the next blocked process (FIFO).',
    ].join('\n');
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Level 3 â€“ The Infinite Fall (Resource Leak)
//  S=3, 15 divers, stuck divers simulate leaks
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class CountingSemaphoreL3Scene extends CountingSemaphoreBase {
  private deadlockTimer?: Phaser.Time.TimerEvent;
  private deadlockWarned = false;

  constructor() {
    super({
      key: 'CountingSemaphoreL3Scene',
      totalPacks: 3,
      targetDivers: 15,
      spawnDelay: 4000,
      fallDuration: 2200,
      enableBench: true,
      enableStuck: true,
      stuckChance: 0.4,
      stuckHoldMs: 5000,
      gameId: 'counting-semaphore-l3',
      levelId: 'l3',
    });
  }

  protected levelSubtitle() { return 'Level 3 â€” The Infinite Fall: Resource Leak / Deadlock'; }

  protected introBody(): string {
    return [
      'ðŸ“¦ COUNTING SEMAPHORE â€” RESOURCE LEAK:',
      '  S = 3  (3 packs, 15 divers, but some get STUCK!)',
      '',
      '  A "stuck" diver holds a pack indefinitely.',
      '  If all 3 packs are held by stuck divers, no one else can jump.',
      '  This is a DEADLOCK â€” system freezes!',
      '',
      'ðŸŽ® HOW TO PLAY:',
      '  â€¢ Same as L2 â€” send divers, return packs',
      '  â€¢ Watch for âš ï¸ STUCK diver warnings in mid-air',
      '  â€¢ Click a stuck diver OR the red warning light to force-land',
      '  â€¢ This simulates OS killing/interrupting a stuck process',
      '',
      'ðŸŽ¯ GOAL: Launch 15 divers without hitting deadlock!',
      '',
      'ðŸ’¡ KEY INSIGHT: Resources held forever cause deadlock.',
      '   The OS must be able to reclaim them (timeouts / signals).',
    ].join('\n');
  }

  protected startGame() {
    super.startGame();

    // deadlock watchdog â€” fires every 10s to check if all packs are stuck
    this.deadlockTimer = this.time.addEvent({
      delay: 10000,
      callback: this.checkDeadlock,
      callbackScope: this,
      loop: true,
    });
  }

  private checkDeadlock() {
    if (this.gamePhase !== 'playing') return;
    const stuckCount = this.divers.filter(d => d.state === 'stuck').length;
    const inAir = this.divers.filter(d => d.state === 'falling').length;
    if (stuckCount >= this.cfg.totalPacks && inAir === 0 && this.blockedQueue.length > 0 && !this.deadlockWarned) {
      this.deadlockWarned = true;
      this.showDeadlockWarning();
    }
  }

  private showDeadlockWarning() {
    const { width, height } = this.scale;
    const warn = this.add.text(width / 2, height / 2, [
      'ðŸ”´ DEADLOCK DETECTED!',
      'All packs held by stuck divers.',
      'Click stuck divers to recover!',
    ].join('\n'), {
      fontSize: '22px', color: '#FF4444', fontStyle: 'bold',
      backgroundColor: '#000000EE', padding: { x: 20, y: 14 }, align: 'center',
    }).setOrigin(0.5).setDepth(60);

    this.tweens.add({ targets: warn, alpha: 0, duration: 4000, onComplete: () => warn.destroy() });
  }
}
