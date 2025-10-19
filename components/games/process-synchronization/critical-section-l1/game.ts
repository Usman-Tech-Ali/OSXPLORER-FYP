import Phaser from 'phaser';

/**
 * ATM Synchronization Demo - Critical Section Simulation
 * 
 * This game demonstrates how mutex locks prevent race conditions in critical sections.
 * 5 customers (C1-C5) use an ATM one by one, with proper synchronization.
 * 
 * Features:
 * - Visual queue system with customer sprites
 * - Real-time mutex status display
 * - VS Code-style code panel showing synchronization logic
 * - Walking animations and progress indicators
 * - Educational demonstration of wait() and signal() operations
 */

// Game state interface
interface GameState {
  mutex: number; // 1 = free, 0 = locked
  currentCustomer: number;
  customersInQueue: number;
  gameRunning: boolean;
  showTutorial: boolean;
  totalCustomers: number;
  completedCustomers: number;
}

// Customer interface
interface Customer {
  sprite: Phaser.GameObjects.Sprite;
  id: number;
  name: string;
  startX: number;
  startY: number;
  queueX: number;
  queueY: number;
  atmX: number;
  atmY: number;
  exitX: number;
  exitY: number;
  isMoving: boolean;
  isInQueue: boolean;
  isAtATM: boolean;
  hasCompleted: boolean;
  label: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
}

export class CriticalSectionGame extends Phaser.Scene {
  private gameState: GameState = {
    mutex: 1, // 1 = free, 0 = locked
    currentCustomer: 0,
    customersInQueue: 0,
    gameRunning: false,
    showTutorial: true,
    totalCustomers: 5,
    completedCustomers: 0
  };

  private score: number = 0;
  private selectedCustomer: Customer | null = null;

  private customers: Customer[] = [];
  private background!: Phaser.GameObjects.Image;
  private atmSprite!: Phaser.GameObjects.Sprite;
  private lockIcon!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private codePanel!: Phaser.GameObjects.Container;
  private codeText!: Phaser.GameObjects.Text;
  private atmStatusText!: Phaser.GameObjects.Text;
  private tutorialOverlay!: Phaser.GameObjects.Container;
  private resultsOverlay!: Phaser.GameObjects.Container;

  // Game dimensions (dynamic based on window size)
  private GAME_WIDTH!: number;
  private GAME_HEIGHT!: number;
  private CONSOLE_WIDTH!: number; // Left side for console (30%)
  private GAME_AREA_WIDTH!: number; // Right side for game with background (70%)
  private ATM_X!: number; // Right side ATM position
  private ATM_Y!: number;
  private QUEUE_START_X!: number; // Right side queue
  private QUEUE_Y!: number;
  private CUSTOMER_SPACING = 130; // Large spacing between customers standing in queue

  constructor() {
    super({ key: 'CriticalSectionGame' });
  }

  preload() {
    // Load background image
    this.load.image('background-1', '/games/process-synchronization/backround-1.png');
    
    // Load person sprites
    for (let i = 1; i <= 5; i++) {
      this.load.image(`person-${i}`, `/games/process-synchronization/person-${i}.png`);
    }
  }

  create() {
    // Initialize dynamic dimensions
    this.initializeDimensions();
    
    // Set world bounds
    this.cameras.main.setBounds(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
    
    this.createBackground();
    this.createATM();
    this.createCustomers();
    this.createCodePanel();
    this.createUI();
    this.createTutorial();
    this.setupEventListeners();

    if (this.gameState.showTutorial) {
      this.showTutorial();
    } else {
      this.startSimulation();
    }
  }

  private initializeDimensions() {
    // Get the actual game dimensions from the camera
    this.GAME_WIDTH = this.cameras.main.width;
    this.GAME_HEIGHT = this.cameras.main.height;
    
    // Split screen layout - narrower console, wider game area
    this.CONSOLE_WIDTH = this.GAME_WIDTH * 0.3; // Left side for console (30%)
    this.GAME_AREA_WIDTH = this.GAME_WIDTH * 0.7; // Right side for game with background (70%)
    
    // Position elements based on dynamic dimensions
    this.ATM_X = this.CONSOLE_WIDTH + this.GAME_AREA_WIDTH * 0.4; // ATM positioned in wider right area
    this.ATM_Y = this.GAME_HEIGHT * 0.5;
    this.QUEUE_START_X = this.CONSOLE_WIDTH + this.GAME_AREA_WIDTH * 0.3; // Queue starts from left side of right area
    this.QUEUE_Y = this.GAME_HEIGHT * 0.65 - 20; // Lowered queue position for better spacing
  }

  private createBackground() {
    // Right side - Game area with background image
    this.background = this.add.image(this.CONSOLE_WIDTH + this.GAME_AREA_WIDTH / 2, this.GAME_HEIGHT / 2 + 30, 'background-1');
    this.background.setOrigin(0.5, 0.5);
    this.background.setDisplaySize(this.GAME_AREA_WIDTH, this.GAME_HEIGHT - 60); // Account for nav bar
    
    // Left side - Console area (dark background)
    const consoleArea = this.add.graphics();
    consoleArea.fillStyle(0x1e1e1e);
    consoleArea.fillRect(0, 0, this.CONSOLE_WIDTH, this.GAME_HEIGHT);
    
    // Add separator line
    const separator = this.add.graphics();
    separator.lineStyle(2, 0x4a90e2);
    separator.moveTo(this.CONSOLE_WIDTH, 0);
    separator.lineTo(this.CONSOLE_WIDTH, this.GAME_HEIGHT);
    separator.stroke();
  }

  private createATM() {
    // Position ATM status indicator on the existing ATM in the background image
    // The ATM is located in the center-right area of the background image
    this.ATM_X = this.CONSOLE_WIDTH + this.GAME_AREA_WIDTH * 0.6 - 500; // Position over existing ATM
    this.ATM_Y = this.GAME_HEIGHT * 0.45 - 100; // Slightly above center to match ATM position

    // ATM status text (positioned over the existing ATM)
    this.atmStatusText = this.add.text(this.ATM_X, this.ATM_Y + 30, 'FREE', {
      fontSize: '16px',
      color: '#2ed573',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Lock icon (positioned over the existing ATM)
    this.lockIcon = this.add.graphics();
    this.updateLockIcon();

    // Progress bar (positioned over the existing ATM)
    this.progressBar = this.add.graphics();
  }

  private createCustomers() {
    this.customers = [];
    
    // Create queue line
    this.createQueueLine();
    
    for (let i = 1; i <= 5; i++) {
      const customer = this.createCustomer(i);
      this.customers.push(customer);
    }
  }

  private createQueueLine() {
    // Create a visual queue line (on right side with background)
    const queueGraphics = this.add.graphics();
    queueGraphics.lineStyle(3, 0x4a90e2, 0.6);
    queueGraphics.moveTo(this.QUEUE_START_X, this.QUEUE_Y - 20);
    queueGraphics.lineTo(this.QUEUE_START_X + 4 * this.CUSTOMER_SPACING, this.QUEUE_Y - 20);
    
    // Add queue label
    this.add.text(this.QUEUE_START_X - 30, this.QUEUE_Y - 40, 'QUEUE', {
      fontSize: '12px',
      color: '#4a90e2',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
  }

  private createCustomer(id: number): Customer {
    const startX = this.GAME_WIDTH + 100; // Start further off-screen right for better arrival effect
    const startY = this.QUEUE_Y;
    const queueX = this.QUEUE_START_X + (id - 1) * this.CUSTOMER_SPACING; // Queue goes right from left
    const queueY = this.QUEUE_Y;
    const atmX = this.ATM_X - 20; // ATM position (customers move left to reach it)
    const atmY = this.ATM_Y;
    const exitX = this.GAME_WIDTH + 100; // Exit off-screen right
    const exitY = this.QUEUE_Y;

    // Create customer sprite
    const sprite = this.add.sprite(startX, startY, `person-${id}`);
    sprite.setScale(0.8);
    sprite.setVisible(false); // Initially hidden
    sprite.setInteractive({ cursor: 'pointer' });

    // Create customer label
    const label = this.add.text(startX, startY - 40, `C${id}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    label.setVisible(false);

    // Create status text
    const statusText = this.add.text(startX, startY + 40, '', {
      fontSize: '12px',
      color: '#ffeb3b',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    statusText.setVisible(false);

    // Add click handler
    sprite.on('pointerdown', () => {
      this.onCustomerClick(id);
    });

    // Add hover effects
    sprite.on('pointerover', () => {
      if (sprite.visible && !sprite.getData('isAtATM')) {
        sprite.setTint(0x4a90e2);
      }
    });

    sprite.on('pointerout', () => {
      sprite.clearTint();
    });

    return {
      sprite,
      id,
      name: `C${id}`,
      startX,
      startY,
      queueX,
      queueY,
      atmX,
      atmY,
      exitX,
      exitY,
      isMoving: false,
      isInQueue: false,
      isAtATM: false,
      hasCompleted: false,
      label,
      statusText
    };
  }

  private createCodePanel() {
    const panelX = this.CONSOLE_WIDTH / 2; // Left side
    const panelY = this.GAME_HEIGHT / 2 + 30; // Below nav bar

    // VS Code-style console panel
    this.codePanel = this.add.container(panelX, panelY);
    
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1e1e1e, 0.95);
    panelBg.lineStyle(2, 0x3c3c3c);
    panelBg.fillRoundedRect(-140, -250, 280, 500, 8);
    panelBg.strokeRoundedRect(-140, -250, 280, 500, 8);

    // Panel title bar
    const titleBar = this.add.graphics();
    titleBar.fillStyle(0x2d2d30);
    titleBar.fillRoundedRect(-140, -250, 280, 30, 8);
    titleBar.lineStyle(1, 0x3c3c3c);
    titleBar.strokeRoundedRect(-140, -250, 280, 30, 8);

    // Title text
    const titleText = this.add.text(0, -235, 'Console - Critical Section L1', {
      fontSize: '14px',
      color: '#cccccc',
      fontFamily: 'Consolas, monospace'
    }).setOrigin(0, 0.5);

    // Code text
    this.codeText = this.add.text(-120, -200, '', {
      fontSize: '11px',
      color: '#d4d4d4',
      fontFamily: 'Consolas, monospace',
      align: 'left',
      lineSpacing: 5,
      wordWrap: { width: 240 }
    }).setOrigin(0, 0);

    this.codePanel.add([panelBg, titleBar, titleText, this.codeText]);
    
    // Initial console display
    this.updateCodeDisplay('Critical Section L1 Console\n================================\n\nSystem initialized...\nMutex: FREE (1)\nWaiting for customers...\n\nClick customers to send them to ATM');
  }

  private updateLockIcon() {
    this.lockIcon.clear();
    
    if (this.gameState.mutex === 0) {
      // Locked icon (red) - positioned over existing ATM
      this.lockIcon.fillStyle(0xff4757);
      this.lockIcon.fillRect(this.ATM_X - 12, this.ATM_Y - 12, 24, 24);
      this.lockIcon.lineStyle(3, 0xffffff);
      this.lockIcon.strokeRect(this.ATM_X - 12, this.ATM_Y - 12, 24, 24);
      this.lockIcon.strokeRect(this.ATM_X - 6, this.ATM_Y - 20, 12, 10);
    } else {
      // Unlocked icon (green) - positioned over existing ATM
      this.lockIcon.fillStyle(0x2ed573);
      this.lockIcon.fillRect(this.ATM_X - 12, this.ATM_Y - 12, 24, 24);
      this.lockIcon.lineStyle(3, 0xffffff);
      this.lockIcon.strokeRect(this.ATM_X - 12, this.ATM_Y - 12, 24, 24);
      this.lockIcon.strokeRect(this.ATM_X - 6, this.ATM_Y - 20, 8, 10);
    }
  }

  private createUI() {
    // Navigation bar
    const navBar = this.add.graphics();
    navBar.fillStyle(0x34495e);
    navBar.fillRect(0, 0, this.GAME_WIDTH, 60);
    
    // Game title
    this.add.text(20, 30, 'Critical Section - Level 1', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Score
    this.add.text(this.GAME_WIDTH - 20, 30, `Score: ${this.score}`, {
      fontSize: '20px',
      color: '#4a90e2',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    // Instructions (on right side with background)
    this.add.text(this.CONSOLE_WIDTH + this.GAME_AREA_WIDTH / 2, 100, 'Click customers to send them to ATM', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    // Customer counter (on right side)
    this.add.text(this.CONSOLE_WIDTH + 20, 130, `Customers Served: ${this.gameState.completedCustomers}/${this.gameState.totalCustomers}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    });

    // Mutex status (on right side)
    this.add.text(this.CONSOLE_WIDTH + 20, 160, 'Mutex Status:', {
      fontSize: '14px',
      color: 'black',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
  }

  private updateUI() {
    // Update customer counter (on right side)
    const customerText = this.children.list.find(child => 
      child instanceof Phaser.GameObjects.Text && 
      (child as Phaser.GameObjects.Text).text.includes('Customers Served:')
    ) as Phaser.GameObjects.Text;
    
    if (customerText) {
      customerText.setText(`Customers Served: ${this.gameState.completedCustomers}/${this.gameState.totalCustomers}`);
    }

    // Update score (in nav bar)
    const scoreText = this.children.list.find(child => 
      child instanceof Phaser.GameObjects.Text && 
      (child as Phaser.GameObjects.Text).text.includes('Score:')
    ) as Phaser.GameObjects.Text;
    
    if (scoreText) {
      scoreText.setText(`Score: ${this.score}`);
    }
  }

  private createTutorial() {
    this.tutorialOverlay = this.add.container(0, 0);
    
    // Semi-transparent background
    const overlay = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, this.GAME_WIDTH, this.GAME_HEIGHT, 0x000000, 0.8);
    
    // Tutorial panel
    const tutorialBg = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 500, 400, 0x2c3e50);
    tutorialBg.setStrokeStyle(4, 0x4a90e2);
    
    // Tutorial text
    const tutorialText = `CRITICAL SECTION - LEVEL 1

🎯 GOAL: Manage customer queue with mutex synchronization

🖱️ HOW TO PLAY:
• Customers arrive one by one from the right side
• They automatically join the queue (moving left)
• Click customers in queue to send them to ATM
• Only ONE customer can use ATM at a time
• If ATM is busy, you'll get an error message
• Watch the console (left side) for real-time events

🔒 MUTEX LOGIC:
• mutex = 1 (ATM free)
• mutex = 0 (ATM locked)
• wait(mutex) - check if ATM is free
• signal(mutex) - release ATM

📊 SCORING:
• +100 points for each successful transaction
• Prevent race conditions for perfect score

Click START to begin!`;

    const text = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 - 50, tutorialText, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5);

    // Start button
    const startButton = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 + 140, 150, 50, 0x4a90e2);
    startButton.setStrokeStyle(3, 0xffffff);
    startButton.setInteractive({ cursor: 'pointer' });

    const startText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 + 140, 'START', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    startButton.on('pointerdown', () => {
      this.hideTutorial();
      this.startSimulation();
    });

    this.tutorialOverlay.add([overlay, tutorialBg, text, startButton, startText]);
    this.tutorialOverlay.setVisible(false);
  }

  private setupEventListeners() {
    // No keyboard controls needed for this demo
  }

  private showTutorial() {
    this.tutorialOverlay.setVisible(true);
    this.gameState.showTutorial = true;
  }

  private hideTutorial() {
    this.tutorialOverlay.setVisible(false);
    this.gameState.showTutorial = false;
  }

  private startSimulation() {
    this.gameState.gameRunning = true;
    this.gameState.currentCustomer = 0;
    this.gameState.completedCustomers = 0;
    this.score = 0;
    
    this.updateCodeDisplay('Critical Section L1 Console\n================================\n\nSystem initialized...\nMutex: FREE (1)\nWaiting for customers...\n\nCustomers will arrive one by one...');
    
    // Start showing customers one by one
    this.time.delayedCall(1000, () => {
      this.showNextCustomer(0);
    });
  }

  private showNextCustomer(index: number) {
    // Check if all customers have arrived
    if (index >= this.customers.length) {
      this.updateCodeDisplay('Critical Section L1 Console\n================================\n\nAll customers have arrived!\nMutex: FREE (1)\n\nClick customers to send them to ATM');
      return;
    }

    const customer = this.customers[index];
    
    // Update console
    this.updateCodeDisplay(`Critical Section L1 Console\n================================\n\nCustomer ${customer.name} arriving...\nMutex: ${this.gameState.mutex === 1 ? 'FREE' : 'LOCKED'}\n\nCustomers in queue: ${index}\nWaiting for next customer...`);
    
    // Show customer sprite
    customer.sprite.setVisible(true);
    customer.label.setVisible(true);
    customer.statusText.setVisible(true);
    customer.statusText.setText('Arriving...');
    customer.statusText.setStyle({ color: '#ffeb3b' });
    
    // Animate customer entering from right side
    this.addWalkingAnimation(customer.sprite);
    
    this.tweens.add({
      targets: [customer.sprite, customer.label, customer.statusText],
      x: customer.queueX,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        this.stopWalkingAnimation(customer.sprite);
        customer.isInQueue = true;
        customer.statusText.setText('In Queue');
        customer.statusText.setStyle({ color: '#4a90e2' });
        
        // Update queue positions for all customers
        this.updateQueuePositions();
        
        // Show next customer after a delay (gap between arrivals)
        this.time.delayedCall(2000, () => { // Increased to 4 seconds gap
          this.showNextCustomer(index + 1);
        });
      }
    });
  }

  private updateQueuePositions() {
    // Reposition all customers in queue to maintain proper spacing
    let queuePosition = 0;
    
    this.customers.forEach((customer) => {
      if (customer.isInQueue && !customer.isAtATM && !customer.hasCompleted) {
        const newQueueX = this.QUEUE_START_X + queuePosition * this.CUSTOMER_SPACING;
        
        // Animate to new position if needed
        if (customer.sprite.x !== newQueueX) {
          this.tweens.add({
            targets: [customer.sprite, customer.label, customer.statusText],
            x: newQueueX,
            duration: 500,
            ease: 'Power2'
          });
        }
        
        queuePosition++;
      }
    });
  }

  private onCustomerClick(customerId: number) {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer || !customer.isInQueue || customer.isMoving || customer.hasCompleted) {
      return;
    }

    // Check if ATM is already in use
    if (this.gameState.mutex === 0) {
      this.showError('ATM is busy! Wait for current customer to finish.');
      return;
    }

    // Visual feedback - flash the selected customer
    this.tweens.add({
      targets: customer.sprite,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        customer.sprite.setAlpha(1);
      }
    });

    // Send the exact clicked customer to ATM
    this.sendCustomerToATM(customer);
  }

  private showError(message: string) {
    this.updateCodeDisplay(`Critical Section L1 Console\n================================\n\nERROR: ${message}\n\nMutex: ${this.gameState.mutex === 1 ? 'FREE' : 'LOCKED'}\nCurrent Status: ATM in use\n\nWait for current transaction to complete.`);
    
    // Show error effect
    this.cameras.main.flash(200, 255, 0, 0, false);
  }

  private sendCustomerToATM(customer: Customer) {
    customer.isMoving = true;
    customer.statusText.setText('Selected!');
    customer.statusText.setStyle({ color: '#00ff00' });
    
    // Brief pause to show selection, then update status and start moving
    this.time.delayedCall(300, () => {
      if (!customer.sprite || customer.hasCompleted) return;
      
      customer.statusText.setText('Going to ATM...');
      customer.statusText.setStyle({ color: '#ffa502' });
      
      this.updateCodeDisplay(`Critical Section L1 Console\n================================\n\n${customer.name} selected for ATM\nExecuting: wait(mutex)\nChecking ATM availability...\n\nMutex: ${this.gameState.mutex === 1 ? 'FREE' : 'LOCKED'}`);
      
      // Move customer to ATM FIRST
      this.addWalkingAnimation(customer.sprite);
      this.tweens.add({
        targets: [customer.sprite, customer.label, customer.statusText],
        x: customer.atmX,
        duration: 1500,
        ease: 'Power2',
        onStart: () => {
          // Only remove from queue and update positions AFTER movement starts
          customer.isInQueue = false;
          // Delay queue update slightly so the correct customer is seen leaving
          this.time.delayedCall(200, () => {
            this.updateQueuePositions();
          });
        },
        onComplete: () => {
          customer.isMoving = false;
          customer.isAtATM = true;
          this.stopWalkingAnimation(customer.sprite);
          this.lockATM(customer);
        }
      });
    });
  }


  private lockATM(customer: Customer) {
    // Lock the ATM (mutex = 0)
    this.gameState.mutex = 0;
    this.updateLockIcon();
    this.atmStatusText.setText('IN USE');
    this.atmStatusText.setStyle({ color: '#ff4757' });
    
    // Update code display
    this.updateCodeDisplay(`Critical Section L1 Console\n================================\n\n${customer.name} at ATM\nExecuting: mutex = 0\nATM LOCKED\n\nCritical Section:\n${customer.name} using ATM\nTransaction in progress...`);
    
    customer.statusText.setText('Using ATM...');
    this.startTransaction(customer);
  }

  private startTransaction(customer: Customer) {
    // Show progress bar
    this.showProgressBar();
    
    // Transaction duration
    this.time.delayedCall(3000, () => {
      this.completeTransaction(customer);
    });
  }

  private showProgressBar() {
    this.progressBar.clear();
    this.progressBar.fillStyle(0x4a90e2);
    this.progressBar.fillRect(this.ATM_X - 40, this.ATM_Y - 60, 80, 10);
    
    // Animate progress
    this.tweens.add({
      targets: this.progressBar,
      scaleX: 0,
      duration: 3000,
      ease: 'Linear'
    });
  }

  private completeTransaction(customer: Customer) {
    // Unlock ATM (mutex = 1)
    this.gameState.mutex = 1;
    this.updateLockIcon();
    this.atmStatusText.setText('FREE');
    this.atmStatusText.setStyle({ color: '#2ed573' });
    
    // Update score
    this.score += 100;
    
    // Update code display
    this.updateCodeDisplay(`Critical Section L1 Console\n================================\n\n${customer.name} transaction complete!\nExecuting: signal(mutex)\nATM UNLOCKED\nMutex: FREE (1)\n\nScore: +100 points\nNext customer can proceed...`);
    
    // Hide progress bar
    this.progressBar.clear();
    
    // Customer exits
    customer.statusText.setText('Done ✅');
    customer.statusText.setStyle({ color: '#2ed573' });
    customer.hasCompleted = true;
    
    this.addWalkingAnimation(customer.sprite);
    this.tweens.add({
      targets: [customer.sprite, customer.label, customer.statusText],
      x: customer.exitX,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.stopWalkingAnimation(customer.sprite);
        customer.sprite.setVisible(false);
        customer.label.setVisible(false);
        customer.statusText.setVisible(false);
        this.gameState.completedCustomers++;
        this.updateUI();
        
        // Check if all customers are done
        if (this.gameState.completedCustomers >= this.gameState.totalCustomers) {
          this.time.delayedCall(1000, () => {
            this.completeSimulation();
          });
        } else {
          this.updateCodeDisplay(`Critical Section L1 Console\n================================\n\n${customer.name} completed successfully!\nATM is now FREE\n\nCustomers remaining: ${this.gameState.totalCustomers - this.gameState.completedCustomers}\nClick next customer to continue...`);
        }
      }
    });
  }

  private addWalkingAnimation(sprite: Phaser.GameObjects.Sprite) {
    // Simple bobbing animation to simulate walking
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 5,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private stopWalkingAnimation(sprite: Phaser.GameObjects.Sprite) {
    this.tweens.killTweensOf(sprite);
    sprite.setY(sprite.y + 5); // Reset to original position
  }

  private updateCodeDisplay(code: string) {
    // Add some basic syntax highlighting simulation
    let highlightedCode = code
      .replace(/\/\/.*$/gm, (match) => `//${match.substring(2)}`) // Comments in green
      .replace(/wait\(mutex\)/g, 'wait(mutex)') // Function calls
      .replace(/signal\(mutex\)/g, 'signal(mutex)') // Function calls
      .replace(/mutex\s*=\s*[01]/g, (match) => match) // Variable assignments
      .replace(/int\s+mutex/g, 'int mutex'); // Type declarations
    
    this.codeText.setText(highlightedCode);
  }

  private completeSimulation() {
    this.gameState.gameRunning = false;
    
    this.updateCodeDisplay(`Critical Section L1 Console\n================================\n\n🎉 SIMULATION COMPLETE! 🎉\n\nAll ${this.gameState.totalCustomers} customers served successfully!\nFinal Score: ${this.score} points\n\nMutex synchronization worked perfectly!\nNo race conditions occurred.\n\nClick PLAY AGAIN to restart.`);
    
    // Show completion message
    this.time.delayedCall(2000, () => {
      this.showResults();
    });
  }

  private showResults() {
    // Create results overlay
    this.resultsOverlay = this.add.container(0, 0);

    const overlay = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, this.GAME_WIDTH, this.GAME_HEIGHT, 0x000000, 0.9);
    
    const resultsBg = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2, 500, 400, 0x2c3e50);
    resultsBg.setStrokeStyle(4, 0x4a90e2);
    
    // Results text
    const resultsText = `🎉 SIMULATION COMPLETE! 🎉

✅ All ${this.gameState.totalCustomers} customers served
🔒 Mutex synchronization worked perfectly
🎯 No race conditions occurred
🏆 Final Score: ${this.score} points

The ATM queue system demonstrates proper
critical section protection using mutex locks.

Great job! You successfully managed the
customer queue with proper synchronization.`;

    const text = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 - 50, resultsText, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5);

    // Play again button
    const playAgainButton = this.add.rectangle(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 + 140, 180, 60, 0x4a90e2);
    playAgainButton.setStrokeStyle(3, 0xffffff);
    playAgainButton.setInteractive({ cursor: 'pointer' });

    const playAgainText = this.add.text(this.GAME_WIDTH / 2, this.GAME_HEIGHT / 2 + 140, 'PLAY AGAIN', {
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
      mutex: 1,
      currentCustomer: 0,
      customersInQueue: 0,
      gameRunning: false,
      showTutorial: false,
      totalCustomers: 5,
      completedCustomers: 0
    };

    this.score = 0;
    this.selectedCustomer = null;

    if (this.resultsOverlay) {
      this.resultsOverlay.destroy();
    }

    // Reset all customers
    this.customers.forEach(customer => {
      customer.sprite.setVisible(false);
      customer.label.setVisible(false);
      customer.statusText.setVisible(false);
      customer.sprite.setPosition(customer.startX, customer.startY);
      customer.label.setPosition(customer.startX, customer.startY - 40);
      customer.statusText.setPosition(customer.startX, customer.startY + 40);
      customer.isMoving = false;
      customer.isInQueue = false;
      customer.isAtATM = false;
      customer.hasCompleted = false;
      customer.sprite.clearTint();
    });

    // Reset ATM
    this.gameState.mutex = 1;
    this.updateLockIcon();
    this.atmStatusText.setText('FREE');
    this.atmStatusText.setStyle({ color: '#2ed573' });
    this.progressBar.clear();

    // Update UI
    this.updateUI();

    this.startSimulation();
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