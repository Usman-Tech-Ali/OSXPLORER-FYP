import Phaser from 'phaser';

interface Car {
  sprite: Phaser.GameObjects.Sprite;
  direction: 'left' | 'right';
  carType: number;
  isMoving: boolean;
  isWaiting: boolean;
}

export class MutexGameScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Image;
  private cars: Car[] = [];
  private mutexLocked: boolean = false;
  private criticalSectionCar: Car | null = null;
  private score: number = 0;
  private crashes: number = 0;
  private gameStartTime: number = 0; // Track when game started
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private gamePhase: 'intro' | 'playing' | 'completed' = 'intro';
  private targetScore: number = 10; // Win condition: pass 10 cars successfully
  private spawnEvent?: Phaser.Time.TimerEvent;

  // Positions
  private readonly CRITICAL_SECTION_START = 0.35;
  private readonly CRITICAL_SECTION_END = 0.65;
  private readonly LEFT_WAITING_X = 0.15;
  private readonly RIGHT_WAITING_X = 0.85;
  private readonly ROAD_Y = 0.55;

  constructor() {
    super({ key: 'MutexGameScene' });
  }

  preload() {
    // Load assets
    this.load.image('background', '/games/process-synchronization/mutex/background.png');
    
    // Load car images
    for (let i = 1; i <= 3; i++) {
      this.load.image(`car${i}-left`, `/games/process-synchronization/mutex/car${i}-right.png`);
      this.load.image(`car${i}-right`, `/games/process-synchronization/mutex/car${i}-left.png`);
    }
  }

  create() {
    const { width, height } = this.scale;

    // Add background
    this.background = this.add.image(width / 2, height / 2, 'background');
    this.background.setDisplaySize(width, height);

    // Create UI
    this.createUI();

    // Show intro modal
    this.showIntroModal();
  }

  private startGame() {
    this.gamePhase = 'playing';
    this.gameStartTime = Date.now(); // Track game start time
    
    // Spawn initial cars
    this.spawnCar('left');
    this.spawnCar('right');

    // Spawn new cars periodically
    this.spawnEvent = this.time.addEvent({
      delay: 5000,
      callback: () => {
        const side = Phaser.Math.RND.pick(['left', 'right']) as 'left' | 'right';
        this.spawnCar(side);
      },
      loop: true,
    });
  }

  private createUI() {
    const { width, height } = this.scale;

    // Score text
    this.scoreText = this.add.text(20, 20, 'Cars Passed: 0', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    });

    // Crashes text
    this.add.text(20, 60, 'Crashes: 0', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    }).setName('crashText');

    // Status text
    this.statusText = this.add.text(width / 2, 20, 'Critical Section: UNLOCKED', {
      fontSize: '28px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 15, y: 8 },
    }).setOrigin(0.5, 0);

    // Instructions
    this.instructionText = this.add.text(width / 2, height - 80, 
      'Click on a car to let it pass through the critical section\nOnly ONE car can pass at a time!', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 15, y: 10 },
      align: 'center',
    }).setOrigin(0.5, 0);
  }

  private spawnCar(side: 'left' | 'right') {
    const { width, height } = this.scale;
    const carType = Phaser.Math.Between(1, 3);
    
    const x = side === 'left' ? width * this.LEFT_WAITING_X : width * this.RIGHT_WAITING_X;
    const y = height * this.ROAD_Y;
    
    const textureKey = `car${carType}-${side}`;
    const sprite = this.add.sprite(x, y, textureKey);
    
    // Scale car appropriately
    const scale = 0.15;
    sprite.setScale(scale);
    sprite.setInteractive({ useHandCursor: true });

    const car: Car = {
      sprite,
      direction: side,
      carType,
      isMoving: false,
      isWaiting: true,
    };

    this.cars.push(car);

    // Add click handler
    sprite.on('pointerdown', () => this.onCarClick(car));
    
    // Add hover effect
    sprite.on('pointerover', () => {
      if (car.isWaiting) {
        sprite.setTint(0xffff00);
      }
    });
    
    sprite.on('pointerout', () => {
      sprite.clearTint();
    });
  }

  private onCarClick(car: Car) {
    if (!car.isWaiting || car.isMoving) return;

    // Check if mutex is locked
    if (this.mutexLocked) {
      // Race condition! Crash!
      this.handleCrash(car);
      return;
    }

    // Acquire mutex lock
    this.mutexLocked = true;
    this.criticalSectionCar = car;
    car.isWaiting = false;
    car.isMoving = true;

    // Update status
    this.updateStatus();

    // Move car through critical section
    this.moveCar(car);
  }

  private moveCar(car: Car) {
    const { width } = this.scale;
    const speed = 200;
    
    const startX = car.direction === 'left' ? 
      width * this.LEFT_WAITING_X : 
      width * this.RIGHT_WAITING_X;
    
    const endX = car.direction === 'left' ? 
      width * this.RIGHT_WAITING_X : 
      width * this.LEFT_WAITING_X;

    // Animate car movement
    this.tweens.add({
      targets: car.sprite,
      x: endX,
      duration: Math.abs(endX - startX) / speed * 1000,
      ease: 'Linear',
      onComplete: () => {
        // Car has passed through
        this.score++;
        this.scoreText.setText(`Cars Passed: ${this.score}`);
        
        // Release mutex lock
        this.mutexLocked = false;
        this.criticalSectionCar = null;
        this.updateStatus();
        
        // Remove car
        car.sprite.destroy();
        const index = this.cars.indexOf(car);
        if (index > -1) {
          this.cars.splice(index, 1);
        }

        // Check win condition
        if (this.score >= this.targetScore) {
          this.gamePhase = 'completed';
          if (this.spawnEvent) {
            this.spawnEvent.remove();
          }
          this.time.delayedCall(1000, () => {
            this.showResultsModal();
          });
        }
      },
    });
  }

  private handleCrash(car: Car) {
    this.crashes++;
    
    // Update crash text
    const crashText = this.children.getByName('crashText') as Phaser.GameObjects.Text;
    if (crashText) {
      crashText.setText(`Crashes: ${this.crashes}`);
      crashText.setColor('#ff0000');
      this.time.delayedCall(500, () => crashText.setColor('#ffffff'));
    }

    // Visual feedback
    car.sprite.setTint(0xff0000);
    
    // Shake camera
    this.cameras.main.shake(300, 0.01);
    
    // Flash status
    this.statusText.setColor('#ff0000');
    this.statusText.setText('RACE CONDITION! CRASH!');
    
    this.time.delayedCall(1500, () => {
      this.updateStatus();
    });

    // Show crash effect
    this.tweens.add({
      targets: car.sprite,
      alpha: 0,
      angle: 360,
      duration: 500,
      onComplete: () => {
        car.sprite.destroy();
        const index = this.cars.indexOf(car);
        if (index > -1) {
          this.cars.splice(index, 1);
        }
      },
    });
  }

  private updateStatus() {
    if (this.mutexLocked) {
      this.statusText.setText('Critical Section: LOCKED');
      this.statusText.setColor('#ff0000');
    } else {
      this.statusText.setText('Critical Section: UNLOCKED');
      this.statusText.setColor('#00ff00');
    }
  }

  private showIntroModal() {
    const { width, height } = this.scale;

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    // Modal box
    const boxWidth = 700;
    const boxHeight = 650;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const modalBox = this.add.graphics();
    modalBox.fillStyle(0x0a0e27, 0.98);
    modalBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    modalBox.lineStyle(4, 0xFFD700, 1);
    modalBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    modalBox.setDepth(301);

    // Title
    const title = this.add.text(width / 2, boxY + 50, '🚗 MUTEX LOCK GAME', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(width / 2, boxY + 95, 'Learn Mutual Exclusion & Critical Sections', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: '600',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    const contentY = boxY + 145;

    // Concept
    const conceptTitle = this.add.text(boxX + 50, contentY, '💡 Concept', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const concept = `   The narrow construction lane is a CRITICAL SECTION.
   Only ONE car can pass at a time using MUTEX LOCK.
   Two cars entering = RACE CONDITION = CRASH!`;

    const conceptText = this.add.text(boxX + 50, contentY + 35, concept, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // How to Play
    const howToPlayTitle = this.add.text(boxX + 50, contentY + 135, '🎮 How to Play', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const howToPlay = `   1. Cars appear on both sides of the construction lane
   2. Click on a car to let it pass through
   3. Wait for the car to finish before clicking another
   4. Pass ${this.targetScore} cars successfully to win!`;

    const howToPlayText = this.add.text(boxX + 50, contentY + 170, howToPlay, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Rules
    const rulesTitle = this.add.text(boxX + 50, contentY + 280, '⚠️ Rules', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const rules = `   • Only ONE car can use the critical section at a time
   • Wait for "UNLOCKED" status before clicking next car
   • Clicking during "LOCKED" causes a crash!`;

    const rulesText = this.add.text(boxX + 50, contentY + 315, rules, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Start button
    const buttonWidth = 200;
    const buttonHeight = 55;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 75;

    const startButton = this.add.graphics();
    startButton.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    startButton.lineStyle(3, 0xFFD700, 1);
    startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    startButton.setDepth(302);

    const buttonText = this.add.text(width / 2, buttonY + 27, '🚀 START GAME', {
      fontSize: '22px',
      color: '#000000',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(303);

    startButton.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    startButton.on('pointerover', () => {
      startButton.clear();
      startButton.fillGradientStyle(0xFFFF00, 0xFFFF00, 0xFFCC00, 0xFFCC00, 1);
      startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      startButton.lineStyle(3, 0xFFD700, 1);
      startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      this.sys.canvas.style.cursor = 'pointer';
    });

    startButton.on('pointerout', () => {
      startButton.clear();
      startButton.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
      startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      startButton.lineStyle(3, 0xFFD700, 1);
      startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      this.sys.canvas.style.cursor = 'default';
    });

    startButton.on('pointerdown', () => {
      overlay.destroy();
      modalBox.destroy();
      title.destroy();
      subtitle.destroy();
      conceptTitle.destroy();
      conceptText.destroy();
      howToPlayTitle.destroy();
      howToPlayText.destroy();
      rulesTitle.destroy();
      rulesText.destroy();
      startButton.destroy();
      buttonText.destroy();
      
      this.startGame();
    });
  }

  private showResultsModal() {
    const { width, height } = this.scale;

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    // Modal box
    const boxWidth = 600;
    const boxHeight = 500;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const modalBox = this.add.graphics();
    modalBox.fillStyle(0x0a0e27, 0.98);
    modalBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    modalBox.lineStyle(4, 0xFFD700, 1);
    modalBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    modalBox.setDepth(301);

    // Submit score to backend
    this.submitScore();

    // Title
    const title = this.add.text(width / 2, boxY + 60, '🎉 GAME COMPLETE!', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(302);

    // Results
    const resultsY = boxY + 140;

    const scoreText = this.add.text(width / 2, resultsY, `Cars Passed: ${this.score}`, {
      fontSize: '28px',
      color: '#00FF00',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);

    const crashText = this.add.text(width / 2, resultsY + 50, `Crashes (Race Conditions): ${this.crashes}`, {
      fontSize: '22px',
      color: this.crashes === 0 ? '#00FF00' : '#FF6B35'
    }).setOrigin(0.5).setDepth(302);

    // Performance message
    let performanceMsg = '';
    let performanceColor = '#FFFFFF';
    
    if (this.crashes === 0) {
      performanceMsg = '🌟 PERFECT! No race conditions!';
      performanceColor = '#FFD700';
    } else if (this.crashes <= 2) {
      performanceMsg = '👍 Good job! Few race conditions.';
      performanceColor = '#00FF00';
    } else {
      performanceMsg = '💡 Practice more to avoid race conditions!';
      performanceColor = '#FFA500';
    }

    const performanceText = this.add.text(width / 2, resultsY + 110, performanceMsg, {
      fontSize: '20px',
      color: performanceColor,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);

    // Learning summary
    const learningText = this.add.text(width / 2, resultsY + 160, 
      'You learned about:\n• Mutex Locks\n• Critical Sections\n• Race Conditions', {
      fontSize: '16px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5).setDepth(302);

    // Restart button
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 70;

    const restartButton = this.add.graphics();
    restartButton.fillStyle(0xFFD700, 1);
    restartButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    restartButton.setDepth(302);

    const restartText = this.add.text(width / 2, buttonY + 25, '🔄 PLAY AGAIN', {
      fontSize: '20px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(303);

    restartButton.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    restartButton.on('pointerover', () => {
      restartButton.clear();
      restartButton.fillStyle(0xFFFF00, 1);
      restartButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'pointer';
    });

    restartButton.on('pointerout', () => {
      restartButton.clear();
      restartButton.fillStyle(0xFFD700, 1);
      restartButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'default';
    });

    restartButton.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  update() {
    // Game loop updates if needed
  }
}
