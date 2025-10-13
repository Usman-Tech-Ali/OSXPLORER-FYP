import Phaser from 'phaser';

// Game state interface
interface GameState {
  isLocked: boolean;
  thread1InCS: boolean;
  thread2InCS: boolean;
  raceConditions: number;
  perfectRuns: number;
  score: number;
  gameRunning: boolean;
  showTutorial: boolean;
  totalRounds: number;
  currentRound: number;
}

// Thread interface
interface Thread {
  sprite: Phaser.GameObjects.Container;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  isMoving: boolean;
  waitingForCS: boolean;
  inCS: boolean;
  hasCompleted: boolean;
  id: number;
  raceConditionFlag: boolean; // Track if this thread was in a race condition
}

export class CriticalSectionGame extends Phaser.Scene {
  private gameState: GameState = {
    isLocked: false,
    thread1InCS: false,
    thread2InCS: false,
    raceConditions: 0,
    perfectRuns: 0,
    score: 0,
    gameRunning: false,
    showTutorial: true,
    totalRounds: 5,
    currentRound: 0
  };

  private threads: Thread[] = [];
  private criticalSection!: Phaser.GameObjects.Graphics;
  private lockIcon!: Phaser.GameObjects.Graphics;
  private lockButton!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private pseudoCodeText!: Phaser.GameObjects.Text;
  private tutorialOverlay!: Phaser.GameObjects.Container;
  private resultsOverlay!: Phaser.GameObjects.Container;

  // Game dimensions
  private readonly GAME_WIDTH = 1200;
  private readonly GAME_HEIGHT = 800;
  private readonly CS_WIDTH = 200;
  private readonly CS_HEIGHT = 150;
  private readonly THREAD_SPEED = 100;

  constructor() {
    super({ key: 'CriticalSectionGame' });
  }

  create() {
    // Set world bounds
    this.cameras.main.setBounds(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
    
    this.createBackground();
    this.createCriticalSection();
    this.createThreads();
    this.createLockButton();
    this.createUI();
    this.createTutorial();
    this.setupEventListeners();

    if (this.gameState.showTutorial) {
      this.showTutorial();
    } else {
      this.startNewRound();
    }
  }

  private createBackground() {
    // Create gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e);
    bg.fillRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);

    // Create path lines
    const pathY = this.GAME_HEIGHT / 2;
    const pathGraphics = this.add.graphics();
    pathGraphics.lineStyle(4, 0x4a90e2, 0.8);
    pathGraphics.moveTo(50, pathY);
    pathGraphics.lineTo(this.GAME_WIDTH - 50, pathY);
    pathGraphics.stroke();

    // Add start and end markers
    this.createMarker(100, pathY, 'START 1', 0x00ff88);
    this.createMarker(this.GAME_WIDTH - 100, pathY, 'START 2', 0xff6b6b);
  }

  private createMarker(x: number, y: number, text: string, color: number) {
    const marker = this.add.circle(x, y, 15, color);
    marker.setStrokeStyle(3, 0xffffff);
    
    const label = this.add.text(x, y - 40, text, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private createCriticalSection() {
    const centerX = this.GAME_WIDTH / 2;
    const centerY = this.GAME_HEIGHT / 2;

    // Critical section background
    this.criticalSection = this.add.graphics();
    this.criticalSection.fillStyle(0xffeb3b, 0.7);
    this.criticalSection.lineStyle(4, 0xffc107);
    this.criticalSection.fillRect(centerX - this.CS_WIDTH/2, centerY - this.CS_HEIGHT/2, this.CS_WIDTH, this.CS_HEIGHT);
    this.criticalSection.strokeRect(centerX - this.CS_WIDTH/2, centerY - this.CS_HEIGHT/2, this.CS_WIDTH, this.CS_HEIGHT);

    // Critical section label
    this.add.text(centerX, centerY - this.CS_HEIGHT / 2 - 30, 'CRITICAL SECTION', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Add warning signs
    this.createWarningSign(centerX - this.CS_WIDTH / 2 - 20, centerY);
    this.createWarningSign(centerX + this.CS_WIDTH / 2 + 20, centerY);
  }

  private createWarningSign(x: number, y: number) {
    const triangle = this.add.triangle(x, y, 0, -15, -12, 15, 12, 15, 0xffc107);
    triangle.setStrokeStyle(2, 0xff9800);
    
    this.add.text(x, y, '!', {
      fontSize: '16px',
      color: '#000000',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private createThreads() {
    // Thread 1 (left side, blue)
    const thread1 = this.createThread(1, 100, this.GAME_HEIGHT / 2, 0x4fc3f7);
    
    // Thread 2 (right side, red)  
    const thread2 = this.createThread(2, this.GAME_WIDTH - 100, this.GAME_HEIGHT / 2, 0xff6b6b);
    
    this.threads = [thread1, thread2];
  }

  private createThread(id: number, x: number, y: number, color: number): Thread {
    // Create thread body
    const threadGraphics = this.add.graphics();
    threadGraphics.fillStyle(color);
    threadGraphics.fillRoundedRect(-20, -20, 40, 40, 8);
    threadGraphics.lineStyle(3, 0xffffff);
    threadGraphics.strokeRoundedRect(-20, -20, 40, 40, 8);
    
    // Create thread sprite from graphics
    const threadSprite = this.add.container(x, y);
    threadSprite.add(threadGraphics);
    
    // Add thread ID text
    const idText = this.add.text(0, 0, `T${id}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    threadSprite.add(idText);

    // Add movement animation
    this.tweens.add({
      targets: threadSprite,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const centerX = this.GAME_WIDTH / 2;
    const targetX = id === 1 ? centerX - this.CS_WIDTH / 2 - 30 : centerX + this.CS_WIDTH / 2 + 30;

    return {
      sprite: threadSprite,
      startX: x,
      startY: y,
      targetX: targetX,
      targetY: y,
      speed: this.THREAD_SPEED + Math.random() * 20, // Slight variation
      isMoving: false,
      waitingForCS: false,
      inCS: false,
      hasCompleted: false,
      id: id,
      raceConditionFlag: false
    };
  }

  private createLockButton() {
    const centerX = this.GAME_WIDTH / 2;
    const buttonY = 100;

    // Lock button container
    this.lockButton = this.add.container(centerX, buttonY);

    // Lock button background
    const lockBg = this.add.circle(0, 0, 40, 0x4a90e2);
    lockBg.setStrokeStyle(4, 0xffffff);
    lockBg.setInteractive({ cursor: 'pointer' });
    
    // Lock icon (simplified)
    this.lockIcon = this.add.graphics();
    this.updateLockIcon();
    
    this.lockButton.add([lockBg, this.lockIcon]);

    // Lock button label
    this.add.text(centerX, buttonY - 70, 'MUTEX LOCK', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Click handler
    lockBg.on('pointerdown', () => {
      this.toggleLock();
    });

    // Hover effects
    lockBg.on('pointerover', () => {
      this.tweens.add({
        targets: this.lockButton,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
    });

    lockBg.on('pointerout', () => {
      this.tweens.add({
        targets: this.lockButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });
  }

  private updateLockIcon() {
    this.lockIcon.clear();
    
    if (this.gameState.isLocked) {
      // Locked icon (red)
      this.lockIcon.fillStyle(0xff4757);
      this.lockIcon.fillRect(-12, -8, 24, 16);
      this.lockIcon.lineStyle(3, 0xffffff);
      this.lockIcon.strokeRect(-12, -8, 24, 16);
      this.lockIcon.strokeRect(-8, -15, 16, 10);
    } else {
      // Unlocked icon (green)
      this.lockIcon.fillStyle(0x2ed573);
      this.lockIcon.fillRect(-12, -8, 24, 16);
      this.lockIcon.lineStyle(3, 0xffffff);
      this.lockIcon.strokeRect(-12, -8, 24, 16);
      this.lockIcon.strokeRect(-8, -15, 12, 10);
    }
  }

  private createUI() {
    // Score
    this.scoreText = this.add.text(50, 50, `Score: ${this.gameState.score}`, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Round counter
    this.roundText = this.add.text(50, 90, `Round: ${this.gameState.currentRound}/${this.gameState.totalRounds}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    });

    // Status text
    this.statusText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT - 100, '', {
      fontSize: '18px',
      color: '#ffeb3b',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Pseudo-code panel
    this.createPseudoCodePanel();
  }

  private updateUI() {
    this.scoreText.setText(`Score: ${this.gameState.score}`);
    this.roundText.setText(`Round: ${this.gameState.currentRound}/${this.gameState.totalRounds}`);
  }

  private createPseudoCodePanel() {
    const panelX = this.GAME_WIDTH - 200;
    const panelY = 200;

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x2c3e50, 0.9);
    panel.lineStyle(2, 0x34495e);
    panel.fillRect(panelX - 140, panelY - 100, 280, 200);
    panel.strokeRect(panelX - 140, panelY - 100, 280, 200);

    // Panel title
    this.add.text(panelX, panelY - 120, 'PSEUDO-CODE', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Pseudo-code text
    this.pseudoCodeText = this.add.text(panelX, panelY, `wait(mutex);
// critical section
signal(mutex);`, {
      fontSize: '12px',
      color: '#2ed573',
      fontFamily: 'Courier, monospace',
      align: 'left'
    }).setOrigin(0.5);
  }

  private createTutorial() {
    this.tutorialOverlay = this.add.container(0, 0);
    
    // Semi-transparent background
    const overlay = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, this.GAME_WIDTH, this.GAME_HEIGHT, 0x000000, 0.8);
    
    // Tutorial panel
    const tutorialBg = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 800, 500, 0x2c3e50);
    tutorialBg.setStrokeStyle(4, 0x4a90e2);
    
    // Tutorial text
    const tutorialText = `CRITICAL CHASE - TWO THREADS

🎯 GOAL: Prevent race conditions using proper mutex synchronization

🕹️ CONTROLS:
• Click MUTEX LOCK to LOCK before threads reach critical section
• UNLOCK after a thread exits to allow the next one
• You MUST use the mutex - threads cannot enter safely when unlocked!

⚡ RULES:
• LOCK the mutex BEFORE threads arrive at critical section
• Only ONE thread can be inside the yellow area at a time
• If threads enter without mutex lock = RACE CONDITION (-75 points)
• Entering without mutex = penalty (-20 points)
• Perfect mutex usage = bonus points (+100)

Click START to begin!`;

    const text = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 - 50, tutorialText, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);

    // Start button
    const startButton = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 + 180, 200, 60, 0x4a90e2);
    startButton.setStrokeStyle(3, 0xffffff);
    startButton.setInteractive({ cursor: 'pointer' });

    const startText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 + 180, 'START', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    startButton.on('pointerdown', () => {
      this.hideTutorial();
      this.startNewRound();
    });

    this.tutorialOverlay.add([overlay, tutorialBg, text, startButton, startText]);
    this.tutorialOverlay.setVisible(false);
  }

  private setupEventListeners() {
    // Keyboard controls as alternative
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.gameState.gameRunning) {
        this.toggleLock();
      }
    });
  }

  private showTutorial() {
    this.tutorialOverlay.setVisible(true);
    this.gameState.showTutorial = true;
  }

  private hideTutorial() {
    this.tutorialOverlay.setVisible(false);
    this.gameState.showTutorial = false;
  }

  private startNewRound() {
    this.gameState.currentRound++;
    this.gameState.gameRunning = true;
    this.gameState.thread1InCS = false;
    this.gameState.thread2InCS = false;
    this.gameState.isLocked = false;

    // Reset threads
    this.threads.forEach(thread => {
      thread.sprite.setPosition(thread.startX, thread.startY);
      thread.isMoving = false;
      thread.waitingForCS = false;
      thread.inCS = false;
      thread.hasCompleted = false;
      thread.raceConditionFlag = false;
      thread.sprite.setAlpha(1);
    });

    this.updateLockIcon();
    this.updateUI();
    this.statusText.setText('Round started! Get ready to control the mutex...');

    // Start threads after a brief delay
    this.time.delayedCall(2000, () => {
      this.startThreadMovement();
    });
  }

  private startThreadMovement() {
    this.statusText.setText('Threads are moving! Click the lock to control access.');
    
    this.threads.forEach(thread => {
      thread.isMoving = true;
      this.moveThreadToCS(thread);
    });
  }

  private moveThreadToCS(thread: Thread) {
    this.tweens.add({
      targets: thread.sprite,
      x: thread.targetX,
      duration: (Math.abs(thread.targetX - thread.startX) / thread.speed) * 1000,
      ease: 'Linear',
      onComplete: () => {
        thread.waitingForCS = true;
        this.checkCSAccess(thread);
      }
    });
  }

  private checkCSAccess(thread: Thread) {
    // Key change: Threads can only enter when mutex is LOCKED (wait(mutex) called)
    // If unlocked, threads will attempt to enter simultaneously causing race condition
    
    if (this.gameState.isLocked && !this.isCSOccupied()) {
      // Proper case: mutex is locked and CS is free
      this.enterCS(thread);
    } else if (this.gameState.isLocked && this.isCSOccupied()) {
      // Proper case: mutex locked but CS occupied, thread waits
      thread.sprite.setAlpha(0.7);
      this.addWaitingAnimation(thread);
      
      const checkInterval = this.time.addEvent({
        delay: 100,
        callback: () => {
          if (this.gameState.isLocked && !this.isCSOccupied() && thread.waitingForCS) {
            checkInterval.destroy();
            this.enterCS(thread);
          } else if (!this.gameState.isLocked && thread.waitingForCS) {
            // If mutex gets unlocked while waiting, thread will attempt entry
            checkInterval.destroy();
            this.attemptUnprotectedEntry(thread);
          }
        },
        loop: true
      });
    } else {
      // Bad case: mutex is unlocked, thread attempts to enter without protection
      this.attemptUnprotectedEntry(thread);
    }
  }

  private attemptUnprotectedEntry(thread: Thread) {
    // When threads try to enter without mutex protection
    thread.sprite.setAlpha(0.9);
    
    // Add a short delay to simulate the race condition timing
    this.time.delayedCall(200 + Math.random() * 300, () => {
      if (this.isCSOccupied()) {
        // Another thread is already in CS - RACE CONDITION!
        this.handleRaceCondition();
      } else {
        // Thread enters unprotected - this will likely cause race condition
        // because both threads will attempt this simultaneously
        thread.inCS = true;
        thread.waitingForCS = false;
        
        // Check if both threads are now in CS
        this.time.delayedCall(100, () => {
          if (this.gameState.thread1InCS && this.gameState.thread2InCS) {
            this.handleRaceCondition();
          } else {
            // Thread got lucky and entered alone, but still penalize for not using mutex
            this.penalizeImproperMutexUsage();
            this.enterCS(thread);
          }
        });
        
        if (thread.id === 1) {
          this.gameState.thread1InCS = true;
        } else {
          this.gameState.thread2InCS = true;
        }
      }
    });
  }

  private penalizeImproperMutexUsage() {
    this.gameState.score = Math.max(0, this.gameState.score - 20);
    this.statusText.setText('⚠️ Thread entered without mutex! -20 points');
    this.statusText.setStyle({ color: '#ffa500' });
    this.updateUI();
  }

  private addWaitingAnimation(thread: Thread) {
    this.tweens.add({
      targets: thread.sprite,
      y: thread.targetY - 10,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private enterCS(thread: Thread) {
    if (this.isCSOccupied()) {
      // Race condition detected!
      this.handleRaceCondition();
      return;
    }

    thread.waitingForCS = false;
    thread.inCS = true;
    thread.sprite.setAlpha(1);
    this.tweens.killTweensOf(thread.sprite); // Stop waiting animation

    // Move to center of CS
    const centerX = this.GAME_WIDTH / 2;
    const centerY = this.GAME_HEIGHT / 2;

    this.tweens.add({
      targets: thread.sprite,
      x: centerX,
      y: centerY,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Stay in CS for a moment
        this.time.delayedCall(1500, () => {
          this.exitCS(thread);
        });
      }
    });

    if (thread.id === 1) {
      this.gameState.thread1InCS = true;
    } else {
      this.gameState.thread2InCS = true;
    }

    this.updatePseudoCode('// critical section');
  }

  private exitCS(thread: Thread) {
    thread.inCS = false;
    if (thread.id === 1) {
      this.gameState.thread1InCS = false;
    } else {
      this.gameState.thread2InCS = false;
    }

    // Move to finish line
    const finishX = thread.id === 1 ? this.GAME_WIDTH - 100 : 100;
    
    this.tweens.add({
      targets: thread.sprite,
      x: finishX,
      y: thread.targetY,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        thread.hasCompleted = true;
        this.checkRoundComplete();
      }
    });

    this.updatePseudoCode('signal(mutex);');
  }

  private isCSOccupied(): boolean {
    return this.threads.some(thread => thread.inCS);
  }

  private handleRaceCondition() {
    this.gameState.raceConditions++;
    this.gameState.score = Math.max(0, this.gameState.score - 75);
    
    // Mark both threads as having completed improperly
    this.threads.forEach(thread => {
      thread.inCS = false;
      thread.hasCompleted = true;
      thread.waitingForCS = false;
      thread.raceConditionFlag = true;
      thread.sprite.setAlpha(0.7); // Dim the failed threads
      this.tweens.killTweensOf(thread.sprite);
    });
    
    // Reset CS occupancy flags
    this.gameState.thread1InCS = false;
    this.gameState.thread2InCS = false;
    
    // Visual effect
    this.cameras.main.shake(500, 0.02);
    
    // Show collision effect with sparks
    for (let i = 0; i < 8; i++) {
      const spark = this.add.circle(
        this.GAME_WIDTH / 2 + (Math.random() - 0.5) * 150,
        this.GAME_HEIGHT / 2 + (Math.random() - 0.5) * 150,
        6 + Math.random() * 8,
        0xff0000,
        0.9
      );
      this.tweens.add({
        targets: spark,
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0,
        duration: 600 + Math.random() * 600,
        onComplete: () => spark.destroy()
      });
    }

    // Flash the critical section red
    this.criticalSection.clear();
    this.criticalSection.fillStyle(0xff0000, 0.8);
    this.criticalSection.lineStyle(4, 0xff4757);
    const centerX = this.GAME_WIDTH / 2;
    const centerY = this.GAME_HEIGHT / 2;
    this.criticalSection.fillRect(centerX - this.CS_WIDTH/2, centerY - this.CS_HEIGHT/2, this.CS_WIDTH, this.CS_HEIGHT);
    this.criticalSection.strokeRect(centerX - this.CS_WIDTH/2, centerY - this.CS_HEIGHT/2, this.CS_WIDTH, this.CS_HEIGHT);

    this.statusText.setText('💥 RACE CONDITION! Both threads accessed critical section! -75 points');
    this.statusText.setStyle({ color: '#ff4757' });

    this.updateUI();

    // Reset critical section color after effect
    this.time.delayedCall(1500, () => {
      this.criticalSection.clear();
      this.criticalSection.fillStyle(0xffeb3b, 0.7);
      this.criticalSection.lineStyle(4, 0xffc107);
      this.criticalSection.fillRect(centerX - this.CS_WIDTH/2, centerY - this.CS_HEIGHT/2, this.CS_WIDTH, this.CS_HEIGHT);
      this.criticalSection.strokeRect(centerX - this.CS_WIDTH/2, centerY - this.CS_HEIGHT/2, this.CS_WIDTH, this.CS_HEIGHT);
    });

    // Continue with round after showing the effect
    this.time.delayedCall(3000, () => {
      this.completeRound();
    });
  }

  private toggleLock() {
    if (!this.gameState.gameRunning) return;

    this.gameState.isLocked = !this.gameState.isLocked;
    this.updateLockIcon();
    
    const lockStatus = this.gameState.isLocked ? 'LOCKED' : 'UNLOCKED';
    this.statusText.setText(`Mutex ${lockStatus}`);
    this.statusText.setStyle({ color: '#ffeb3b' });

    this.updatePseudoCode(this.gameState.isLocked ? 'wait(mutex);' : 'signal(mutex);');

    // Check if any waiting threads can now enter
    if (!this.gameState.isLocked) {
      this.threads.forEach(thread => {
        if (thread.waitingForCS) {
          this.checkCSAccess(thread);
        }
      });
    }
  }

  private updatePseudoCode(highlightLine: string) {
    let code = `wait(mutex);
// critical section  
signal(mutex);`;

    if (highlightLine) {
      code = code.replace(highlightLine, `> ${highlightLine} <`);
    }

    this.pseudoCodeText.setText(code);
  }

  private checkRoundComplete() {
    if (this.threads.every(thread => thread.hasCompleted || thread.inCS)) {
      this.completeRound();
    }
  }

  private completeRound() {
    this.gameState.gameRunning = false;

    // Check if this round had any race conditions
    const hadRaceCondition = this.threads.some(thread => thread.raceConditionFlag);

    // Award points for successful completion
    if (!hadRaceCondition) {
      // No race conditions this round
      this.gameState.perfectRuns++;
      this.gameState.score += 100;
      this.statusText.setText('🎉 Perfect! Proper mutex synchronization! +100 points');
      this.statusText.setStyle({ color: '#2ed573' });
    } else {
      this.statusText.setText('Round complete. Use mutex properly to prevent race conditions!');
      this.statusText.setStyle({ color: '#ffa500' });
    }

    this.updateUI();

    // Check if game is complete
    if (this.gameState.currentRound >= this.gameState.totalRounds) {
      this.time.delayedCall(3000, () => {
        this.showResults();
      });
    } else {
      this.time.delayedCall(3000, () => {
        this.startNewRound();
      });
    }
  }

  private showResults() {
    // Create results overlay
    this.resultsOverlay = this.add.container(0, 0);

    const overlay = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, this.GAME_WIDTH, this.GAME_HEIGHT, 0x000000, 0.9);
    
    const resultsBg = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 600, 400, 0x2c3e50);
    resultsBg.setStrokeStyle(4, 0x4a90e2);
    
    // Results text
    const resultsText = `GAME COMPLETE!

Final Score: ${this.gameState.score}
Perfect Runs: ${this.gameState.perfectRuns}/${this.gameState.totalRounds}
Race Conditions: ${this.gameState.raceConditions}

${this.gameState.perfectRuns === this.gameState.totalRounds ? 
  '🏆 PERFECT GAME! You mastered mutex synchronization!' :
  'Good job! Practice more to achieve perfect synchronization.'}`;

    const text = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 - 50, resultsText, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      lineSpacing: 15
    }).setOrigin(0.5);

    // Play again button
    const playAgainButton = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 + 130, 200, 60, 0x4a90e2);
    playAgainButton.setStrokeStyle(3, 0xffffff);
    playAgainButton.setInteractive({ cursor: 'pointer' });

    const playAgainText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 + 130, 'PLAY AGAIN', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    playAgainButton.on('pointerdown', () => {
      this.resetGame();
    });

    this.resultsOverlay.add([overlay, resultsBg, text, playAgainButton, playAgainText]);
  }

  private resetGame() {
    this.gameState = {
      isLocked: false,
      thread1InCS: false,
      thread2InCS: false,
      raceConditions: 0,
      perfectRuns: 0,
      score: 0,
      gameRunning: false,
      showTutorial: false,
      totalRounds: 5,
      currentRound: 0
    };

    if (this.resultsOverlay) {
      this.resultsOverlay.destroy();
    }

    this.startNewRound();
  }
}

// Export game configuration
export const CriticalSectionGameConfig = {
  type: Phaser.AUTO,
  width: 1200,
  height: 800,
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