import Phaser from 'phaser';
import { openAIFeedbackChat } from '../../shared/aiFeedbackChat';

type PlayerType = 'rookie' | 'pro' | 'mvp';

interface Player {
  id: string;
  name: string;
  type: PlayerType;
  targetScore: number; // total baskets required
  remainingScore: number; // baskets left
  ballsInRack: number; // balls left in current quantum
  container?: Phaser.GameObjects.Container;
  sprite?: Phaser.GameObjects.Sprite;
  labelText?: Phaser.GameObjects.Text;
  isFinished: boolean;
}

export class RoundRobinL1Game extends Phaser.Scene {
  private gamePhase: 'intro' | 'playing' | 'results' = 'intro';
  private players: Player[] = [];
  private readyQueue: Player[] = [];
  private finishedPlayers: Player[] = [];
  private currentPlayer?: Player;

  private gameStartTime = 0;
  private currentTime = 0;

  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  private hoopSprite!: Phaser.GameObjects.Sprite;
  private rackSprite!: Phaser.GameObjects.Sprite;

  private totalScore = 0;
  private wrongAttempts = 0; // kept for scoreboard consistency

  private readonly QUANTUM = 3; // 3 balls per turn
  private shotTimer?: Phaser.Time.TimerEvent;
  private clockTimer?: Phaser.Time.TimerEvent;
  private shootHandler?: () => void;

  constructor() {
    super({ key: 'RoundRobinL1Game' });
  }

  preload() {
    const p = '/games/cpu-scheduling/assets/round-robin/';
    this.load.image('court-bg', `${p}Basketball-Court.png`);
    this.load.image('hoop', `${p}Basketball-Hoop.png`);
    this.load.image('rack-full', `${p}Basketball-Rack-Full.png`);
    this.load.image('rack-2', `${p}Basketball-Rack-2.png`);
    this.load.image('rack-1', `${p}Basketball-Rack-1.png`);
    this.load.image('rack-empty', `${p}Basketball-Rack-Empty.png`);
    this.load.image('basketball', `${p}Basketball.png`);
    this.load.image('whistle', `${p}Whistle.png`);
    this.load.image('rookie-standing', `${p}Rookie-Player-Standing-with-Ball.png`);
    this.load.image('rookie-running', `${p}Rookie-Player-Running.png`);
    this.load.image('rookie-throwing', `${p}Rookie-Player-Throwing-Ball.png`);
    this.load.image('pro-standing', `${p}Pro-Player-Standing-with-Ball.png`);
    this.load.image('pro-running', `${p}Pro-Player-Running.png`);
    this.load.image('pro-throwing', `${p}Pro-Player-Throwing-Ball.png`);
    this.load.image('mvp-standing', `${p}MVP-Player-Standing-with-Ball.png`);
    this.load.image('mvp-running', `${p}MVP-Player-Running.png`);
    this.load.image('mvp-throwing', `${p}MVP-Player-Throwing-Ball.png`);
  }

  create() {
    const { width, height } = this.sys.game.canvas;

    const bg = this.add.image(width / 2, height / 2, 'court-bg');
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
    bg.setDepth(-100);

    this.createCourt(width, height);
    this.createUI(width, height);
    this.showIntro(width, height);
  }

  private createCourt(width: number, height: number) {
    // Stand (hoop) at the end of the court – smaller, further right, lower (stand on court)
    const hoopX = width * 0.82;
    const hoopY = height * 0.36;
    this.hoopSprite = this.add.sprite(hoopX+100, hoopY+50, 'hoop');
    this.hoopSprite.setScale(0.26);
    this.hoopSprite.setDepth(4);

    // Ball trolley = rack (court level, smaller, in front of stand)
    const rackX = hoopX - 100;
    const rackY = height * 0.50;
    this.rackSprite = this.add.sprite(rackX-100, rackY, 'rack-full');
    this.rackSprite.setScale(0.12);
    this.rackSprite.setDepth(6);
  }

  private getPlayerSpriteKey(type: PlayerType, pose: 'standing' | 'running' | 'throwing'): string {
    const base = type === 'rookie' ? 'rookie' : type === 'pro' ? 'pro' : 'mvp';
    return `${base}-${pose}`;
  }

  private setRackTexture(ballsLeft: number) {
    const key = ballsLeft >= 3 ? 'rack-full' : ballsLeft === 2 ? 'rack-2' : ballsLeft === 1 ? 'rack-1' : 'rack-empty';
    this.rackSprite.setTexture(key);
  }

  private createUI(width: number, height: number) {
    this.phaseText = this.add.text(width / 2, 20, 'Phase: Intro', {
      fontSize: '18px',
      color: '#00FF00',
      fontStyle: 'bold',
      backgroundColor: '#000000AA',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5);
    this.phaseText.setDepth(20);

    this.scoreText = this.add.text(width - 170, 20, 'Score: 0', {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold',
      backgroundColor: '#000000AA',
      padding: { x: 8, y: 4 },
    });
    this.scoreText.setDepth(20);

    this.timeText = this.add.text(20, 20, 'Time: 0s', {
      fontSize: '16px',
      color: '#00FFFF',
      fontStyle: 'bold',
      backgroundColor: '#000000AA',
      padding: { x: 8, y: 4 },
    });
    this.timeText.setDepth(20);

    this.instructionText = this.add.text(width / 2, height - 30, '', {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#000000CC',
      padding: { x: 12, y: 6 },
      align: 'center',
    }).setOrigin(0.5);
    this.instructionText.setDepth(20);
  }

  private showIntro(width: number, height: number) {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(40);

    const boxW = 720;
    const boxH = 540;
    const boxX = width / 2 - boxW / 2;
    const boxY = height / 2 - boxH / 2;

    const box = this.add.graphics();
    box.fillStyle(0x10152a, 0.98);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.lineStyle(4, 0xffa500, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.setDepth(41);

    const title = this.add.text(width / 2, boxY + 50, '🏀 Court Kings – Round Robin L1', {
      fontSize: '30px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(42);

    const subtitle = this.add.text(width / 2, boxY + 92, 'Time Quantum = Balls in the Rack (3 balls)', {
      fontSize: '16px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(42);

    const contentY = boxY + 140;

    const t1 = this.add.text(boxX + 40, contentY, '🎮 How it works', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setDepth(42);

    const text1 = this.add.text(boxX + 40, contentY + 28,
      'Players (Rookie, Pro, MVP) form a line on the left.\n' +
      'The first player runs to the hoop and shoots using the balls in the rack.\n' +
      'Each shot uses 1 ball and scores 1 basket.', {
        fontSize: '14px',
        color: '#E0E0E0',
        lineSpacing: 6,
      }).setDepth(42);

    const t2 = this.add.text(boxX + 40, contentY + 130, '🔁 Round Robin Rule', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setDepth(42);

    const text2 = this.add.text(boxX + 40, contentY + 158,
      '• Quantum = 3 balls per turn.\n' +
      '• If a player finishes their target score, they cheer and leave the court.\n' +
      '• If they still need points when balls run out, they go to BACK of the line.\n' +
      '• CPU = Hoop, Process = Player, Burst Time = Target Score.', {
        fontSize: '14px',
        color: '#E0E0E0',
        lineSpacing: 6,
      }).setDepth(42);

    const t3 = this.add.text(boxX + 40, contentY + 255, '🎯 Goal', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setDepth(42);

    const text3 = this.add.text(boxX + 40, contentY + 283,
      'Clear the entire line. Everyone must reach Score = 0 using pure Round Robin scheduling.', {
        fontSize: '14px',
        color: '#00ff88',
      }).setDepth(42);

    const btnW = 200;
    const btnH = 50;
    const btnX = width / 2 - btnW / 2;
    const btnY = boxY + boxH - 80;

    const startBtn = this.add.graphics();
    startBtn.fillStyle(0xffa500, 1);
    startBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    startBtn.setDepth(42);

    const btnText = this.add.text(width / 2, btnY + 25, ' START DRILL', {
      fontSize: '20px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(43);

    const introObjects: Phaser.GameObjects.GameObject[] = [
      overlay, box, title, subtitle, t1, text1, t2, text2, t3, text3, startBtn, btnText,
    ];

    startBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    startBtn.on('pointerdown', () => {
      introObjects.forEach(o => o.destroy());
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
    this.players = [];
    this.readyQueue = [];
    this.finishedPlayers = [];
    this.currentPlayer = undefined;

    this.phaseText.setText('Phase: Playing (Round Robin, q = 3)');
    this.instructionText.setText('Watch how each player gets 3 balls, then goes back to the line if not finished.');
    this.scoreText.setText('Score: 0');
    this.timeText.setText('Time: 0s');

    this.clockTimer = this.time.addEvent({
      delay: 1000,
      callback: this.updateClock,
      callbackScope: this,
      loop: true,
    });

    const basePlayers: Array<{ name: string; type: PlayerType; target: number }> = [
      { name: 'Rookie', type: 'rookie', target: 3 }, // finishes in one quantum
      { name: 'Pro', type: 'pro', target: 6 },
      { name: 'MVP', type: 'mvp', target: 9 },
    ];

    const queueStartX = width * 0.14;
    const queueY = height * 0.5;
    const spacing = 120;

    basePlayers.forEach((cfg, index) => {
      const p: Player = {
        id: `player-${index + 1}`,
        name: cfg.name,
        type: cfg.type,
        targetScore: cfg.target,
        remainingScore: cfg.target,
        ballsInRack: this.QUANTUM,
        isFinished: false,
      };
      this.players.push(p);
      this.readyQueue.push(p);

      const x = queueStartX + index * spacing;
      const container = this.add.container(x, queueY);
      const spriteKey = this.getPlayerSpriteKey(cfg.type, 'standing');
      const sprite = this.add.sprite(0, 0, spriteKey);
      sprite.setScale(0.15);
      container.add(sprite);

      const label = this.add.text(0, 80, `${cfg.name} (need ${cfg.target})`, {
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
        backgroundColor: '#000000AA',
        padding: { x: 8, y: 3 },
      }).setOrigin(0.5);
      container.add(label);

      p.container = container;
      p.sprite = sprite;
      p.labelText = label;
      container.setDepth(8);
    });

    this.time.delayedCall(800, () => this.dispatchNext());
  }

  private updateClock() {
    this.currentTime = Math.floor((this.time.now - this.gameStartTime) / 1000);
    this.timeText.setText(`Time: ${this.currentTime}s`);
  }

  private dispatchNext() {
    if (this.currentPlayer || this.gamePhase !== 'playing') return;
    if (this.readyQueue.length === 0) {
      if (this.finishedPlayers.length === this.players.length) {
        this.time.delayedCall(1000, () => this.showResults());
      }
      return;
    }

    const next = this.readyQueue.shift()!;
    this.currentPlayer = next;
    next.ballsInRack = this.QUANTUM;

    const { width, height } = this.sys.game.canvas;
    const hoopX = width * 0.62;
    const hoopY = height * 0.50;

    if (next.container && next.sprite) {
      next.sprite.setTexture(this.getPlayerSpriteKey(next.type, 'running'));
      next.sprite.setFlipX(false);
      this.setRackTexture(this.QUANTUM);
      this.instructionText.setText(`Click to shoot! ${next.name} has ${this.QUANTUM} balls.`);
      this.tweens.add({
        targets: next.container,
        x: hoopX,
        y: hoopY,
        duration: 700,
        ease: 'Power2',
        onComplete: () => {
          next.sprite?.setTexture(this.getPlayerSpriteKey(next.type, 'standing'));
          this.startShooting(next);
        },
      });
    } else {
      this.startShooting(next);
    }
  }

  private startShooting(player: Player) {
    this.shotTimer?.remove(false);
    this.shotTimer = undefined;
    this.updatePlayerLabel(player);
    this.instructionText.setText(`Click to shoot! ${player.name} (${player.ballsInRack} balls left)`);
    this.shootHandler = () => this.performShot(player);
    this.input.on('pointerdown', this.shootHandler);
  }

  private performShot(player: Player) {
    if (this.gamePhase !== 'playing' || player.isFinished) {
      this.shotTimer?.remove(false);
      this.shotTimer = undefined;
      return;
    }

    if (player.ballsInRack <= 0 || player.remainingScore <= 0) {
      this.evaluateQuantum(player);
      return;
    }

    player.ballsInRack -= 1;
    player.remainingScore -= 1;
    this.totalScore += 5;
    this.scoreText.setText(`Score: ${this.totalScore}`);
    this.setRackTexture(player.ballsInRack);

    if (player.sprite) player.sprite.setTexture(this.getPlayerSpriteKey(player.type, 'throwing'));
    this.showBallAnimation(player);
    this.time.delayedCall(350, () => {
      if (player.sprite && !player.isFinished) player.sprite.setTexture(this.getPlayerSpriteKey(player.type, 'standing'));
    });
    this.updatePlayerLabel(player);

    if (player.remainingScore <= 0) {
      this.evaluateQuantum(player);
    } else if (player.ballsInRack <= 0) {
      this.evaluateQuantum(player);
    } else {
      this.instructionText.setText(`Click to shoot! ${player.name} (${player.ballsInRack} balls left)`);
    }
  }

  private showBallAnimation(player: Player) {
    // Ball starts at the rack (player picks from trolley) and flies to the stand (hoop)
    const startX = this.rackSprite.x + 15;
    const startY = this.rackSprite.y - 25;
    const ball = this.add.sprite(startX, startY, 'basketball');
    ball.setScale(0.05);
    ball.setDepth(15);
    // Target = center of the rim (circle) so the ball goes into the hoop like a real shot
    const targetX = this.hoopSprite.x-20;
    const targetY = this.hoopSprite.y - 160;

    this.tweens.add({
      targets: ball,
      x: targetX,
      y: targetY,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => ball.destroy(),
    });
  }

  private updatePlayerLabel(player: Player) {
    if (!player.labelText) return;
    player.labelText.setText(
      `${player.name} (left: ${player.remainingScore}, balls: ${player.ballsInRack})`,
    );
  }

  private evaluateQuantum(player: Player) {
    this.shotTimer?.remove(false);
    this.shotTimer = undefined;
    if (this.shootHandler) {
      this.input.off('pointerdown', this.shootHandler);
      this.shootHandler = undefined;
    }

    if (player.remainingScore <= 0) {
      this.finishPlayer(player);
    } else if (player.ballsInRack <= 0) {
      this.preemptPlayer(player);
    }
  }

  private finishPlayer(player: Player) {
    player.isFinished = true;
    this.finishedPlayers.push(player);
    this.currentPlayer = undefined;

    if (player.container && player.sprite) {
      player.sprite.setTexture(this.getPlayerSpriteKey(player.type, 'running'));
      player.sprite.setFlipX(false);
      const targetX = this.sys.game.canvas.width + 200;
      this.instructionText.setText(`${player.name} finished! They leave the court.`);
      this.tweens.add({
        targets: player.container,
        x: targetX,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          player.container?.destroy();
          this.dispatchNext();
        },
      });
    } else {
      this.dispatchNext();
    }
  }

  private preemptPlayer(player: Player) {
    const whistleX = this.hoopSprite.x - 30;
    const whistleY = this.hoopSprite.y - 80;
    const whistle = this.add.sprite(whistleX, whistleY, 'whistle');
    whistle.setScale(0.15);
    whistle.setDepth(18);
    this.setRackTexture(0);
    this.time.delayedCall(600, () => whistle.destroy());

    const queueStartX = this.sys.game.canvas.width * 0.14;
    const queueY = this.sys.game.canvas.height * 0.5;
    const spacing = 120;

    const newIndex = this.readyQueue.length;
    this.readyQueue.push(player);
    this.currentPlayer = undefined;

    this.instructionText.setText(
      `${player.name} used all ${this.QUANTUM} balls but still needs points. Coach blows whistle – back of the line!`,
    );

    if (player.container && player.sprite) {
      player.sprite.setTexture(this.getPlayerSpriteKey(player.type, 'running'));
      player.sprite.setFlipX(true);
      const targetX = queueStartX + newIndex * spacing;
      this.tweens.add({
        targets: player.container,
        x: targetX,
        y: queueY,
        duration: 700,
        ease: 'Power2',
        onComplete: () => {
          player.sprite?.setTexture(this.getPlayerSpriteKey(player.type, 'standing'));
          player.sprite?.setFlipX(false);
          this.dispatchNext();
        },
      });
    } else {
      this.dispatchNext();
    }
  }

  private showResults() {
    this.gamePhase = 'results';
    this.clockTimer?.remove(false);
    this.shotTimer?.remove(false);

    const { width, height } = this.sys.game.canvas;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(50);

    const boxW = 560;
    const boxH = 420;
    const boxX = width / 2 - boxW / 2;
    const boxY = height / 2 - boxH / 2;

    const box = this.add.graphics();
    box.fillStyle(0x10152a, 0.98);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.lineStyle(4, 0xffa500, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.setDepth(51);

    const title = this.add.text(width / 2, boxY + 50, '🏀 Drill Complete', {
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);

    const stats = `Score: ${this.totalScore}
Players finished: ${this.finishedPlayers.length}/${this.players.length}
Wrong attempts: ${this.wrongAttempts}
Time: ${this.currentTime}s`;

    const statsText = this.add.text(width / 2, boxY + 145, stats, {
      fontSize: '18px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(52);

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

    const btnW = 180;
    const btnH = 48;
    const btnX = width / 2 - btnW / 2;
    const btnY = boxY + boxH - 80;
    const restartBtn = this.add.graphics();
    restartBtn.fillStyle(0xffa500, 1);
    restartBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    restartBtn.setDepth(52);
    const btnText = this.add.text(width / 2, btnY + 24, '🔄 Play Again', {
      fontSize: '18px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(53);

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
          levelId: 'l1',
          score: Math.max(0, this.totalScore),
          timeSpent: this.currentTime,
          accuracy: this.wrongAttempts === 0 ? 100 : Math.max(0, 100 - this.wrongAttempts * 10),
          wrongAttempts: this.wrongAttempts,
          metadata: {
            playersFinished: this.finishedPlayers.length,
            totalPlayers: this.players.length,
            quantum: this.QUANTUM,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to submit score', error);
    }
  }
}

export const RoundRobinL1GameConfig = {
  type: Phaser.AUTO,
  scene: RoundRobinL1Game,
};


