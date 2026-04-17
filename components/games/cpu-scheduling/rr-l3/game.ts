import Phaser from 'phaser';
import { openAIFeedbackChat } from '../../shared/aiFeedbackChat';

type PlayerType = 'rookie' | 'pro' | 'mvp';

interface Player {
  id: string;
  name: string;
  type: PlayerType;
  targetScore: number;
  remainingScore: number;
  ballsInRack: number;
  container?: Phaser.GameObjects.Container;
  sprite?: Phaser.GameObjects.Sprite;
  labelText?: Phaser.GameObjects.Text;
  isFinished: boolean;
}

const ASSET_PATH = '/games/cpu-scheduling/assets/round-robin/';
const QUANTUM = 3;
const MAX_QUEUE_LENGTH = 6; // game over if queue exceeds this
const SPAWN_INTERVAL_MS = 6500;
const SPAWN_DURATION_MS = 50000; // stop spawning after 50s

export class RoundRobinL3Game extends Phaser.Scene {
  private gamePhase: 'intro' | 'playing' | 'results' | 'gameover' = 'intro';
  private players: Player[] = [];
  private readyQueue: Player[] = [];
  private finishedPlayers: Player[] = [];
  private currentPlayer?: Player;
  private playerCounter = 0;

  private gameStartTime = 0;
  private currentTime = 0;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private spawnEndTimer?: Phaser.Time.TimerEvent;
  private spawnEnded = false;

  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  private hoopSprite!: Phaser.GameObjects.Sprite;
  private rackSprite!: Phaser.GameObjects.Sprite;
  private queueStartX = 0;
  private queueY = 0;
  private queueSpacing = 120;

  private totalScore = 0;
  private wrongAttempts = 0;
  private shotTimer?: Phaser.Time.TimerEvent;
  private clockTimer?: Phaser.Time.TimerEvent;
  private shootHandler?: () => void;

  constructor() {
    super({ key: 'RoundRobinL3Game' });
  }

  preload() {
    const p = ASSET_PATH;
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
    const hoopX = width * 0.82;
    const hoopY = height * 0.36;
    this.hoopSprite = this.add.sprite(hoopX + 100, hoopY + 50, 'hoop');
    this.hoopSprite.setScale(0.26);
    this.hoopSprite.setDepth(4);
    const rackX = hoopX - 100;
    const rackY = height * 0.50;
    this.rackSprite = this.add.sprite(rackX - 100, rackY, 'rack-full');
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
      fontSize: '18px', color: '#00FF00', fontStyle: 'bold',
      backgroundColor: '#000000AA', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(20);
    this.scoreText = this.add.text(width - 170, 20, 'Score: 0', {
      fontSize: '16px', color: '#FFD700', fontStyle: 'bold',
      backgroundColor: '#000000AA', padding: { x: 8, y: 4 },
    }).setDepth(20);
    this.timeText = this.add.text(20, 20, 'Time: 0s', {
      fontSize: '16px', color: '#00FFFF', fontStyle: 'bold',
      backgroundColor: '#000000AA', padding: { x: 8, y: 4 },
    }).setDepth(20);
    this.instructionText = this.add.text(width / 2, height - 30, '', {
      fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#000000CC', padding: { x: 12, y: 6 }, align: 'center',
    }).setOrigin(0.5).setDepth(20);
  }

  private showIntro(width: number, height: number) {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(40);
    const boxW = 720;
    const boxH = 500;
    const boxX = width / 2 - boxW / 2;
    const boxY = height / 2 - boxH / 2;
    const box = this.add.graphics();
    box.fillStyle(0x10152a, 0.98);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.lineStyle(4, 0x9932cc, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.setDepth(41);

    const title = this.add.text(width / 2, boxY + 48, '🏀 Court Kings – Round Robin L3', {
      fontSize: '28px', color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(42);
    const subtitle = this.add.text(width / 2, boxY + 90, 'The Tryouts: Continuous arrivals & queue overflow', {
      fontSize: '16px', color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(42);
    const contentY = boxY + 132;
    const cap1 = this.add.text(boxX + 40, contentY, '📥 New players join the line continuously.', {
      fontSize: '18px', color: '#FFD700', fontStyle: 'bold',
    }).setDepth(42);
    const cap2 = this.add.text(boxX + 40, contentY + 30,
      `If the line gets too long (more than ${MAX_QUEUE_LENGTH} waiting), it's Game Over.\nClear short tasks (Rookies) quickly to make space in the gym!`, {
      fontSize: '14px', color: '#E0E0E0', lineSpacing: 6,
    }).setDepth(42);
    const cap3 = this.add.text(boxX + 40, contentY + 100, '🎯 Goal', {
      fontSize: '18px', color: '#FFD700', fontStyle: 'bold',
    }).setDepth(42);
    const cap4 = this.add.text(boxX + 40, contentY + 128,
      'Survive and clear as many players as possible. Keep the queue from overflowing.', {
      fontSize: '14px', color: '#00ff88',
    }).setDepth(42);

    const btnW = 200;
    const btnH = 50;
    const btnX = width / 2 - btnW / 2;
    const btnY = boxY + boxH - 72;
    const startBtn = this.add.graphics();
    startBtn.fillStyle(0x9932cc, 1);
    startBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    startBtn.setDepth(42);
    const btnText = this.add.text(width / 2, btnY + 25, ' START DRILL', {
      fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(43);

    const introItems: Phaser.GameObjects.GameObject[] = [overlay, box, title, subtitle, cap1, cap2, cap3, cap4, startBtn, btnText];
    startBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    startBtn.on('pointerdown', () => { introItems.forEach(o => o.destroy()); this.startGame(); });
  }

  private startGame() {
    const { width, height } = this.sys.game.canvas;
    this.gamePhase = 'playing';
    this.gameStartTime = this.time.now;
    this.currentTime = 0;
    this.playerCounter = 0;
    this.totalScore = 0;
    this.wrongAttempts = 0;
    this.players = [];
    this.readyQueue = [];
    this.finishedPlayers = [];
    this.currentPlayer = undefined;

    this.queueStartX = width * 0.14;
    this.queueY = height * 0.5;
    this.phaseText.setText('Phase: Tryouts (continuous spawn)');
    this.instructionText.setText('New players join the line. Keep the queue under ' + MAX_QUEUE_LENGTH + ' or Game Over!');
    this.scoreText.setText('Score: 0');
    this.timeText.setText('Time: 0s');

    this.clockTimer = this.time.addEvent({ delay: 1000, callback: this.updateClock, callbackScope: this, loop: true });

    this.spawnNewPlayer();
    this.spawnTimer = this.time.addEvent({
      delay: SPAWN_INTERVAL_MS,
      callback: this.spawnNewPlayer,
      callbackScope: this,
      loop: true,
    });
    this.spawnEnded = false;
    this.spawnEndTimer = this.time.delayedCall(SPAWN_DURATION_MS, () => {
      this.spawnEnded = true;
      this.spawnTimer?.remove(false);
      this.instructionText.setText('No more new players. Clear the queue to win!');
    });

    this.time.delayedCall(600, () => this.dispatchNext());
  }

  private updateClock() {
    this.currentTime = Math.floor((this.time.now - this.gameStartTime) / 1000);
    this.timeText.setText(`Time: ${this.currentTime}s`);
  }

  private spawnNewPlayer() {
    if (this.gamePhase !== 'playing') return;
    const types: Array<{ name: string; type: PlayerType; target: number }> = [
      { name: 'Rookie', type: 'rookie', target: 3 },
      { name: 'Pro', type: 'pro', target: 6 },
      { name: 'MVP', type: 'mvp', target: 9 },
    ];
    const cfg = types[Math.floor(Math.random() * types.length)];
    this.playerCounter++;
    const p: Player = {
      id: `player-${this.playerCounter}`,
      name: `${cfg.name} ${this.playerCounter}`,
      type: cfg.type,
      targetScore: cfg.target,
      remainingScore: cfg.target,
      ballsInRack: QUANTUM,
      isFinished: false,
    };
    this.players.push(p);
    this.readyQueue.push(p);

    const idx = this.readyQueue.length - 1;
    const x = this.queueStartX + idx * this.queueSpacing;
    const container = this.add.container(x, this.queueY);
    const spriteKey = this.getPlayerSpriteKey(cfg.type, 'standing');
    const sprite = this.add.sprite(0, 0, spriteKey);
    sprite.setScale(0.15);
    container.add(sprite);
    const label = this.add.text(0, 70, `${p.name} (${cfg.target})`, {
      fontSize: '12px', color: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
      backgroundColor: '#000000AA', padding: { x: 6, y: 2 },
    }).setOrigin(0.5);
    container.add(label);
    p.container = container;
    p.sprite = sprite;
    p.labelText = label;
    container.setDepth(8);

    if (this.readyQueue.length > MAX_QUEUE_LENGTH) {
      this.triggerGameOver();
    } else {
      this.layoutQueue();
    }
  }

  private layoutQueue() {
    this.readyQueue.forEach((p, i) => {
      if (p.container && !p.isFinished) {
        const x = this.queueStartX + i * this.queueSpacing;
        this.tweens.add({ targets: p.container, x, duration: 300, ease: 'Power2' });
      }
    });
  }

  private triggerGameOver() {
    this.gamePhase = 'gameover';
    this.spawnTimer?.remove(false);
    this.spawnEndTimer?.remove(false);
    this.clockTimer?.remove(false);
    this.shotTimer?.remove(false);
    this.instructionText.setText('Game Over! The line overflowed.');
    this.time.delayedCall(2500, () => this.showResults(true));
  }

  private dispatchNext() {
    if (this.currentPlayer || this.gamePhase !== 'playing') return;
    if (this.readyQueue.length === 0) {
      if (this.spawnEnded) {
        this.time.delayedCall(1000, () => this.showResults(false));
      }
      return;
    }

    const next = this.readyQueue.shift()!;
    this.currentPlayer = next;
    next.ballsInRack = QUANTUM;

    const { width, height } = this.sys.game.canvas;
    const hoopX = width * 0.62;
    const hoopY = height * 0.50;

    this.layoutQueue();

    if (next.container && next.sprite) {
      next.sprite.setTexture(this.getPlayerSpriteKey(next.type, 'running'));
      next.sprite.setFlipX(false);
      this.setRackTexture(QUANTUM);
      this.instructionText.setText(`Click to shoot! ${next.name} has ${QUANTUM} balls. Queue: ${this.readyQueue.length}`);
      this.tweens.add({
        targets: next.container,
        x: hoopX,
        y: hoopY,
        duration: 600,
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
    this.time.delayedCall(300, () => {
      if (player.sprite && !player.isFinished) player.sprite.setTexture(this.getPlayerSpriteKey(player.type, 'standing'));
    });
    this.updatePlayerLabel(player);
    if (player.remainingScore <= 0 || player.ballsInRack <= 0) {
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
    const targetX = this.hoopSprite.x;
    const targetY = this.hoopSprite.y + 600;
    this.tweens.add({
      targets: ball,
      x: targetX,
      y: targetY,
      duration: 450,
      ease: 'Quad.easeOut',
      onComplete: () => ball.destroy(),
    });
  }

  private updatePlayerLabel(player: Player) {
    if (player.labelText) {
      player.labelText.setText(`${player.name} (${player.remainingScore})`);
    }
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
      this.instructionText.setText(`${player.name} done! Queue: ${this.readyQueue.length}`);
      this.tweens.add({
        targets: player.container,
        x: this.sys.game.canvas.width + 150,
        duration: 700,
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
    const whistle = this.add.sprite(this.hoopSprite.x - 30, this.hoopSprite.y - 80, 'whistle');
    whistle.setScale(0.15);
    whistle.setDepth(18);
    this.setRackTexture(0);
    this.time.delayedCall(500, () => whistle.destroy());

    this.readyQueue.push(player);
    this.currentPlayer = undefined;
    const newIndex = this.readyQueue.length - 1;

    if (this.readyQueue.length > MAX_QUEUE_LENGTH) {
      this.triggerGameOver();
      return;
    }

    this.instructionText.setText(`${player.name} back of line. Queue: ${this.readyQueue.length} (max ${MAX_QUEUE_LENGTH})`);
    if (player.container && player.sprite) {
      player.sprite.setTexture(this.getPlayerSpriteKey(player.type, 'running'));
      player.sprite.setFlipX(true);
      const targetX = this.queueStartX + newIndex * this.queueSpacing;
      this.tweens.add({
        targets: player.container,
        x: targetX,
        y: this.queueY,
        duration: 600,
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

  private showResults(isGameOver: boolean) {
    this.gamePhase = 'results';
    this.spawnTimer?.remove(false);
    this.spawnEndTimer?.remove(false);
    this.clockTimer?.remove(false);
    this.shotTimer?.remove(false);

    const { width, height } = this.sys.game.canvas;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(50);
    const boxW = 540;
    const boxH = 380;
    const boxX = width / 2 - boxW / 2;
    const boxY = height / 2 - boxH / 2;
    const box = this.add.graphics();
    box.fillStyle(0x10152a, 0.98);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.lineStyle(4, isGameOver ? 0xff4444 : 0x9932cc, 1);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 20);
    box.setDepth(51);

    this.add.text(width / 2, boxY + 42, isGameOver ? '💥 Queue overflow!' : '🏀 Tryouts complete', {
      fontSize: '26px', color: isGameOver ? '#FF6666' : '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    this.add.text(width / 2, boxY + 110,
      `Score: ${this.totalScore}\nFinished: ${this.finishedPlayers.length}\nTime: ${this.currentTime}s`,
      { fontSize: '18px', color: '#FFFFFF', align: 'center', lineSpacing: 8 },
    ).setOrigin(0.5).setDepth(52);

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
    const btnH = 44;
    const btnX = width / 2 - btnW / 2;
    const btnY = boxY + boxH - 68;
    const restartBtn = this.add.graphics();
    restartBtn.fillStyle(isGameOver ? 0xcc0000 : 0x9932cc, 1);
    restartBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    restartBtn.setDepth(52);
    this.add.text(width / 2, btnY + 22, '🔄 Play Again', { fontSize: '17px', color: '#FFFFFF', fontStyle: 'bold' }).setOrigin(0.5).setDepth(53);
    restartBtn.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    restartBtn.on('pointerdown', () => this.scene.restart());
  }

  private async submitScore(gameId: string, gameOver: boolean) {
    try {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          moduleId: 'cpu-scheduling',
          levelId: 'l3',
          score: Math.max(0, this.totalScore),
          timeSpent: this.currentTime,
          accuracy: this.wrongAttempts === 0 ? 100 : Math.max(0, 100 - this.wrongAttempts * 10),
          wrongAttempts: this.wrongAttempts,
          metadata: { playersFinished: this.finishedPlayers.length, gameOver },
        }),
      });
    } catch (e) {
      console.error('Submit score failed', e);
    }
  }
}

export const RoundRobinL3GameConfig = { type: Phaser.AUTO, scene: RoundRobinL3Game };

