import Phaser from 'phaser';

type PriorityLevel = 1 | 2 | 3 | 4;

interface Plane {
  id: string;
  planeNumber: number;
  priority: PriorityLevel;
  arrivalTime: number;
  burstTime: number;
  remainingBurstTime: number; // for preemption: time left when sent back to queue
  startTime?: number;
  completionTime?: number;
  isCompleted: boolean;
  isOnRunway: boolean;
  container?: Phaser.GameObjects.Container;
  sprite?: Phaser.GameObjects.Sprite;
}

const PRIORITY_ASSETS: Record<PriorityLevel, string> = {
  1: 'plane-p1', 2: 'plane-p2', 3: 'plane-p3', 4: 'plane-p4',
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  1: 'P1 Medical', 2: 'P2 VIP', 3: 'P3 Commercial', 4: 'P4 Cargo',
};

/** Spawn schedule: [time in seconds, priority] */
const SPAWN_SCHEDULE_L2: Array<[number, PriorityLevel]> = [
  [0, 4],   // P4 Green Cargo first
  [3, 1],   // P1 Red Medical – preempt P4!
  [6, 2],   // P2 Gold VIP
  [9, 3],   // P3 Blue
];

export class PriorityGameL2 extends Phaser.Scene {
  private gamePhase: 'intro' | 'playing' | 'results' = 'intro';
  private planes: Plane[] = [];
  private readyQueue: Plane[] = [];
  private completedPlanes: Plane[] = [];
  private currentOnRunway?: Plane;
  private gameStartTime: number = 0;
  private currentTime: number = 0;
  private nextSpawnIndex: number = 0;
  private planeCounter: number = 0;

  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  private readonly RUNWAY_X = 0.75;
  private readonly TAXIWAY_Y = 0.75;

  private totalScore: number = 0;
  private wrongAttempts: number = 0;
  private takeoffProgressEvent?: Phaser.Time.TimerEvent;
  private clockEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'PriorityGameL2' });
  }

  preload() {
    const assetPath = '/games/cpu-scheduling/assets/priority/';
    this.load.image('bg-airport', `${assetPath}Airport-Background.png`);
    this.load.image('plane-p1', `${assetPath}Red-Emergency-Plane.png`);
    this.load.image('plane-p2', `${assetPath}Gold-Private-Plane.png`);
    this.load.image('plane-p3', `${assetPath}Blue-Commercial-Plane.png`);
    this.load.image('plane-p4', `${assetPath}Green-Cargo-Plane.png`);
  }

  create() {
    const { width, height } = this.sys.game.canvas;
    const bg = this.add.image(width / 2, height / 2, 'bg-airport');
    bg.setDisplaySize(width, height);
    bg.setDepth(-100);
    this.createUI(width, height);
    this.showIntroScenario(width, height);
  }

  private createUI(width: number, height: number) {
    this.phaseText = this.add.text(width / 2, 24, 'Phase: Intro', {
      fontSize: '18px', color: '#00FF00', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(20);
    this.scoreText = this.add.text(width - 140, 24, 'Score: 0', {
      fontSize: '16px', color: '#FFD700', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x: 8, y: 4 },
    }).setDepth(20);
    this.timeText = this.add.text(20, 24, 'Time: 0s', {
      fontSize: '16px', color: '#00FFFF', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x: 8, y: 4 },
    }).setDepth(20);
    this.instructionText = this.add.text(width / 2, height - 28, '', {
      fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#000000CC', padding: { x: 12, y: 6 }, align: 'center',
    }).setOrigin(0.5).setDepth(20);
  }

  private showIntroScenario(width: number, height: number) {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);
    const boxWidth = 700;
    const boxHeight = 560;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;
    const box = this.add.graphics();
    box.fillStyle(0x0a0e27, 0.98);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.lineStyle(4, 0xFF6600, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.setDepth(301);

    const title = this.add.text(width / 2, boxY + 48, '✈️ Sky Marshals – Priority L2', {
      fontSize: '32px', color: '#FF6600', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(302);
    const subtitle = this.add.text(width / 2, boxY + 90, 'Preemptive: Higher priority can take the runway!', {
      fontSize: '16px', color: '#E0E0E0',
    }).setOrigin(0.5).setDepth(302);
    const contentY = boxY + 140;
    const howTitle = this.add.text(boxX + 40, contentY, '🎮 Crisis Mode', {
      fontSize: '18px', color: '#FFD700', fontStyle: 'bold',
    }).setDepth(302);
    const howText = this.add.text(boxX + 40, contentY + 28,
      'A lower-priority plane may be on the runway. When a higher-priority plane appears, click it to preempt: the current plane stops, turns back, and returns to the queue. The new plane takes the runway.', {
      fontSize: '14px', color: '#E0E0E0', lineSpacing: 6,
    }).setDepth(302);
    const rulesTitle = this.add.text(boxX + 40, contentY + 130, '⚠️ Rules', {
      fontSize: '18px', color: '#FFD700', fontStyle: 'bold',
    }).setDepth(302);
    const rulesText = this.add.text(boxX + 40, contentY + 158,
      '• Lower number = higher priority. Click highest-priority plane (queue or preempt).\n• Correct: +20 pts  |  Wrong: -10 pts', {
      fontSize: '14px', color: '#E0E0E0', lineSpacing: 6,
    }).setDepth(302);
    const goalTitle = this.add.text(boxX + 40, contentY + 230, '🎯 Goal', {
      fontSize: '18px', color: '#FFD700', fontStyle: 'bold',
    }).setDepth(302);
    const goalText = this.add.text(boxX + 40, contentY + 258,
      'Clear all planes using preemptive priority. Preempt when a higher-priority plane arrives!', {
      fontSize: '14px', color: '#00ff88', fontStyle: '600',
    }).setDepth(302);

    const btnW = 200;
    const btnH = 50;
    const btnX = width / 2 - btnW / 2;
    const btnY = boxY + boxHeight - 72;
    const startBtn = this.add.graphics();
    startBtn.fillStyle(0xFF6600, 1);
    startBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    startBtn.setDepth(302);
    const btnText = this.add.text(width / 2, btnY + 25, '🚀 START', {
      fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(303);
    startBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    const toDestroy = [overlay, box, title, subtitle, howTitle, howText, rulesTitle, rulesText, goalTitle, goalText, startBtn, btnText];
    startBtn.on('pointerdown', () => { toDestroy.forEach(o => o.destroy()); this.startGame(); });
  }

  private startGame() {
    const { width, height } = this.sys.game.canvas;
    this.gamePhase = 'playing';
    this.gameStartTime = this.time.now;
    this.currentTime = 0;
    this.totalScore = 0;
    this.wrongAttempts = 0;
    this.planes = [];
    this.readyQueue = [];
    this.completedPlanes = [];
    this.currentOnRunway = undefined;
    this.nextSpawnIndex = 0;
    this.planeCounter = 0;

    this.phaseText.setText('Phase: Preemptive Priority');
    this.instructionText.setText('Planes will arrive over time. Send highest priority to runway (or preempt).');
    this.scoreText.setText('Score: 0');
    this.timeText.setText('Time: 0s');

    this.clockEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tick,
      callbackScope: this,
      loop: true,
    });
    this.tick(); // run once so spawn at t=0 runs
  }

  private tick() {
    this.currentTime = Math.floor((this.time.now - this.gameStartTime) / 1000);
    this.timeText.setText(`Time: ${this.currentTime}s`);

    while (this.nextSpawnIndex < SPAWN_SCHEDULE_L2.length && SPAWN_SCHEDULE_L2[this.nextSpawnIndex][0] <= this.currentTime) {
      const [, priority] = SPAWN_SCHEDULE_L2[this.nextSpawnIndex];
      this.spawnPlane(priority);
      this.nextSpawnIndex++;
    }
  }

  private spawnPlane(priority: PriorityLevel) {
    const { width, height } = this.sys.game.canvas;
    this.planeCounter++;
    const plane: Plane = {
      id: `plane-${this.planeCounter}`,
      planeNumber: this.planeCounter,
      priority,
      arrivalTime: this.currentTime,
      burstTime: 4,
      remainingBurstTime: 4,
      isCompleted: false,
      isOnRunway: false,
    };
    this.planes.push(plane);
    this.readyQueue.push(plane);

    const taxiY = height * this.TAXIWAY_Y;
    const planeSpacing = 200; // clear space between planes
    const taxiStartX = width * 0.06;
    const idx = this.readyQueue.length - 1;
    const x = taxiStartX + (idx % 4) * planeSpacing;

    const container = this.add.container(x, taxiY);
    const sprite = this.add.sprite(0, 0, PRIORITY_ASSETS[priority]);
    sprite.setScale(0.14);
    container.add(sprite);
    const label = this.add.text(0, 50, `P${priority}`, {
      fontSize: '14px', color: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
      backgroundColor: '#000000AA', padding: { x: 6, y: 2 },
    }).setOrigin(0.5);
    container.add(label);
    plane.container = container;
    plane.sprite = sprite;
    container.setDepth(10);

    container.setInteractive(new Phaser.Geom.Rectangle(-40, -40, 80, 80), Phaser.Geom.Rectangle.Contains);
    container.on('pointerdown', () => this.onPlaneClick(plane));
    container.on('pointerover', () => { if (!plane.isCompleted && !plane.isOnRunway) this.sys.canvas.style.cursor = 'pointer'; });
    container.on('pointerout', () => { this.sys.canvas.style.cursor = 'default'; });

    this.showMessage(`P${priority} (${PRIORITY_LABELS[priority]}) arrived!`, '#00FFFF');

    if (!this.currentOnRunway && this.readyQueue.length > 0) {
      this.time.delayedCall(400, () => this.sendHighestToRunway());
    } else if (this.currentOnRunway && plane.priority < this.currentOnRunway.priority) {
      this.instructionText.setText(`⚠️ Preempt! Click P${plane.priority} to take the runway from P${this.currentOnRunway.priority}.`);
    }
  }

  private sendHighestToRunway() {
    if (this.currentOnRunway || this.readyQueue.length === 0) return;
    const highest = this.readyQueue.reduce((best, p) => (p.priority < best.priority ? p : best));
    this.sendToRunway(highest);
  }

  private onPlaneClick(clicked: Plane) {
    if (this.gamePhase !== 'playing') return;
    if (clicked.isCompleted || clicked.isOnRunway) return;

    const highestInQueue = this.readyQueue.reduce((best, p) => (p.priority < best.priority ? p : best));
    if (clicked.id !== highestInQueue.id) {
      this.wrongAttempts++;
      this.totalScore = Math.max(0, this.totalScore - 10);
      this.scoreText.setText(`Score: ${this.totalScore}`);
      this.showMessage(`Wrong priority! Highest in queue is P${highestInQueue.priority}.`, '#FF0000');
      return;
    }

    if (this.currentOnRunway && clicked.priority < this.currentOnRunway.priority) {
      this.preempt(clicked);
      return;
    }

    if (this.currentOnRunway && clicked.id === this.currentOnRunway.id) {
      this.showMessage('This plane is already on the runway.', '#FFA500');
      return;
    }

    if (!this.currentOnRunway) {
      this.totalScore += 20;
      this.scoreText.setText(`Score: ${this.totalScore}`);
      this.sendToRunway(clicked);
    }
  }

  private preempt(newPlane: Plane) {
    const old = this.currentOnRunway;
    if (!old) return;

    this.takeoffProgressEvent?.remove();
    this.takeoffProgressEvent = undefined;

    const elapsed = this.currentTime - (old.startTime ?? 0);
    old.remainingBurstTime = Math.max(0, (old.burstTime - elapsed));
    old.isOnRunway = false;
    const idx = this.readyQueue.indexOf(newPlane);
    if (idx > -1) this.readyQueue.splice(idx, 1);
    this.readyQueue.push(old);
    this.currentOnRunway = undefined;

    const { width, height } = this.sys.game.canvas;
    const taxiY = height * this.TAXIWAY_Y;
    const planeSpacing = 200;
    const taxiX = width * 0.06 + (this.readyQueue.length - 1) % 4 * planeSpacing;

    if (old.container) {
      old.container.setDepth(10);
      old.sprite?.setFlipX(true);
      this.tweens.add({
        targets: old.container,
        x: taxiX,
        y: taxiY,
        duration: 700,
        ease: 'Power2',
        onComplete: () => {
          old.sprite?.setFlipX(false);
        },
      });
    }

    this.totalScore += 20;
    this.scoreText.setText(`Score: ${this.totalScore}`);
    this.showMessage(`Preempted P${old.priority}. P${newPlane.priority} takes runway!`, '#00FF00');
    this.sendToRunway(newPlane);
  }

  private sendToRunway(plane: Plane) {
    const { width, height } = this.sys.game.canvas;
    const runwayX = width * this.RUNWAY_X;
    const runwayY = height * 0.4;

    const idx = this.readyQueue.indexOf(plane);
    if (idx > -1) this.readyQueue.splice(idx, 1);
    plane.isOnRunway = true;
    plane.startTime = this.currentTime;
    this.currentOnRunway = plane;

    if (plane.container) {
      this.tweens.add({
        targets: plane.container,
        x: runwayX,
        y: runwayY,
        duration: 600,
        ease: 'Power2',
        onComplete: () => {
          this.instructionText.setText(`P${plane.priority} taking off... (${plane.remainingBurstTime}s)`);
          this.startTakeoffTimer(plane);
        },
      });
    } else {
      this.startTakeoffTimer(plane);
    }
  }

  private startTakeoffTimer(plane: Plane) {
    this.takeoffProgressEvent = this.time.addEvent({
      delay: plane.remainingBurstTime * 1000,
      callback: () => this.completeTakeoff(plane),
      callbackScope: this,
    });
  }

  private completeTakeoff(plane: Plane) {
    plane.isCompleted = true;
    plane.isOnRunway = false;
    plane.completionTime = this.currentTime;
    this.currentOnRunway = undefined;
    this.completedPlanes.push(plane);

    if (plane.container) {
      const startY = plane.container.y;
      this.tweens.add({
        targets: plane.container,
        alpha: 0,
        y: startY - 80,
        duration: 500,
        onComplete: () => plane.container?.destroy(),
      });
    }

    this.showMessage(`P${plane.priority} took off!`, '#00FF00');

    if (this.completedPlanes.length >= SPAWN_SCHEDULE_L2.length) {
      this.time.delayedCall(1500, () => this.showResults());
    } else {
      if (this.readyQueue.length > 0) {
        this.time.delayedCall(500, () => this.sendHighestToRunway());
      } else {
        this.instructionText.setText('Wait for next plane or send highest priority to runway.');
      }
    }
  }

  private showMessage(text: string, color: string) {
    const { width, height } = this.sys.game.canvas;
    const msg = this.add.text(width / 2, height / 2, text, {
      fontSize: '18px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#000000DD', padding: { x: 16, y: 8 }, align: 'center',
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: msg, alpha: 0, y: height / 2 - 40, duration: 2000, onComplete: () => msg.destroy() });
  }

  private showResults() {
    this.gamePhase = 'results';
    this.clockEvent?.remove();
    this.takeoffProgressEvent?.remove();

    const { width, height } = this.sys.game.canvas;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);
    const boxW = 520;
    const boxH = 420;
    const boxX = width / 2 - boxW / 2;
    const boxY = height / 2 - boxH / 2;
    const box = this.add.graphics();
    box.fillStyle(0x0a0e27, 0.98);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.lineStyle(4, 0xFF6600, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.setDepth(301);
    this.add.text(width / 2, boxY + 45, '✈️ Level Complete', {
      fontSize: '28px', color: '#FF6600', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302);
    const stats = `Score: ${this.totalScore}\nPlanes: ${this.completedPlanes.length}/${SPAWN_SCHEDULE_L2.length}\nWrong: ${this.wrongAttempts}\nTime: ${this.currentTime}s`;
    this.add.text(width / 2, boxY + 130, stats, {
      fontSize: '18px', color: '#FFFFFF', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setDepth(302);
    this.submitScore('priority-l2');

    const btnW = 160;
    const btnH = 48;
    const btnX = width / 2 - btnW / 2;
    const btnY = boxY + boxH - 70;
    const restartBtn = this.add.graphics();
    restartBtn.fillStyle(0xFF6600, 1);
    restartBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    restartBtn.setDepth(302);
    this.add.text(width / 2, btnY + 24, '🔄 Play Again', { fontSize: '18px', color: '#FFFFFF', fontStyle: 'bold' }).setOrigin(0.5).setDepth(303);
    restartBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    restartBtn.on('pointerdown', () => this.scene.restart());
  }

  private async submitScore(gameId: string) {
    try {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          moduleId: 'cpu-scheduling',
          levelId: gameId.replace('priority-', ''),
          score: Math.max(0, this.totalScore),
          timeSpent: this.currentTime,
          accuracy: this.wrongAttempts === 0 ? 100 : Math.max(0, 100 - this.wrongAttempts * 10),
          wrongAttempts: this.wrongAttempts,
          metadata: { completed: this.completedPlanes.length, total: SPAWN_SCHEDULE_L2.length },
        }),
      });
    } catch (e) {
      console.error('Submit score failed', e);
    }
  }
}

export const PriorityGameL2Config = {
  type: Phaser.AUTO,
  scene: PriorityGameL2,
};
