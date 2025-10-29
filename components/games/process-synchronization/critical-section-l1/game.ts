import Phaser from 'phaser';

interface Person {
  id: number;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  isInQueue: boolean;
  isAtAtm: boolean;
  isCompleted: boolean;
  queuePosition: number;
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
  }

  create() {
    this.GAME_WIDTH = this.cameras.main.width;
    this.GAME_HEIGHT = this.cameras.main.height;
    
    // Set default cursor for the entire game
    this.input.setDefaultCursor('default');
    
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
    // ATM status indicator above the ATM
    this.atmStatusBg = this.add.graphics();
    this.atmStatusBg.setDepth(50);

    this.atmStatusText = this.add.text(this.ATM_X-50, this.ATM_Y - 140, 'FREE', {
      fontSize: '24px',
      color: '#00ff88',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.atmStatusText.setDepth(50);

    this.updateATMStatus(false);
  }

  private createInstructions() {
    this.instructionText = this.add.text(this.GAME_WIDTH / 2, 50, 'Click on persons to send them to the ATM (one at a time)', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.instructionText.setDepth(100);
  }

  private createUI() {
    // Title
    const titleText = this.add.text(this.GAME_WIDTH / 2, 40, '🏦 Critical Section Simulation 🏦', {
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#00000099',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5);
    titleText.setDepth(12);

    // Phase indicator
    this.phaseText = this.add.text(this.GAME_WIDTH / 2, 88, 'Phase: Intro', {
      fontSize: '18px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 10, y: 4 }
    }).setOrigin(0.5);
    this.phaseText.setDepth(12);

    // Score display
    this.scoreText = this.add.text(this.GAME_WIDTH - 150, 90, 'Score: 0', {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 }
    });
    this.scoreText.setDepth(12);

    // Time display
    this.timeText = this.add.text(170, 90, 'Time: 0s', {
      fontSize: '16px',
      color: '#00FFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 }
    });
    this.timeText.setDepth(12);
  }

  private showIntroScenario() {
    // Dark overlay to hide background completely
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
    overlay.setDepth(100);

    // Compact scenario box
    const boxWidth = 850;
    const boxHeight = 550;
    const boxX = this.GAME_WIDTH / 2 - boxWidth / 2;
    const boxY = this.GAME_HEIGHT / 2 - boxHeight / 2;

    const scenarioBox = this.add.graphics();
    scenarioBox.fillStyle(0x1a1a2e, 0.98);
    scenarioBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 25);
    scenarioBox.lineStyle(4, 0xFFD700, 1);
    scenarioBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 25);
    scenarioBox.setDepth(101);

    const gradientBox = this.add.graphics();
    gradientBox.fillGradientStyle(0xFFD700, 0xFFA500, 0xFF8C00, 0xFF4500, 0.1);
    gradientBox.fillRoundedRect(boxX + 5, boxY + 5, boxWidth - 10, boxHeight - 10, 20);
    gradientBox.setDepth(101);

    const title = this.add.text(this.GAME_WIDTH / 2, boxY + 40, '🔒 CRITICAL SECTION SIMULATION', {
      fontSize: '38px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    title.setDepth(102);

    const subtitle = this.add.text(this.GAME_WIDTH / 2, boxY + 90, 'Process Synchronization - Mutual Exclusion Demo', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'normal'
    }).setOrigin(0.5);
    subtitle.setDepth(102);

    const scenarioText = `📚 LEARNING OBJECTIVES:
• Understand Critical Section concept
• Learn Mutual Exclusion principle
• Visualize process synchronization

🎮 HOW TO PLAY:

1️⃣ ARRIVAL: Persons arrive and form a queue
2️⃣ ATM ACCESS: Click on persons to send them to ATM
   ⚠️ Only ONE person can use ATM at a time!
3️⃣ COMPLETION: Person completes transaction and leaves

📋 RULES:
• Click on any person to send them to ATM
• Only one person can use ATM at a time
• Wait for current person to finish before next
• Follow mutual exclusion principle

🎯 SCORING:
✅ Correct access: +25 points
❌ Wrong attempt: -10 points
🏆 Perfect game: +100 bonus points`;

    const text = this.add.text(this.GAME_WIDTH / 2, boxY + 310, scenarioText, {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'normal',
      align: 'left',
      lineSpacing: 5
    }).setOrigin(0.5);
    text.setDepth(102);

    // Start button - positioned inside box
    const buttonWidth = 280;
    const buttonHeight = 55;
    const buttonX = this.GAME_WIDTH / 2 - buttonWidth / 2 + 240;
    const buttonY = boxY + boxHeight - 80;

    const startButton = this.add.graphics();
    startButton.fillStyle(0xFFD700, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    startButton.lineStyle(3, 0xFF8C00, 1);
    startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    startButton.setDepth(102);

    const buttonText = this.add.text(this.GAME_WIDTH / 2 + 240, buttonY + 28, '🚀 START', {
      fontSize: '22px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    buttonText.setDepth(102);

    startButton.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    startButton.on('pointerover', () => {
      startButton.clear();
      startButton.fillStyle(0xFFA500, 1);
      startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
      startButton.lineStyle(3, 0xFF8C00, 1);
      startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    });

    startButton.on('pointerout', () => {
      startButton.clear();
      startButton.fillStyle(0xFFD700, 1);
      startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
      startButton.lineStyle(3, 0xFF8C00, 1);
      startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    });

    startButton.on('pointerdown', () => {
      overlay.destroy();
      scenarioBox.destroy();
      gradientBox.destroy();
      title.destroy();
      subtitle.destroy();
      text.destroy();
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
    sprite.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, 40) // Hit area centered on sprite
    });

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

    // Create person object
    const person: Person = {
      id: personId,
      sprite,
      label,
      isInQueue: false,
      isAtAtm: false,
      isCompleted: false,
      queuePosition
    };

    this.persons.push(person);

    // Calculate queue position with proper spacing
    const targetX = this.QUEUE_START_X + (queuePosition * this.QUEUE_SPACING);
    
    this.updateConsole(`Person ${personId} is arriving...\nWalking to queue position...`);
    
    // Animate person walking to queue position
    this.tweens.add({
      targets: [sprite, label],
      x: targetX,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => {
        person.isInQueue = true;
        this.updateConsole(`Person ${personId} has joined the queue!\nQueue size: ${this.persons.length}\n\nClick on any person to send them to the ATM.\nRemember: Only one person at a time!`);
        
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
    
    this.updateConsole(`Person ${person.id} is walking to ATM...\nATM is now OCCUPIED!\n\nCritical section is being accessed...`);

    // Animate person walking to ATM
    this.tweens.add({
      targets: [person.sprite, person.label],
      x: this.ATM_FRONT_X,
      y: this.ATM_FRONT_Y,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.updateConsole(`Person ${person.id} is using the ATM...\nTransaction in progress...\n\nCritical section is protected!`);
        
        // Simulate ATM usage with visual feedback
        this.atmSprite.setTint(0xffaaaa); // Slight red tint when in use
        
        // Simulate ATM usage
        this.time.delayedCall(4000, () => {
          this.completePersonTransaction(person);
        });
      }
    });
  }

  private completePersonTransaction(person: Person) {
    person.isCompleted = true;
    this.completedCount++;
    
    this.updateConsole(`Person ${person.id} finished transaction!\nLeaving the ATM...\n\nCompleted: ${this.completedCount}/${this.totalPersons}\n\nCritical section is now free!`);

    // Reset ATM visual
    this.atmSprite.setTint(0xffffff);

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
    
    // Update background
    this.atmStatusBg.clear();
    this.atmStatusBg.fillStyle(bgColor, 0.4);
    this.atmStatusBg.fillRoundedRect(
      this.atmStatusText.x - 70,
      this.atmStatusText.y - 25,
      140,
      50,
      15
    );
    this.atmStatusBg.lineStyle(3, bgColor, 1);
    this.atmStatusBg.strokeRoundedRect(
      this.atmStatusText.x - 70,
      this.atmStatusText.y - 25,
      140,
      50,
      15
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
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
    overlay.setDepth(200);

    // End game container
    const container = this.add.container(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2);
    container.setDepth(201);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.95);
    bg.lineStyle(4, 0x00ff88);
    bg.fillRoundedRect(-450, -300, 900, 600, 25);
    bg.strokeRoundedRect(-450, -300, 900, 600, 25);
    container.add(bg);

    // Title
    const title = this.add.text(0, -220, '🎉 CRITICAL SECTION SIMULATION COMPLETE! 🎉', {
      fontSize: '32px',
      color: '#00ff88',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    container.add(title);

    // Subtitle
    const subtitle = this.add.text(0, -160, 'Mutual Exclusion Successfully Demonstrated', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(subtitle);

    // Results
    const results = this.add.text(0, -80, `✅ All ${this.totalPersons} persons successfully used the ATM!\n\n🔒 No race conditions occurred\n🛡️ Mutual exclusion was maintained throughout\n⚡ Critical section was properly protected\n🎯 Each person waited their turn patiently\n\nThis simulation demonstrates how critical sections\nprevent multiple processes from accessing\nshared resources simultaneously!`, {
      fontSize: '16px',
      color: '#cccccc',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);
    container.add(results);

    // Score breakdown
    const scoreBreakdown = this.add.text(0, 80, `📊 SCORE BREAKDOWN:\n\nBase Score: ${this.totalScore} points\nWrong Attempts: ${this.wrongAttempts}\nPerfect Bonus: ${perfectBonus} points\n\nFinal Score: ${finalScore}/100`, {
      fontSize: '18px',
      color: '#ffff00',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5);
    container.add(scoreBreakdown);

    // Performance rating
    let rating = '';
    let ratingColor = '#ff0000';
    if (finalScore >= 90) {
      rating = '🏆 EXCELLENT! Perfect understanding of mutual exclusion!';
      ratingColor = '#00ff00';
    } else if (finalScore >= 70) {
      rating = '🥈 GOOD! Good understanding with minor errors.';
      ratingColor = '#ffff00';
    } else if (finalScore >= 50) {
      rating = '🥉 FAIR! Some understanding but needs improvement.';
      ratingColor = '#ff8800';
    } else {
      rating = '📚 NEEDS IMPROVEMENT! Review mutual exclusion concepts.';
      ratingColor = '#ff0000';
    }

    const performanceRating = this.add.text(0, 180, rating, {
      fontSize: '16px',
      color: ratingColor,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    container.add(performanceRating);

    // Instructions
    const instructions = this.add.text(0, 220, 'Click anywhere to restart the simulation', {
      fontSize: '18px',
      color: '#888888',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    container.add(instructions);

    // Make clickable
    overlay.setInteractive();
    overlay.on('pointerdown', () => {
      this.scene.restart();
    });

    // Animate
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 800,
      ease: 'Back.easeOut'
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
