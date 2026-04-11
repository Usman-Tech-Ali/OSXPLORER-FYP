import Phaser from 'phaser';
import { openAIFeedbackChat } from '../../shared/aiFeedbackChat';

const ASSET_PATH = '/games/memory-management/Fragmentation_Compaction/';

const BAY_HEIGHT  = 100;
const UNIT_PX     = 76;
const TOTAL_UNITS = 9;

interface MemBlock {
  id: string;
  units: number;
  spriteKey: string;
  label: string;
  free: boolean;
  wrapSprite?: Phaser.GameObjects.Sprite;
  itemSprite?: Phaser.GameObjects.Sprite;
  labelTxt?: Phaser.GameObjects.Text;
  freeTxt?: Phaser.GameObjects.Text;
  peanutsSprite?: Phaser.GameObjects.Sprite;
  clickZone?: Phaser.GameObjects.Rectangle;
}

// Initial memory layout after filling phase
const INITIAL_OCCUPIED = [
  { id: 'A', units: 2, spriteKey: 'item-scanner', label: 'Scanner\n(2u)' },
  { id: 'B', units: 3, spriteKey: 'item-server',  label: 'Server\n(3u)'  },
  { id: 'C', units: 1, spriteKey: 'item-pc',      label: 'PC\n(1u)'      },
  { id: 'D', units: 2, spriteKey: 'item-scanner', label: 'Scanner\n(2u)' },
];

// Items the user must place after drones create holes
const PLACEMENT_TASKS = [
  {
    id: 'T1', units: 2, spriteKey: 'item-pc',      label: 'PC Tower (2u)',
    question: 'Where can this 2u PC fit?',
    hint: 'Look for any gap ≥ 2 units.',
  },
  {
    id: 'T2', units: 4, spriteKey: 'item-server',  label: 'Server Rack (4u)',
    question: 'Can this 4u Server Rack fit anywhere?',
    hint: 'Total free might be ≥ 4u, but is any single gap ≥ 4u?',
  },
];

type Phase = 'intro' | 'filling' | 'drone-phase' | 'placing' | 'results';

export class FragL2Scene extends Phaser.Scene {
  private gamePhase: Phase = 'intro';

  private blocks: MemBlock[] = [];
  private bayStartX = 0;
  private bayY      = 0;

  private score          = 100;
  private correctAnswers = 0;
  private taskIndex      = 0;

  private currentTask: typeof PLACEMENT_TASKS[0] | null = null;
  private itemSprite?: Phaser.GameObjects.Sprite;
  private itemLabelObj?: Phaser.GameObjects.Text;

  private conveyorBelt!: Phaser.GameObjects.Sprite;
  private wasteFill!:    Phaser.GameObjects.Graphics;

  private infoBox!:         Phaser.GameObjects.Text;
  private questionBox!:     Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private scoreText!:       Phaser.GameObjects.Text;
  private memStatsText!:    Phaser.GameObjects.Text;

  // for "can it fit?" yes/no question
  private answerBtns: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: 'FragL2Scene' }); }

  preload() {
    const p = ASSET_PATH;
    this.load.image('warehouse-bg',      `${p}Warehouse-Background.png`);
    this.load.image('truck',             `${p}Truck.png`);
    this.load.image('conveyor-belt',     `${p}Conveyer-Belt.png`);
    this.load.image('conveyor-smoke',    `${p}Conveyor-Smoke.png`);
    this.load.image('shrink-wrap',       `${p}Shrink-Wrap.png`);
    this.load.image('drone',             `${p}Drone.png`);
    this.load.image('scattered-peanuts', `${p}Scattered-Peanuts.png`);
    this.load.image('waste-meter',       `${p}Waste-Meter.png`);
    this.load.image('system-halted',     `${p}System-Halted-Sign.png`);
    this.load.image('item-scanner',      `${p}Item-1.png`);
    this.load.image('item-pc',           `${p}Item-2.png`);
    this.load.image('item-server',       `${p}Item-3.png`);
  }

  create() {
    const { width, height } = this.cameras.main;
    const totalBayW  = TOTAL_UNITS * UNIT_PX;
    this.bayStartX   = (width - totalBayW) / 2;
    this.bayY        = height * 0.40;

    // bg
    const bg = this.add.image(width / 2, height / 2, 'warehouse-bg');
    bg.setScale(Math.max(width / bg.width, height / bg.height)).setDepth(-10);
    this.add.graphics().fillStyle(0x000000, 0.40).fillRect(0, 0, width, height).setDepth(-9);

    // truck
    this.add.sprite(width / 2, this.bayY + 10, 'truck')
      .setDisplaySize(totalBayW + 60, BAY_HEIGHT + 80)
      .setDepth(0).setAlpha(0.48);

    // bay panel
    const px = this.bayStartX - 14;
    const pw = totalBayW + 28;
    const ph = BAY_HEIGHT + 54;
    const py = this.bayY - BAY_HEIGHT / 2 - 20;
    this.add.graphics().setDepth(1)
      .fillStyle(0x001a00, 0.90).fillRoundedRect(px, py, pw, ph, 10)
      .lineStyle(2, 0x00FFCC, 0.55).strokeRoundedRect(px, py, pw, ph, 10);

    // bay outline + ticks
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(2, 0x00FFCC, 0.60)
      .strokeRect(this.bayStartX, this.bayY - BAY_HEIGHT / 2, totalBayW, BAY_HEIGHT);
    for (let i = 0; i <= TOTAL_UNITS; i++) {
      const tx = this.bayStartX + i * UNIT_PX;
      g.lineStyle(1, 0x00FFCC, 0.20)
        .lineBetween(tx, this.bayY - BAY_HEIGHT / 2, tx, this.bayY + BAY_HEIGHT / 2);
      if (i < TOTAL_UNITS) {
        this.add.text(tx + UNIT_PX / 2, this.bayY - BAY_HEIGHT / 2 + 6,
          `${i}–${i + 1}`, { fontSize: '8px', color: '#336633' }
        ).setOrigin(0.5).setDepth(3);
      }
    }

    this.add.text(width / 2, py - 16,
      '🧠  TRUCK CARGO BAY  —  Dynamic Partitions  (9 units total)', {
        fontSize: '13px', color: '#00FFCC', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 10, y: 4 },
      }
    ).setOrigin(0.5).setDepth(3);

    // conveyor
    const beltY = height * 0.73;
    this.conveyorBelt = this.add.sprite(width / 2, beltY, 'conveyor-belt')
      .setDisplaySize(width * 0.78, 58).setDepth(2);
    this.tweens.add({ targets: this.conveyorBelt, x: this.conveyorBelt.x - 4, yoyo: true, repeat: -1, duration: 200 });

    // frag meter
    const meterX = width - 52;
    this.add.sprite(meterX, height * 0.38, 'waste-meter').setScale(0.21).setDepth(8);
    this.wasteFill = this.add.graphics().setDepth(9);
    this.add.text(meterX, height * 0.60, 'FRAG', {
      fontSize: '10px', color: '#FF6666', fontStyle: 'bold',
      backgroundColor: '#000000AA', padding: { x: 3, y: 2 },
    }).setOrigin(0.5).setDepth(10);

    this.memStatsText = this.add.text(meterX, height * 0.68, '', {
      fontSize: '10px', color: '#888888', align: 'center',
      backgroundColor: '#000000AA', padding: { x: 4, y: 3 }, lineSpacing: 2,
    }).setOrigin(0.5).setDepth(10);

    // HUD
    this.add.text(width / 2, 22,
      'Level 2  —  Dynamic Partitions  |  External Fragmentation', {
        fontSize: '15px', color: '#FF6666', fontStyle: 'bold',
        backgroundColor: '#000000CC', padding: { x: 12, y: 5 },
      }
    ).setOrigin(0.5).setDepth(20);

    this.scoreText = this.add.text(meterX, 22, 'Score: 100', {
      fontSize: '15px', color: '#00FF88', fontStyle: 'bold',
      backgroundColor: '#000000CC', padding: { x: 8, y: 5 },
    }).setOrigin(0.5, 0).setDepth(20);

    this.infoBox = this.add.text(width / 2, 58, '', {
      fontSize: '14px', color: '#FFFFFF',
      backgroundColor: '#0a1a0aEE', padding: { x: 16, y: 8 },
      align: 'center', wordWrap: { width: width * 0.58 },
    }).setOrigin(0.5).setDepth(20);

    this.questionBox = this.add.text(width / 2, height * 0.60, '', {
      fontSize: '15px', color: '#FFFFFF', fontStyle: 'bold',
      backgroundColor: '#1a0a00EE', padding: { x: 20, y: 12 },
      align: 'center', wordWrap: { width: width * 0.60 },
    }).setOrigin(0.5).setDepth(20);

    this.instructionText = this.add.text(width / 2, height - 22, '', {
      fontSize: '13px', color: '#B0E0E6',
      backgroundColor: '#000000CC', padding: { x: 14, y: 5 }, align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.showIntro(width, height);
  }

  // ── Intro ──────────────────────────────────────────────────────────────────

  private showIntro(w: number, h: number) {
    const ov = this.add.graphics()
      .fillStyle(0x000000, 0.90).fillRect(0, 0, w, h).setDepth(30);
    const card = this.add.graphics().setDepth(31);
    card.fillStyle(0x0a1a0a, 0.97)
      .fillRoundedRect(w * 0.12, h * 0.08, w * 0.76, h * 0.84, 16)
      .lineStyle(3, 0xFF6666, 0.9)
      .strokeRoundedRect(w * 0.12, h * 0.08, w * 0.76, h * 0.84, 16);

    this.add.text(w / 2, h * 0.17, '🚁  Level 2: Dynamic Partitions', {
      fontSize: '24px', color: '#FF6666', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(32);
    this.add.text(w / 2, h * 0.24, 'Topic: External Fragmentation', {
      fontSize: '15px', color: '#FFD700',
    }).setOrigin(0.5).setDepth(32);

    const cg = this.add.graphics().setDepth(31);
    cg.fillStyle(0x1a0000, 0.90)
      .fillRoundedRect(w * 0.17, h * 0.29, w * 0.66, h * 0.25, 8);
    this.add.text(w / 2, h * 0.415,
      '🧠  Items are shrink-wrapped to EXACT size — no internal waste.\n' +
      'But when items are removed from the MIDDLE,\n' +
      'free gaps scatter across memory.\n' +
      'A new large item may not fit even if total free ≥ needed.',
      { fontSize: '13px', color: '#E0E0E0', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5).setDepth(32);

    const hg = this.add.graphics().setDepth(31);
    hg.fillStyle(0x001a1a, 0.90)
      .fillRoundedRect(w * 0.17, h * 0.56, w * 0.66, h * 0.25, 8);
    this.add.text(w / 2, h * 0.685,
      '🎮  HOW TO PLAY  (this is where you score)\n\n' +
      'Phase 1: Memory auto-fills (watch).\n' +
      'Phase 2: Drones create holes (watch).\n' +
      'Phase 3: YOU answer — can the new item fit?\n' +
      '         If yes, click the correct gap to place it.\n' +
      '         If no, click NO to reject it. Correct = +20 pts.',
      { fontSize: '13px', color: '#00FFCC', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5).setDepth(32);

    const btn = this.add.text(w / 2, h * 0.868, '  START LEVEL 2  ▶', {
      fontSize: '20px', color: '#000', backgroundColor: '#FF6666',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(32);
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#CC0000' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#FF6666' }));
    btn.on('pointerdown', () => {
      [ov, card, cg, hg, btn].forEach((o) => o.destroy());
      this.children.list
        .filter((c) => {
          const depth = (c as any).depth as number | undefined;
          return depth === 31 || depth === 32;
        })
        .forEach((c) => c.destroy());
      this.gamePhase = 'filling';
      this.initBlocks();
      this.autoFill();
    });
  }

  // ── Phase 1: auto fill (visual only) ──────────────────────────────────────

  private initBlocks() {
    this.blocks = [{ id: 'free_all', units: TOTAL_UNITS, free: true, spriteKey: '', label: '' }];
    this.renderBlocks();
  }

  private autoFill() {
    this.infoBox.setText('Memory filling with shrink-wrapped items — exact size, no internal waste…');
    this.instructionText.setText('Watch how each item uses exactly its required space.');
    let delay = 300;
    INITIAL_OCCUPIED.forEach(item => {
      this.time.delayedCall(delay, () => this.insertBlock(item));
      delay += 800;
    });
    this.time.delayedCall(delay + 400, () => this.startDronePhase());
  }

  private insertBlock(item: typeof INITIAL_OCCUPIED[0]) {
    const freeIdx = this.blocks.findIndex(b => b.free && b.units >= item.units);
    if (freeIdx === -1) return;
    const free = this.blocks[freeIdx];
    const nb: MemBlock = { id: item.id, units: item.units, spriteKey: item.spriteKey, label: item.label, free: false };
    const rem = free.units - item.units;
    const spliced: MemBlock[] = [nb];
    if (rem > 0) spliced.push({ id: `fr_${item.id}`, units: rem, spriteKey: '', label: '', free: true });
    this.blocks.splice(freeIdx, 1, ...spliced);
    this.renderBlocks(true);
    this.updateWasteMeter();
    this.updateMemStats();
  }

  // ── Phase 2: drones ────────────────────────────────────────────────────────

  private startDronePhase() {
    this.gamePhase = 'drone-phase';
    const { width, height } = this.cameras.main;
    this.infoBox.setText('🚁  Drones removing items from the MIDDLE of memory…');
    this.instructionText.setText('Watch the gaps scatter — External Fragmentation forming.');

    const targets = ['B', 'C'];
    targets.forEach((tid, i) => {
      this.time.delayedCall(i * 1300, () => this.droneRemove(tid, width, height));
    });
    this.time.delayedCall(targets.length * 1300 + 900, () => this.startPlacingPhase());
  }

  private droneRemove(blockId: string, width: number, height: number) {
    const idx = this.blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const blk = this.blocks[idx];
    const bx  = this.getBlockCenterX(idx);

    const drone = this.add.sprite(bx, height * 0.14, 'drone').setScale(0.13).setDepth(15);
    this.tweens.add({ targets: drone, y: drone.y - 5, yoyo: true, repeat: -1, duration: 350 });

    this.tweens.add({
      targets: drone, y: this.bayY - 52, duration: 500, ease: 'Power2',
      onComplete: () => {
        const flash = this.add.graphics().setDepth(14)
          .fillStyle(0xFF0000, 0.25)
          .fillRect(bx - (blk.units * UNIT_PX) / 2,
            this.bayY - BAY_HEIGHT / 2, blk.units * UNIT_PX, BAY_HEIGHT);
        this.time.delayedCall(160, () => flash.destroy());

        this.tweens.add({
          targets: [blk.wrapSprite, blk.itemSprite, blk.labelTxt, blk.freeTxt, blk.peanutsSprite],
          alpha: 0, duration: 250,
          onComplete: () => {
            blk.wrapSprite?.destroy(); blk.itemSprite?.destroy();
            blk.labelTxt?.destroy();   blk.freeTxt?.destroy();
            blk.peanutsSprite?.destroy();
            this.blocks[idx] = { id: `hole_${blockId}`, units: blk.units, spriteKey: '', label: `FREE\n${blk.units}u`, free: true };
            this.renderBlocks();
            this.updateWasteMeter();
            this.updateMemStats();
            const tf = this.blocks.filter(b => b.free).reduce((s, b) => s + b.units, 0);
            const mg = this.maxContiguousFree();
            this.infoBox.setText(
              `🕳  Gap created!  Total free: ${tf}u  |  Largest gap: ${mg}u`
            );
          },
        });
        this.tweens.add({ targets: drone, y: height * 0.06, x: bx + 120, duration: 380, onComplete: () => drone.destroy() });
      },
    });
  }

  // ── Phase 3: user must answer questions about placement ────────────────────

  private startPlacingPhase() {
    this.gamePhase = 'placing';
    this.taskIndex = 0;
    this.time.delayedCall(400, () => this.nextTask());
  }

  private nextTask() {
    if (this.taskIndex >= PLACEMENT_TASKS.length) {
      this.showResults();
      return;
    }
    this.currentTask = PLACEMENT_TASKS[this.taskIndex];
    this.taskIndex++;

    const { width, height } = this.cameras.main;
    const beltY = height * 0.73;
    const totalFree = this.blocks.filter(b => b.free).reduce((s, b) => s + b.units, 0);
    const maxGap    = this.maxContiguousFree();
    const canFit    = maxGap >= this.currentTask.units;

    // spawn item on belt
    this.itemSprite?.destroy();
    this.itemLabelObj?.destroy();
    this.clearAnswerBtns();

    this.itemSprite = this.add.sprite(width + 120, beltY - 18, this.currentTask.spriteKey)
      .setScale(0.12).setDepth(6);
    this.itemLabelObj = this.add.text(width + 120, beltY + 22, this.currentTask.label, {
      fontSize: '13px', color: '#FFD700', fontStyle: 'bold',
      backgroundColor: '#000000CC', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(6);

    this.tweens.add({
      targets: [this.itemSprite, this.itemLabelObj],
      x: width * 0.50, duration: 700, ease: 'Power2',
      onComplete: () => {
        this.questionBox.setText(
          `❓  ${this.currentTask!.question}\n` +
          `Item size: ${this.currentTask!.units}u   |   Total free: ${totalFree}u   |   Largest gap: ${maxGap}u\n` +
          `Hint: ${this.currentTask!.hint}`
        );
        this.instructionText.setText('Answer: Can this item fit? YES → click the correct gap in the truck  |  NO → click NO');

        if (canFit) {
          // user must click the correct free gap in the truck
          this.highlightFreeGaps(true);
          this.showNoButton(false, width, height); // show NO as wrong option too
        } else {
          // user must click NO — if they click a gap instead, penalty
          this.highlightFreeGaps(false);
          this.showNoButton(true, width, height);
        }
      },
    });
  }

  private highlightFreeGaps(isCorrectToClick: boolean) {
    // add click zones on each free block
    this.blocks.forEach((b, idx) => {
      if (!b.free || b.units === 0) return;
      b.clickZone?.destroy();
      const cx  = this.getBlockCenterX(idx);
      const bw  = b.units * UNIT_PX - 6;
      const col = isCorrectToClick ? 0x00FFCC : 0xFF3300;

      // visual highlight
      const hl = this.add.graphics().setDepth(11)
        .fillStyle(col, 0.20)
        .fillRect(cx - bw / 2, this.bayY - BAY_HEIGHT / 2 + 2, bw, BAY_HEIGHT - 4)
        .lineStyle(2, col, 0.7)
        .strokeRect(cx - bw / 2, this.bayY - BAY_HEIGHT / 2 + 2, bw, BAY_HEIGHT - 4);

      const zone = this.add.rectangle(cx, this.bayY, bw, BAY_HEIGHT)
        .setDepth(12).setInteractive({ useHandCursor: isCorrectToClick });
      b.clickZone = zone;

      if (isCorrectToClick) {
        zone.on('pointerover', () => hl.setAlpha(1.4));
        zone.on('pointerout',  () => hl.setAlpha(1));
        zone.on('pointerdown', () => {
          // check: does the item fit in this specific gap?
          const fits = b.units >= this.currentTask!.units;
          this.onGapClick(idx, fits, hl);
        });
      } else {
        // clicking gap when item can't fit = wrong
        zone.on('pointerdown', () => this.onGapClick(idx, false, hl));
      }
    });
  }

  private showNoButton(isCorrect: boolean, width: number, height: number) {
    const btn = this.add.text(width * 0.50, height * 0.82, '  ❌  NO — It Cannot Fit  ', {
      fontSize: '16px', color: '#000',
      backgroundColor: isCorrect ? '#FF4444' : '#666666',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setDepth(15).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout',  () => btn.setAlpha(1));
    btn.on('pointerdown', () => {
      btn.disableInteractive();
      this.onNoClick(isCorrect);
    });
    this.answerBtns.push(btn);
  }

  private onGapClick(blockIdx: number, fits: boolean, hl: Phaser.GameObjects.Graphics) {
    if (this.gamePhase !== 'placing') return;
    this.disableAllZones();
    this.clearAnswerBtns();

    if (fits) {
      // correct — place item there
      hl.clear();
      hl.fillStyle(0x00FF88, 0.30).fillRect(
        this.getBlockCenterX(blockIdx) - (this.blocks[blockIdx].units * UNIT_PX) / 2,
        this.bayY - BAY_HEIGHT / 2, this.blocks[blockIdx].units * UNIT_PX, BAY_HEIGHT
      );
      this.score += 20;
      this.correctAnswers++;
      this.questionBox.setText(
        `✅  CORRECT!  The ${this.currentTask!.units}u item fits in this ${this.blocks[blockIdx].units}u gap.\n` +
        `+20 points!`
      );
      this.questionBox.setStyle({ color: '#00FF88' });
      this.updateScoreDisplay(20, true);

      // animate item into gap
      const targetX = this.getBlockCenterX(blockIdx);
      this.tweens.add({
        targets: [this.itemSprite, this.itemLabelObj],
        x: targetX, y: this.bayY, duration: 400, ease: 'Back.easeIn',
        onComplete: () => {
          this.itemSprite?.destroy(); this.itemLabelObj?.destroy();
          this.placeBlockInGap(blockIdx);
          hl.destroy();
          this.time.delayedCall(700, () => {
            this.questionBox.setText('');
            this.nextTask();
          });
        },
      });
    } else {
      // wrong gap (too small or item can't fit at all)
      hl.clear();
      hl.fillStyle(0xFF0000, 0.30).fillRect(
        this.getBlockCenterX(blockIdx) - (this.blocks[blockIdx].units * UNIT_PX) / 2,
        this.bayY - BAY_HEIGHT / 2, this.blocks[blockIdx].units * UNIT_PX, BAY_HEIGHT
      );
      this.score = Math.max(0, this.score - 15);
      this.questionBox.setText(
        `❌  WRONG.  That gap is only ${this.blocks[blockIdx].units}u but item needs ${this.currentTask!.units}u.\n` +
        `−15 points.`
      );
      this.questionBox.setStyle({ color: '#FF6666' });
      this.updateScoreDisplay(-15, false);
      this.time.delayedCall(1400, () => {
        hl.destroy();
        this.questionBox.setText('');
        this.itemSprite?.destroy(); this.itemLabelObj?.destroy();
        this.nextTask();
      });
    }
  }

  private onNoClick(wasCorrect: boolean) {
    this.disableAllZones();
    const totalFree = this.blocks.filter(b => b.free).reduce((s, b) => s + b.units, 0);
    const maxGap    = this.maxContiguousFree();

    if (wasCorrect) {
      this.score += 20;
      this.correctAnswers++;
      this.questionBox.setText(
        `✅  CORRECT!  Item needs ${this.currentTask!.units}u.\n` +
        `Total free: ${totalFree}u  but largest gap is only ${maxGap}u.\n` +
        `Free space is fragmented — item CANNOT fit!  +20 points!`
      );
      this.questionBox.setStyle({ color: '#00FF88' });
      this.updateScoreDisplay(20, true);

      // system halted visual
      this.cameras.main.shake(300, 0.015);
      const smoke = this.add.sprite(this.bayStartX + TOTAL_UNITS * UNIT_PX / 2, this.bayY - 80, 'conveyor-smoke')
        .setScale(0.26).setDepth(14).setAlpha(0);
      this.tweens.add({ targets: smoke, alpha: 0.8, duration: 200, yoyo: true, repeat: 2, onComplete: () => smoke.destroy() });
    } else {
      this.score = Math.max(0, this.score - 15);
      this.questionBox.setText(
        `❌  WRONG!  The item actually CAN fit.\n` +
        `Largest gap is ${maxGap}u which is ≥ ${this.currentTask!.units}u.\n` +
        `−15 points.`
      );
      this.questionBox.setStyle({ color: '#FF6666' });
      this.updateScoreDisplay(-15, false);
    }

    this.time.delayedCall(1600, () => {
      this.questionBox.setText('');
      this.itemSprite?.destroy(); this.itemLabelObj?.destroy();
      this.nextTask();
    });
  }

  private placeBlockInGap(idx: number) {
    const task = this.currentTask!;
    const free = this.blocks[idx];
    const nb: MemBlock = { id: task.id, units: task.units, spriteKey: task.spriteKey, label: task.label, free: false };
    const rem = free.units - task.units;
    const spliced: MemBlock[] = [nb];
    if (rem > 0) spliced.push({ id: `fr_${task.id}`, units: rem, spriteKey: '', label: '', free: true });
    this.blocks.splice(idx, 1, ...spliced);
    this.renderBlocks(true);
    this.updateWasteMeter();
    this.updateMemStats();
  }

  private disableAllZones() {
    this.blocks.forEach(b => {
      b.clickZone?.disableInteractive();
      b.clickZone?.destroy();
      b.clickZone = undefined;
    });
  }

  private clearAnswerBtns() {
    this.answerBtns.forEach(b => b.destroy());
    this.answerBtns = [];
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  private renderBlocks(animate = false) {
    let curX = this.bayStartX;
    this.blocks.forEach(b => {
      b.wrapSprite?.destroy(); b.itemSprite?.destroy();
      b.labelTxt?.destroy();   b.freeTxt?.destroy();
      b.peanutsSprite?.destroy();

      const cx = curX + (b.units * UNIT_PX) / 2;
      const bw = b.units * UNIT_PX - 5;

      if (!b.free) {
        b.wrapSprite = this.add.sprite(cx, this.bayY, 'shrink-wrap')
          .setDisplaySize(bw, BAY_HEIGHT - 6).setDepth(3);
        b.itemSprite = this.add.sprite(cx, this.bayY - 14, b.spriteKey)
          .setScale(0.075).setDepth(4);
        b.labelTxt = this.add.text(cx, this.bayY + BAY_HEIGHT / 2 - 10, b.label, {
          fontSize: '10px', color: '#00FFCC',
          backgroundColor: '#000000AA', padding: { x: 3, y: 2 }, align: 'center',
        }).setOrigin(0.5).setDepth(5);
        if (animate) {
          b.wrapSprite.setAlpha(0); b.itemSprite.setAlpha(0); b.labelTxt.setAlpha(0);
          this.tweens.add({ targets: [b.wrapSprite, b.itemSprite, b.labelTxt], alpha: 1, duration: 300 });
        }
      } else if (b.units > 0) {
        b.peanutsSprite = this.add.sprite(cx, this.bayY, 'scattered-peanuts')
          .setDisplaySize(bw, BAY_HEIGHT - 22).setDepth(3).setAlpha(0.55);
        b.freeTxt = this.add.text(cx, this.bayY + BAY_HEIGHT / 2 - 10, `FREE\n${b.units}u`, {
          fontSize: '10px', color: '#FF6666', fontStyle: 'bold',
          backgroundColor: '#000000AA', padding: { x: 3, y: 2 }, align: 'center',
        }).setOrigin(0.5).setDepth(5);
      }
      curX += b.units * UNIT_PX;
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getBlockCenterX(idx: number): number {
    let x = this.bayStartX;
    for (let i = 0; i < idx; i++) x += this.blocks[i].units * UNIT_PX;
    return x + (this.blocks[idx].units * UNIT_PX) / 2;
  }

  private maxContiguousFree(): number {
    let max = 0, cur = 0;
    this.blocks.forEach(b => { if (b.free) { cur += b.units; max = Math.max(max, cur); } else cur = 0; });
    return max;
  }

  private updateWasteMeter() {
    this.wasteFill.clear();
    const { width, height } = this.cameras.main;
    const tf  = this.blocks.filter(b => b.free).reduce((s, b) => s + b.units, 0);
    const mg  = this.maxContiguousFree();
    const pct = tf > 0 ? (tf - mg) / tf : 0;
    const bx = width - 66; const by = height * 0.22;
    const bh = 126; const fh = pct * bh;
    const col = pct < 0.35 ? 0x00FF44 : pct < 0.65 ? 0xFFCC00 : 0xFF3300;
    this.wasteFill.fillStyle(col, 0.88).fillRect(bx, by + bh - fh, 26, fh);
  }

  private updateMemStats() {
    const tf = this.blocks.filter(b => b.free).reduce((s, b) => s + b.units, 0);
    const mg = this.maxContiguousFree();
    this.memStatsText.setText(`Free: ${tf}u\nLargest: ${mg}u`);
  }

  private updateScoreDisplay(delta: number, correct: boolean) {
    this.scoreText.setText(`Score: ${this.score}`);
    this.scoreText.setColor(correct ? '#00FF88' : '#FF4444');
    this.time.delayedCall(600, () => this.scoreText.setColor('#00FF88'));
    const { width, height } = this.cameras.main;
    const ft = this.add.text(width - 52, height * 0.18,
      delta > 0 ? `+${delta}` : `${delta}`, {
        fontSize: '20px', fontStyle: 'bold',
        color: correct ? '#00FF88' : '#FF4444',
      }
    ).setOrigin(0.5).setDepth(22);
    this.tweens.add({ targets: ft, y: ft.y - 44, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
  }

  // ── Results ────────────────────────────────────────────────────────────────

  private showResults() {
    this.gamePhase = 'results';
    const { width, height } = this.cameras.main;
    const grade =
      this.score >= 130 ? { text: 'EXPERT  🏆',        color: '#FFD700' } :
      this.score >= 100 ? { text: 'PROFICIENT  👏',     color: '#00FF88' } :
      this.score >= 70  ? { text: 'LEARNING  📚',       color: '#FFD700' } :
                          { text: 'NEEDS REVISION  ⚠', color: '#FF6666' };

    this.add.graphics().fillStyle(0x000000, 0.88).fillRect(0, 0, width, height).setDepth(28);
    const card = this.add.graphics().setDepth(29);
    card.fillStyle(0x0a1a0a, 0.97)
      .fillRoundedRect(width * 0.15, height * 0.10, width * 0.70, height * 0.80, 14)
      .lineStyle(3, 0xFF6666, 0.9)
      .strokeRoundedRect(width * 0.15, height * 0.10, width * 0.70, height * 0.80, 14);

    this.add.text(width / 2, height * 0.19, '🚁  Level 2 Complete!', {
      fontSize: '24px', color: '#FF6666', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.add.graphics().setDepth(29)
      .fillStyle(0x1a0000, 0.85)
      .fillRoundedRect(width * 0.22, height * 0.27, width * 0.56, height * 0.30, 8);

    this.add.text(width / 2, height * 0.42,
      `Final Score:         ${this.score}\n` +
      `Correct Answers:     ${this.correctAnswers} / ${PLACEMENT_TASKS.length}\n` +
      `Max Possible Score:  ${100 + PLACEMENT_TASKS.length * 20}`,
      { fontSize: '14px', color: '#FFFFFF', align: 'left', fontFamily: 'monospace', lineSpacing: 6 }
    ).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height * 0.60, grade.text, {
      fontSize: '22px', color: grade.color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height * 0.69,
      `KEY LESSON: Scattered free gaps = External Fragmentation.\n` +
      `Total free ≥ item size is NOT enough.\n` +
      `One CONTIGUOUS gap must be ≥ item size.`,
      { fontSize: '12px', color: '#B0B0B0', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5).setDepth(31);

    this.add.text(width * 0.36, height * 0.80, '  RETRY  ', {
      fontSize: '16px', color: '#000', backgroundColor: '#FFD700', padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31)
      .on('pointerdown', () => this.scene.restart());

    this.add.text(width * 0.64, height * 0.80, '  NEXT LEVEL ▶  ', {
      fontSize: '16px', color: '#000', backgroundColor: '#00FF88', padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31)
      .on('pointerdown', () => this.scene.start('FragL3Scene'));

    this.add.text(140, height - 36, '💬 Chat with AI', {
      fontSize: '16px',
      color: '#FFFFFF',
      backgroundColor: '#4CAF50',
      padding: { x: 12, y: 8 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(31).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        openAIFeedbackChat({
          gameType: this.scene.key,
          score: this.score,
          phase: this.gamePhase,
          correctAnswers: this.correctAnswers,
          totalQuestions: PLACEMENT_TASKS.length
        });
      });
  }
}