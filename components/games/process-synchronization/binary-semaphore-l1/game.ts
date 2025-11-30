import Phaser from 'phaser';

interface Car {
  sprite: Phaser.GameObjects.Sprite;
  direction: 'left' | 'right';
  carType: number;
  isOnBridge: boolean;
  isWaiting: boolean;
  waitingIndicator?: Phaser.GameObjects.Graphics;
}

export class BinarySemaphoreGameScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Image;
  private cars: Car[] = [];
  private semaphoreValue: number = 1; // Binary: 0 or 1
  private bridgeCar: Car | null = null;
  private score: number = 0;
  private crashes: number = 0;
  private carsPassed: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private semaphoreText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private waitButton!: Phaser.GameObjects.Container;
  private signalButton!: Phaser.GameObjects.Container;
  private gamePhase: 'intro' | 'playing' | 'completed' = 'intro';
  private targetScore: number = 10;
  private spawnEvent?: Phaser.Time.TimerEvent;

  // Positions
  private readonly BRIDGE_START = 0.35;
  private readonly BRIDGE_END = 0.65;
  private readonly LEFT_WAITING_X = 0.15;
  private readonly RIGHT_WAITING_X = 0.85;
  private readonly ROAD_Y = 0.60; // Moved cars higher (lower Y value = higher on screen)

  constructor() {
    super({ key: 'BinarySemaphoreGameScene' });
  }

  preload() {
    const assetPath = '/games/process-synchronization/simple-semaphore/';
    
    this.load.image('background', `${assetPath}background.png`);
    
    for (let i = 1; i <= 3; i++) {
      this.load.image(`car${i}-left`, `${assetPath}car${i}-right.png`);
      this.load.image(`car${i}-right`, `${assetPath}car${i}-left.png`);
    }
  }

  create() {
    const { width, height } = this.scale;

    this.background = this.add.image(width / 2, height / 2, 'background');
    this.background.setDisplaySize(width, height);

    this.createUI();
    this.showIntroModal();
  }

  private createUI() {
    const { width, height } = this.scale;

    // Score
    this.scoreText = this.add.text(20, 20, 'Score: 0 | Passed: 0/10', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    });

    // Semaphore status
    this.semaphoreText = this.add.text(width / 2, 20, 'Bridge: OPEN (1)', {
      fontSize: '24px',
      color: '#00FF00',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 },
    }).setOrigin(0.5);

    // Instruction
    this.instructionText = this.add.text(width / 2, height - 40, '', {
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#000000DD',
      padding: { x: 15, y: 8 },
      align: 'center'
    }).setOrigin(0.5);

    // WAIT button
    this.createWaitButton(width, height);
    
    // SIGNAL button
    this.createSignalButton(width, height);
  }

  private createWaitButton(width: number, height: number) {
    const buttonX = width * 0.3;
    const buttonY = height * 0.85;
    
    this.waitButton = this.add.container(buttonX, buttonY);
    
    const bg = this.add.graphics();
    bg.fillStyle(0xFF4444, 1);
    bg.fillRoundedRect(-80, -30, 160, 60, 10);
    bg.lineStyle(3, 0xFFFFFF, 1);
    bg.strokeRoundedRect(-80, -30, 160, 60, 10);
    this.waitButton.add(bg);
    
    const text = this.add.text(0, 0, '🔒 WAIT()', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.waitButton.add(text);
    
    this.waitButton.setSize(160, 60);
    this.waitButton.setInteractive({ useHandCursor: true });
    
    this.waitButton.on('pointerdown', () => this.onWaitPressed());
    this.waitButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xFF6666, 1);
      bg.fillRoundedRect(-80, -30, 160, 60, 10);
      bg.lineStyle(3, 0xFFFFFF, 1);
      bg.strokeRoundedRect(-80, -30, 160, 60, 10);
    });
    this.waitButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xFF4444, 1);
      bg.fillRoundedRect(-80, -30, 160, 60, 10);
      bg.lineStyle(3, 0xFFFFFF, 1);
      bg.strokeRoundedRect(-80, -30, 160, 60, 10);
    });
  }

  private createSignalButton(width: number, height: number) {
    const buttonX = width * 0.7;
    const buttonY = height * 0.85;
    
    this.signalButton = this.add.container(buttonX, buttonY);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x44FF44, 1);
    bg.fillRoundedRect(-80, -30, 160, 60, 10);
    bg.lineStyle(3, 0xFFFFFF, 1);
    bg.strokeRoundedRect(-80, -30, 160, 60, 10);
    this.signalButton.add(bg);
    
    const text = this.add.text(0, 0, '🟢 SIGNAL()', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.signalButton.add(text);
    
    this.signalButton.setSize(160, 60);
    this.signalButton.setInteractive({ useHandCursor: true });
    
    this.signalButton.on('pointerdown', () => this.onSignalPressed());
    this.signalButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x66FF66, 1);
      bg.fillRoundedRect(-80, -30, 160, 60, 10);
      bg.lineStyle(3, 0xFFFFFF, 1);
      bg.strokeRoundedRect(-80, -30, 160, 60, 10);
    });
    this.signalButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x44FF44, 1);
      bg.fillRoundedRect(-80, -30, 160, 60, 10);
      bg.lineStyle(3, 0xFFFFFF, 1);
      bg.strokeRoundedRect(-80, -30, 160, 60, 10);
    });
  }

  private showIntroModal() {
    const { width, height } = this.scale;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    const boxWidth = 700;
    const boxHeight = 600;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const box = this.add.graphics();
    box.fillStyle(0x0a0e27, 0.98);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.lineStyle(4, 0xFFD700, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.setDepth(301);

    const title = this.add.text(width / 2, boxY + 50, '🌉 BINARY SEMAPHORE', {
      fontSize: '32px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(width / 2, boxY + 90, 'One-Lane Bridge Guard', {
      fontSize: '18px',
      color: '#FFFFFF'
    }).setOrigin(0.5).setDepth(302);

    const content = `🎮 How to Play:
• Cars arrive ONE AT A TIME from left/right
• Only ONE car can cross the bridge at a time
• Press WAIT() to LOCK bridge and let car cross
• Press SIGNAL() to UNLOCK bridge after crossing

⚠️ Binary Semaphore Rules:
• Semaphore value: 1 (unlocked) or 0 (locked)
• WAIT(): Lock bridge (1→0) and allow car to cross
• SIGNAL(): Unlock bridge (0→1) after car exits
• Must SIGNAL() before next WAIT()

🎯 Goal: Pass 10 cars safely!`;

    const contentText = this.add.text(boxX + 50, boxY + 140, content, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6
    }).setDepth(302);

    const buttonWidth = 200;
    const buttonHeight = 55;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 75;

    const startButton = this.add.graphics();
    startButton.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    startButton.setDepth(302);

    const buttonText = this.add.text(width / 2, buttonY + 27, '🚀 START GAME', {
      fontSize: '22px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(303);

    startButton.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    startButton.on('pointerdown', () => {
      overlay.destroy();
      box.destroy();
      title.destroy();
      subtitle.destroy();
      contentText.destroy();
      startButton.destroy();
      buttonText.destroy();
      
      this.startGame();
    });
  }

  private startGame() {
    this.gamePhase = 'playing';
    this.instructionText.setText('Car arriving! Press WAIT() to lock bridge and let it cross.');
    
    // Spawn first car
    this.time.delayedCall(1000, () => {
      this.spawnCar('left');
    });

    // Spawn cars one at a time with delays
    this.spawnEvent = this.time.addEvent({
      delay: 6000, // Spawn every 6 seconds
      callback: () => {
        const side = Phaser.Math.RND.pick(['left', 'right']) as 'left' | 'right';
        this.spawnCar(side);
      },
      loop: true,
    });
  }

  private spawnCar(direction: 'left' | 'right') {
    const { width, height } = this.scale;
    const carType = Phaser.Math.Between(1, 3);
    
    const startX = direction === 'left' ? -130: width + 130;
    const y = height * this.ROAD_Y;
    
    const sprite = this.add.sprite(startX, y, `car${carType}-${direction}`);
    sprite.setScale(0.15);
    
    const car: Car = {
      sprite,
      direction,
      carType,
      isOnBridge: false,
      isWaiting: false
    };
    
    this.cars.push(car);
    this.moveCar(car);
  }

  private moveCar(car: Car) {
    const { width, height } = this.scale;
    
    // Check if there are other waiting cars from the same side
    const waitingCarsFromSameSide = this.cars.filter(c => 
      c.direction === car.direction && 
      c.isWaiting && 
      c !== car
    );
    
    // Position behind other waiting cars
    const queuePosition = waitingCarsFromSameSide.length;
    const baseWaitingX = car.direction === 'left' ? 
      width * this.LEFT_WAITING_X : 
      width * this.RIGHT_WAITING_X;
    
    // Add spacing for queue (50px per car)
    const offset = car.direction === 'left' ? -queuePosition * 100 : queuePosition * 100;
    const waitingX = baseWaitingX + offset;
    
    // Move to waiting position
    this.tweens.add({
      targets: car.sprite,
      x: waitingX,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => {
        car.isWaiting = true;
        this.showWaitingIndicator(car);
        
        // Update instruction if this is the first car
        if (queuePosition === 0) {
          this.instructionText.setText('Car waiting! Press WAIT() to lock bridge and start crossing.');
        }
      }
    });
  }

  private showWaitingIndicator(car: Car) {
    const indicator = this.add.graphics();
    indicator.fillStyle(0xFF0000, 0.7);
    indicator.fillCircle(car.sprite.x, car.sprite.y - 40, 15);
    indicator.lineStyle(3, 0xFFFFFF, 1);
    indicator.strokeCircle(car.sprite.x, car.sprite.y - 40, 15);
    
    car.waitingIndicator = indicator;
    
    // Pulse animation
    this.tweens.add({
      targets: indicator,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  private onWaitPressed() {
    if (this.semaphoreValue === 0) {
      this.showMessage('⚠️ Bridge already locked! Press SIGNAL() first!', '#FF6600');
      return;
    }
    
    // Find first waiting car (FIFO)
    const waitingCar = this.cars.find(c => c.isWaiting && !c.isOnBridge);
    
    if (!waitingCar) {
      this.showMessage('⚠️ No car waiting at bridge!', '#FF6600');
      return;
    }
    
    // WAIT() operation - lock the bridge
    this.semaphoreValue = 0;
    this.bridgeCar = waitingCar;
    waitingCar.isWaiting = false;
    waitingCar.isOnBridge = true;
    
    if (waitingCar.waitingIndicator) {
      waitingCar.waitingIndicator.destroy();
    }
    
    this.updateSemaphoreDisplay();
    this.instructionText.setText('Car crossing bridge... Press SIGNAL() when it exits!');
    this.crossBridge(waitingCar);
  }

  private onSignalPressed() {
    if (this.semaphoreValue === 1) {
      this.showMessage('⚠️ Bridge already unlocked!', '#FF6600');
      return;
    }
    
    if (this.bridgeCar && this.bridgeCar.isOnBridge) {
      this.showMessage('⚠️ Wait for car to finish crossing!', '#FF6600');
      return;
    }
    
    // SIGNAL() operation - unlock the bridge
    this.semaphoreValue = 1;
    this.bridgeCar = null;
    
    this.updateSemaphoreDisplay();
    this.score += 10;
    this.carsPassed++;
    this.updateScore();
    
    this.instructionText.setText('Bridge unlocked! Press WAIT() for next car.');
    
    if (this.carsPassed >= this.targetScore) {
      this.gameWon();
    }
  }

  private crossBridge(car: Car) {
    const { width } = this.scale;
    const targetX = car.direction === 'left' ? width + 100 : -100;
    
    this.tweens.add({
      targets: car.sprite,
      x: targetX,
      duration: 4000, // Slower crossing
      ease: 'Linear',
      onComplete: () => {
        car.isOnBridge = false;
        car.sprite.destroy();
        const index = this.cars.indexOf(car);
        if (index > -1) {
          this.cars.splice(index, 1);
        }
        
        // Prompt to signal
        this.instructionText.setText('Car exited! Press SIGNAL() to unlock bridge.');
      }
    });
  }

  private updateSemaphoreDisplay() {
    if (this.semaphoreValue === 1) {
      this.semaphoreText.setText('Bridge: OPEN (1)');
      this.semaphoreText.setColor('#00FF00');
    } else {
      this.semaphoreText.setText('Bridge: LOCKED (0)');
      this.semaphoreText.setColor('#FF0000');
    }
  }

  private updateScore() {
    this.scoreText.setText(`Score: ${this.score} | Passed: ${this.carsPassed}/${this.targetScore}`);
  }

  private showMessage(text: string, color: string) {
    const { width, height } = this.scale;
    const message = this.add.text(width / 2, height / 2, text, {
      fontSize: '24px',
      color: color,
      fontStyle: 'bold',
      backgroundColor: '#000000DD',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    message.setDepth(100);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: height / 2 - 50,
      duration: 2000,
      onComplete: () => message.destroy()
    });
  }

  private gameWon() {
    this.gamePhase = 'completed';
    
    if (this.spawnEvent) {
      this.spawnEvent.remove();
    }
    
    const { width, height } = this.scale;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    const boxWidth = 500;
    const boxHeight = 400;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const box = this.add.graphics();
    box.fillStyle(0x0a0e27, 0.98);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.lineStyle(4, 0x00FF00, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.setDepth(301);

    const title = this.add.text(width / 2, boxY + 50, '🎉 LEVEL COMPLETE!', {
      fontSize: '32px',
      color: '#00FF00',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);

    const stats = `
Final Score: ${this.score}
Cars Passed: ${this.carsPassed}
Crashes: ${this.crashes}
    `;

    const statsText = this.add.text(width / 2, boxY + 150, stats, {
      fontSize: '20px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5).setDepth(302);

    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 80;

    const restartButton = this.add.graphics();
    restartButton.fillGradientStyle(0x4CAF50, 0x4CAF50, 0x388E3C, 0x388E3C, 1);
    restartButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    restartButton.setDepth(302);

    const buttonText = this.add.text(width / 2, buttonY + 25, '🔄 PLAY AGAIN', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(303);

    restartButton.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    restartButton.on('pointerdown', () => {
      this.scene.restart();
    });
  }
}
