import Phaser from 'phaser';

interface Person {
  id: number;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  isInQueue: boolean;
  isAtAtm: boolean;
  isCompleted: boolean;
  queuePosition: number;
  atmUsageTime: number; // Time in milliseconds to use ATM
  clickCircle?: Phaser.GameObjects.Graphics; // Visual indicator for clickable area
}

export class CriticalSectionGame extends Phaser.Scene {
  // Game state
  private gamePhase: 'intro' | 'playing' | 'completed' = 'intro';
  private persons: Person[] = [];
  private currentPersonId: number = 1;
  private completedCount: number = 0;
  private totalPersons: number = 4;
  private isAtmOccupied: boolean = false;
  
  // Scoring system
  private totalScore: number = 0;
  private wrongAttempts: number = 0;
  private gameStartTime: number = 0;
  private currentTime: number = 0;
  
  // UI elements
  private consolePanel!: Phaser.GameObjects.Container;
  private consoleText!: Phaser.GameObjects.Text;
  private atmStatusText!: Phaser.GameObjects.Text;
  private atmStatusBg!: Phaser.GameObjects.Graphics;
  private instructionText!: Phaser.GameObjects.Text;
  private atmSprite!: Phaser.GameObjects.Sprite;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private atmProgressBar!: Phaser.GameObjects.Graphics;
  private atmProgressBg!: Phaser.GameObjects.Graphics;
  private atmTimerText!: Phaser.GameObjects.Text;
  
  // Game dimensions
  private GAME_WIDTH!: number;
  private GAME_HEIGHT!: number;
  
  // Positions based on background image layout - moved to bottom road level
  private readonly ATM_X = 120; // Left side of screen
  private readonly ATM_Y = 550; // Bottom road level
  private readonly ATM_FRONT_X = 120; // Position in front of ATM
  private readonly ATM_FRONT_Y = 530; // Ground level in front of ATM
  
  // Queue positions - spread across screen with proper spacing on road level
  private readonly QUEUE_START_X = 400; // Start after ATM with space
  private readonly QUEUE_Y = 550; // Bottom road level
  private readonly QUEUE_SPACING = 120; // More space between persons
  
  // Person spawn position (off-screen right)
  private readonly SPAWN_X = 1000;
  private readonly SPAWN_Y = 550;

  constructor() {
    super({ key: 'CriticalSectionGame' });
  }

  preload() {
    // Load background
    this.load.image('background', '/games/process-synchronization/backround-1.png');
    
    // Load ATM
    this.load.image('atm', '/games/process-synchronization/Atm.png');
    
    // Load person sprites
    for (let i = 1; i <= 5; i++) {
      this.load.image(`person-${i}`, `/games/process-synchronization/person-${i}.png`);
    }
    
    // Load sound effects
    this.load.audio('person-walk', '/games/process-synchronization/sounds/person-walk.wav');
    this.load.audio('background-music', '/games/process-synchronization/sounds/background_music.flac');
  }

  create() {
    this.GAME_WIDTH = this.cameras.main.width;
    this.GAME_HEIGHT = this.cameras.main.height;
    
    // Set default cursor for the entire game
    this.input.setDefaultCursor('default');
    
    // Start background music - loop continuously
    this.sound.play('background-music', { 
      loop: true, 
      volume: 0.3 
    });
    
    // Create background
    this.createBackground();
    
    // Create ATM
    this.createATM();
    
    // Create UI elements
    this.createConsole();
    this.createATMStatus();
    this.createInstructions();
    this.createUI();
    
    // Show intro scenario
    this.showIntroScenario();
    
    // Handle resize
    this.scale.on('resize', this.handleResize, this);
    
    // Ensure cursor is always default unless hovering over interactive elements
    this.input.on('pointermove', () => {
      this.input.setDefaultCursor('default');
    });
  }

  private createBackground() {
    const background = this.add.image(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 'background');
    background.setOrigin(0.5, 0.5);
    background.setDisplaySize(this.GAME_WIDTH, this.GAME_HEIGHT);
    background.setDepth(0);
  }

  private createATM() {
    // Create ATM sprite on the left side - larger size
    this.atmSprite = this.add.sprite(this.ATM_X, this.ATM_Y, 'atm');
    this.atmSprite.setScale(1.2); // Increased from 0.8 to 1.2
    this.atmSprite.setOrigin(0.5, 0.5); // Center the sprite anchor point
    this.atmSprite.setDepth(10);
    
    // Add a subtle glow effect to make ATM more prominent
    this.atmSprite.setTint(0xffffff);
  }

  private createConsole() {
    const panelWidth = 350;
    const panelHeight = 400;
    const panelX = this.GAME_WIDTH - panelWidth / 2 - 20;
    const panelY = this.GAME_HEIGHT / 2;

    this.consolePanel = this.add.container(panelX, panelY);
    this.consolePanel.setDepth(100);

    // Panel background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.9);
    bg.lineStyle(2, 0x00ff88);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 10);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 10);

    // Title
    const title = this.add.text(0, -panelHeight / 2 + 20, 'Console', {
      fontSize: '18px',
      color: '#00ff88',
      fontFamily: 'Consolas, monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Console text
    this.consoleText = this.add.text(-panelWidth / 2 + 15, -panelHeight / 2 + 50, '', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Consolas, monospace',
      align: 'left',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 30 }
    }).setOrigin(0, 0);

    this.consolePanel.add([bg, title, this.consoleText]);
    this.updateConsole('Critical Section Simulation\n\nSystem initialized...\nATM is ready and waiting...\n\nPersons will arrive shortly...');
  }

  private createATMStatus() {
    // ATM status indicator - small and compact to fit on ATM
    this.atmStatusBg = this.add.graphics();
    this.atmStatusBg.setDepth(50);

    // Smaller status indicator positioned on the ATM
    this.atmStatusText = this.add.text(this.ATM_X - 60, this.ATM_Y - 140, 'FREE', {
      fontSize: '14px',
      color: '#00ff88',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.atmStatusText.setDepth(50);

    // Progress bar background
    this.atmProgressBg = this.add.graphics();
    this.atmProgressBg.setDepth(50);
    this.atmProgressBg.setVisible(false);

    // Progress bar
    this.atmProgressBar = this.add.graphics();
    this.atmProgressBar.setDepth(51);
    this.atmProgressBar.setVisible(false);

    // Timer text
    this.atmTimerText = this.add.text(this.ATM_X + 70, this.ATM_Y - 140, '', {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.atmTimerText.setDepth(52);
    this.atmTimerText.setVisible(false);

    this.updateATMStatus(false);
  }

  private createInstructions() {
    // Remove the instruction text as it overlaps - phase text will show instructions
    this.instructionText = this.add.text(this.GAME_WIDTH / 2, 20, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.instructionText.setDepth(100);
    this.instructionText.setVisible(false); // Hide to prevent overlap
  }

  private createUI() {
    // Title - moved up slightly
    const titleText = this.add.text(this.GAME_WIDTH / 2, 25, '🏦 Critical Section Simulation', {
      fontSize: '24px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
    titleText.setDepth(12);

    // Phase indicator - better positioned below title
    this.phaseText = this.add.text(this.GAME_WIDTH / 2, 60, 'Phase: Intro', {
      fontSize: '16px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);
    this.phaseText.setDepth(12);

    // Score display - positioned on the right
    this.scoreText = this.add.text(this.GAME_WIDTH - 120, 25, 'Score: 0', {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 }
    });
    this.scoreText.setDepth(12);

    // Time display - positioned on the left
    this.timeText = this.add.text(120, 25, 'Time: 0s', {
      fontSize: '16px',
      color: '#00FFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 }
    });
    this.timeText.setDepth(12);
  }

  private showIntroScenario() {
    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
    overlay.setDepth(300);

    // Scenario box - cleaner and more compact
    const boxWidth = 700;
    const boxHeight = 600;
    const boxX = this.GAME_WIDTH / 2 - boxWidth / 2;
    const boxY = this.GAME_HEIGHT / 2 - boxHeight / 2;

    const scenarioBox = this.add.graphics();
    scenarioBox.fillStyle(0x0a0e27, 0.98);
    scenarioBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    scenarioBox.lineStyle(4, 0xFFD700, 1);
    scenarioBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    scenarioBox.setDepth(301);

    // Title
    const title = this.add.text(this.GAME_WIDTH / 2, boxY + 50, '🔒 CRITICAL SECTION', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(this.GAME_WIDTH / 2, boxY + 95, 'Process Synchronization Game', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: '600',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    // Clean sections layout
    const contentY = boxY + 145;

    // How to Play
    const howToPlayTitle = this.add.text(boxX + 50, contentY, '🎮 How to Play', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const howToPlay = `   1. Persckons arrive and form a queue
   2. Click on any person to send them to the ATM
   3. Only ONE person can use the ATM at a time
   4. Wait for the person to finish before sending next`;

    const howToPlayText = this.add.text(boxX + 50, contentY + 35, howToPlay, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Rules
    const rulesTitle = this.add.text(boxX + 50, contentY + 145, '⚠️ Mutual Exclusion Rules', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const rules = `   • ATM is a critical section (shared resource)
   • Only one person can access it at a time
   • Trying to access an occupied ATM = Error (-10 points)
   • Correct access = +25 points | Perfect game = +100 bonus`;

    const rulesText = this.add.text(boxX + 50, contentY + 180, rules, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Goals
    const goalTitle = this.add.text(boxX + 50, contentY + 280, '🎯 Goal', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const goal = `   Help all persons use the ATM while maintaining mutual exclusion!`;

    const goalText = this.add.text(boxX + 50, contentY + 315, goal, {
      fontSize: '16px',
      color: '#00ff88',
      fontStyle: '600',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Start button
    const buttonWidth = 200;
    const buttonHeight = 55;
    const buttonX = this.GAME_WIDTH / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 75;

    const startButton = this.add.graphics();
    startButton.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    startButton.lineStyle(3, 0xFFD700, 1);
    startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    startButton.setDepth(302);

    const buttonText = this.add.text(this.GAME_WIDTH / 2, buttonY + 27, '🚀 START GAME', {
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
      this.input.setDefaultCursor('pointer');
    });

    startButton.on('pointerout', () => {
      startButton.clear();
      startButton.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
      startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      startButton.lineStyle(3, 0xFFD700, 1);
      startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      this.input.setDefaultCursor('default');
    });

    startButton.on('pointerdown', () => {
      // Destroy all intro elements
      overlay.destroy();
      scenarioBox.destroy();
      title.destroy();
      subtitle.destroy();
      howToPlayTitle.destroy();
      howToPlayText.destroy();
      rulesTitle.destroy();
      rulesText.destroy();
      goalTitle.destroy();
      goalText.destroy();
      startButton.destroy();
      buttonText.destroy();
      
      this.startGame();
    });
  }

  private startGame() {
    this.gamePhase = 'playing';
    this.gameStartTime = this.time.now;
    this.currentTime = 0;
    
    // Update phase text
    this.phaseText.setText('Phase: Persons Arriving');
    
    // Start clock
    this.time.addEvent({
      delay: 100,
      callback: this.updateClock,
      callbackScope: this,
      loop: true
    });
    
    // Spawn persons one by one with delays
    this.time.delayedCall(2000, () => {
      this.spawnNextPerson();
    });
  }

  private spawnNextPerson() {
    if (this.currentPersonId > this.totalPersons) {
      this.phaseText.setText('Phase: ATM Access (Click persons)');
      this.updateConsole('All persons have arrived!\n\nClick on any person to send them to the ATM.\nOnly one person can use the ATM at a time.\n\nThis demonstrates mutual exclusion!');
      return;
    }

    const personId = this.currentPersonId;
    const queuePosition = personId - 1;
    
    // Create person sprite off-screen - larger size
    const sprite = this.add.sprite(this.SPAWN_X, this.SPAWN_Y, `person-${personId}`);
    sprite.setScale(0.9); // Increased from 0.6 to 0.9
    sprite.setOrigin(0.5, 0.5); // Center the sprite anchor point
    sprite.setDepth(20);
    // Don't set interactive yet - will set after person reaches queue

    // Create label
    const label = this.add.text(this.SPAWN_X, this.SPAWN_Y - 60, `Person ${personId}`, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    label.setDepth(20);

    // Random ATM usage time between 3-7 seconds (different for each person)
    const atmUsageTime = Phaser.Math.Between(3000, 7000);

    // Create person object
    const person: Person = {
      id: personId,
      sprite,
      label,
      isInQueue: false,
      isAtAtm: false,
      isCompleted: false,
      queuePosition,
      atmUsageTime
    };

    this.persons.push(person);

    // Calculate queue position with proper spacing
    const targetX = this.QUEUE_START_X + (queuePosition * this.QUEUE_SPACING);
    
    this.updateConsole(`Person ${personId} is arriving...\nWalking to queue position...`);
    
    // Play walking sound with reduced duration (stop after 1.5 seconds)
    const walkSound = this.sound.add('person-walk');
    walkSound.play({ volume: 0.5 });
    this.time.delayedCall(1500, () => {
      if (walkSound.isPlaying) {
        walkSound.stop();
      }
    });
    
    // Animate person walking to queue position
    this.tweens.add({
      targets: [sprite, label],
      x: targetX,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => {
        person.isInQueue = true;
        this.updateConsole(`Person ${personId} has joined the queue!\nQueue size: ${this.persons.length}\n\nClick on any person to send them to the ATM.\nRemember: Only one person at a time!`);
        
        // Set interactive with pixel perfect detection based on texture
        sprite.setInteractive({ 
          pixelPerfect: true,
          alphaTolerance: 1,
          cursor: 'pointer'
        });
        
        // Add click handler
        sprite.on('pointerdown', () => this.onPersonClick(person));
        
        // Add hover effects - only for this specific person
        sprite.on('pointerover', () => {
          if (!person.isAtAtm && !person.isCompleted) {
            sprite.setTint(0xaaaaff);
            this.input.setDefaultCursor('pointer');
            // Add a subtle scale effect
            this.tweens.add({
              targets: sprite,
              scaleX: 1.0,
              scaleY: 1.0,
              duration: 200,
              ease: 'Power2'
            });
          }
        });
        
        sprite.on('pointerout', () => {
          sprite.clearTint();
          this.input.setDefaultCursor('default');
          // Reset scale
          this.tweens.add({
            targets: sprite,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 200,
            ease: 'Power2'
          });
        });
      }
    });

    this.currentPersonId++;
    
    // Spawn next person after delay
    this.time.delayedCall(2000, () => {
      this.spawnNextPerson();
    });
  }

  private onPersonClick(person: Person) {
    // Check if this specific person can be sent to ATM
    if (person.isAtAtm || person.isCompleted) {
      this.showMessage('⚠️ This person is already at the ATM or has completed!', '#FF0000');
      return;
    }

    if (this.isAtmOccupied) {
      // Wrong attempt - deduct points
      this.wrongAttempts++;
      this.totalScore = Math.max(0, this.totalScore - 10);
      this.updateScoreDisplay();
      
      this.showMessage('❌ ATM is occupied! Only one person can use it at a time! -10 points', '#FF0000');
      
      // Shake the person sprite to indicate error
      this.tweens.add({
        targets: person.sprite,
        x: person.sprite.x + 5,
        duration: 100,
        yoyo: true,
        repeat: 3,
        ease: 'Power2'
      });
      
      this.updateConsole(`Person ${person.id} tried to access occupied ATM!\nThis demonstrates mutual exclusion!\nScore: ${this.totalScore}`);
      return;
    }

    if (!person.isInQueue) {
      this.showMessage('⚠️ This person hasn\'t joined the queue yet!', '#FF0000');
      return;
    }

    // Correct access - add points
    this.totalScore += 25;
    this.updateScoreDisplay();
    
    // Send this specific person to ATM
    this.updateConsole(`Sending Person ${person.id} to the ATM... (+25 points)`);
    this.sendPersonToATM(person);
  }

  private sendPersonToATM(person: Person) {
    person.isAtAtm = true;
    this.isAtmOccupied = true;
    this.updateATMStatus(true);
    
    // Disable interaction for this person
    person.sprite.disableInteractive();
    person.sprite.clearTint();
    
    this.updateConsole(`Person ${person.id} is walking to ATM...\nATM is now OCCUPIED!\n\nCritical section is being accessed...`);

    // Play walking sound with reduced duration (stop after 1.5 seconds)
    const walkSound = this.sound.add('person-walk');
    walkSound.play({ volume: 0.5 });
    this.time.delayedCall(1500, () => {
      if (walkSound.isPlaying) {
        walkSound.stop();
      }
    });

    // Animate person walking to ATM
    this.tweens.add({
      targets: [person.sprite, person.label],
      x: this.ATM_FRONT_X,
      y: this.ATM_FRONT_Y,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        const usageTimeInSeconds = (person.atmUsageTime / 1000).toFixed(1);
        this.updateConsole(`Person ${person.id} is using the ATM...\nTransaction time: ${usageTimeInSeconds}s\nTransaction in progress...\n\nCritical section is protected!`);
        
        // Simulate ATM usage with visual feedback
        this.atmSprite.setTint(0xffaaaa); // Slight red tint when in use
        
        // Show progress bar and timer
        this.showATMProgress(person.atmUsageTime);
        
        // Simulate ATM usage with person's specific time
        this.time.delayedCall(person.atmUsageTime, () => {
          this.completePersonTransaction(person);
        });
      }
    });
  }

  private showATMProgress(duration: number) {
    // Show progress elements
    this.atmProgressBg.setVisible(true);
    this.atmProgressBar.setVisible(true);
    this.atmTimerText.setVisible(true);

    const progressBarWidth = 120;
    const progressBarHeight = 8;
    const progressBarX = this.ATM_X - progressBarWidth / 2;
    const progressBarY = this.ATM_Y - 110;

    // Draw progress bar background
    this.atmProgressBg.clear();
    this.atmProgressBg.fillStyle(0x333333, 0.8);
    this.atmProgressBg.fillRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 4);
    this.atmProgressBg.lineStyle(1, 0x666666, 1);
    this.atmProgressBg.strokeRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 4);

    // Animate progress bar
    let startTime = this.time.now;
    
    const updateProgress = () => {
      const elapsed = this.time.now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const remainingTime = Math.max((duration - elapsed) / 1000, 0);

      // Update progress bar
      this.atmProgressBar.clear();
      this.atmProgressBar.fillStyle(0x00ff88, 1);
      this.atmProgressBar.fillRoundedRect(
        progressBarX + 1,
        progressBarY + 1,
        (progressBarWidth - 2) * progress,
        progressBarHeight - 2,
        3
      );

      // Update timer text
      this.atmTimerText.setText(`${remainingTime.toFixed(1)}s`);

      if (progress < 1) {
        this.time.delayedCall(50, updateProgress);
      } else {
        // Hide progress elements when complete
        this.time.delayedCall(200, () => {
          this.atmProgressBg.setVisible(false);
          this.atmProgressBar.setVisible(false);
          this.atmTimerText.setVisible(false);
        });
      }
    };

    updateProgress();
  }

  private completePersonTransaction(person: Person) {
    person.isCompleted = true;
    this.completedCount++;
    
    this.updateConsole(`Person ${person.id} finished transaction!\nLeaving the ATM...\n\nCompleted: ${this.completedCount}/${this.totalPersons}\n\nCritical section is now free!`);

    // Reset ATM visual
    this.atmSprite.setTint(0xffffff);

    // Play walking sound for leaving with reduced duration (stop after 1.5 seconds)
    const walkSound = this.sound.add('person-walk');
    walkSound.play({ volume: 0.5 });
    this.time.delayedCall(1500, () => {
      if (walkSound.isPlaying) {
        walkSound.stop();
      }
    });

    // Animate person leaving
    this.tweens.add({
      targets: [person.sprite, person.label],
      x: -100, // Exit left
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        // Free up ATM
        this.isAtmOccupied = false;
        this.updateATMStatus(false);
        
        // Destroy person objects
        person.sprite.destroy();
        person.label.destroy();
        
        this.updateConsole(`Person ${person.id} has left.\nATM is now FREE!\n\nCompleted: ${this.completedCount}/${this.totalPersons}\n\nClick another person to continue...`);
        
        // Check if all persons completed
        if (this.completedCount >= this.totalPersons) {
          this.time.delayedCall(3000, () => {
            this.submitScore();
            this.showEndGame();
          });
        }
      }
    });
  }

  private updateATMStatus(occupied: boolean) {
    const text = occupied ? 'OCCUPIED' : 'FREE';
    const color = occupied ? '#ff4444' : '#00ff88';
    const bgColor = occupied ? 0xff4444 : 0x00ff88;
    
    this.atmStatusText.setText(text);
    this.atmStatusText.setColor(color);
    
    // Update background - smaller size to fit on ATM
    this.atmStatusBg.clear();
    this.atmStatusBg.fillStyle(bgColor, 0.5);
    this.atmStatusBg.fillRoundedRect(
      this.atmStatusText.x - 40,
      this.atmStatusText.y - 15,
      80,
      30,
      8
    );
    this.atmStatusBg.lineStyle(2, bgColor, 1);
    this.atmStatusBg.strokeRoundedRect(
      this.atmStatusText.x - 40,
      this.atmStatusText.y - 15,
      80,
      30,
      8
    );
  }

  private updateConsole(message: string) {
    this.consoleText.setText(message);
  }

  private showEndGame() {
    this.gamePhase = 'completed';
    
    // Calculate final score out of 100
    const maxPossibleScore = this.totalPersons * 25; // 25 points per person
    const perfectBonus = this.wrongAttempts === 0 ? 100 : 0; // 100 bonus for perfect game
    const finalScore = Math.min(100, Math.round((this.totalScore / (maxPossibleScore + 100)) * 100));
    
    // Create end game overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
    overlay.setDepth(300);

    // Scenario box - matching intro style
    const boxWidth = 700;
    const boxHeight = 550;
    const boxX = this.GAME_WIDTH / 2 - boxWidth / 2;
    const boxY = this.GAME_HEIGHT / 2 - boxHeight / 2;

    const scenarioBox = this.add.graphics();
    scenarioBox.fillStyle(0x0a0e27, 0.98);
    scenarioBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    scenarioBox.lineStyle(4, 0xFFD700, 1);
    scenarioBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    scenarioBox.setDepth(301);

    // Title
    const title = this.add.text(this.GAME_WIDTH / 2, boxY + 50, '🎉 GAME COMPLETE', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(this.GAME_WIDTH / 2, boxY + 95, 'Mutual Exclusion Demonstrated', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: '600',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    // Clean sections layout
    const contentY = boxY + 150;

    // Results Summary
    const resultsTitle = this.add.text(boxX + 50, contentY, '📊 Results', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const results = `   • All ${this.totalPersons} persons completed their transactions
   • Base Score: ${this.totalScore} points
   • Wrong Attempts: ${this.wrongAttempts}
   • Perfect Bonus: ${perfectBonus} points`;

    const resultsText = this.add.text(boxX + 50, contentY + 35, results, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Performance rating
    let rating = '';
    let ratingColor = '#ff0000';
    let ratingIcon = '📚';
    if (finalScore >= 90) {
      rating = 'EXCELLENT!';
      ratingColor = '#00ff00';
      ratingIcon = '🏆';
    } else if (finalScore >= 70) {
      rating = 'GOOD!';
      ratingColor = '#ffff00';
      ratingIcon = '🥈';
    } else if (finalScore >= 50) {
      rating = 'FAIR!';
      ratingColor = '#ff8800';
      ratingIcon = '🥉';
    } else {
      rating = 'NEEDS IMPROVEMENT!';
      ratingColor = '#ff0000';
      ratingIcon = '📚';
    }

    const performanceTitle = this.add.text(boxX + 50, contentY + 150, '⭐ Performance', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const performanceRating = this.add.text(boxX + 50, contentY + 185, `   ${ratingIcon} ${rating}`, {
      fontSize: '18px',
      color: ratingColor,
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Final Score - large display
    const finalScoreTitle = this.add.text(boxX + 50, contentY + 240, '🎯 Final Score', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const finalScoreText = this.add.text(boxX + 50, contentY + 275, `   ${finalScore}/100`, {
      fontSize: '32px',
      color: '#00ff88',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Restart button
    const buttonWidth = 200;
    const buttonHeight = 55;
    const buttonX = this.GAME_WIDTH / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 75;

    const restartButton = this.add.graphics();
    restartButton.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
    restartButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    restartButton.lineStyle(3, 0xFFD700, 1);
    restartButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    restartButton.setDepth(302);

    const buttonText = this.add.text(this.GAME_WIDTH / 2, buttonY + 27, '🔄 PLAY AGAIN', {
      fontSize: '22px',
      color: '#000000',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(303);

    restartButton.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    restartButton.on('pointerover', () => {
      restartButton.clear();
      restartButton.fillGradientStyle(0xFFFF00, 0xFFFF00, 0xFFCC00, 0xFFCC00, 1);
      restartButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      restartButton.lineStyle(3, 0xFFD700, 1);
      restartButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      this.input.setDefaultCursor('pointer');
    });

    restartButton.on('pointerout', () => {
      restartButton.clear();
      restartButton.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
      restartButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      restartButton.lineStyle(3, 0xFFD700, 1);
      restartButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      this.input.setDefaultCursor('default');
    });

    restartButton.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  private calculateScore(): number {
    const baseScore = this.completedCount * 100;
    const perfectBonus = this.completedCount === this.totalPersons ? 500 : 0;
    const efficiencyBonus = this.completedCount === this.totalPersons ? 200 : 0;
    return baseScore + perfectBonus + efficiencyBonus;
  }

  private updateClock() {
    this.currentTime = (this.time.now - this.gameStartTime) / 1000;
    this.timeText.setText(`Time: ${this.currentTime.toFixed(1)}s`);
  }

  private updateScoreDisplay() {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${Math.max(0, this.totalScore)}`);
    }
  }

  private showMessage(text: string, color: string) {
    const message = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, text, {
      fontSize: '24px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000AA',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    message.setDepth(30);
    
    this.tweens.add({
      targets: message,
      alpha: 0,
      y: message.y - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => message.destroy()
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.GAME_WIDTH = gameSize.width;
    this.GAME_HEIGHT = gameSize.height;
  }

  private async submitScore() {
    try {
      const timeSpent = Math.floor((Date.now() - (this.gameStartTime + Date.now() - this.time.now)) / 1000);
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'critical-section-l1',
          moduleId: 'process-synchronization',
          levelId: 'l1',
          score: Math.max(0, this.totalScore),
          timeSpent: Math.floor(this.currentTime),
          accuracy: this.wrongAttempts === 0 ? 100 : Math.max(0, 100 - (this.wrongAttempts * 10)),
          wrongAttempts: this.wrongAttempts,
          metadata: {
            completedPersons: this.completedCount,
            totalPersons: this.totalPersons
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.achievementsUnlocked && result.achievementsUnlocked.length > 0) {
          this.showMessage(
            `🎉 Achievement Unlocked! ${result.achievementsUnlocked.length} new achievement(s)`,
            '#00FF00'
          );
        }
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }
}

// Export game configuration
export const CriticalSectionGameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#181c24',
  scene: CriticalSectionGame,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};
