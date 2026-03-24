import Phaser from 'phaser';

// ─────────────────────────────────────────────
//  Shared types
// ─────────────────────────────────────────────
type ActorState = 'idle' | 'moving' | 'depositing' | 'consuming' | 'blocked';

interface LevelConfig {
  key: string;
  bufferSize: number;
  producerInterval: number;   // ms between auto-produce (L2/L3)
  consumerInterval: number;   // ms between auto-consume (L2/L3)
  isManual: boolean;          // L1: player clicks; L2+: automated
  mutexRequired: boolean;     // L2: player must click shield
  targetProduced: number;     // win condition: total packets produced & consumed
  solarStorm: boolean;        // L3: 3x producer speed
  gameId: string;
  levelId: string;
}

const ASSET_PATH = '/games/process-synchronization/producer-consumer/';
const BUFFER_SIZE = 10;

// ─────────────────────────────────────────────
//  Base Scene
// ─────────────────────────────────────────────
class ProducerConsumerBase extends Phaser.Scene {
  protected cfg!: LevelConfig;

  // semaphore state
  protected sEmpty: number = 10;   // empty slots available
  protected sFull: number = 0;     // full slots available
  protected mutexLocked: boolean = false;
  protected buffer: boolean[] = []; // true = has packet

  // score
  protected totalProduced: number = 0;
  protected totalConsumed: number = 0;
  protected lives: number = 3;
  protected score: number = 0;
  protected gameStartTime: number = 0;

  // scene objects
  protected bg!: Phaser.GameObjects.Image;
  protected pedestal!: Phaser.GameObjects.Image;
  protected drone!: Phaser.GameObjects.Image;
  protected satellite!: Phaser.GameObjects.Image;
  protected mutexShield!: Phaser.GameObjects.Image;
  protected transmitBeam!: Phaser.GameObjects.Image;
  protected bufferProgressBar!: Phaser.GameObjects.Image;

  // buffer slot graphics
  protected bufferSlots: Phaser.GameObjects.Graphics[] = [];
  protected packetSprites: (Phaser.GameObjects.Image | null)[] = [];

  // HUD
  protected sEmptyText!: Phaser.GameObjects.Text;
  protected sFullText!: Phaser.GameObjects.Text;
  protected mutexText!: Phaser.GameObjects.Text;
  protected livesText!: Phaser.GameObjects.Text;
  protected scoreText!: Phaser.GameObjects.Text;
  protected progressText!: Phaser.GameObjects.Text;
  protected instructionText!: Phaser.GameObjects.Text;
  protected bufferBarFill!: Phaser.GameObjects.Graphics;

  // state
  protected gamePhase: 'intro' | 'playing' | 'completed' = 'intro';
  protected producerTimer?: Phaser.Time.TimerEvent;
  protected consumerTimer?: Phaser.Time.TimerEvent;
  protected droneState: ActorState = 'idle';
  protected satelliteState: ActorState = 'idle';
  protected droneBlocked: boolean = false;
  protected satelliteBlocked: boolean = false;

  // L3 storm
  protected stormActive: boolean = false;
  protected stormOverlay?: Phaser.GameObjects.Graphics;
  protected overclockActive: boolean = false;

  constructor(cfg: LevelConfig) {
    super({ key: cfg.key });
    this.cfg = cfg;
  }

  // ── preload ──────────────────────────────────
  preload() {
    this.load.image('space-bg', `${ASSET_PATH}Space-Background.png`);
    this.load.image('pedestal', `${ASSET_PATH}Space-Storage-Pedestal.png`);
    this.load.image('drone', `${ASSET_PATH}Producer-Drone.png`);
    this.load.image('satellite', `${ASSET_PATH}Consumer-Satelite.png`);
    this.load.image('mutex-shield', `${ASSET_PATH}Mutex-Shield.png`);
    this.load.image('beam', `${ASSET_PATH}Transmission-Beam.png`);
    this.load.image('packet', `${ASSET_PATH}Data-Packet.png`);
    this.load.image('progress-bar', `${ASSET_PATH}UI-Buffer-Progress-Bar.png`);
    this.load.image('ui-consumer-blocked', `${ASSET_PATH}UI-Consumer-Blocked-Buffer-Empty.png`);
    this.load.image('ui-producer-blocked', `${ASSET_PATH}UI-Producer-Blocked-Buffer-Full.png`);
    this.load.image('ui-semaphore-1', `${ASSET_PATH}UI-Semaphore-Counter-1.png`);
    this.load.image('ui-semaphore-2', `${ASSET_PATH}UI-Semaphore-Counter-2.png`);
  }

  // ── create ───────────────────────────────────
  create() {
    const { width, height } = this.scale;

    // reset state
    this.sEmpty = this.cfg.bufferSize;
    this.sFull = 0;
    this.mutexLocked = false;
    this.buffer = new Array(this.cfg.bufferSize).fill(false);
    this.totalProduced = 0;
    this.totalConsumed = 0;
    this.lives = 3;
    this.score = 0;
    this.gamePhase = 'intro';
    this.droneState = 'idle';
    this.satelliteState = 'idle';
    this.droneBlocked = false;
    this.satelliteBlocked = false;
    this.stormActive = false;
    this.overclockActive = false;
    this.bufferSlots = [];
    this.packetSprites = new Array(this.cfg.bufferSize).fill(null);

    this.buildScene(width, height);
    this.buildBufferSlots(width, height);
    this.buildHUD(width, height);
    this.showIntroModal();
  }

  // ── scene layout ─────────────────────────────
  private buildScene(w: number, h: number) {
    // background
    this.bg = this.add.image(w / 2, h / 2, 'space-bg').setDisplaySize(w, h).setDepth(0);

    // pedestal (buffer) - center
    this.pedestal = this.add.image(w / 2, h * 0.72, 'pedestal')
      .setDisplaySize(420, 100).setDepth(2);

    // drone - left side, mid height
    this.drone = this.add.image(w * 0.12, h * 0.45, 'drone')
      .setDisplaySize(90, 90).setDepth(4)
      .setInteractive({ useHandCursor: true });
    this.drone.on('pointerdown', () => this.onDroneClick());
    this.drone.on('pointerover', () => { if (this.droneState === 'idle') this.drone.setTint(0xaaffaa); });
    this.drone.on('pointerout', () => this.drone.clearTint());

    // satellite - right side
    this.satellite = this.add.image(w * 0.88, h * 0.38, 'satellite')
      .setDisplaySize(110, 110).setDepth(4)
      .setInteractive({ useHandCursor: true });
    this.satellite.on('pointerdown', () => this.onSatelliteClick());
    this.satellite.on('pointerover', () => { if (this.satelliteState === 'idle') this.satellite.setTint(0xaaaaff); });
    this.satellite.on('pointerout', () => this.satellite.clearTint());

    // mutex shield - center, over pedestal
    this.mutexShield = this.add.image(w / 2, h * 0.58, 'mutex-shield')
      .setDisplaySize(140, 100).setDepth(5)
      .setAlpha(0.15)
      .setVisible(this.cfg.mutexRequired)
      .setInteractive({ useHandCursor: this.cfg.mutexRequired });
    if (this.cfg.mutexRequired) {
      this.mutexShield.on('pointerdown', () => this.onMutexClick());
      this.mutexShield.on('pointerover', () => this.mutexShield.setTint(0xffffff));
      this.mutexShield.on('pointerout', () => this.mutexShield.clearTint());
    }

    // transmission beam - hidden initially
    this.transmitBeam = this.add.image(w / 2, h * 0.38, 'beam')
      .setDisplaySize(w * 0.55, 30).setDepth(3).setAlpha(0).setVisible(false);

    // buffer progress bar base
    this.bufferProgressBar = this.add.image(w / 2, h * 0.88, 'progress-bar')
      .setDisplaySize(w * 0.55, 28).setDepth(3);
    this.bufferBarFill = this.add.graphics().setDepth(4);
  }

  // ── buffer slot visuals ───────────────────────
  private buildBufferSlots(w: number, h: number) {
    const slotW = 36, slotH = 36, gap = 4;
    const totalW = this.cfg.bufferSize * (slotW + gap) - gap;
    const startX = w / 2 - totalW / 2;
    const slotY = h * 0.60;

    for (let i = 0; i < this.cfg.bufferSize; i++) {
      const x = startX + i * (slotW + gap);
      const g = this.add.graphics().setDepth(3);
      g.lineStyle(2, 0x00CCFF, 0.8);
      g.strokeRect(x, slotY, slotW, slotH);
      this.bufferSlots.push(g);
    }
  }

  protected refreshBufferVisuals() {
    const { width, height } = this.scale;
    const slotW = 36, slotH = 36, gap = 4;
    const totalW = this.cfg.bufferSize * (slotW + gap) - gap;
    const startX = width / 2 - totalW / 2;
    const slotY = height * 0.60;

    for (let i = 0; i < this.cfg.bufferSize; i++) {
      // destroy old packet sprite
      if (this.packetSprites[i]) {
        this.packetSprites[i]!.destroy();
        this.packetSprites[i] = null;
      }
      const g = this.bufferSlots[i];
      g.clear();

      if (this.buffer[i]) {
        // filled slot
        g.fillStyle(0x00FFFF, 0.15);
        g.fillRect(startX + i * (slotW + gap), slotY, slotW, slotH);
        g.lineStyle(2, 0x00FFFF, 1);
        g.strokeRect(startX + i * (slotW + gap), slotY, slotW, slotH);

        const px = startX + i * (slotW + gap) + slotW / 2;
        const py = slotY + slotH / 2;
        const p = this.add.image(px, py, 'packet')
          .setDisplaySize(22, 22).setDepth(4);
        this.packetSprites[i] = p;
      } else {
        g.lineStyle(2, 0x00CCFF, 0.35);
        g.strokeRect(startX + i * (slotW + gap), slotY, slotW, slotH);
      }
    }

    // progress bar fill
    this.bufferBarFill.clear();
    const pct = this.sFull / this.cfg.bufferSize;
    const barW = width * 0.55;
    const barX = width / 2 - barW / 2;
    const barY = height * 0.875;
    const fillColor = pct > 0.8 ? 0xFF4444 : pct > 0.5 ? 0xFFAA00 : 0xAA44FF;
    this.bufferBarFill.fillStyle(fillColor, 0.8);
    this.bufferBarFill.fillRoundedRect(barX + 4, barY + 3, (barW - 8) * pct, 16, 6);
  }

  // ── HUD ──────────────────────────────────────
  private buildHUD(w: number, h: number) {
    const mono = (size = '15px', color = '#00FFFF') => ({
      fontSize: size, color, fontFamily: 'monospace',
      backgroundColor: '#00000099', padding: { x: 8, y: 4 },
    });

    this.sEmptyText = this.add.text(16, 16, '', mono('16px', '#00CCFF')).setDepth(10);
    this.sFullText = this.add.text(16, 46, '', mono('16px', '#FFD700')).setDepth(10);
    this.mutexText = this.add.text(16, 76, '', mono('14px', '#CC88FF')).setDepth(10);
    this.livesText = this.add.text(w - 16, 16, '', mono('16px', '#FF6666')).setOrigin(1, 0).setDepth(10);
    this.scoreText = this.add.text(w - 16, 46, '', mono('14px', '#AAFFAA')).setOrigin(1, 0).setDepth(10);
    this.progressText = this.add.text(w / 2, 16, '', mono('14px', '#FFFFFF')).setOrigin(0.5, 0).setDepth(10);

    this.instructionText = this.add.text(w / 2, h - 34, '', {
      fontSize: '14px', color: '#FFFFFF',
      backgroundColor: '#000000BB', padding: { x: 12, y: 5 }, align: 'center',
    }).setOrigin(0.5).setDepth(10);

    // drone label
    this.add.text(w * 0.12, h * 0.45 + 56, 'PRODUCER\n[Drone]', {
      fontSize: '11px', color: '#AAFFAA', align: 'center', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(5);

    // satellite label
    this.add.text(w * 0.88, h * 0.38 + 66, 'CONSUMER\n[Satellite]', {
      fontSize: '11px', color: '#AAAAFF', align: 'center', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(5);

    this.updateHUD();
  }

  protected updateHUD() {
    this.sEmptyText.setText(`S_empty (free slots): ${this.sEmpty}`);
    this.sFullText.setText(`S_full  (data ready):  ${this.sFull}`);
    this.mutexText.setText(
      this.cfg.mutexRequired
        ? `MUTEX: ${this.mutexLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}`
        : 'MUTEX: auto'
    );
    this.livesText.setText(`Lives: ${'♥ '.repeat(this.lives).trim()}`);
    this.scoreText.setText(`Score: ${this.score}`);
    this.progressText.setText(`Consumed: ${this.totalConsumed} / ${this.cfg.targetProduced}`);
    this.refreshBufferVisuals();
  }

  // ── intro modal ──────────────────────────────
  private showIntroModal() {
    const { width, height } = this.scale;
    const ov = this.add.graphics().setDepth(100);
    ov.fillStyle(0x000000, 0.88); ov.fillRect(0, 0, width, height);

    const bw = Math.min(700, width - 40), bh = 560;
    const bx = width / 2 - bw / 2, by = height / 2 - bh / 2;

    const box = this.add.graphics().setDepth(101);
    box.fillStyle(0x05010f, 0.98);
    box.fillRoundedRect(bx, by, bw, bh, 18);
    box.lineStyle(3, 0xAA44FF, 1);
    box.strokeRoundedRect(bx, by, bw, bh, 18);

    this.add.text(width / 2, by + 44, '🛸 PRODUCER–CONSUMER PROBLEM', {
      fontSize: '26px', color: '#AA44FF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(width / 2, by + 82, this.levelSubtitle(), {
      fontSize: '16px', color: '#FFD700',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(bx + 36, by + 115, this.introBody(), {
      fontSize: '13px', color: '#D0D0D0', lineSpacing: 5,
      wordWrap: { width: bw - 72 },
    }).setDepth(102);

    const btnW = 200, btnH = 48;
    const btnX = width / 2 - btnW / 2, btnY = by + bh - 70;
    const btn = this.add.graphics().setDepth(102);
    btn.fillStyle(0x6600CC, 1); btn.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    btn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    this.add.text(width / 2, btnY + 24, '🚀 START', {
      fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(103);

    btn.on('pointerdown', () => {
      [ov, box, btn].forEach(o => o.destroy());
      this.children.list
        .filter(c => (c as any).depth >= 101 && (c as any).depth <= 103)
        .forEach(c => c.destroy());
      this.startGame();
    });
  }

  protected levelSubtitle(): string { return 'Bounded Buffer Problem'; }
  protected introBody(): string {
    return [
      '📡 THE SETUP:',
      `  Buffer (Pedestal) = ${this.cfg.bufferSize} slots  |  Drone = Producer  |  Satellite = Consumer`,
      '',
      '🔢 THREE SEMAPHORES:',
      '  S_empty = 10   (tracks free buffer slots — Producer waits when 0)',
      '  S_full  = 0    (tracks filled slots — Consumer waits when 0)',
      '  mutex   = 1    (guards the critical section — only one at a time)',
      '',
      '🔄 PRODUCER sequence:  wait(S_empty) → wait(mutex) → deposit → signal(mutex) → signal(S_full)',
      '🔄 CONSUMER sequence:  wait(S_full)  → wait(mutex) → consume → signal(mutex) → signal(S_empty)',
      '',
      '🎮 HOW TO PLAY:',
      ...this.howToPlayLines(),
      '',
      `🎯 GOAL: Successfully transmit ${this.cfg.targetProduced} data packets!`,
    ].join('\n');
  }

  protected howToPlayLines(): string[] {
    return [
      '  • Click the DRONE to produce a data packet → wait(S_empty)',
      '  • Click the SATELLITE to consume a packet → wait(S_full)',
      '  • If buffer is FULL, drone is blocked (S_empty = 0)',
      '  • If buffer is EMPTY, satellite is blocked (S_full = 0)',
    ];
  }

  // ── game start ───────────────────────────────
  protected startGame() {
    this.gamePhase = 'playing';
    this.gameStartTime = Date.now();

    if (!this.cfg.isManual) {
      this.startAutomation();
    }

    if (this.cfg.solarStorm) {
      this.time.delayedCall(8000, () => this.triggerSolarStorm());
    }

    this.instructionText.setText(this.playingInstruction());
    this.updateHUD();
  }

  protected playingInstruction(): string {
    return 'Click DRONE to produce → Click SATELLITE to consume';
  }

  protected startAutomation() {
    this.producerTimer = this.time.addEvent({
      delay: this.cfg.producerInterval,
      callback: () => { if (this.gamePhase === 'playing') this.tryProduce(); },
      loop: true,
    });
    this.consumerTimer = this.time.addEvent({
      delay: this.cfg.consumerInterval,
      callback: () => { if (this.gamePhase === 'playing') this.tryConsume(); },
      loop: true,
    });
  }

  // ── produce (wait S_empty → deposit → signal S_full) ─
  protected onDroneClick() {
    if (this.gamePhase !== 'playing' || !this.cfg.isManual) return;
    this.tryProduce();
  }

  protected tryProduce() {
    if (this.sEmpty === 0) {
      // Producer BLOCKED
      this.droneBlocked = true;
      this.showBlockedIndicator('producer');
      this.showMessage('⛔ Buffer FULL! S_empty = 0 → Producer blocks', '#FF6644', 2000);
      return;
    }
    if (this.cfg.mutexRequired && this.mutexLocked) {
      this.showMessage('🔒 Mutex locked — wait for release', '#CC88FF', 1500);
      return;
    }

    this.droneBlocked = false;

    // If mutex required but not locked → race condition penalty
    if (this.cfg.mutexRequired && !this.mutexLocked && this.satelliteState === 'consuming') {
      this.raceConditionPenalty();
      return;
    }

    this.performDeposit();
  }

  private performDeposit() {
    this.droneState = 'depositing';

    // find first empty slot
    const slot = this.buffer.indexOf(false);
    if (slot === -1) return;

    // Auto-lock mutex if L1 (no mutex mechanic)
    if (!this.cfg.mutexRequired) this.mutexLocked = true;

    // Animate drone moving to buffer
    const { width, height } = this.scale;
    const slotW = 36, gap = 4;
    const totalW = this.cfg.bufferSize * (slotW + gap) - gap;
    const startX = width / 2 - totalW / 2;
    const targetX = startX + slot * (slotW + gap) + slotW / 2;

    this.tweens.add({
      targets: this.drone,
      x: targetX, y: height * 0.58,
      duration: 500, ease: 'Power2',
      onComplete: () => {
        // deposit
        this.buffer[slot] = true;
        this.sEmpty--;
        this.sFull++;
        this.totalProduced++;
        this.score += 5;

        this.showMessage(`wait(S_empty)→deposit→signal(S_full)  S_empty=${this.sEmpty} S_full=${this.sFull}`, '#00FFAA', 1600);

        if (!this.cfg.mutexRequired) this.mutexLocked = false;
        this.droneState = 'idle';

        // Return drone
        this.tweens.add({
          targets: this.drone,
          x: width * 0.12, y: height * 0.45,
          duration: 400, ease: 'Power1',
          onComplete: () => {
            this.updateHUD();
            this.checkWin();
            // Wake blocked satellite
            if (this.satelliteBlocked && this.sFull > 0) {
              this.satelliteBlocked = false;
              this.time.delayedCall(300, () => this.tryConsume());
            }
          },
        });
      },
    });
  }

  // ── consume (wait S_full → consume → signal S_empty) ─
  protected onSatelliteClick() {
    if (this.gamePhase !== 'playing' || !this.cfg.isManual) return;
    this.tryConsume();
  }

  protected tryConsume() {
    if (this.sFull === 0) {
      this.satelliteBlocked = true;
      this.showBlockedIndicator('consumer');
      this.showMessage('⛔ Buffer EMPTY! S_full = 0 → Consumer blocks', '#4488FF', 2000);
      return;
    }
    if (this.cfg.mutexRequired && this.mutexLocked) {
      this.showMessage('🔒 Mutex locked — wait for release', '#CC88FF', 1500);
      return;
    }

    this.satelliteBlocked = false;

    if (this.cfg.mutexRequired && !this.mutexLocked && this.droneState === 'depositing') {
      this.raceConditionPenalty();
      return;
    }

    this.performConsume();
  }

  private performConsume() {
    this.satelliteState = 'consuming';

    // find last filled slot
    const slot = this.buffer.lastIndexOf(true);
    if (slot === -1) return;

    if (!this.cfg.mutexRequired) this.mutexLocked = true;

    const { width, height } = this.scale;
    const slotW = 36, gap = 4;
    const totalW = this.cfg.bufferSize * (slotW + gap) - gap;
    const startX = width / 2 - totalW / 2;
    const targetX = startX + slot * (slotW + gap) + slotW / 2;

    this.tweens.add({
      targets: this.satellite,
      x: targetX, y: height * 0.58,
      duration: 500, ease: 'Power2',
      onComplete: () => {
        this.buffer[slot] = false;
        this.sFull--;
        this.sEmpty++;
        this.totalConsumed++;
        this.score += 10;

        // Show beam effect
        this.showTransmitBeam();
        this.showMessage(`wait(S_full)→consume→signal(S_empty)  S_full=${this.sFull} S_empty=${this.sEmpty}`, '#FFD700', 1600);

        if (!this.cfg.mutexRequired) this.mutexLocked = false;
        this.satelliteState = 'idle';

        this.tweens.add({
          targets: this.satellite,
          x: width * 0.88, y: height * 0.38,
          duration: 400, ease: 'Power1',
          onComplete: () => {
            this.updateHUD();
            this.checkWin();
            // Wake blocked drone
            if (this.droneBlocked && this.sEmpty > 0) {
              this.droneBlocked = false;
              this.time.delayedCall(300, () => this.tryProduce());
            }
          },
        });
      },
    });
  }

  // ── mutex (L2) ────────────────────────────────
  protected onMutexClick() {
    if (!this.cfg.mutexRequired || this.gamePhase !== 'playing') return;

    if (this.mutexLocked) {
      // manual unlock
      this.mutexLocked = false;
      this.mutexShield.setAlpha(0.15);
      this.mutexShield.clearTint();
      this.updateHUD();
      this.showMessage('signal(mutex) — Critical section released', '#CC88FF', 1200);
    } else {
      // manual lock
      this.mutexLocked = true;
      this.mutexShield.setAlpha(0.9);
      this.mutexShield.setTint(0xCC88FF);
      this.updateHUD();
      this.showMessage('wait(mutex) — Critical section locked', '#CC88FF', 1200);
    }
  }

  // ── L2 race condition ─────────────────────────
  private raceConditionPenalty() {
    this.lives--;
    this.showMessage('💥 RACE CONDITION! Data corrupted! Mutex required!', '#FF2222', 3000);
    this.cameras.main.shake(500, 0.012);

    // Flash red
    const flash = this.add.graphics().setDepth(50);
    flash.fillStyle(0xFF0000, 0.3); flash.fillRect(0, 0, this.scale.width, this.scale.height);
    this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });

    this.updateHUD();
    if (this.lives <= 0) this.gameLost();
  }

  // ── L3 solar storm ────────────────────────────
  protected triggerSolarStorm() {
    if (this.gamePhase !== 'playing') return;
    this.stormActive = true;

    this.stormOverlay = this.add.graphics().setDepth(8);
    this.stormOverlay.fillStyle(0xFF6600, 0.12);
    this.stormOverlay.fillRect(0, 0, this.scale.width, this.scale.height);

    this.showMessage('☀️ SOLAR STORM! Drone production 3x faster!', '#FF8800', 3000);
    this.instructionText.setText('⚡ Storm active! Click SATELLITE rapidly or click OVERCLOCK!');

    // Triple producer speed
    if (this.producerTimer) {
      this.producerTimer.remove();
      this.producerTimer = this.time.addEvent({
        delay: Math.floor(this.cfg.producerInterval / 3),
        callback: () => this.tryProduce(),
        loop: true,
      });
    }

    this.showOverclockButton();
  }

  private showOverclockButton() {
    const { width, height } = this.scale;
    const btn = this.add.graphics().setDepth(10);
    btn.fillStyle(0xFF4400, 1); btn.fillRoundedRect(width * 0.88 - 60, height * 0.62, 120, 40, 8);
    btn.setInteractive(
      new Phaser.Geom.Rectangle(width * 0.88 - 60, height * 0.62, 120, 40),
      Phaser.Geom.Rectangle.Contains
    );
    const lbl = this.add.text(width * 0.88, height * 0.62 + 20, '⚡ OVERCLOCK', {
      fontSize: '13px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    btn.on('pointerdown', () => {
      if (this.overclockActive) return;
      this.overclockActive = true;
      if (this.consumerTimer) {
        this.consumerTimer.remove();
        this.consumerTimer = this.time.addEvent({
          delay: Math.floor(this.cfg.consumerInterval / 3),
          callback: () => this.tryConsume(),
          loop: true,
        });
      }
      this.showMessage('⚡ Consumer overclocked! Draining buffer fast!', '#FFAA00', 2000);
      this.time.delayedCall(10000, () => {
        this.overclockActive = false;
        if (this.consumerTimer) {
          this.consumerTimer.remove();
          this.consumerTimer = this.time.addEvent({
            delay: this.cfg.consumerInterval,
            callback: () => this.tryConsume(),
            loop: true,
          });
        }
        btn.destroy(); lbl.destroy();
      });
    });
    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout', () => btn.setAlpha(1));
  }

  // ── helpers ───────────────────────────────────
  private showBlockedIndicator(who: 'producer' | 'consumer') {
    const { width, height } = this.scale;
    const key = who === 'producer' ? 'ui-producer-blocked' : 'ui-consumer-blocked';
    const x = who === 'producer' ? width * 0.12 : width * 0.88;
    const ind = this.add.image(x, height * 0.28, key)
      .setDisplaySize(160, 36).setDepth(15);
    this.tweens.add({ targets: ind, alpha: 0, duration: 2500, onComplete: () => ind.destroy() });
  }

  private showTransmitBeam() {
    const { width } = this.scale;
    this.transmitBeam.setVisible(true).setAlpha(1);
    this.transmitBeam.setPosition(width * 0.68, this.scale.height * 0.38);
    this.transmitBeam.setDisplaySize(width * 0.25, 20);
    this.tweens.add({
      targets: this.transmitBeam, alpha: 0,
      duration: 800, onComplete: () => this.transmitBeam.setVisible(false),
    });
  }

  protected showMessage(text: string, color: string, duration = 2000) {
    const { width, height } = this.scale;
    const msg = this.add.text(width / 2, height * 0.18, text, {
      fontSize: '15px', color,
      backgroundColor: '#00000099', padding: { x: 12, y: 6 },
      fontStyle: 'bold', wordWrap: { width: width * 0.8 }, align: 'center',
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({ targets: msg, alpha: 0, y: msg.y - 30, duration, onComplete: () => msg.destroy() });
  }

  // ── win / lose ────────────────────────────────
  private checkWin() {
    if (this.totalConsumed >= this.cfg.targetProduced) {
      this.time.delayedCall(500, () => this.gameWon());
    }
  }

  private gameWon() {
    if (this.gamePhase === 'completed') return;
    this.gamePhase = 'completed';
    this.producerTimer?.remove();
    this.consumerTimer?.remove();
    this.submitScore();
    this.showEndModal(true);
  }

  private gameLost() {
    this.gamePhase = 'completed';
    this.producerTimer?.remove();
    this.consumerTimer?.remove();
    this.showEndModal(false);
  }

  private showEndModal(won: boolean) {
    const { width, height } = this.scale;
    const ov = this.add.graphics().setDepth(200);
    ov.fillStyle(0x000000, 0.88); ov.fillRect(0, 0, width, height);

    const bw = 460, bh = 340;
    const bx = width / 2 - bw / 2, by = height / 2 - bh / 2;
    const box = this.add.graphics().setDepth(201);
    const borderColor = won ? 0x00FF88 : 0xFF4444;
    box.fillStyle(won ? 0x021a05 : 0x1a0202, 0.98);
    box.fillRoundedRect(bx, by, bw, bh, 18);
    box.lineStyle(3, borderColor, 1);
    box.strokeRoundedRect(bx, by, bw, bh, 18);

    this.add.text(width / 2, by + 50, won ? '🎉 LEVEL COMPLETE!' : '💀 SYSTEM FAILURE', {
      fontSize: '30px', color: won ? '#00FF88' : '#FF4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
    this.add.text(width / 2, by + 160, [
      `Packets transmitted: ${this.totalConsumed}`,
      `Score:               ${this.score}`,
      `Time:                ${elapsed}s`,
    ].join('\n'), {
      fontSize: '17px', color: '#FFFFFF', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setDepth(202);

    const btnX = width / 2 - 90, btnY = by + bh - 75;
    const btn = this.add.graphics().setDepth(202);
    btn.fillStyle(won ? 0x00AA55 : 0xAA2200, 1);
    btn.fillRoundedRect(btnX, btnY, 180, 46, 10);
    btn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, 180, 46), Phaser.Geom.Rectangle.Contains);
    this.add.text(width / 2, btnY + 23, '🔄 PLAY AGAIN', {
      fontSize: '19px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(203);
    btn.on('pointerdown', () => this.scene.restart());
  }

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
          score: this.score,
          timeSpent,
          accuracy: this.lives === 3 ? 100 : Math.max(0, this.lives * 33),
          wrongAttempts: 3 - this.lives,
          metadata: { totalConsumed: this.totalConsumed, bufferSize: this.cfg.bufferSize },
        }),
      });
    } catch (e) { console.error('Score submit failed', e); }
  }
}

// ─────────────────────────────────────────────
//  Level 1 – Manual Transmission
//  Player clicks drone to produce, satellite to consume
// ─────────────────────────────────────────────
export class ProducerConsumerL1Scene extends ProducerConsumerBase {
  constructor() {
    super({
      key: 'ProducerConsumerL1Scene',
      bufferSize: BUFFER_SIZE,
      producerInterval: 0,
      consumerInterval: 0,
      isManual: true,
      mutexRequired: false,
      targetProduced: 15,
      solarStorm: false,
      gameId: 'producer-consumer-l1',
      levelId: 'l1',
    });
  }

  protected levelSubtitle() { return 'Level 1 — Manual Transmission: The Bounded Buffer'; }

  protected howToPlayLines(): string[] {
    return [
      '  • Click the DRONE (left) to drop a data packet → wait(S_empty) → deposit → signal(S_full)',
      '  • Click the SATELLITE (right) to transmit a packet → wait(S_full) → consume → signal(S_empty)',
      '  • Try to DROP when buffer is FULL → see the block!',
      '  • Try to TRANSMIT when buffer is EMPTY → see the stall!',
      '  • No mutex needed yet — you are the scheduler!',
    ];
  }

  protected playingInstruction(): string {
    return 'Click DRONE to produce a packet  |  Click SATELLITE to consume';
  }
}

// ─────────────────────────────────────────────
//  Level 2 – Automated Sync (Race Conditions & Mutex)
//  Auto-timers run; player must manage mutex shield
// ─────────────────────────────────────────────
export class ProducerConsumerL2Scene extends ProducerConsumerBase {
  constructor() {
    super({
      key: 'ProducerConsumerL2Scene',
      bufferSize: BUFFER_SIZE,
      producerInterval: 2800,
      consumerInterval: 3200,
      isManual: false,
      mutexRequired: true,
      targetProduced: 20,
      solarStorm: false,
      gameId: 'producer-consumer-l2',
      levelId: 'l2',
    });
  }

  protected levelSubtitle() { return 'Level 2 — Automated Sync: Race Conditions & Mutex'; }

  protected howToPlayLines(): string[] {
    return [
      '  • Drone and Satellite now operate AUTOMATICALLY on timers',
      '  • Click the MUTEX SHIELD (center glowing dome) to LOCK before an operation',
      '  • If both touch the buffer at the same time WITHOUT the shield → Race Condition! (-1 life)',
      '  • Click shield again to UNLOCK after the operation completes',
      '  • 0 lives = system failure!',
      '  • Tip: Lock before the operation, unlock immediately after',
    ];
  }

  protected playingInstruction(): string {
    return 'Click MUTEX SHIELD to lock/unlock the critical section';
  }
}

// ─────────────────────────────────────────────
//  Level 3 – The Solar Storm (Throughput & Congestion)
//  After 8s a storm triples producer speed; player must overclock consumer
// ─────────────────────────────────────────────
export class ProducerConsumerL3Scene extends ProducerConsumerBase {
  private bufferOverflowWarned = false;

  constructor() {
    super({
      key: 'ProducerConsumerL3Scene',
      bufferSize: BUFFER_SIZE,
      producerInterval: 2200,
      consumerInterval: 2800,
      isManual: false,
      mutexRequired: false,
      targetProduced: 30,
      solarStorm: true,
      gameId: 'producer-consumer-l3',
      levelId: 'l3',
    });
  }

  protected levelSubtitle() { return 'Level 3 — The Solar Storm: Throughput & Congestion'; }

  protected howToPlayLines(): string[] {
    return [
      '  • System runs automatically — drone produces, satellite consumes',
      '  • After ~8 seconds, a SOLAR STORM triples the drone\'s production rate!',
      '  • The buffer will fill up → S_empty = 0 → Producer blocks → congestion!',
      '  • Click ⚡ OVERCLOCK button when it appears to triple consumer speed',
      '  • Balance production vs consumption to prevent total overflow',
      '  • If the system stalls (buffer full, nothing consumed for 10s) → lives lost',
    ];
  }

  protected playingInstruction(): string {
    return 'System auto-running — watch for SOLAR STORM! Use ⚡ OVERCLOCK when needed';
  }

  protected startGame() {
    super.startGame();
    // Deadlock watchdog — if buffer has been full for too long
    this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        if (this.gamePhase !== 'playing') return;
        if (this.sFull >= this.cfg.bufferSize && !this.bufferOverflowWarned) {
          this.bufferOverflowWarned = true;
          this.showMessage('🔴 BUFFER OVERFLOW! Reduce production or overclock consumer!', '#FF4444', 3000);
          this.lives--;
          this.updateHUD();
          if (this.lives <= 0) {
            this.gamePhase = 'completed';
            this.producerTimer?.remove();
            this.consumerTimer?.remove();
            const { width, height } = this.scale;
            const ov = this.add.graphics().setDepth(200);
            ov.fillStyle(0x000000, 0.88); ov.fillRect(0, 0, width, height);
            this.add.text(width / 2, height / 2, '💀 SYSTEM OVERLOAD\nBuffer congestion killed the station', {
              fontSize: '26px', color: '#FF4444', align: 'center',
              backgroundColor: '#000000CC', padding: { x: 20, y: 14 },
            }).setOrigin(0.5).setDepth(201);
          }
        } else {
          this.bufferOverflowWarned = false;
        }
      },
    });
  }
}