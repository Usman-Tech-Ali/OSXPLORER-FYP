import Phaser from 'phaser';
import { openAIFeedbackChat } from '../../shared/aiFeedbackChat';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Constants & Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const N = 5; // number of philosophers / valves
const ASSET_PATH = '/games/process-synchronization/dining-philosopher/';

type PhilosopherState = 'thinking' | 'hungry' | 'waiting_left' | 'waiting_right' | 'eating' | 'deadlocked' | 'starving';
type ValveState = 'free' | 'held';

interface Philosopher {
  id: number;           // 0-4
  state: PhilosopherState;
  heat: number;         // 0-100: rises when hungry/waiting, drops when eating
  heldLeft: boolean;
  heldRight: boolean;
  cooldownMs: number;   // eating duration remaining
  hungerRate: number;   // heat increase per tick (L3: randomised)
  // display
  consoleSprite: Phaser.GameObjects.Image;
  heatBarBg: Phaser.GameObjects.Graphics;
  heatBarFill: Phaser.GameObjects.Graphics;
  heatText: Phaser.GameObjects.Text;
  stateLabel: Phaser.GameObjects.Text;
  coolantStream?: Phaser.GameObjects.Image;
}

interface Valve {
  id: number;           // 0-4 â€” valve i is BETWEEN philosopher i and (i+1)%N
  state: ValveState;
  heldBy: number | null;
  sprite: Phaser.GameObjects.Image;
}

interface LevelConfig {
  key: string;
  isManual: boolean;          // L1: player clicks to assign valves
  autoGrabLeft: boolean;      // L2: philosophers auto-grab left valve when hungry
  starvationEnabled: boolean; // L3: heat rises at random rates, must prioritise
  heatRisePerTick: number;    // base heat per second when hungry/waiting
  coolPerTick: number;        // heat drop per second while eating
  targetCycles: number;       // win: complete this many eating cycles
  hungerInterval: number;     // ms before a thinking philosopher gets hungry
  gameId: string;
  levelId: string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Base Scene
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class DiningPhilosophersBase extends Phaser.Scene {
  protected cfg!: LevelConfig;
  protected philosophers: Philosopher[] = [];
  protected valves: Valve[] = [];
  protected completedCycles = 0;
  protected deadlockCount = 0;
  protected meltdownCount = 0;
  protected gameStartTime = 0;
  protected gamePhase: 'intro' | 'playing' | 'completed' = 'intro';
  protected scramBtn!: Phaser.GameObjects.Image;
  protected scramLabel!: Phaser.GameObjects.Text;
  protected cycleText!: Phaser.GameObjects.Text;
  protected deadlockText!: Phaser.GameObjects.Text;
  protected instructionText!: Phaser.GameObjects.Text;
  protected mainTicker?: Phaser.Time.TimerEvent;
  protected reactorCore!: Phaser.GameObjects.Image;
  // layout
  protected cx!: number;
  protected cy!: number;
  protected ringR!: number;  // radius for philosopher placement
  protected valveR!: number; // radius for valve placement

  constructor(cfg: LevelConfig) {
    super({ key: cfg.key });
    this.cfg = cfg;
  }

  // â”€â”€ preload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  preload() {
    this.load.image('reactor-bg', `${ASSET_PATH}Nuclear-Reactor-Core.png`);
    this.load.image('console-idle', `${ASSET_PATH}Cooling-Sector-Console-Idle.png`);
    this.load.image('console-cooling', `${ASSET_PATH}Cooling-Sector-Console-Cooling.png`);
    this.load.image('valve-normal', `${ASSET_PATH}Valve-Normal.png`);
    this.load.image('valve-deadlocked', `${ASSET_PATH}Valve-Deadlocked.png`);
    this.load.image('scram', `${ASSET_PATH}Emergency-SCRAM-Switch.png`);
    this.load.image('coolant-stream', `${ASSET_PATH}Execution-Stream.png`);
    this.load.image('heat-gauge', `${ASSET_PATH}Sector-Temperature-Indicator.png`);
  }

  // â”€â”€ create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;
    this.cy = height * 0.50;
    this.ringR = Math.min(width, height) * 0.31;
    this.valveR = this.ringR * 0.58;
    this.completedCycles = 0;
    this.deadlockCount = 0;
    this.meltdownCount = 0;
    this.gamePhase = 'intro';
    this.philosophers = [];
    this.valves = [];

    this.buildBackground(width, height);
    this.buildValves();
    this.buildPhilosophers();
    this.buildScram(width, height);
    this.buildHUD(width, height);
    this.showIntroModal();
  }

  // â”€â”€ background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private buildBackground(w: number, h: number) {
    // dark bg
    this.add.rectangle(w / 2, h / 2, w, h, 0x080c10).setDepth(0);
    this.reactorCore = this.add.image(this.cx, this.cy, 'reactor-bg')
      .setDisplaySize(this.ringR * 2.6, this.ringR * 2.6).setDepth(1).setAlpha(0.92);
  }

  // â”€â”€ valves (forks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private buildValves() {
    for (let i = 0; i < N; i++) {
      const angle = (2 * Math.PI * i) / N - Math.PI / 2 + Math.PI / N;
      const vx = this.cx + this.valveR * Math.cos(angle);
      const vy = this.cy + this.valveR * Math.sin(angle);

      const sprite = this.add.image(vx, vy, 'valve-normal')
        .setDisplaySize(62, 62).setDepth(5)
        .setInteractive({ useHandCursor: true });

      const valve: Valve = { id: i, state: 'free', heldBy: null, sprite };
      this.valves.push(valve);

      if (this.cfg.isManual) {
        sprite.on('pointerover', () => { if (valve.state === 'free') sprite.setTint(0xaaffcc); });
        sprite.on('pointerout', () => sprite.clearTint());
        sprite.on('pointerdown', () => this.onValveClick(valve));
      }
    }
  }

  // â”€â”€ philosophers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private buildPhilosophers() {
    const labels = ['S-1', 'S-2', 'S-3', 'S-4', 'S-5'];
    for (let i = 0; i < N; i++) {
      const angle = (2 * Math.PI * i) / N - Math.PI / 2;
      const px = this.cx + this.ringR * Math.cos(angle);
      const py = this.cy + this.ringR * Math.sin(angle);

      const consoleSprite = this.add.image(px, py, 'console-idle')
        .setDisplaySize(100, 90).setDepth(6)
        .setInteractive({ useHandCursor: true });
      consoleSprite.setRotation(angle + Math.PI / 2);

      // heat bar background
      const barW = 80, barH = 10;
      const heatBarBg = this.add.graphics().setDepth(8);
      heatBarBg.fillStyle(0x333333, 1);
      heatBarBg.fillRect(px - barW / 2, py + 52, barW, barH);

      const heatBarFill = this.add.graphics().setDepth(9);

      const heatText = this.add.text(px, py + 44, '0Â°', {
        fontSize: '11px', color: '#AAFFAA', fontFamily: 'monospace',
        backgroundColor: '#00000088', padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(10);

      const stateLabel = this.add.text(px, py - 56, labels[i], {
        fontSize: '12px', color: '#FFFFFF', fontStyle: 'bold',
        backgroundColor: '#00000099', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(10);

      const p: Philosopher = {
        id: i,
        state: 'thinking',
        heat: 0,
        heldLeft: false,
        heldRight: false,
        cooldownMs: 0,
        hungerRate: this.cfg.heatRisePerTick + (this.cfg.starvationEnabled ? Math.random() * 8 : 0),
        consoleSprite,
        heatBarBg,
        heatBarFill,
        heatText,
        stateLabel,
      };
      this.philosophers.push(p);

      consoleSprite.on('pointerover', () => { if (p.state === 'hungry' || p.state === 'waiting_left' || p.state === 'starving') consoleSprite.setTint(0xffff88); });
      consoleSprite.on('pointerout', () => consoleSprite.clearTint());
      consoleSprite.on('pointerdown', () => this.onPhilosopherClick(p));
    }
  }

  // â”€â”€ SCRAM button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private buildScram(w: number, h: number) {
    this.scramBtn = this.add.image(w * 0.5, h * 0.93, 'scram')
      .setDisplaySize(80, 80).setDepth(12)
      .setInteractive({ useHandCursor: true });
    this.scramBtn.on('pointerdown', () => this.triggerScram());
    this.scramBtn.on('pointerover', () => this.scramBtn.setTint(0xffaaaa));
    this.scramBtn.on('pointerout', () => this.scramBtn.clearTint());

    this.scramLabel = this.add.text(w * 0.5, h * 0.93 + 48, 'SCRAM\n(release all valves)', {
      fontSize: '10px', color: '#FFD700', align: 'center', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(12);
  }

  // â”€â”€ HUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private buildHUD(w: number, h: number) {
    const style = (c = '#FFFFFF') => ({
      fontSize: '14px', color: c, fontFamily: 'monospace',
      backgroundColor: '#00000099', padding: { x: 6, y: 3 },
    });
    this.cycleText = this.add.text(16, 16, '', style('#00FFCC')).setDepth(12);
    this.deadlockText = this.add.text(16, 44, '', style('#FF6644')).setDepth(12);
    this.instructionText = this.add.text(w / 2, h * 0.06, '', {
      fontSize: '13px', color: '#FFFFFF', backgroundColor: '#000000AA',
      padding: { x: 10, y: 4 }, align: 'center', wordWrap: { width: w * 0.7 },
    }).setOrigin(0.5).setDepth(12);
    this.updateHUD();
  }

  protected updateHUD() {
    this.cycleText?.setText(`Cooling Cycles: ${this.completedCycles}/${this.cfg.targetCycles}`);
    this.deadlockText?.setText(`Deadlocks: ${this.deadlockCount}  |  Meltdowns: ${this.meltdownCount}`);
  }

  // â”€â”€ valve colour helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected refreshValveSprite(v: Valve) {
    if (v.state === 'held') {
      v.sprite.setTexture('valve-normal').setTint(0x00FFCC);
    } else {
      v.sprite.setTexture('valve-normal').clearTint();
    }
  }

  protected refreshConsole(p: Philosopher) {
    const { width, height } = this.scale;
    const angle = (2 * Math.PI * p.id) / N - Math.PI / 2;
    const px = this.cx + this.ringR * Math.cos(angle);
    const py = this.cy + this.ringR * Math.sin(angle);

    if (p.state === 'eating') {
      p.consoleSprite.setTexture('console-cooling').clearTint();
    } else {
      p.consoleSprite.setTexture('console-idle');
      if (p.state === 'starving' || p.heat >= 90) p.consoleSprite.setTint(0xFF3333);
      else if (p.heat >= 60) p.consoleSprite.setTint(0xFF9900);
      else if (p.state === 'hungry' || p.state === 'waiting_left' || p.state === 'waiting_right') p.consoleSprite.setTint(0xFFEE66);
      else p.consoleSprite.clearTint();
    }

    // heat bar
    const barW = 80, barH = 10;
    p.heatBarFill.clear();
    const pct = Math.min(p.heat / 100, 1);
    const fillColor = pct > 0.85 ? 0xFF2222 : pct > 0.55 ? 0xFF8800 : 0x22CC44;
    p.heatBarFill.fillStyle(fillColor, 1);
    p.heatBarFill.fillRect(px - barW / 2, py + 52, barW * pct, barH);

    p.heatText.setText(`${Math.floor(p.heat)}Â°`);
    p.heatText.setColor(pct > 0.85 ? '#FF4444' : pct > 0.55 ? '#FFAA00' : '#AAFFAA');

    const stateColors: Record<PhilosopherState, string> = {
      thinking: '#88BBFF', hungry: '#FFEE66',
      waiting_left: '#FFB833', waiting_right: '#FF8800',
      eating: '#00FFCC', deadlocked: '#FF2222', starving: '#FF0000',
    };
    p.stateLabel.setColor(stateColors[p.state] ?? '#FFFFFF');
    p.stateLabel.setText(`S-${p.id + 1} [${p.state.toUpperCase().replace('_', ' ')}]`);
  }

  // â”€â”€ intro modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private showIntroModal() {
    const { width, height } = this.scale;
    const ov = this.add.graphics().setDepth(100);
    ov.fillStyle(0x000000, 0.88); ov.fillRect(0, 0, width, height);

    const bw = Math.min(720, width - 40), bh = 560;
    const bx = width / 2 - bw / 2, by = height / 2 - bh / 2;
    const box = this.add.graphics().setDepth(101);
    box.fillStyle(0x050a05, 0.98);
    box.fillRoundedRect(bx, by, bw, bh, 18);
    box.lineStyle(3, 0x00FFCC, 1);
    box.strokeRoundedRect(bx, by, bw, bh, 18);

    this.add.text(width / 2, by + 44, 'âš›ï¸ DINING PHILOSOPHERS', {
      fontSize: '26px', color: '#00FFCC', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(width / 2, by + 80, this.levelSubtitle(), {
      fontSize: '15px', color: '#FFD700',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(bx + 36, by + 112, this.introBody(), {
      fontSize: '13px', color: '#D0D0D0', lineSpacing: 5,
      wordWrap: { width: bw - 72 },
    }).setDepth(102);

    const btnW = 200, btnH = 48;
    const btnX = width / 2 - btnW / 2, btnY = by + bh - 70;
    const btn = this.add.graphics().setDepth(102);
    btn.fillStyle(0x006633, 1); btn.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    btn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    this.add.text(width / 2, btnY + 24, 'âš›ï¸ INITIATE', {
      fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(103);
    btn.on('pointerdown', () => {
      [ov, box, btn].forEach(o => o.destroy());
      this.children.list.filter(c => (c as any).depth >= 101 && (c as any).depth <= 103).forEach(c => c.destroy());
      this.startGame();
    });
  }

  protected levelSubtitle(): string { return 'Nuclear Cooling Logic'; }
  protected introBody(): string {
    return [
      'âš›ï¸ THE SETUP â€” 5 Reactor Sectors, 5 Cooling Valves:',
      '  â€¢ Each SECTOR (Philosopher) sits between two VALVES (Forks)',
      '  â€¢ A sector needs BOTH its left and right valve to start COOLING',
      '  â€¢ A valve can only be held by ONE sector at a time',
      '',
      'ðŸ”„ PHILOSOPHER STATES:',
      '  THINKING â†’ heat stable  |  HUNGRY â†’ heat rising  |  EATING (cooling) â†’ heat falling',
      '',
      'âš ï¸ DEADLOCK: All 5 sectors hold one valve each â†’ no one can cool â†’ system stalls',
      'âš ï¸ STARVATION: A sector never gets both valves â†’ heat reaches 100Â° â†’ MELTDOWN',
      '',
      'ðŸŽ® HOW TO PLAY:',
      ...this.howToPlayLines(),
      '',
      `ðŸŽ¯ GOAL: Complete ${this.cfg.targetCycles} cooling cycles before a meltdown!`,
    ].join('\n');
  }

  protected howToPlayLines(): string[] {
    return [
      '  â€¢ Click a VALVE to assign it to the adjacent hungry sector',
      '  â€¢ Click a SECTOR to manually start cooling (if it holds both valves)',
      '  â€¢ Hit SCRAM to force-release all valves if you detect a deadlock',
    ];
  }

  // â”€â”€ game start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected startGame() {
    this.gamePhase = 'playing';
    this.gameStartTime = Date.now();
    this.instructionText.setText(this.playingInstruction());

    // Schedule hunger events
    this.time.addEvent({
      delay: this.cfg.hungerInterval,
      callback: this.makePhilosophersHungry,
      callbackScope: this,
      loop: true,
    });

    // Main tick: heat management, deadlock detection, eating cooldown
    this.mainTicker = this.time.addEvent({
      delay: 500,
      callback: this.tick,
      callbackScope: this,
      loop: true,
    });
  }

  protected playingInstruction(): string {
    return 'Click VALVES to assign them to hungry sectors. Both valves needed to cool!';
  }

  // â”€â”€ hunger event â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private makePhilosophersHungry() {
    for (const p of this.philosophers) {
      if (p.state === 'thinking' && Math.random() < 0.55) {
        p.state = 'hungry';
        this.refreshConsole(p);
        if (this.cfg.autoGrabLeft) {
          this.time.delayedCall(300, () => this.autoGrabLeft(p));
        }
      }
    }
  }

  // â”€â”€ L2: auto-grab left valve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected autoGrabLeft(p: Philosopher) {
    if (p.state !== 'hungry' && p.state !== 'waiting_right') return;
    const leftValve = this.valves[p.id];
    if (leftValve.state === 'free') {
      leftValve.state = 'held';
      leftValve.heldBy = p.id;
      p.heldLeft = true;
      p.state = 'waiting_right';
      leftValve.sprite.setTexture('valve-normal').setTint(0x00FFCC);
      this.refreshConsole(p);
    }
  }

  // â”€â”€ tick â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private tick() {
    if (this.gamePhase !== 'playing') return;

    for (const p of this.philosophers) {
      // Heat rise when not eating
      if (p.state !== 'eating' && p.state !== 'thinking') {
        p.heat = Math.min(100, p.heat + p.hungerRate * 0.5);
        if (p.heat >= 100) {
          this.meltdownCount++;
          this.showMessage(`ðŸ”´ MELTDOWN! Sector ${p.id + 1} overheated! (Starvation)`, '#FF2222', 3000);
          this.cameras.main.shake(500, 0.015);
          this.resetPhilosopher(p);
          this.updateHUD();
          if (this.meltdownCount >= 3) { this.gameLost(); return; }
        } else if (p.heat >= 80 && p.state !== 'starving') {
          p.state = 'starving';
          this.refreshConsole(p);
        }
      }

      // Cool down when eating
      if (p.state === 'eating') {
        p.heat = Math.max(0, p.heat - this.cfg.coolPerTick * 0.5);
        p.cooldownMs -= 500;
        if (p.cooldownMs <= 0) this.finishCooling(p);
      }

      this.refreshConsole(p);
    }

    // Deadlock detection: every sector holds one valve and none are eating
    this.detectDeadlock();
    this.updateHUD();
  }

  // â”€â”€ deadlock detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private detectDeadlock() {
    const eatingCount = this.philosophers.filter(p => p.state === 'eating').length;
    const heldTotal = this.valves.filter(v => v.state === 'held').length;
    const hungerCount = this.philosophers.filter(p =>
      p.state === 'hungry' || p.state === 'waiting_left' || p.state === 'waiting_right' || p.state === 'starving'
    ).length;

    if (heldTotal === N && eatingCount === 0 && hungerCount > 0) {
      // DEADLOCK
      this.deadlockCount++;
      for (const v of this.valves) v.sprite.setTexture('valve-deadlocked').clearTint();
      this.showMessage('ðŸ”’ DEADLOCK DETECTED! All sectors hold one valve. Hit SCRAM!', '#FF2222', 3000);
      this.time.delayedCall(3200, () => {
        for (const v of this.valves) this.refreshValveSprite(v);
      });
    }
  }

  // â”€â”€ SCRAM: release all valves â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected triggerScram() {
    if (this.gamePhase !== 'playing') return;
    for (const v of this.valves) {
      v.state = 'free'; v.heldBy = null;
      v.sprite.setTexture('valve-normal').clearTint();
    }
    for (const p of this.philosophers) {
      if (p.state !== 'eating' && p.state !== 'thinking') {
        p.heldLeft = false; p.heldRight = false;
        p.state = 'hungry';
        this.refreshConsole(p);
      }
    }
    this.showMessage('ðŸ”“ SCRAM! All valves released â€” system reset.', '#FFD700', 2000);
  }

  // â”€â”€ valve click (L1 manual) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected onValveClick(v: Valve) {
    if (!this.cfg.isManual || this.gamePhase !== 'playing') return;

    if (v.state === 'held') {
      // Free the valve
      const holder = this.philosophers[v.heldBy!];
      if (v.heldBy === v.id) { holder.heldLeft = false; }
      else { holder.heldRight = false; }
      if (holder.state === 'waiting_right') holder.state = 'hungry';
      v.state = 'free'; v.heldBy = null;
      this.refreshValveSprite(v);
      this.refreshConsole(holder);
      return;
    }

    // Try to assign to best adjacent hungry philosopher
    const left = (v.id + 1) % N;   // philosopher whose left this is
    const right = v.id;              // philosopher whose right this is

    const pLeft = this.philosophers[left];
    const pRight = this.philosophers[right];

    // Prefer the one that is starving / hotter
    let target: Philosopher | null = null;
    if ((pLeft.state === 'hungry' || pLeft.state === 'starving') && !pLeft.heldLeft) {
      target = pLeft;
    } else if ((pRight.state === 'hungry' || pRight.state === 'starving') && !pRight.heldRight) {
      target = pRight;
    }

    if (!target) {
      this.showMessage('No hungry adjacent sector needs this valve right now.', '#FFAA00', 1200);
      return;
    }

    v.state = 'held'; v.heldBy = target.id;
    if (target.id === left) { target.heldLeft = true; }
    else { target.heldRight = true; }

    this.refreshValveSprite(v);

    // Check if target now has both
    if (target.heldLeft && target.heldRight) {
      this.startCooling(target);
    } else {
      target.state = target.heldLeft ? 'waiting_right' : 'waiting_left';
      this.refreshConsole(target);
    }
  }

  // â”€â”€ philosopher click â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected onPhilosopherClick(p: Philosopher) {
    if (this.gamePhase !== 'playing') return;
    if (p.state === 'eating') return;

    if (p.heldLeft && p.heldRight) {
      this.startCooling(p);
      return;
    }

    // L1 hint
    if (this.cfg.isManual) {
      const leftId = p.id;
      const rightId = (p.id + N - 1) % N;
      const info = `Sector ${p.id + 1}: needs valve ${leftId + 1} (left) and valve ${rightId + 1} (right)`;
      this.showMessage(info, '#88CCFF', 1800);
    }
  }

  // â”€â”€ cooling start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected startCooling(p: Philosopher) {
    p.state = 'eating';
    p.cooldownMs = 4000;
    p.consoleSprite.setTexture('console-cooling').clearTint();
    this.showMessage(`âœ… Sector ${p.id + 1} COOLING â€” both valves acquired!`, '#00FFCC', 1500);
    this.refreshConsole(p);
  }

  // â”€â”€ cooling done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private finishCooling(p: Philosopher) {
    this.completedCycles++;

    // Release valves
    const lv = this.valves[p.id];
    const rv = this.valves[(p.id + N - 1) % N];
    lv.state = 'free'; lv.heldBy = null;
    rv.state = 'free'; rv.heldBy = null;
    this.refreshValveSprite(lv);
    this.refreshValveSprite(rv);

    p.heldLeft = false; p.heldRight = false;
    p.state = 'thinking';
    p.consoleSprite.setTexture('console-idle').clearTint();
    this.refreshConsole(p);
    this.updateHUD();

    if (this.completedCycles >= this.cfg.targetCycles) {
      this.time.delayedCall(500, () => this.gameWon());
    }
  }

  // â”€â”€ reset single philosopher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private resetPhilosopher(p: Philosopher) {
    const lv = this.valves[p.id];
    const rv = this.valves[(p.id + N - 1) % N];
    if (lv.heldBy === p.id) { lv.state = 'free'; lv.heldBy = null; this.refreshValveSprite(lv); }
    if (rv.heldBy === p.id) { rv.state = 'free'; rv.heldBy = null; this.refreshValveSprite(rv); }
    p.heldLeft = false; p.heldRight = false;
    p.heat = 20;
    p.state = 'thinking';
    p.consoleSprite.setTexture('console-idle').clearTint();
  }

  // â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  protected showMessage(text: string, color: string, duration = 2000) {
    const { width, height } = this.scale;
    const msg = this.add.text(width / 2, height * 0.13, text, {
      fontSize: '15px', color, backgroundColor: '#00000099',
      padding: { x: 12, y: 6 }, fontStyle: 'bold',
      wordWrap: { width: width * 0.75 }, align: 'center',
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: msg, alpha: 0, y: msg.y - 30, duration, onComplete: () => msg.destroy() });
  }

  // â”€â”€ win / lose â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private gameWon() {
    if (this.gamePhase === 'completed') return;
    this.gamePhase = 'completed';
    this.mainTicker?.remove();

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
    this.showEndModal(true);
  }

  private gameLost() {
    if (this.gamePhase === 'completed') return;
    this.gamePhase = 'completed';
    this.mainTicker?.remove();
    this.showEndModal(false);
  }

  private showEndModal(won: boolean) {
    const { width, height } = this.scale;
    const ov = this.add.graphics().setDepth(200);
    ov.fillStyle(0x000000, 0.88); ov.fillRect(0, 0, width, height);

    const bw = 460, bh = 340;
    const bx = width / 2 - bw / 2, by = height / 2 - bh / 2;
    const box = this.add.graphics().setDepth(201);
    box.fillStyle(won ? 0x021a05 : 0x1a0202, 0.98);
    box.fillRoundedRect(bx, by, bw, bh, 18);
    box.lineStyle(3, won ? 0x00FF88 : 0xFF4444, 1);
    box.strokeRoundedRect(bx, by, bw, bh, 18);

    this.add.text(width / 2, by + 50, won ? 'âœ… COOLING COMPLETE!' : 'ðŸ’€ REACTOR FAILURE', {
      fontSize: '28px', color: won ? '#00FF88' : '#FF4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
    this.add.text(width / 2, by + 160, [
      `Cycles completed: ${this.completedCycles}`,
      `Deadlocks hit:    ${this.deadlockCount}`,
      `Meltdowns:        ${this.meltdownCount}`,
      `Time:             ${elapsed}s`,
    ].join('\n'), {
      fontSize: '16px', color: '#FFFFFF', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setDepth(202);

    const btnX = width / 2 - 90, btnY = by + bh - 72;
    const btn = this.add.graphics().setDepth(202);
    btn.fillStyle(won ? 0x00AA55 : 0xAA2200, 1);
    btn.fillRoundedRect(btnX, btnY, 180, 46, 10);
    btn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, 180, 46), Phaser.Geom.Rectangle.Contains);
    this.add.text(width / 2, btnY + 23, 'ðŸ”„ PLAY AGAIN', {
      fontSize: '18px', color: '#FFFFFF', fontStyle: 'bold',
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
          score: this.completedCycles * 10 - this.deadlockCount * 5 - this.meltdownCount * 10,
          timeSpent,
          accuracy: Math.max(0, 100 - this.deadlockCount * 10 - this.meltdownCount * 20),
          wrongAttempts: this.deadlockCount + this.meltdownCount,
          metadata: { cycles: this.completedCycles, deadlocks: this.deadlockCount },
        }),
      });
    } catch (e) { console.error('Score submit failed', e); }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Level 1 â€“ The Training Run (Manual, no auto-grab)
//  Player manually assigns valves to hungry sectors
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class DiningPhilosophersL1Scene extends DiningPhilosophersBase {
  constructor() {
    super({
      key: 'DiningPhilosophersL1Scene',
      isManual: true,
      autoGrabLeft: false,
      starvationEnabled: false,
      heatRisePerTick: 6,
      coolPerTick: 14,
      targetCycles: 10,
      hungerInterval: 4000,
      gameId: 'dining-philosopher-l1',
      levelId: 'l1',
    });
  }

  protected levelSubtitle() { return 'Level 1 â€” The Training Run: Resource Contention'; }

  protected howToPlayLines(): string[] {
    return [
      '  â€¢ Sectors heat up and become HUNGRY (yellow glow)',
      '  â€¢ Click a VALVE to assign it to the adjacent hungry sector',
      '  â€¢ Once a sector holds BOTH its valves â†’ it auto-starts COOLING',
      '  â€¢ Two ADJACENT sectors share a valve â€” they CANNOT cool at the same time',
      '  â€¢ Click SCRAM if things get stuck (costs no penalty at L1)',
    ];
  }

  protected playingInstruction(): string {
    return 'Sectors heating up! Click VALVES to assign them to hungry sectors.';
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Level 2 â€“ The Logic Lock (Deadlock)
//  Sectors auto-grab their left valve â†’ deadlock risk
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class DiningPhilosophersL2Scene extends DiningPhilosophersBase {
  constructor() {
    super({
      key: 'DiningPhilosophersL2Scene',
      isManual: false,
      autoGrabLeft: true,
      starvationEnabled: false,
      heatRisePerTick: 8,
      coolPerTick: 12,
      targetCycles: 15,
      hungerInterval: 3000,
      gameId: 'dining-philosopher-l2',
      levelId: 'l2',
    });
  }

  protected levelSubtitle() { return 'Level 2 â€” The Logic Lock: Deadlock Management'; }

  protected howToPlayLines(): string[] {
    return [
      '  â€¢ Sectors NOW auto-grab their LEFT valve when hungry',
      '  â€¢ If all 5 grab their left valve simultaneously â†’ DEADLOCK (no one can get the right!)',
      '  â€¢ Deadlocked valves turn RED and hiss steam',
      '  â€¢ Click SCRAM immediately to release all valves and break the deadlock',
      '  â€¢ Click a SECTOR to manually grant it the right valve before deadlock forms',
      '  â€¢ 3 meltdowns = failure!',
    ];
  }

  protected playingInstruction(): string {
    return 'Sectors auto-grab left valve! Prevent deadlock â€” click SCRAM if all 5 go red!';
  }

  protected onPhilosopherClick(p: Philosopher) {
    if (this.gamePhase !== 'playing') return;
    // In L2, clicking a sector tries to assign its right valve
    const rightValveId = (p.id + N - 1) % N;
    const rv = this.valves[rightValveId];

    if (p.state === 'waiting_right' && rv.state === 'free') {
      rv.state = 'held'; rv.heldBy = p.id;
      p.heldRight = true;
      this.refreshValveSprite(rv);
      this.startCooling(p);
    } else if (p.state === 'eating') {
      // no-op
    } else {
      this.showMessage(`Sector ${p.id + 1}: waiting for right valve (${rightValveId + 1})`, '#88CCFF', 1400);
    }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Level 3 â€“ Critical Mass (Starvation Prevention)
//  Random heat rates; player must prioritise starving sectors
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class DiningPhilosophersL3Scene extends DiningPhilosophersBase {
  private starvationAlerts = 0;

  constructor() {
    super({
      key: 'DiningPhilosophersL3Scene',
      isManual: true,
      autoGrabLeft: false,
      starvationEnabled: true,
      heatRisePerTick: 10,
      coolPerTick: 10,
      targetCycles: 20,
      hungerInterval: 2500,
      gameId: 'dining-philosopher-l3',
      levelId: 'l3',
    });
  }

  protected levelSubtitle() { return 'Level 3 â€” Critical Mass: Starvation Prevention'; }

  protected howToPlayLines(): string[] {
    return [
      '  â€¢ Each sector heats at a DIFFERENT random rate â€” some burn faster!',
      '  â€¢ Sectors in the RED ZONE (>80Â°) are STARVING â€” prioritise them!',
      '  â€¢ Adjacent sectors share a valve; favouring one may starve its neighbour',
      '  â€¢ Flashing red sector = imminent meltdown if you ignore it',
      '  â€¢ Click SCRAM releases all valves (use when a slow sector blocks a starving one)',
      '  â€¢ 3 meltdowns = reactor failure!',
    ];
  }

  protected playingInstruction(): string {
    return 'Watch heat gauges! Prioritise RED/ORANGE sectors â€” starvation causes meltdown!';
  }

  protected startGame() {
    super.startGame();

    // Starvation watchdog: warn when a sector is starving too long
    this.time.addEvent({
      delay: 6000, loop: true,
      callback: () => {
        for (const p of this.philosophers) {
          if (p.heat >= 80 && p.state !== 'eating') {
            this.starvationAlerts++;
            const flash = this.add.graphics().setDepth(60);
            flash.fillStyle(0xFF0000, 0.18);
            flash.fillRect(0, 0, this.scale.width, this.scale.height);
            this.tweens.add({ targets: flash, alpha: 0, duration: 800, onComplete: () => flash.destroy() });
            this.showMessage(`âš ï¸ STARVATION! Sector ${p.id + 1} critical â€” assign valves NOW!`, '#FF2222', 2500);
            break;
          }
        }
      },
    });
  }
}
