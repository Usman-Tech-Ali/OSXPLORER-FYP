import Phaser from 'phaser';
import { openAIFeedbackChat } from '../../shared/aiFeedbackChat';

const ASSET_PATH = '/games/memory-management/Fragmentation_Compaction/';

const SLOT_COUNT = 5;
const SLOT_W     = 96;
const SLOT_H     = 110;
const SLOT_UNITS = 3; // every fixed partition = 3 units

type ItemType = 'scanner' | 'pc' | 'server';

interface ItemConfig {
  type: ItemType;
  label: string;
  spriteKey: string;
  units: number;
  color: string;
  description: string;
}

interface Slot {
  index: number;
  x: number;
  y: number;
  occupied: boolean;
  units?: number;
  boxSprite?: Phaser.GameObjects.Sprite;
  itemSprite?: Phaser.GameObjects.Sprite;
  peanutsSprite?: Phaser.GameObjects.Sprite;
  wasteLabelObj?: Phaser.GameObjects.Text;
}

const ITEMS: ItemConfig[] = [
  { type: 'scanner', label: 'RFID Scanner', spriteKey: 'item-scanner', units: 1, color: '#FF6666',
    description: 'Tiny device — only 1 unit' },
  { type: 'server',  label: 'Server Rack',  spriteKey: 'item-server',  units: 3, color: '#00FF88',
    description: 'Large rack — fills 3 units' },
  { type: 'pc',      label: 'PC Tower',     spriteKey: 'item-pc',      units: 2, color: '#FFD700',
    description: 'Mid-size PC — 2 units' },
  { type: 'scanner', label: 'RFID Scanner', spriteKey: 'item-scanner', units: 1, color: '#FF6666',
    description: 'Tiny device — only 1 unit' },
  { type: 'pc',      label: 'PC Tower',     spriteKey: 'item-pc',      units: 2, color: '#FFD700',
    description: 'Mid-size PC — 2 units' },
];

export class FragL1Scene extends Phaser.Scene {
  private gamePhase: 'intro' | 'predict' | 'confirm' | 'results' = 'intro';

  private slots: Slot[] = [];
  private bayLeft = 0;
  private bayY    = 0;

  private itemIndex     = 0;
  private currentItem: ItemConfig | null = null;

  // player's prediction (waste guess)
  private playerGuess   = -1;
  private correctWaste  = 0;

  // scoring
  private score         = 100;
  private correctGuesses = 0;
  private totalItems    = ITEMS.length;

  // conveyor
  private conveyorBelt!:  Phaser.GameObjects.Sprite;
  private itemSpriteObj?: Phaser.GameObjects.Sprite;
  private itemLabelObj?:  Phaser.GameObjects.Text;

  // waste tracking
  private totalWaste = 0;
  private totalCap   = 0;
  private wasteFill!: Phaser.GameObjects.Graphics;

  // HUD
  private infoBox!:         Phaser.GameObjects.Text;
  private questionBox!:     Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private scoreText!:       Phaser.GameObjects.Text;
  private progressText!:    Phaser.GameObjects.Text;

  // prediction buttons
  private predBtns: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: 'FragL1Scene' }); }

  preload() {
    const p = ASSET_PATH;
    this.load.image('warehouse-bg',      `${p}Warehouse-Background.png`);
    this.load.image('truck',             `${p}Truck.png`);
    this.load.image('conveyor-belt',     `${p}Conveyer-Belt.png`);
    this.load.image('box-large',         `${p}Large-Box.png`);
    this.load.image('item-scanner',      `${p}Item-1.png`);
    this.load.image('item-pc',           `${p}Item-2.png`);
    this.load.image('item-server',       `${p}Item-3.png`);
    this.load.image('scattered-peanuts', `${p}Scattered-Peanuts.png`);
    this.load.image('waste-meter',       `${p}Waste-Meter.png`);
  }

  create() {
    const { width, height } = this.cameras.main;

    const totalBayW = SLOT_COUNT * SLOT_W;
    this.bayLeft    = (width - totalBayW) / 2 + SLOT_W / 2;
    this.bayY       = height * 0.40;

    // background
    const bg = this.add.image(width / 2, height / 2, 'warehouse-bg');
    bg.setScale(Math.max(width / bg.width, height / bg.height)).setDepth(-10);
    this.add.graphics().fillStyle(0x000000, 0.40).fillRect(0, 0, width, height).setDepth(-9);

    // truck behind slots
    this.add.sprite(width / 2, this.bayY + 8, 'truck')
      .setDisplaySize(totalBayW + 60, SLOT_H + 80)
      .setDepth(0).setAlpha(0.45);

    // bay panel
    const px = this.bayLeft - SLOT_W / 2 - 14;
    const pw = totalBayW + 28;
    const ph = SLOT_H + 52;
    const py = this.bayY - SLOT_H / 2 - 18;
    this.add.graphics().setDepth(1)
      .fillStyle(0x001a00, 0.90).fillRoundedRect(px, py, pw, ph, 10)
      .lineStyle(2, 0xFFD700, 0.55).strokeRoundedRect(px, py, pw, ph, 10);

    this.add.text(width / 2, py - 16,
      '📦  TRUCK CARGO BAY  —  Fixed Partitions  (each slot = 3 units)', {
        fontSize: '13px', color: '#FFD700', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 10, y: 4 },
      }
    ).setOrigin(0.5).setDepth(3);

    // slots
    const slotG = this.add.graphics().setDepth(2);
    this.slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const cx = this.bayLeft + i * SLOT_W;
      slotG.lineStyle(2, 0xFFD700, 0.50)
        .strokeRect(cx - SLOT_W / 2 + 3, this.bayY - SLOT_H / 2, SLOT_W - 6, SLOT_H);
      this.add.text(cx, this.bayY - SLOT_H / 2 + 11, `S${i + 1}`, {
        fontSize: '11px', color: '#FFD700',
        backgroundColor: '#00000088', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(3);
      this.add.text(cx, this.bayY + SLOT_H / 2 - 10, '3u', {
        fontSize: '9px', color: '#555555',
      }).setOrigin(0.5).setDepth(3);
      this.slots.push({ index: i, x: cx, y: this.bayY, occupied: false });
    }

    // conveyor belt
    const beltY = height * 0.73;
    this.conveyorBelt = this.add.sprite(width / 2, beltY, 'conveyor-belt')
      .setDisplaySize(width * 0.80, 56).setDepth(2);
    this.tweens.add({
      targets: this.conveyorBelt, x: this.conveyorBelt.x - 4,
      yoyo: true, repeat: -1, duration: 200,
    });

    // waste meter
    const meterX = width - 52;
    this.add.sprite(meterX, height * 0.38, 'waste-meter').setScale(0.21).setDepth(8);
    this.wasteFill = this.add.graphics().setDepth(9);
    this.add.text(meterX, height * 0.60, 'WASTE', {
      fontSize: '10px', color: '#FFD700', fontStyle: 'bold',
      backgroundColor: '#000000AA', padding: { x: 3, y: 2 },
    }).setOrigin(0.5).setDepth(10);

    // HUD
    this.add.text(width / 2, 22,
      'Level 1  —  Fixed Partitions  |  Internal Fragmentation', {
        fontSize: '15px', color: '#FFD700', fontStyle: 'bold',
        backgroundColor: '#000000CC', padding: { x: 12, y: 5 },
      }
    ).setOrigin(0.5).setDepth(20);

    this.scoreText = this.add.text(meterX, 22, 'Score: 100', {
      fontSize: '15px', color: '#00FF88', fontStyle: 'bold',
      backgroundColor: '#000000CC', padding: { x: 8, y: 5 },
    }).setOrigin(0.5, 0).setDepth(20);

    this.progressText = this.add.text(16, 22, '', {
      fontSize: '13px', color: '#888888',
      backgroundColor: '#000000AA', padding: { x: 8, y: 4 },
    }).setOrigin(0, 0).setDepth(20);

    // item info box (top-centre, below title)
    this.infoBox = this.add.text(width / 2, 58, '', {
      fontSize: '14px', color: '#FFFFFF',
      backgroundColor: '#0a1a0aEE', padding: { x: 16, y: 8 },
      align: 'center', wordWrap: { width: width * 0.55 },
    }).setOrigin(0.5).setDepth(20);

    // question box (mid-screen, above belt)
    this.questionBox = this.add.text(width / 2, height * 0.60, '', {
      fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold',
      backgroundColor: '#1a0a00EE', padding: { x: 20, y: 12 },
      align: 'center', wordWrap: { width: width * 0.55 },
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
      .lineStyle(3, 0xFFD700, 0.9)
      .strokeRoundedRect(w * 0.12, h * 0.08, w * 0.76, h * 0.84, 16);

    this.add.text(w / 2, h * 0.17, '📦  Level 1: Fixed Partitions', {
      fontSize: '24px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(32);

    this.add.text(w / 2, h * 0.24, 'Topic: Internal Fragmentation', {
      fontSize: '15px', color: '#FF6666',
    }).setOrigin(0.5).setDepth(32);

    // concept
    const cg = this.add.graphics().setDepth(31);
    cg.fillStyle(0x1a1a00, 0.90)
      .fillRoundedRect(w * 0.17, h * 0.29, w * 0.66, h * 0.25, 8);
    this.add.text(w / 2, h * 0.415,
      '🧠  Each slot in this truck is a FIXED 3-unit partition.\n' +
      'Every item — no matter how small — uses one full slot.\n' +
      'The leftover space inside the slot is WASTED.\n' +
      'This wasted space = INTERNAL FRAGMENTATION.',
      { fontSize: '13px', color: '#E0E0E0', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5).setDepth(32);

    // how to play
    const hg = this.add.graphics().setDepth(31);
    hg.fillStyle(0x001a1a, 0.90)
      .fillRoundedRect(w * 0.17, h * 0.56, w * 0.66, h * 0.24, 8);
    this.add.text(w / 2, h * 0.68,
      '🎮  HOW TO PLAY  (this is where you score points)\n\n' +
      '1. An item arrives on the belt — you see its size.\n' +
      '2. YOU MUST PREDICT: "How many units will be WASTED?"\n' +
      '3. Pick 0, 1, or 2. Correct prediction = +20 pts.\n' +
      '4. Wrong prediction = −15 pts. Then the item loads.',
      { fontSize: '13px', color: '#00FFCC', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5).setDepth(32);

    const btn = this.add.text(w / 2, h * 0.855, '  START  ▶', {
      fontSize: '20px', color: '#000', backgroundColor: '#FFD700',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(32);
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#FFA500' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#FFD700' }));
    btn.on('pointerdown', () => {
      [ov, card, cg, hg, btn].forEach((o) => o.destroy());
      this.children.list
        .filter((c) => {
          const depth = (c as any).depth as number | undefined;
          return depth === 31 || depth === 32;
        })
        .forEach((c) => c.destroy());
      this.gamePhase = 'predict';
      this.spawnNextItem();
    });
  }

  // ── Spawn item onto belt ───────────────────────────────────────────────────

  private spawnNextItem() {
    if (this.itemIndex >= ITEMS.length) {
      this.time.delayedCall(600, () => this.showResults());
      return;
    }

    this.currentItem  = ITEMS[this.itemIndex];
    this.itemIndex++;
    this.playerGuess  = -1;
    this.correctWaste = SLOT_UNITS - this.currentItem.units;

    this.progressText.setText(`Item ${this.itemIndex} / ${ITEMS.length}`);

    const { width, height } = this.cameras.main;
    const beltY = height * 0.73;

    this.itemSpriteObj?.destroy();
    this.itemLabelObj?.destroy();
    this.clearPredBtns();

    // spawn off screen right
    this.itemSpriteObj = this.add.sprite(width + 130, beltY - 18, this.currentItem.spriteKey)
      .setScale(0.12).setDepth(6);
    this.itemLabelObj = this.add.text(width + 130, beltY + 22, '', {
      fontSize: '13px', color: this.currentItem.color, fontStyle: 'bold',
      backgroundColor: '#000000CC', padding: { x: 6, y: 3 }, align: 'center',
    }).setOrigin(0.5).setDepth(6);

    this.tweens.add({
      targets: [this.itemSpriteObj, this.itemLabelObj],
      x: width * 0.50, duration: 700, ease: 'Power2',
      onComplete: () => {
        if (!this.currentItem) return;
        this.itemLabelObj?.setText(
          `${this.currentItem.label}\n${this.currentItem.description}`
        );
        this.infoBox.setText(
          `📦  ${this.currentItem.label}  (${this.currentItem.units} units)\n` +
          `Each slot = 3 units fixed.`
        );
        this.showPredictionQuestion();
      },
    });
  }

  // ── Show prediction question ───────────────────────────────────────────────

  private showPredictionQuestion() {
    if (!this.currentItem) return;
    const { width, height } = this.cameras.main;

    this.gamePhase = 'predict';
    this.questionBox.setText(
      `❓  ${this.currentItem.label} is ${this.currentItem.units}u.\n` +
      `Slot size = 3u.   How many units will be WASTED?`
    );

    this.instructionText.setText('Click your answer below — think before you click!');

    // answer buttons: 0, 1, 2
    const options  = [0, 1, 2];
    const btnY     = height * 0.72;
    const spacing  = 130;
    const startX   = width / 2 - spacing;

    this.clearPredBtns();
    options.forEach((val, i) => {
      const bx = startX + i * spacing;
      const btn = this.add.text(bx, btnY, `  ${val} unit${val !== 1 ? 's' : ''} wasted  `, {
        fontSize: '16px', color: '#000',
        backgroundColor: '#AAAAAA',
        padding: { x: 14, y: 10 },
      }).setOrigin(0.5).setDepth(15).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#CCCCCC' }));
      btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#AAAAAA' }));
      btn.on('pointerdown', () => this.onPrediction(val));
      this.predBtns.push(btn);
    });
  }

  // ── Handle prediction answer ───────────────────────────────────────────────

  private onPrediction(guess: number) {
    if (this.gamePhase !== 'predict' || !this.currentItem) return;
    this.gamePhase = 'confirm';
    this.playerGuess = guess;
    const correct = guess === this.correctWaste;

    // colour the buttons: green = correct, red = wrong
    this.predBtns.forEach(btn => {
      const val = parseInt(btn.text.trim().split(' ')[0]);
      if (val === this.correctWaste) {
        btn.setStyle({ backgroundColor: '#00AA44', color: '#FFFFFF' });
      } else if (val === guess && !correct) {
        btn.setStyle({ backgroundColor: '#AA0000', color: '#FFFFFF' });
      }
      btn.disableInteractive();
    });

    if (correct) {
      this.score += 20;
      this.correctGuesses++;
      this.questionBox.setText(
        `✅  CORRECT!  ${this.currentItem.label} (${this.currentItem.units}u) in a 3u slot\n` +
        `wastes exactly ${this.correctWaste} unit${this.correctWaste !== 1 ? 's' : ''}.\n` +
        `+20 points!`
      );
      this.questionBox.setStyle({ color: '#00FF88' });
    } else {
      this.score = Math.max(0, this.score - 15);
      this.questionBox.setText(
        `❌  WRONG.  You said ${guess}u — correct answer is ${this.correctWaste}u.\n` +
        `${this.currentItem.label} is ${this.currentItem.units}u in a 3u slot → ${this.correctWaste}u wasted.\n` +
        `−15 points.`
      );
      this.questionBox.setStyle({ color: '#FF6666' });
    }

    this.updateScoreDisplay(correct ? 20 : -15, correct);

    // after feedback, load item into slot
    this.time.delayedCall(1400, () => {
      this.clearPredBtns();
      this.questionBox.setText('');
      this.loadItemIntoSlot();
    });
  }

  // ── Load item into next free slot ──────────────────────────────────────────

  private loadItemIntoSlot() {
    if (!this.currentItem) return;
    const freeSlot = this.slots.find(s => !s.occupied);
    if (!freeSlot) { this.spawnNextItem(); return; }

    const item = this.currentItem;
    this.currentItem = null;

    this.tweens.add({
      targets: [this.itemSpriteObj, this.itemLabelObj],
      x: freeSlot.x, y: freeSlot.y,
      duration: 420, ease: 'Back.easeIn',
      onComplete: () => {
        this.itemSpriteObj?.destroy();
        this.itemLabelObj?.destroy();
        this.placeInSlot(freeSlot, item);
      },
    });
  }

  private placeInSlot(slot: Slot, item: ItemConfig) {
    slot.occupied = true;
    slot.units    = item.units;
    const waste   = SLOT_UNITS - item.units;

    slot.boxSprite = this.add.sprite(slot.x, slot.y, 'box-large')
      .setDisplaySize(SLOT_W - 8, SLOT_H - 8).setDepth(3);

    const itemY = waste > 0 ? slot.y - SLOT_H * 0.15 : slot.y;
    slot.itemSprite = this.add.sprite(slot.x, itemY, item.spriteKey)
      .setScale(0.07).setDepth(4);

    if (waste > 0) {
      const ph = Math.round((waste / SLOT_UNITS) * (SLOT_H - 18));
      const py = slot.y + SLOT_H / 2 - ph / 2 - 6;
      slot.peanutsSprite = this.add.sprite(slot.x, py, 'scattered-peanuts')
        .setDisplaySize(SLOT_W - 16, ph).setDepth(4).setAlpha(0);
      this.tweens.add({ targets: slot.peanutsSprite, alpha: 0.90, duration: 350 });
      slot.wasteLabelObj = this.add.text(slot.x, slot.y + SLOT_H / 2 + 9,
        `${waste}u wasted`, {
          fontSize: '10px', color: '#FF6666', fontStyle: 'bold',
          backgroundColor: '#000000BB', padding: { x: 3, y: 2 },
        }
      ).setOrigin(0.5).setDepth(5);
    } else {
      const flash = this.add.graphics().setDepth(4)
        .fillStyle(0x00FF88, 0.30)
        .fillRect(slot.x - SLOT_W / 2 + 3, slot.y - SLOT_H / 2, SLOT_W - 6, SLOT_H);
      this.tweens.add({ targets: flash, alpha: 0, duration: 700, onComplete: () => flash.destroy() });
      slot.wasteLabelObj = this.add.text(slot.x, slot.y + SLOT_H / 2 + 9, '✓ PERFECT', {
        fontSize: '10px', color: '#00FF88', fontStyle: 'bold',
        backgroundColor: '#000000BB', padding: { x: 3, y: 2 },
      }).setOrigin(0.5).setDepth(5);
    }

    this.totalWaste += waste;
    this.totalCap   += SLOT_UNITS;
    this.updateWasteMeter();

    this.infoBox.setText(
      `Slot S${slot.index + 1}: ${item.label} (${item.units}u)  →  ${waste}u wasted  |  Score: ${this.score}`
    );

    this.time.delayedCall(500, () => this.spawnNextItem());
  }

  // ── Waste meter ────────────────────────────────────────────────────────────

  private updateWasteMeter() {
    this.wasteFill.clear();
    const { width, height } = this.cameras.main;
    const pct = this.totalCap > 0 ? this.totalWaste / this.totalCap : 0;
    const bx = width - 66; const by = height * 0.22;
    const bw = 26;         const bh = 126;
    const fh = pct * bh;
    const col = pct < 0.35 ? 0x00FF44 : pct < 0.65 ? 0xFFCC00 : 0xFF3300;
    this.wasteFill.fillStyle(col, 0.88).fillRect(bx, by + bh - fh, bw, fh);
  }

  // ── Score display ──────────────────────────────────────────────────────────

  private updateScoreDisplay(delta: number, correct: boolean) {
    this.scoreText.setText(`Score: ${this.score}`);
    this.scoreText.setColor(correct ? '#00FF88' : '#FF4444');
    this.time.delayedCall(600, () => this.scoreText.setColor('#00FF88'));

    const { width, height } = this.cameras.main;
    const ft = this.add.text(
      width - 52, height * 0.18,
      delta > 0 ? `+${delta}` : `${delta}`, {
        fontSize: '20px', fontStyle: 'bold',
        color: correct ? '#00FF88' : '#FF4444',
      }
    ).setOrigin(0.5).setDepth(22);
    this.tweens.add({
      targets: ft, y: ft.y - 44, alpha: 0, duration: 900,
      onComplete: () => ft.destroy(),
    });
  }

  private clearPredBtns() {
    this.predBtns.forEach(b => b.destroy());
    this.predBtns = [];
  }

  // ── Results ────────────────────────────────────────────────────────────────

  private showResults() {
    this.gamePhase = 'results';
    const { width, height } = this.cameras.main;
    const wastePct = Math.round((this.totalWaste / this.totalCap) * 100);

    const grade =
      this.score >= 160 ? { text: 'EXPERT  🏆',          color: '#FFD700' } :
      this.score >= 120 ? { text: 'PROFICIENT  👏',       color: '#00FF88' } :
      this.score >= 80  ? { text: 'LEARNING  📚',         color: '#FFD700' } :
                          { text: 'NEEDS REVISION  ⚠',   color: '#FF6666' };

    this.add.graphics()
      .fillStyle(0x000000, 0.88).fillRect(0, 0, width, height).setDepth(28);
    const card = this.add.graphics().setDepth(29);
    card.fillStyle(0x0a1a0a, 0.97)
      .fillRoundedRect(width * 0.15, height * 0.10, width * 0.70, height * 0.80, 14)
      .lineStyle(3, 0xFFD700, 0.9)
      .strokeRoundedRect(width * 0.15, height * 0.10, width * 0.70, height * 0.80, 14);

    this.add.text(width / 2, height * 0.19, '📦  Level 1 Complete!', {
      fontSize: '24px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.add.graphics().setDepth(29)
      .fillStyle(0x1a1a00, 0.85)
      .fillRoundedRect(width * 0.22, height * 0.27, width * 0.56, height * 0.32, 8);

    this.add.text(width / 2, height * 0.43,
      `Final Score:         ${this.score}\n` +
      `Correct Predictions: ${this.correctGuesses} / ${this.totalItems}\n` +
      `Total Items Placed:  ${this.totalItems}\n` +
      `Wasted Units:        ${this.totalWaste} / ${this.totalCap}  (${wastePct}%)\n` +
      `Max Possible Score:  ${100 + this.totalItems * 20}`,
      {
        fontSize: '14px', color: '#FFFFFF', align: 'left',
        fontFamily: 'monospace', lineSpacing: 6,
      }
    ).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height * 0.64, grade.text, {
      fontSize: '22px', color: grade.color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height * 0.73,
      `KEY LESSON: Fixed partitions always waste space\n` +
      `when processes are smaller than the partition size.\n` +
      `Slot 3u + Item 1u = 2u wasted every time.`,
      { fontSize: '12px', color: '#B0B0B0', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5).setDepth(31);

    this.add.text(width * 0.36, height * 0.83, '  RETRY  ', {
      fontSize: '16px', color: '#000', backgroundColor: '#FFD700',
      padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31)
      .on('pointerdown', () => this.scene.restart());

    this.add.text(width * 0.64, height * 0.83, '  NEXT LEVEL ▶  ', {
      fontSize: '16px', color: '#000', backgroundColor: '#00FF88',
      padding: { x: 18, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31)
      .on('pointerdown', () => this.scene.start('FragL2Scene'));

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
          correctAnswers: this.correctGuesses,
          totalItems: this.totalItems,
          totalWaste: this.totalWaste,
          totalCapacity: this.totalCap
        });
      });
  }
}