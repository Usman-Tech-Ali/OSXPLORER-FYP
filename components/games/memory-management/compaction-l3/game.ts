import Phaser from 'phaser';

const ASSET_PATH = '/games/memory-management/Fragmentation_Compaction/';

const BAY_HEIGHT  = 100;
const UNIT_PX     = 72;
const TOTAL_UNITS = 10;
const FREEZE_MS   = 3000;
const MAX_QUEUE   = 5;

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
}

const PROCESS_POOL = [
  { id: 'P1', units: 2, spriteKey: 'item-scanner', label: 'Scanner (2u)' },
  { id: 'P2', units: 1, spriteKey: 'item-pc',      label: 'PC (1u)'      },
  { id: 'P3', units: 3, spriteKey: 'item-server',  label: 'Server (3u)'  },
  { id: 'P4', units: 2, spriteKey: 'item-scanner', label: 'Scanner (2u)' },
  { id: 'P5', units: 4, spriteKey: 'item-server',  label: 'SERVER (4u)'  },
  { id: 'P6', units: 1, spriteKey: 'item-pc',      label: 'PC (1u)'      },
  { id: 'P7', units: 3, spriteKey: 'item-scanner', label: 'Scanner (3u)' },
  { id: 'P8', units: 2, spriteKey: 'item-server',  label: 'Server (2u)'  },
];

// quiz questions asked mid-game when compaction is needed
interface QuizQ {
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQ[] = [
  {
    question: 'The new item cannot fit. What is the CPU cost of compacting?',
    options: ['Zero — it\'s instant', 'High — halts all processes while shifting memory', 'Low — only touches free blocks'],
    correctIdx: 1,
    explanation: 'Compaction halts the CPU to physically move all blocks to one side. This is expensive.',
  },
  {
    question: 'Memory has 4u free in 3 separate gaps. Item needs 3u. Should you compact?',
    options: ['No — 4u total is enough, just pick any gap', 'Yes — only if the largest gap < 3u', 'Yes — always compact to be safe'],
    correctIdx: 1,
    explanation: 'Only compact when the largest single gap < item size. If any gap ≥ 3u exists, no compaction needed.',
  },
];

type Phase = 'intro' | 'playing' | 'quiz' | 'gameover' | 'win';

export class FragL3Scene extends Phaser.Scene {
  private gamePhase: Phase = 'intro';

  private blocks: MemBlock[] = [];
  private bayStartX = 0;
  private bayY      = 0;

  private score          = 100;
  private compactions    = 0;
  private delivered      = 0;
  private quizAsked      = 0;
  private correctQuizzes = 0;
  private beltFrozen     = false;
  private poolIndex      = 0;

  private conveyorQueue: typeof PROCESS_POOL = [];
  private queueSprites: Array<{ spr: Phaser.GameObjects.Sprite; txt: Phaser.GameObjects.Text }> = [];

  private conveyorBelt!:   Phaser.GameObjects.Sprite;
  private hydraulicWall!:  Phaser.GameObjects.Sprite;
  private droneSprite!:    Phaser.GameObjects.Sprite;
  private compactBtnSpr!:  Phaser.GameObjects.Sprite;
  private haltSign!:       Phaser.GameObjects.Sprite;
  private wasteFill!:      Phaser.GameObjects.Graphics;
  private freezeBarFill!:  Phaser.GameObjects.Graphics;

  private spawnTimer?: Phaser.Time.TimerEvent;

  private infoBox!:         Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private scoreText!:       Phaser.GameObjects.Text;
  private queueText!:       Phaser.GameObjects.Text;
  private memStatsText!:    Phaser.GameObjects.Text;
  private freezeTimerText!: Phaser.GameObjects.Text;

  // active quiz
  private quizBtns: Phaser.GameObjects.Text[] = [];
  private pendingProcessAfterQuiz: typeof PROCESS_POOL[0] | null = null;
  private currentQuizIdx = 0;

  constructor() { super({ key: 'FragL3Scene' }); }

  preload() {
    const p = ASSET_PATH;
    this.load.image('warehouse-bg',      `${p}Warehouse-Background.png`);
    this.load.image('truck',             `${p}Truck.png`);
    this.load.image('conveyor-belt',     `${p}Conveyer-Belt.png`);
    this.load.image('conveyor-smoke',    `${p}Conveyor-Smoke.png`);
    this.load.image('shrink-wrap',       `${p}Shrink-Wrap.png`);
    this.load.image('drone',             `${p}Drone.png`);
    this.load.image('hydraulic-wall',    `${p}Hydraulic-Wall.png`);
    this.load.image('compact-btn',       `${p}Compact-Button.png`);
    this.load.image('scattered-peanuts', `${p}Scattered-Peanuts.png`);
    this.load.image('waste-meter',       `${p}Waste-Meter.png`);
    this.load.image('system-halted',     `${p}System-Halted-Sign.png`);
    this.load.image('item-scanner',      `${p}Item-1.png`);
    this.load.image('item-pc',           `${p}Item-2.png`);
    this.load.image('item-server',       `${p}Item-3.png`);
  }

  create() {
    const { width, height } = this.cameras.main;
    this.bayStartX = (width - TOTAL_UNITS * UNIT_PX) / 2;
    this.bayY      = height * 0.40;

    // bg
    const bg = this.add.image(width / 2, height / 2, 'warehouse-bg');
    bg.setScale(Math.max(width / bg.width, height / bg.height)).setDepth(-10);
    this.add.graphics().fillStyle(0x000000, 0.40).fillRect(0, 0, width, height).setDepth(-9);

    // truck
    this.add.sprite(width / 2, this.bayY + 10, 'truck')
      .setDisplaySize(TOTAL_UNITS * UNIT_PX + 60, BAY_HEIGHT + 80)
      .setDepth(0).setAlpha(0.48);

    // bay panel
    const px = this.bayStartX - 14;
    const pw = TOTAL_UNITS * UNIT_PX + 28;
    const ph = BAY_HEIGHT + 54;
    const py = this.bayY - BAY_HEIGHT / 2 - 20;
    this.add.graphics().setDepth(1)
      .fillStyle(0x001a00, 0.90).fillRoundedRect(px, py, pw, ph, 10)
      .lineStyle(2, 0x00FFCC, 0.55).strokeRoundedRect(px, py, pw, ph, 10);

    const g = this.add.graphics().setDepth(2);
    g.lineStyle(2, 0x00FFCC, 0.55)
      .strokeRect(this.bayStartX, this.bayY - BAY_HEIGHT / 2, TOTAL_UNITS * UNIT_PX, BAY_HEIGHT);
    for (let i = 0; i <= TOTAL_UNITS; i++) {
      g.lineStyle(1, 0x00FFCC, 0.18)
        .lineBetween(this.bayStartX + i * UNIT_PX, this.bayY - BAY_HEIGHT / 2,
          this.bayStartX + i * UNIT_PX, this.bayY + BAY_HEIGHT / 2);
    }

    this.add.text(width / 2, py - 16,
      '⚙️  TRUCK CARGO BAY  —  Compaction Level  (10 units)', {
        fontSize: '13px', color: '#FF4444', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 10, y: 4 },
      }
    ).setOrigin(0.5).setDepth(3);

    // conveyor belt
    const beltY = height * 0.73;
    this.conveyorBelt = this.add.sprite(width * 0.52, beltY, 'conveyor-belt')
      .setDisplaySize(width * 0.75, 56).setDepth(2);
    this.tweens.add({ targets: this.conveyorBelt, x: this.conveyorBelt.x - 4, yoyo: true, repeat: -1, duration: 200 });

    // hydraulic wall
    this.hydraulicWall = this.add.sprite(this.bayStartX - 50, this.bayY, 'hydraulic-wall')
      .setScale(0.17).setDepth(6).setVisible(false).setFlipX(true);

    // drone
    this.droneSprite = this.add.sprite(width / 2, this.bayY - 140, 'drone')
      .setScale(0.13).setDepth(12).setVisible(false);

    // COMPACT button
    this.compactBtnSpr = this.add.sprite(width - 50, height * 0.74, 'compact-btn')
      .setScale(0.14).setDepth(10).setInteractive({ useHandCursor: true });
    this.compactBtnSpr.on('pointerdown', () => this.triggerCompaction());
    this.compactBtnSpr.on('pointerover', () =>
      this.tweens.add({ targets: this.compactBtnSpr, scaleX: 0.16, scaleY: 0.16, duration: 80 })
    );
    this.compactBtnSpr.on('pointerout', () =>
      this.tweens.add({ targets: this.compactBtnSpr, scaleX: 0.14, scaleY: 0.14, duration: 80 })
    );
    this.add.text(width - 50, height * 0.85, 'COMPACT', {
      fontSize: '11px', color: '#FF4444', fontStyle: 'bold',
      backgroundColor: '#000000AA', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(11);

    // system halted sign
    this.haltSign = this.add.sprite(width / 2, height * 0.28, 'system-halted')
      .setDisplaySize(width * 0.52, 64).setDepth(22).setAlpha(0);

    // waste + freeze meters
    const meterX = width - 50;
    this.add.sprite(meterX, height * 0.36, 'waste-meter').setScale(0.20).setDepth(8);
    this.wasteFill     = this.add.graphics().setDepth(9);
    this.freezeBarFill = this.add.graphics().setDepth(9);

    this.add.text(meterX, height * 0.57, 'FRAG', {
      fontSize: '10px', color: '#FF6666', fontStyle: 'bold',
      backgroundColor: '#000000AA', padding: { x: 3, y: 2 },
    }).setOrigin(0.5).setDepth(10);

    this.memStatsText = this.add.text(meterX, height * 0.63, '', {
      fontSize: '10px', color: '#888888', align: 'center',
      backgroundColor: '#000000AA', padding: { x: 4, y: 2 }, lineSpacing: 2,
    }).setOrigin(0.5).setDepth(10);

    this.freezeTimerText = this.add.text(meterX, height * 0.68, '', {
      fontSize: '10px', color: '#FF4444', fontStyle: 'bold',
      backgroundColor: '#000000AA', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(10);

    // HUD
    this.add.text(width / 2, 22, 'Level 3  —  Compaction  |  CPU Overhead', {
      fontSize: '15px', color: '#FF4444', fontStyle: 'bold',
      backgroundColor: '#000000CC', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setDepth(20);

    this.scoreText = this.add.text(meterX, 22, 'Score: 100', {
      fontSize: '14px', color: '#00FF88', fontStyle: 'bold',
      backgroundColor: '#000000CC', padding: { x: 8, y: 5 },
    }).setOrigin(0.5, 0).setDepth(20);

    this.infoBox = this.add.text(width / 2, 56, '', {
      fontSize: '14px', color: '#FFFFFF',
      backgroundColor: '#0a1a0aEE', padding: { x: 16, y: 8 },
      align: 'center', wordWrap: { width: width * 0.58 },
    }).setOrigin(0.5).setDepth(20);

    this.instructionText = this.add.text(width / 2, height - 22, '', {
      fontSize: '13px', color: '#B0E0E6',
      backgroundColor: '#000000CC', padding: { x: 14, y: 5 }, align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.queueText = this.add.text(width / 2, height * 0.82, '', {
      fontSize: '12px', color: '#FFD700',
      backgroundColor: '#000000AA', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(20);

    this.showIntro(width, height);
  }

  // ── Intro ──────────────────────────────────────────────────────────────────

  private showIntro(w: number, h: number) {
    const ov = this.add.graphics().fillStyle(0x000000, 0.90).fillRect(0, 0, w, h).setDepth(30);
    const card = this.add.graphics().setDepth(31);
    card.fillStyle(0x0a1a0a, 0.97)
      .fillRoundedRect(w * 0.11, h * 0.07, w * 0.78, h * 0.86, 16)
      .lineStyle(3, 0xFF4444, 0.9)
      .strokeRoundedRect(w * 0.11, h * 0.07, w * 0.78, h * 0.86, 16);

    this.add.text(w / 2, h * 0.15, '⚙️  Level 3: Compaction', {
      fontSize: '24px', color: '#FF4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(32);
    this.add.text(w / 2, h * 0.22, 'Topic: CPU Overhead & When to Compact', {
      fontSize: '15px', color: '#FFD700',
    }).setOrigin(0.5).setDepth(32);

    const cg = this.add.graphics().setDepth(31);
    cg.fillStyle(0x1a0000, 0.90).fillRoundedRect(w * 0.16, h * 0.27, w * 0.68, h * 0.22, 8);
    this.add.text(w / 2, h * 0.38,
      '🧠  Compaction merges scattered free gaps into ONE contiguous block.\n' +
      'BUT it HALTS the CPU while doing it — expensive overhead!\n' +
      'Bad strategy: compact too often → belt overflows → GAME OVER.\n' +
      'Good strategy: only compact when absolutely necessary.',
      { fontSize: '13px', color: '#E0E0E0', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5).setDepth(32);

    const hg = this.add.graphics().setDepth(31);
    hg.fillStyle(0x001a1a, 0.90).fillRoundedRect(w * 0.16, h * 0.51, w * 0.68, h * 0.28, 8);
    this.add.text(w / 2, h * 0.655,
      '🎮  HOW TO SCORE\n\n' +
      '• Items arrive on belt every 3.5s — load them into memory.\n' +
      '• If item doesn\'t fit: answer a QUIZ QUESTION (+20 if correct)\n' +
      '  THEN decide: click COMPACT or skip (item is lost).\n' +
      '• Each compaction: −15 pts  +  belt freezes for 3s.\n' +
      '• Queue hits ' + MAX_QUEUE + ' items = GAME OVER.\n' +
      '• Deliver all 8 = WIN. Fewer compactions = higher score.',
      { fontSize: '12px', color: '#00FFCC', align: 'center', lineSpacing: 3 }
    ).setOrigin(0.5).setDepth(32);

    const btn = this.add.text(w / 2, h * 0.86, '  START LEVEL 3  ▶', {
      fontSize: '20px', color: '#000', backgroundColor: '#FF4444', padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(32);
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#CC0000' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#FF4444' }));
    btn.on('pointerdown', () => {
      [ov, card, cg, hg, btn].forEach((o) => o.destroy());
      this.children.list
        .filter((c) => {
          const depth = (c as any).depth as number | undefined;
          return depth === 31 || depth === 32;
        })
        .forEach((c) => c.destroy());
      this.gamePhase = 'playing';
      this.initMemory();
      this.startSpawning();
    });
  }

  // ── Initial memory ──────────────────────────────────────────────────────────

  private initMemory() {
    this.blocks = [
      { id: 'A', units: 2, spriteKey: 'item-scanner', label: 'Scanner', free: false },
      { id: 'f1', units: 1, spriteKey: '', label: '', free: true },
      { id: 'B', units: 3, spriteKey: 'item-server',  label: 'Server',  free: false },
      { id: 'f2', units: 2, spriteKey: '', label: '', free: true },
      { id: 'C', units: 1, spriteKey: 'item-pc',      label: 'PC',      free: false },
      { id: 'f3', units: 1, spriteKey: '', label: '', free: true },
    ];
    this.renderBlocks();
    this.updateWasteMeter();
    this.updateMemStats();
  }

  // ── Spawning ────────────────────────────────────────────────────────────────

  private startSpawning() {
    this.instructionText.setText('Items arriving on belt. Load them into memory. If no fit — a quiz appears, then decide whether to COMPACT.');
    this.infoBox.setText('Memory is pre-loaded with some blocks and gaps. New items arriving…');

    // spawn first immediately, then on timer
    this.time.delayedCall(1000, () => this.spawnItem());
    this.spawnTimer = this.time.addEvent({
      delay: 3500,
      callback: () => {
        if (!this.beltFrozen && this.gamePhase === 'playing') this.spawnItem();
      },
      repeat: PROCESS_POOL.length - 2,
    });
  }

  private spawnItem() {
    if (this.poolIndex >= PROCESS_POOL.length || this.gamePhase !== 'playing') return;
    const item = PROCESS_POOL[this.poolIndex];
    this.poolIndex++;
    this.conveyorQueue.push({ ...item });
    this.renderQueue();
    this.checkQueueOverflow();
    this.tryLoad();
  }

  private tryLoad() {
    if (this.beltFrozen || !this.conveyorQueue.length || this.gamePhase !== 'playing') return;
    const item = this.conveyorQueue[0];
    const maxGap = this.maxContiguousFree();

    if (maxGap >= item.units) {
      // fits — load immediately
      this.conveyorQueue.shift();
      this.renderQueue();
      this.loadItem(item);
    } else {
      // doesn't fit — trigger quiz before asking to compact
      this.infoBox.setText(
        `⚠  "${item.label}" needs ${item.units}u.  Largest gap: ${maxGap}u.  Total free: ${this.totalFree()}u.\n` +
        `Answer the question below, then decide what to do.`
      );
      this.triggerQuiz(item);
    }
  }

  private loadItem(item: typeof PROCESS_POOL[0]) {
    const freeIdx = this.findFitIndex(item.units);
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
    this.delivered++;
    this.infoBox.setText(`✅  ${item.label} loaded.  Delivered: ${this.delivered}/${PROCESS_POOL.length}`);
    this.updateScoreDisplay(0, true);

    if (this.delivered >= PROCESS_POOL.length) {
      this.time.delayedCall(800, () => this.triggerWin());
    }
  }

  // ── Quiz ────────────────────────────────────────────────────────────────────

  private triggerQuiz(blockedItem: typeof PROCESS_POOL[0]) {
    if (this.quizAsked >= QUIZ_QUESTIONS.length) {
      // no more quiz — go straight to compact decision
      this.pendingProcessAfterQuiz = blockedItem;
      this.showCompactDecision();
      return;
    }

    this.gamePhase = 'quiz';
    this.pendingProcessAfterQuiz = blockedItem;
    const q = QUIZ_QUESTIONS[this.currentQuizIdx];
    this.currentQuizIdx = (this.currentQuizIdx + 1) % QUIZ_QUESTIONS.length;
    this.quizAsked++;

    const { width, height } = this.cameras.main;
    this.clearQuizBtns();

    // dim overlay behind question
    const qBg = this.add.graphics().setDepth(18)
      .fillStyle(0x000000, 0.55)
      .fillRoundedRect(width * 0.10, height * 0.52, width * 0.80, height * 0.36, 10);

    const qTxt = this.add.text(width / 2, height * 0.57,
      `❓  QUIZ: ${q.question}`, {
        fontSize: '14px', color: '#FFD700', fontStyle: 'bold',
        align: 'center', wordWrap: { width: width * 0.70 },
      }
    ).setOrigin(0.5).setDepth(19);

    const btnY = [height * 0.65, height * 0.72, height * 0.79];
    q.options.forEach((opt, i) => {
      const btn = this.add.text(width / 2, btnY[i], `  ${opt}  `, {
        fontSize: '13px', color: '#000',
        backgroundColor: '#888888', padding: { x: 12, y: 7 },
        wordWrap: { width: width * 0.65 },
      }).setOrigin(0.5).setDepth(19).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#AAAAAA' }));
      btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#888888' }));
      btn.on('pointerdown', () => {
        const correct = i === q.correctIdx;
        // colour all buttons
        q.options.forEach((_, j) => {
          this.quizBtns[j].setStyle({
            backgroundColor: j === q.correctIdx ? '#00AA44' : (j === i && !correct ? '#AA0000' : '#555555'),
            color: '#FFFFFF',
          });
          this.quizBtns[j].disableInteractive();
        });

        if (correct) {
          this.score += 20;
          this.correctQuizzes++;
        } else {
          this.score = Math.max(0, this.score - 10);
        }
        this.updateScoreDisplay(correct ? 20 : -10, correct);

        const expTxt = this.add.text(width / 2, height * 0.86,
          (correct ? '✅  ' : '❌  ') + q.explanation, {
            fontSize: '12px',
            color: correct ? '#00FF88' : '#FF6666',
            backgroundColor: '#000000CC', padding: { x: 10, y: 5 },
            align: 'center', wordWrap: { width: width * 0.70 },
          }
        ).setOrigin(0.5).setDepth(19);

        this.time.delayedCall(1600, () => {
          [qBg, qTxt, expTxt].forEach(o => o.destroy());
          this.clearQuizBtns();
          this.gamePhase = 'playing';
          this.showCompactDecision();
        });
      });
      this.quizBtns.push(btn);
    });
  }

  private showCompactDecision() {
    const item = this.pendingProcessAfterQuiz;
    if (!item) return;

    const { width, height } = this.cameras.main;
    const maxGap    = this.maxContiguousFree();
    const totalFree = this.totalFree();

    this.infoBox.setText(
      `"${item.label}" (${item.units}u) still can't fit.  Largest gap: ${maxGap}u.\n` +
      `Total free: ${totalFree}u.\n` +
      `COMPACT (−15 pts, belt freezes 3s) or SKIP (item lost, no penalty)?`
    );

    const compBtn = this.add.text(width * 0.38, height * 0.61, '  🔧 COMPACT  ', {
      fontSize: '16px', color: '#000', backgroundColor: '#FF4444', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setDepth(18).setInteractive({ useHandCursor: true });

    const skipBtn = this.add.text(width * 0.62, height * 0.61, '  ❌ SKIP ITEM  ', {
      fontSize: '16px', color: '#000', backgroundColor: '#666666', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setDepth(18).setInteractive({ useHandCursor: true });

    const destroy = () => { compBtn.destroy(); skipBtn.destroy(); };

    compBtn.on('pointerdown', () => {
      destroy();
      this.conveyorQueue.shift();
      this.renderQueue();
      this.pendingProcessAfterQuiz = null;
      this.triggerCompaction(item);
    });

    skipBtn.on('pointerdown', () => {
      destroy();
      this.conveyorQueue.shift();
      this.renderQueue();
      this.pendingProcessAfterQuiz = null;
      this.infoBox.setText(`Skipped "${item.label}". No penalty but item lost.`);
      this.time.delayedCall(600, () => this.tryLoad());
    });
  }

  // ── Compaction ──────────────────────────────────────────────────────────────

  private triggerCompaction(afterItem?: typeof PROCESS_POOL[0]) {
    if (this.beltFrozen) return;
    this.beltFrozen = true;
    this.compactions++;
    this.score = Math.max(0, this.score - 15);
    this.updateScoreDisplay(-15, false);

    const { width } = this.cameras.main;

    // show halt + smoke
    this.tweens.add({ targets: this.haltSign, alpha: 1, duration: 200 });
    this.cameras.main.shake(280, 0.014);
    const smoke = this.add.sprite(width / 2, this.bayY - 80, 'conveyor-smoke')
      .setScale(0.28).setDepth(14).setAlpha(0);
    this.tweens.add({
      targets: smoke, alpha: 0.8, duration: 200, yoyo: true, repeat: 4,
      onComplete: () => smoke.destroy(),
    });

    this.hydraulicWall.setVisible(true).setX(this.bayStartX - 50);
    this.droneSprite.setVisible(true);

    let remaining = FREEZE_MS / 1000;
    this.freezeTimerText.setText(`CPU FROZEN: ${remaining}s`);
    const countdown = this.time.addEvent({
      delay: 1000, repeat: FREEZE_MS / 1000 - 1,
      callback: () => {
        remaining--;
        this.freezeTimerText.setText(remaining > 0 ? `CPU FROZEN: ${remaining}s` : '');
      },
    });

    this.infoBox.setText(`🔴 COMPACTION RUNNING…  Belt frozen for ${FREEZE_MS / 1000}s  −15 pts`);

    this.tweens.add({
      targets: this.hydraulicWall, x: this.bayStartX + 20,
      duration: FREEZE_MS * 0.5, ease: 'Power2',
      onComplete: () => {
        // merge blocks
        const occupied = this.blocks.filter(b => !b.free);
        const tf = this.totalFree();
        this.blocks = [
          ...occupied,
          { id: 'merged_free', units: tf, spriteKey: '', label: '', free: true },
        ];
        this.renderBlocks(true);
        this.updateWasteMeter();
        this.updateMemStats();

        this.tweens.add({ targets: this.hydraulicWall, x: this.bayStartX - 50, duration: 400,
          onComplete: () => this.hydraulicWall.setVisible(false) });
        this.tweens.add({ targets: this.droneSprite, y: this.bayY - 200, duration: 350,
          onComplete: () => this.droneSprite.setVisible(false) });

        this.time.delayedCall(FREEZE_MS * 0.5, () => {
          countdown.destroy();
          this.beltFrozen = false;
          this.freezeTimerText.setText('');
          this.tweens.add({ targets: this.haltSign, alpha: 0, duration: 250 });
          this.infoBox.setText('✅  Compaction done.  Free space merged.');

          if (afterItem) {
            this.time.delayedCall(300, () => this.loadItem(afterItem));
          } else {
            this.time.delayedCall(300, () => this.tryLoad());
          }
        });
      },
    });
  }

  // ── Queue ────────────────────────────────────────────────────────────────────

  private renderQueue() {
    this.queueSprites.forEach(q => { q.spr.destroy(); q.txt.destroy(); });
    this.queueSprites = [];
    const { width, height } = this.cameras.main;
    this.conveyorQueue.forEach((item, i) => {
      const x = width * 0.80 - i * 58;
      const y = height * 0.73;
      const spr = this.add.sprite(x, y - 10, item.spriteKey).setScale(0.07).setDepth(5);
      const txt = this.add.text(x, y + 18, `${item.units}u`, {
        fontSize: '10px', color: '#FFD700', backgroundColor: '#000000AA', padding: { x: 2, y: 1 },
      }).setOrigin(0.5).setDepth(5);
      this.queueSprites.push({ spr, txt });
    });
    this.queueText.setText(
      `Queue: ${this.conveyorQueue.length} / ${MAX_QUEUE}  ${this.conveyorQueue.length >= MAX_QUEUE - 1 ? '⚠ OVERFLOW RISK!' : ''}`
    );
    this.queueText.setColor(this.conveyorQueue.length >= MAX_QUEUE - 1 ? '#FF4444' : '#FFD700');
  }

  private checkQueueOverflow() {
    if (this.conveyorQueue.length >= MAX_QUEUE && this.gamePhase === 'playing') {
      this.triggerGameOver();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  private renderBlocks(animate = false) {
    this.blocks.forEach(b => {
      b.wrapSprite?.destroy(); b.itemSprite?.destroy();
      b.labelTxt?.destroy();   b.freeTxt?.destroy();
      b.peanutsSprite?.destroy();
    });
    let curX = this.bayStartX;
    this.blocks.forEach(b => {
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

  // ── Helpers ────────────────────────────────────────────────────────────────────

  private findFitIndex(units: number): number {
    let cur = 0, start = -1;
    for (let i = 0; i < this.blocks.length; i++) {
      if (this.blocks[i].free) {
        if (start === -1) start = i;
        cur += this.blocks[i].units;
        if (cur >= units) return start;
      } else { start = -1; cur = 0; }
    }
    return -1;
  }

  private maxContiguousFree(): number {
    let max = 0, cur = 0;
    this.blocks.forEach(b => { if (b.free) { cur += b.units; max = Math.max(max, cur); } else cur = 0; });
    return max;
  }

  private totalFree(): number {
    return this.blocks.filter(b => b.free).reduce((s, b) => s + b.units, 0);
  }

  private getBlockCenterX(idx: number): number {
    let x = this.bayStartX;
    for (let i = 0; i < idx; i++) x += this.blocks[i].units * UNIT_PX;
    return x + (this.blocks[idx].units * UNIT_PX) / 2;
  }

  private updateWasteMeter() {
    this.wasteFill.clear();
    const { width, height } = this.cameras.main;
    const tf  = this.totalFree();
    const mg  = this.maxContiguousFree();
    const pct = tf > 0 ? (tf - mg) / tf : 0;
    const bx = width - 64; const by = height * 0.20;
    const bh = 120; const fh = pct * bh;
    const col = pct < 0.35 ? 0x00FF44 : pct < 0.65 ? 0xFFCC00 : 0xFF3300;
    this.wasteFill.fillStyle(col, 0.88).fillRect(bx, by + bh - fh, 26, fh);
  }

  private updateMemStats() {
    this.memStatsText.setText(`Free: ${this.totalFree()}u\nLargest: ${this.maxContiguousFree()}u`);
  }

  private updateScoreDisplay(delta: number, correct: boolean) {
    this.scoreText.setText(`Score: ${this.score}`);
    if (delta !== 0) {
      this.scoreText.setColor(correct ? '#00FF88' : '#FF4444');
      this.time.delayedCall(500, () => this.scoreText.setColor('#00FF88'));
      const { width, height } = this.cameras.main;
      const ft = this.add.text(width - 50, height * 0.16,
        delta > 0 ? `+${delta}` : `${delta}`, {
          fontSize: '20px', fontStyle: 'bold',
          color: correct ? '#00FF88' : '#FF4444',
        }
      ).setOrigin(0.5).setDepth(22);
      this.tweens.add({ targets: ft, y: ft.y - 44, alpha: 0, duration: 900, onComplete: () => ft.destroy() });
    }
  }

  private clearQuizBtns() {
    this.quizBtns.forEach(b => b.destroy());
    this.quizBtns = [];
  }

  // ── Game over ────────────────────────────────────────────────────────────────

  private triggerGameOver() {
    if (this.gamePhase === 'gameover') return;
    this.gamePhase = 'gameover';
    this.spawnTimer?.destroy();
    const { width, height } = this.cameras.main;
    this.cameras.main.shake(500, 0.022);

    this.add.graphics().fillStyle(0x000000, 0.84).fillRect(0, 0, width, height).setDepth(28);
    this.add.sprite(width / 2, height * 0.28, 'system-halted')
      .setDisplaySize(width * 0.58, 72).setDepth(29);

    this.add.text(width / 2, height * 0.44,
      `💀  BELT OVERFLOW — GAME OVER!\n\n` +
      `Queue hit ${MAX_QUEUE} items.\n` +
      `Too many compactions froze the belt too long.\n\n` +
      `Delivered: ${this.delivered}/${PROCESS_POOL.length}\n` +
      `Compactions: ${this.compactions}\n` +
      `Quiz Correct: ${this.correctQuizzes} / ${this.quizAsked}\n` +
      `Final Score: ${this.score}`,
      {
        fontSize: '16px', color: '#FF4444', align: 'center',
        backgroundColor: '#0a0a1aCC', padding: { x: 28, y: 18 }, lineSpacing: 6,
      }
    ).setOrigin(0.5).setDepth(30);

    this.add.text(width / 2, height * 0.74, '  TRY AGAIN  ', {
      fontSize: '18px', color: '#000', backgroundColor: '#FFD700', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(30)
      .on('pointerdown', () => this.scene.restart());
  }

  // ── Win ────────────────────────────────────────────────────────────────────────

  private triggerWin() {
    if (this.gamePhase === 'win') return;
    this.gamePhase = 'win';
    this.spawnTimer?.destroy();
    const { width, height } = this.cameras.main;

    const grade =
      this.compactions === 0 && this.score >= 160 ? { text: 'ZERO COMPACTIONS  🏆', color: '#FFD700' } :
      this.compactions <= 2                        ? { text: 'EFFICIENT PACKER  👏', color: '#00FF88' } :
                                                     { text: 'TOO MANY COMPACTIONS  ⚠', color: '#FF6666' };

    this.add.graphics().fillStyle(0x000000, 0.86).fillRect(0, 0, width, height).setDepth(28);
    const card = this.add.graphics().setDepth(29);
    card.fillStyle(0x0a1a0a, 0.97)
      .fillRoundedRect(width * 0.14, height * 0.10, width * 0.72, height * 0.80, 14)
      .lineStyle(3, 0xFF4444, 0.9)
      .strokeRoundedRect(width * 0.14, height * 0.10, width * 0.72, height * 0.80, 14);

    this.add.text(width / 2, height * 0.19, '⚙️  Level 3 Complete!', {
      fontSize: '24px', color: '#FF4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.add.graphics().setDepth(29)
      .fillStyle(0x1a0000, 0.85)
      .fillRoundedRect(width * 0.21, height * 0.27, width * 0.58, height * 0.34, 8);

    this.add.text(width / 2, height * 0.44,
      `Final Score:         ${this.score}\n` +
      `Delivered:           ${this.delivered} / ${PROCESS_POOL.length}\n` +
      `Compactions Used:    ${this.compactions}\n` +
      `Quiz Correct:        ${this.correctQuizzes} / ${this.quizAsked}\n` +
      `Max Possible Score:  ${100 + this.quizAsked * 20}`,
      { fontSize: '14px', color: '#FFFFFF', align: 'left', fontFamily: 'monospace', lineSpacing: 6 }
    ).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height * 0.64, grade.text, {
      fontSize: '20px', color: grade.color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height * 0.73,
      `KEY LESSON: Compact only when necessary.\n` +
      `Every compaction costs CPU time.\n` +
      `Plan your memory usage to minimise fragmentation.`,
      { fontSize: '12px', color: '#B0B0B0', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height * 0.82, '  PLAY AGAIN  ', {
      fontSize: '16px', color: '#000', backgroundColor: '#FFD700', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31)
      .on('pointerdown', () => this.scene.restart());
  }
}