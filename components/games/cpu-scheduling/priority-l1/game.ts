import Phaser from 'phaser';
import { openAIFeedbackChat } from '../../shared/aiFeedbackChat';

/** Plane priority: 1 = highest (Red Medical), 4 = lowest (Green Cargo). Lower number = higher priority. */
type PriorityLevel = 1 | 2 | 3 | 4;

interface Plane {
  id: string;
  planeNumber: number;
  priority: PriorityLevel;
  arrivalTime: number;
  burstTime: number; // takeoff duration in seconds
  startTime?: number;
  completionTime?: number;
  isCompleted: boolean;
  isOnRunway: boolean;
  container?: Phaser.GameObjects.Container;
  sprite?: Phaser.GameObjects.Sprite;
}

const PRIORITY_ASSETS: Record<PriorityLevel, string> = {
  1: 'plane-p1', // Red Medical Jet
  2: 'plane-p2', // Gold VIP Jet
  3: 'plane-p3', // Blue Commercial
  4: 'plane-p4', // Green Cargo
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  1: 'P1 Medical',
  2: 'P2 VIP',
  3: 'P3 Commercial',
  4: 'P4 Cargo',
};

export class PriorityGameL1 extends Phaser.Scene {
  private gamePhase: 'intro' | 'playing' | 'results' = 'intro';
  private planes: Plane[] = [];
  private readyQueue: Plane[] = [];
  private completedPlanes: Plane[] = [];
  private currentOnRunway?: Plane;
  private gameStartTime: number = 0;
  private currentTime: number = 0;

  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  private runwaySprite!: Phaser.GameObjects.Sprite;
  private readonly RUNWAY_X = 0.75; // fraction of width
  private readonly TAXIWAY_Y = 0.75; // fraction of height

  private totalScore: number = 0;
  private wrongAttempts: number = 0;
  private takeoffProgressEvent?: Phaser.Time.TimerEvent;
  private clockEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'PriorityGameL1' });
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
      fontSize: '18px',
      color: '#00FF00',
      fontStyle: 'bold',
      backgroundColor: '#00000099',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(20);

    this.scoreText = this.add.text(width - 140, 24, 'Score: 0', {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    }).setDepth(20);

    this.timeText = this.add.text(20, 24, 'Time: 0s', {
      fontSize: '16px',
      color: '#00FFFF',
      fontStyle: 'bold',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    }).setDepth(20);

    this.instructionText = this.add.text(width / 2, height - 28, '', {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#000000CC',
      padding: { x: 12, y: 6 },
      align: 'center',
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
    box.lineStyle(4, 0x1E90FF, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.setDepth(301);

    const title = this.add.text(width / 2, boxY + 48, 'âœˆï¸ Sky Marshals â€“ Priority L1', {
      fontSize: '32px',
      color: '#1E90FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(width / 2, boxY + 90, 'Non-Preemptive: Lower number = higher priority', {
      fontSize: '16px',
      color: '#E0E0E0',
    }).setOrigin(0.5).setDepth(302);

    const contentY = boxY + 140;
    const howTitle = this.add.text(boxX + 40, contentY, 'ðŸŽ® How to Play', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setDepth(302);

    const howText = this.add.text(boxX + 40, contentY + 28, 'Planes wait on the Taxiway. Send them to the Runway by clicking.\nAlways send the HIGHEST priority first (P1 â†’ P2 â†’ P3 â†’ P4).\nOnce on the runway, a plane cannot be stopped.', {
      fontSize: '14px',
      color: '#E0E0E0',
      lineSpacing: 6,
    }).setDepth(302);

    const rulesTitle = this.add.text(boxX + 40, contentY + 130, 'âš ï¸ Rules', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setDepth(302);

    const rulesText = this.add.text(boxX + 40, contentY + 158, 'â€¢ P1 (Red Medical) > P2 (Gold VIP) > P3 (Blue) > P4 (Green Cargo)\nâ€¢ Correct choice: +20 pts  |  Wrong: -10 pts', {
      fontSize: '14px',
      color: '#E0E0E0',
      lineSpacing: 6,
    }).setDepth(302);

    const goalTitle = this.add.text(boxX + 40, contentY + 230, 'ðŸŽ¯ Goal', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setDepth(302);

    const goalText = this.add.text(boxX + 40, contentY + 258, 'Clear all planes from the taxiway in priority order (non-preemptive).', {
      fontSize: '14px',
      color: '#00ff88',
      fontStyle: '600',
    }).setDepth(302);

    const btnW = 200;
    const btnH = 50;
    const btnX = width / 2 - btnW / 2;
    const btnY = boxY + boxHeight - 72;

    const startBtn = this.add.graphics();
    startBtn.fillStyle(0x1E90FF, 1);
    startBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    startBtn.setDepth(302);

    const btnText = this.add.text(width / 2, btnY + 25, 'ðŸš€ START', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(303);

    startBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    startBtn.on('pointerdown', () => {
      [overlay, box, title, subtitle, howTitle, howText, rulesTitle, rulesText, goalTitle, goalText, startBtn, btnText].forEach(o => o.destroy());
      this.startGame();
    });
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

    this.phaseText.setText('Phase: Playing (Non-Preemptive)');
    this.instructionText.setText('Click the highest-priority plane (lowest number: P1 first). It will move to the runway.');
    this.scoreText.setText('Score: 0');
    this.timeText.setText('Time: 0s');

    this.clockEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateClock,
      callbackScope: this,
      loop: true,
    });

    // Level 1: 4 planes in the four corners; when clicked, plane moves to center path (runway)
    const priorities: PriorityLevel[] = [1, 2, 3, 4];
    const shuffled = [...priorities].sort(() => Math.random() - 0.5);
    const margin = 140;
    const corners: Array<{ x: number; y: number }> = [
      { x: margin+60, y: margin },                    // top-left
      { x: width - margin-60, y: margin },            // top-right
      { x: margin+60, y: height - margin },           // bottom-left
      { x: width - margin, y: height - margin },   // bottom-right
    ];

    shuffled.forEach((priority, index) => {
      const plane: Plane = {
        id: `plane-${index + 1}`,
        planeNumber: index + 1,
        priority,
        arrivalTime: 0,
        burstTime: 4,
        isCompleted: false,
        isOnRunway: false,
      };
      this.planes.push(plane);
      this.readyQueue.push(plane);

      const { x, y } = corners[index];
      const container = this.add.container(x, y);
      const sprite = this.add.sprite(0, 0, PRIORITY_ASSETS[priority]);
      sprite.setScale(0.14);
      container.add(sprite);
      const label = this.add.text(0, 50, `P${priority}`, {
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#000000AA',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5);
      container.add(label);
      plane.container = container;
      plane.sprite = sprite;
      container.setDepth(10);

      container.setInteractive(new Phaser.Geom.Rectangle(-40, -40, 80, 80), Phaser.Geom.Rectangle.Contains);
      container.on('pointerdown', () => this.onPlaneClick(plane));
      container.on('pointerover', () => { if (!plane.isCompleted && !plane.isOnRunway) this.sys.canvas.style.cursor = 'pointer'; });
      container.on('pointerout', () => { this.sys.canvas.style.cursor = 'default'; });
    });
  }

  private updateClock() {
    this.currentTime = Math.floor((this.time.now - this.gameStartTime) / 1000);
    this.timeText.setText(`Time: ${this.currentTime}s`);
  }

  private onPlaneClick(clicked: Plane) {
    if (this.gamePhase !== 'playing') return;
    if (clicked.isCompleted || clicked.isOnRunway) return;
    if (this.currentOnRunway) {
      this.showMessage('A plane is already on the runway. Wait for takeoff (non-preemptive).', '#FFA500');
      return;
    }

    const highestInQueue = this.readyQueue.reduce((best, p) =>
      (p.priority < best.priority ? p : best)
    );

    if (clicked.id !== highestInQueue.id) {
      this.wrongAttempts++;
      this.totalScore = Math.max(0, this.totalScore - 10);
      this.scoreText.setText(`Score: ${this.totalScore}`);
      this.showMessage(`Wrong! Send highest priority first. Next: P${highestInQueue.priority} (${PRIORITY_LABELS[highestInQueue.priority]})`, '#FF0000');
      return;
    }

    this.totalScore += 20;
    this.scoreText.setText(`Score: ${this.totalScore}`);
    this.sendToRunway(clicked);
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
        x: runwayX-400,
        y: runwayY+200,
        duration: 600,
        ease: 'Power2',
        onComplete: () => {
          this.instructionText.setText(`Plane P${plane.priority} taking off... (${plane.burstTime}s)`);
          this.startTakeoffTimer(plane);
        },
      });
    } else {
      this.startTakeoffTimer(plane);
    }
  }

  private startTakeoffTimer(plane: Plane) {
    this.takeoffProgressEvent = this.time.addEvent({
      delay: plane.burstTime * 1000,
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
      this.tweens.add({
        targets: plane.container,
        alpha: 0,
        y: plane.container.y - 80,
        duration: 500,
        onComplete: () => {
          plane.container?.destroy();
        },
      });
    }

    this.showMessage(`P${plane.priority} took off! +20`, '#00FF00');

    if (this.completedPlanes.length >= this.planes.length) {
      this.time.delayedCall(1500, () => this.showResults());
    } else {
      this.instructionText.setText('Click the highest-priority plane on the taxiway (P1 > P2 > P3 > P4).');
    }
  }

  private showMessage(text: string, color: string) {
    const { width, height } = this.sys.game.canvas;
    const msg = this.add.text(width / 2, height / 2, text, {
      fontSize: '18px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#000000DD',
      padding: { x: 16, y: 8 },
      align: 'center',
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: height / 2 - 40,
      duration: 2000,
      onComplete: () => msg.destroy(),
    });
  }

  private showResults() {
    this.gamePhase = 'results';
    this.clockEvent?.remove();

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
    box.lineStyle(4, 0x1E90FF, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.setDepth(301);

    const title = this.add.text(width / 2, boxY + 45, 'âœˆï¸ Level Complete', {
      fontSize: '28px',
      color: '#1E90FF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302);

    const stats = `Score: ${this.totalScore}\nPlanes cleared: ${this.completedPlanes.length}/${this.planes.length}\nWrong attempts: ${this.wrongAttempts}\nTime: ${this.currentTime}s`;
    const statsText = this.add.text(width / 2, boxY + 130, stats, {
      fontSize: '18px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(302);

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

    const btnW = 160;
    const btnH = 48;
    const btnX = width / 2 - btnW / 2;
    const btnY = boxY + boxH - 70;
    const restartBtn = this.add.graphics();
    restartBtn.fillStyle(0x1E90FF, 1);
    restartBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    restartBtn.setDepth(302);
    const restartText = this.add.text(width / 2, btnY + 24, 'ðŸ”„ Play Again', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(303);
    restartBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    restartBtn.on('pointerdown', () => this.scene.restart());
  }

  private async submitScore(gameId: string) {
    try {
      const timeSpent = this.currentTime;
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          moduleId: 'cpu-scheduling',
          levelId: gameId.replace('priority-', ''),
          score: Math.max(0, this.totalScore),
          timeSpent,
          accuracy: this.wrongAttempts === 0 ? 100 : Math.max(0, 100 - this.wrongAttempts * 10),
          wrongAttempts: this.wrongAttempts,
          metadata: { completed: this.completedPlanes.length, total: this.planes.length },
        }),
      });
    } catch (e) {
      console.error('Submit score failed', e);
    }
  }
}

export const PriorityGameL1Config = {
  type: Phaser.AUTO,
  scene: PriorityGameL1,
};

