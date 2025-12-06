import Phaser from 'phaser';

interface FoodOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  arrivalTime: number; // When customer arrived
  burstTime: number; // Cooking time
  startTime?: number; // When chef started cooking
  completionTime?: number; // When cooking finished
  waitingTime?: number; // completionTime - arrivalTime - burstTime
  turnaroundTime?: number; // completionTime - arrivalTime
  dishType: 'burger' | 'pizza' | 'sandwich' | 'mushroom' | 'chicken';
  isCompleted: boolean;
  isDelivered: boolean;
  isCooking: boolean;
  orderContainer?: Phaser.GameObjects.Container;
}

interface Customer {
  id: string;
  name: string;
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  orderText?: Phaser.GameObjects.Text;
  order: FoodOrder;
  x: number;
  y: number;
  tableNumber: number;
  moodIcon: Phaser.GameObjects.Text;
  tooltip?: Phaser.GameObjects.Container;
  standSprite?: Phaser.GameObjects.Sprite;
  standOrderText?: Phaser.GameObjects.Container;
}

interface GanttChartEntry {
  order: FoodOrder;
  startTime: number;
  endTime: number;
  x: number;
  width: number;
}

export class FCFSGame extends Phaser.Scene {
  // Game State
  private gamePhase: 'intro' | 'arrival' | 'cooking' | 'serving' | 'results' = 'intro';
  private customers: Customer[] = [];
  private orders: FoodOrder[] = [];
  private readyQueue: FoodOrder[] = []; // FIFO queue
  private completedOrders: FoodOrder[] = [];
  private currentCookingOrder?: FoodOrder;
  private gameStartTime: number = 0;
  private currentTime: number = 0;
  private cookingSound?: Phaser.Sound.BaseSound;
  
  // Sprites & Objects
  private waiterSprite!: Phaser.GameObjects.Sprite;
  private chefSprite!: Phaser.GameObjects.Sprite;
  private deliveryBoySprite?: Phaser.GameObjects.Sprite;
  private orderBoard!: Phaser.GameObjects.Image;
  private orderBoardTexts: Phaser.GameObjects.Container[] = [];
  private waiterFoodSprite?: Phaser.GameObjects.Sprite;
  private dispatchButton?: Phaser.GameObjects.Container;
  private dispatchButtonText?: Phaser.GameObjects.Text;

  // UI Elements
  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private currentProgress: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  
  // Positions
  private readonly CHEF_HOME_X = 1200;
  private readonly CHEF_HOME_Y = 500;
  // Place waiter near bottom-left wall for less clutter and clear pathing
  private readonly WAITER_HOME_X = 110;
  private readonly WAITER_HOME_Y = 900;
  private readonly ORDER_BOARD_X = 400;
  private readonly ORDER_BOARD_Y = 270;
  
  // Game scoring
  private totalScore: number = 0;
  private wrongAttempts: number = 0;
  
  // AI Chatbot
  private chatbotContainer?: Phaser.GameObjects.Container;
  private chatMessages: Array<{ role: 'user' | 'ai', message: string }> = [];
  private isChatbotOpen: boolean = false;
  private chatScrollOffset: number = 0;
  private maxChatScroll: number = 0;
  
  // Game Data
  private readonly CUSTOMER_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Emma'];
  private readonly DISH_CONFIGS = {
    burger: { name: 'Burger', emoji: '🍔', burstTime: 4, asset: 'burger' },
    pizza: { name: 'Pizza', emoji: '🍕', burstTime: 6, asset: 'pizza' },
    sandwich: { name: 'Sandwich', emoji: '🥪', burstTime: 3, asset: 'sandwich' },
    mushroom: { name: 'Soup', emoji: '🍄', burstTime: 5, asset: 'mashroom' },
    chicken: { name: 'Chicken', emoji: '🍗', burstTime: 5, asset: 'chicken' }
  };

  // Timing
  private numCustomers: number = 0; // Will be randomly set (3-5)
  private currentWaiterCustomerIndex: number = 0;
  private waiterVisitOrder: number[] = []; // Randomized indices for customer visits
  private timeEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'FCFSGame' });
  }

  preload() {
    const assetPath = '/games/cpu-scheduling/assets/';
    
    // Load all assets
    this.load.image('bg-restaurant', `${assetPath}background.png`);
    this.load.image('order-board-bg', `${assetPath}order_board.png`);
    this.load.image('station-equipment', `${assetPath}table_stove_chimney.png`);
    this.load.image('chef-standing', `${assetPath}chef_standing.png`);
    this.load.image('chef-cutting', `${assetPath}chef_cutting_meal.png`);
    this.load.image('chef-serving', `${assetPath}chef_with food_in_hand.png`);
    this.load.image('waiter', `${assetPath}waiter.png`);
    this.load.image('customer', `${assetPath}customer.png`);
    this.load.image('customer2', `${assetPath}customer2.png`);
    this.load.image('burger', `${assetPath}burger.png`);
    this.load.image('pizza', `${assetPath}pizza.png`);
    this.load.image('sandwich', `${assetPath}sandwich.png`);
    this.load.image('mashroom', `${assetPath}mashroom.png`);
    this.load.image('chicken', `${assetPath}chicken.png`);
    this.load.image('stand', `${assetPath}stand.png`);
    this.load.image('deliver1', `${assetPath}deliver1.png`); // Delivery boy standing
    this.load.image('deliver2', `${assetPath}deliver2.png`); // Delivery boy moving right
    this.load.image('deliver3', `${assetPath}deliver3.png`); // Delivery boy moving left
    
    // Load sound effects
    this.load.audio('person-walk', `${assetPath}sounds/person-walk.wav`);
    this.load.audio('background-music', `${assetPath}sounds/background_music.flac`);
    this.load.audio('cooking', `${assetPath}sounds/cooking.mp3`);
  }

  create() {
    const { width, height } = this.sys.game.canvas;
    
    // Clean up any stray DOM inputs from previous sessions
    this.removeDOMInput();
    
    // Start background music - loop continuously
    this.sound.play('background-music', { 
      loop: true, 
      volume: 0.3 
    });
    
    // Full screen background
    const bgImage = this.add.image(width / 2, height / 2, 'bg-restaurant');
    const scaleX = width / bgImage.width;
    const scaleY = height / bgImage.height;
    const scale = Math.max(scaleX, scaleY);
    bgImage.setScale(scale);
    bgImage.setDepth(-100);

    // Setup game elements
    this.createKitchenStation(width, height);
    this.createWaiter();
    this.createChef();
    this.createDeliveryBoy();
    this.createOrderBoard();
    this.createUI(width, height);
    
    // Show intro scenario
    this.showIntroScenario(width, height);
  }

  private createKitchenStation(width: number, height: number) {
    const equipment = this.add.image(this.CHEF_HOME_X, this.CHEF_HOME_Y, 'station-equipment');
    equipment.setScale(0.5);
    equipment.setAlpha(0.9);
    equipment.setDepth(-10);
  }

  private createWaiter() {
    const { width, height } = this.sys.game.canvas;
    const row1Y = height - 190;
    const row1StartX = width * 0.24;
    
    // Position waiter at the start of first row initially
    const waiterStartX = row1StartX - 150;
    const waiterStartY = row1Y;
    
    this.waiterSprite = this.add.sprite(waiterStartX, waiterStartY, 'waiter');
    this.waiterSprite.setScale(0.5);
    this.waiterSprite.setDepth(-10);
  }

  private createChef() {
    this.chefSprite = this.add.sprite(this.CHEF_HOME_X, this.CHEF_HOME_Y, 'chef-standing');
    this.chefSprite.setScale(0.25);
    this.chefSprite.setDepth(-15); // Behind the stove table (which is at -10)
  }

  private createDeliveryBoy() {
    const { width, height } = this.sys.game.canvas;
    const row1Y = height - 190;
    
    // Position delivery boy at the end of first row near stove
    const deliveryBoyX = this.CHEF_HOME_X - 200; // Near stove
    const deliveryBoyY = row1Y;
    
    // Create delivery boy sprite with deliver1 (standing pose)
    this.deliveryBoySprite = this.add.sprite(deliveryBoyX, deliveryBoyY, 'deliver1');
    this.deliveryBoySprite.setScale(0.5);
    this.deliveryBoySprite.setDepth(-10); // Same depth as waiter initially (hidden during intro)
  }

  private createOrderBoard() {
    this.orderBoard = this.add.image(this.ORDER_BOARD_X, this.ORDER_BOARD_Y+100, 'order-board-bg');
    this.orderBoard.setScale(0.6);
    this.orderBoard.setAlpha(1);
    this.orderBoard.setDepth(-10);
  
    
    const boardTitle = this.add.text(this.ORDER_BOARD_X, this.ORDER_BOARD_Y - 60, 'ORDERS QUEUE', {
      fontSize: '20px',
      color: '#FF6B35',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#000000AA',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
    boardTitle.setDepth(-10);
    boardTitle.setData('isBoardTitle', true);
  }

  private createUI(width: number, height: number) {
    // Title (smaller, with subtle background for contrast)
    const titleText = this.add.text(width / 2, 40, '🍽️ FCFS CPU Scheduling Simulator 🍽️', {
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
    this.phaseText = this.add.text(width / 2, 88, 'Phase: Intro', {
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
    this.scoreText = this.add.text(width - 150, 90, 'Score: 0', {
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

    // Instruction text at bottom
    this.instructionText = this.add.text(width / 2, height - 20, '', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);

    // Progress bar background
    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0x333333, 0.8);
    this.progressBarBg.fillRoundedRect(width / 2 - 200, 115, 400, 20, 10);
    this.progressBarBg.setVisible(false);

    // Progress bar
    this.progressBar = this.add.graphics();
    this.progressBar.setVisible(false);
  }

  private showIntroScenario(width: number, height: number) {
    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    // Scenario box - cleaner and more compact
    const boxWidth = 700;
    const boxHeight = 600;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const scenarioBox = this.add.graphics();
    scenarioBox.fillStyle(0x0a0e27, 0.98);
    scenarioBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    scenarioBox.lineStyle(4, 0xFFD700, 1);
    scenarioBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    scenarioBox.setDepth(301);

    // Title
    const title = this.add.text(width / 2, boxY + 50, '🎯 FCFS SCHEDULING', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(width / 2, boxY + 95, 'CPU Scheduling - Restaurant Game', {
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

    const howToPlay = `   1. Waiter collects orders from customers
   2. Orders appear in the Ready Queue
   3. Click the FIRST order to start cooking
   4. Delivery boy delivers completed orders`;

    const howToPlayText = this.add.text(boxX + 50, contentY + 35, howToPlay, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Rules
    const rulesTitle = this.add.text(boxX + 50, contentY + 145, '⚠️ FCFS Rules', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const rules = `   • Always select the FIRST order in queue
   • Orders must be processed in arrival order
   • Chef cooks one order at a time
   • Correct order: +20 pts | Wrong order: -10 pts`;

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

    const goal = `   Process all orders following FCFS (First Come First Served)!`;

    const goalText = this.add.text(boxX + 50, contentY + 315, goal, {
      fontSize: '16px',
      color: '#00ff88',
      fontStyle: '600',
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
      
      this.showGameElements();
      this.startArrivalPhase();
    });
  }

  private showGameElements() {
    // Show customers (will be populated as they arrive)
    // Show waiter and chef
    this.waiterSprite.setDepth(2);
    this.chefSprite.setDepth(-15); // Behind the stove table
    
    // Show delivery boy at end of first row
    if (this.deliveryBoySprite) {
      this.deliveryBoySprite.setDepth(2);
    }
    
    // Show order board
    this.orderBoard.setDepth(10);
    this.children.list.forEach(child => {
      if (child.name === 'shadow' && 'setDepth' in child) {
        (child as any).setDepth(9);
      }
    });
    
    this.children.list.forEach(child => {
      if (child.getData('isBoardTitle') && 'setDepth' in child) {
        (child as any).setDepth(11);
      }
    });
  }

  private startArrivalPhase() {
    this.gamePhase = 'arrival';
    this.gameStartTime = Date.now(); // Track game start time
    this.gameStartTime = this.time.now;
    this.currentTime = 0;
    
    // Randomly decide how many customers (3 to 5)
    this.numCustomers = Phaser.Math.Between(3, 5);
    
    this.phaseText.setText('Phase: Customers Arriving');
    this.instructionText.setText(`🎲 ${this.numCustomers} customers have arrived at the restaurant!`);
    
    // Start clock
    this.timeEvent = this.time.addEvent({
      delay: 100,
      callback: this.updateClock,
      callbackScope: this,
      loop: true
    });
    
    // Create all customers at once
    this.createAllCustomers();
    
    // After showing customers, start waiter collecting orders
    this.time.delayedCall(2000, () => {
      this.startWaiterCollecting();
    });
  }

  private positionWaiterForOrders() {
    // No longer needed - waiter is already positioned at start of row 1
  }

  private createAllCustomers() {
    const { width, height } = this.sys.game.canvas;
    
    // Position configuration
    const customersPerRow = 3;
    const row1Y = height - 190;
    const row2Y = height - 85;
    const rowSpacing = width * 0.18;
    const row1StartX = width * 0.22;
    const row2StartX = width * 0.26;
    
    const dishTypes: Array<keyof typeof this.DISH_CONFIGS> = ['burger', 'pizza', 'sandwich', 'mushroom', 'chicken'];

    for (let customerIndex = 0; customerIndex < this.numCustomers; customerIndex++) {
      // Determine position
      const isFirstRow = customerIndex < customersPerRow;
      const posInRow = isFirstRow ? customerIndex : customerIndex - customersPerRow;
      const customerY = isFirstRow ? row1Y : row2Y;
      const startX = isFirstRow ? row1StartX : row2StartX;
      const x = startX + (posInRow * rowSpacing);

      // Random customer image
      const customerImages = ['customer', 'customer2'];
      const customerImage = customerImages[Math.floor(Math.random() * customerImages.length)];
      const customerSprite = this.add.sprite(x, customerY, customerImage);
      customerSprite.setScale(0.25);
      customerSprite.setDepth(2);
      customerSprite.setAlpha(1); // Already visible

      const name = this.CUSTOMER_NAMES[customerIndex];
      const nameText = this.add.text(x, customerY + 20, name, {
        fontSize: '16px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      nameText.setDepth(2);
      nameText.setAlpha(0); // Hidden - no name displayed on tables

      const moodIcon = this.add.text(x-10, customerY - 40, '', {
        fontSize: '24px'
      }).setOrigin(0.5);
      moodIcon.setDepth(2);
      moodIcon.setAlpha(1); // Already visible

      // Create stand for displaying order details on the table
      const standXOffset = customerImage === 'customer' ? 35 : 0;
      const standSprite = this.add.sprite(x-5-standXOffset, customerY - 40, 'stand');
      standSprite.setScale(0.4); // Adjust scale as needed
      standSprite.setDepth(1); // Behind customer but in front of background
      standSprite.setAlpha(1); // Already visible

      // Create order with random dish
      const dishType = dishTypes[customerIndex % dishTypes.length];
      const dishConfig = this.DISH_CONFIGS[dishType];
      
      const order: FoodOrder = {
        id: `order-${customerIndex + 1}`,
        orderNumber: 0, // Will be assigned when waiter visits
        customerName: name,
        arrivalTime: 0, // All arrive at time 0
        burstTime: dishConfig.burstTime,
        dishType: dishType,
        isCompleted: false,
        isDelivered: false,
        isCooking: false
      };

      const customer: Customer = {
        id: `customer-${customerIndex + 1}`,
        name: name,
        sprite: customerSprite,
        nameText: nameText,
        order: order,
        x: x,
        y: customerY,
        tableNumber: customerIndex + 1,
        moodIcon: moodIcon,
        standSprite: standSprite
      };

      this.customers.push(customer);
      this.orders.push(order);

      // Customers are already visible - no animation needed
    }
  }

  private startWaiterCollecting() {
    this.phaseText.setText('Phase: Taking Orders');
    this.instructionText.setText('�️ Click on any table to send waiter - Order number will be based on your click sequence!');
    
    // Initialize empty visit order - will be filled by clicks
    this.waiterVisitOrder = [];
    this.currentWaiterCustomerIndex = 0;
    
    // Make all customers clickable
    this.customers.forEach((customer) => {
      customer.sprite.setInteractive({ cursor: 'pointer' });
      customer.sprite.setData('hasOrder', false); // Track if order was taken
      
      // Add pulsing glow circle using Graphics for better visibility
      const glowCircle = this.add.graphics();
      glowCircle.lineStyle(4, 0xFFFF00, 1); // Thick yellow border
      glowCircle.fillStyle(0xFFD700, 0.3); // Semi-transparent gold fill
      glowCircle.fillCircle(customer.x, customer.y, 65);
      glowCircle.strokeCircle(customer.x, customer.y, 65);
      glowCircle.setDepth(10); // High depth to ensure visibility above everything
      customer.sprite.setData('glowCircle', glowCircle);
      
      // Pulsing animation
      this.tweens.add({
        targets: glowCircle,
        alpha: { from: 0.5, to: 1 },
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 1.1 },
        x: { from: customer.x, to: customer.x },
        y: { from: customer.y, to: customer.y },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Click handler
      customer.sprite.on('pointerdown', () => {
        this.onCustomerTableClick(customer);
      });
      
      // Hover effects
      customer.sprite.on('pointerover', () => {
        if (!customer.sprite.getData('hasOrder')) {
          customer.sprite.setTint(0xFFFF00); // Yellow highlight
          glowCircle.clear();
          glowCircle.lineStyle(5, 0xFFFF00, 1);
          glowCircle.fillStyle(0xFFFF00, 0.5);
          glowCircle.fillCircle(customer.x, customer.y, 65);
          glowCircle.strokeCircle(customer.x, customer.y, 65);
        }
      });
      
      customer.sprite.on('pointerout', () => {
        if (!customer.sprite.getData('hasOrder')) {
          customer.sprite.clearTint();
          glowCircle.clear();
          glowCircle.lineStyle(4, 0xFFFF00, 1);
          glowCircle.fillStyle(0xFFD700, 0.3);
          glowCircle.fillCircle(customer.x, customer.y, 65);
          glowCircle.strokeCircle(customer.x, customer.y, 65);
        }
      });
    });
  }

  private onCustomerTableClick(customer: Customer) {
    // Check if order already taken from this customer
    if (customer.sprite.getData('hasOrder')) {
      this.showMessage('⚠️ Order already taken from this table!', '#FF0000');
      return;
    }
    
    // Check if waiter is currently busy
    if (this.tweens.getTweensOf(this.waiterSprite).length > 0) {
      this.showMessage('⚠️ Waiter is busy! Wait for current order collection.', '#FF0000');
      return;
    }
    
    // Mark customer as having order taken
    customer.sprite.setData('hasOrder', true);
    customer.sprite.removeInteractive();
    customer.sprite.clearTint();
    customer.moodIcon.setText('');
    
    // Remove glow effect
    const glowCircle = customer.sprite.getData('glowCircle');
    if (glowCircle) {
      this.tweens.killTweensOf(glowCircle);
      this.tweens.add({
        targets: glowCircle,
        alpha: 0,
        duration: 300,
        onComplete: () => glowCircle.destroy()
      });
    }
    
    // Calculate order number (how many orders have been taken + 1)
    const ordersAlreadyTaken = this.customers.filter(c => c.sprite.getData('hasOrder')).length;
    const orderNumber = ordersAlreadyTaken; // This customer just got marked as hasOrder
    
    // Send waiter to this customer with the correct order number
    this.collectOrderFromCustomer(customer, orderNumber);
  }
  
  private collectOrderFromCustomer(customer: Customer, orderNumber: number) {
    
    // Calculate realistic movement duration based on distance
    const distance = Phaser.Math.Distance.Between(
      this.waiterSprite.x,
      this.waiterSprite.y,
      customer.x - 100,
      customer.y
    );
    const moveDuration = Math.max(500, Math.min(1500, distance * 0.8)); // Scale duration by distance
    
    // Play walking sound with reduced duration
    const walkSound = this.sound.add('person-walk');
    walkSound.play({ volume: 0.5 });
    this.time.delayedCall(1500, () => {
      if (walkSound.isPlaying) {
        walkSound.stop();
      }
    });
    
    // Waiter walks to customer with smooth animation
    this.tweens.add({
      targets: this.waiterSprite,
      x: customer.x - 100, // Stand beside the customer
      y: customer.y,
      duration: moveDuration,
      ease: 'Sine.inOut', // More natural movement
      onComplete: () => {
        // Assign order number based on click sequence
        customer.order.orderNumber = orderNumber;
        
        // Set arrival time to current game time
        customer.order.arrivalTime = Math.round(this.currentTime);
        
        // Show customer's order on the stand
        const dishConfig = this.DISH_CONFIGS[customer.order.dishType];
        
        // Create order display on stand
        if (customer.standSprite) {
          const standX = customer.standSprite.x;
          const standY = customer.standSprite.y;
          
          // Create container for order details on stand (just the food emoji)
          customer.standOrderText = this.add.container(standX+5, standY);
          customer.standOrderText.setDepth(2);
          
          // Food emoji - simple and fits on the stand
          const foodEmoji = this.add.text(0, -5, dishConfig.emoji, {
            fontSize: '20px'
          }).setOrigin(0.5);
          customer.standOrderText.add(foodEmoji);
          
          // Order number below the food emoji
          const orderNumber = this.add.text(0, 12, `${customer.order.orderNumber}`, {
            fontSize: '15px',
            color: '#FF6B35',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }).setOrigin(0.5);
          customer.standOrderText.add(orderNumber);
          
          // Animate stand order appearing
          customer.standOrderText.setAlpha(0);
          customer.standOrderText.setScale(0.5);
          this.tweens.add({
            targets: customer.standOrderText,
            alpha: 1,
            scale: 1,
            duration: 400,
            ease: 'Back.out'
          });
        }
        
        // Add order to the board
        this.addOrderToBoard(customer.order);
        this.readyQueue.push(customer.order);
        
        // Return waiter to home position and wait for next click
        this.time.delayedCall(1500, () => {
          this.waiterReturnsHomeQuick(() => {
            // Check if all orders collected
            const ordersCollected = this.customers.filter(c => c.sprite.getData('hasOrder')).length;
            if (ordersCollected >= this.customers.length) {
              // All orders collected, start cooking phase
              this.time.delayedCall(500, () => {
                this.startCookingPhase();
              });
            } else {
              // Update instruction for next table
              this.instructionText.setText(`🖱️ Click on next table (${ordersCollected}/${this.customers.length} orders taken)`);
            }
          });
        });
      }
    });
  }

  private waiterReturnsHomeQuick(callback?: () => void) {
    const { width, height } = this.sys.game.canvas;
    const row1Y = height - 190;
    const row1StartX = width * 0.24;
    
    // Return to the start of first row
    const waiterStartX = row1StartX - 150;
    const waiterStartY = row1Y;
    
    // Calculate realistic movement duration based on distance
    const distance = Phaser.Math.Distance.Between(
      this.waiterSprite.x,
      this.waiterSprite.y,
      waiterStartX,
      waiterStartY
    );
    const moveDuration = Math.max(800, Math.min(2000, distance * 0.8));
    
    // Play walking sound with reduced duration
    const walkSound = this.sound.add('person-walk');
    walkSound.play({ volume: 0.5 });
    this.time.delayedCall(1500, () => {
      if (walkSound.isPlaying) {
        walkSound.stop();
      }
    });
    
    this.tweens.add({
      targets: this.waiterSprite,
      x: waiterStartX,
      y: waiterStartY,
      duration: moveDuration,
      ease: 'Sine.inOut',
      onComplete: () => {
        if (callback) callback();
      }
    });
  }

  private waiterReturnsHome() {
    this.instructionText.setText('✅ All orders collected! Waiter returning...');
    
    const { width, height } = this.sys.game.canvas;
    const row1Y = height - 190;
    const row1StartX = width * 0.24;
    
    // Return to the start of first row
    const waiterStartX = row1StartX - 150;
    const waiterStartY = row1Y;
    
    // Calculate realistic movement duration based on distance
    const distance = Phaser.Math.Distance.Between(
      this.waiterSprite.x,
      this.waiterSprite.y,
      waiterStartX,
      waiterStartY
    );
    const moveDuration = Math.max(1000, Math.min(2500, distance * 0.8)); // Scale duration by distance
    
    // Play walking sound with reduced duration
    const walkSound = this.sound.add('person-walk');
    walkSound.play({ volume: 0.5 });
    this.time.delayedCall(1500, () => {
      if (walkSound.isPlaying) {
        walkSound.stop();
      }
    });
    
    this.tweens.add({
      targets: this.waiterSprite,
      x: waiterStartX,
      y: waiterStartY,
      duration: moveDuration,
      ease: 'Sine.inOut', // More natural movement
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.startCookingPhase();
        });
      }
    });
  }

  private scheduleCustomerArrivals() {
    // This function is now replaced by createAllCustomers
    // Keeping it to avoid breaking references, but it won't be used
  }

  private addOrderToBoard(order: FoodOrder) {
    const startY = this.ORDER_BOARD_Y - 20;
    const lineHeight = 28;
    const orderIndex = this.orderBoardTexts.length;
    
    const dishConfig = this.DISH_CONFIGS[order.dishType];
    
    const orderContainer = this.add.container(this.ORDER_BOARD_X, startY + (orderIndex * lineHeight));
    orderContainer.setDepth(15);
    orderContainer.setData('orderId', order.id);
    
    // Background
    const orderBg = this.add.graphics();
    orderBg.fillStyle(0xFFFFFF, 0.95);
    orderBg.fillRoundedRect(-80, -12, 160, 24, 6);
    orderBg.lineStyle(2, 0xFF6B35, 1);
    orderBg.strokeRoundedRect(-80, -12, 160, 24, 6);
    orderContainer.add(orderBg);
    
    // Order number
    const orderNumber = this.add.text(-75, 0, `${order.orderNumber}.`, {
      fontSize: '14px',
      color: '#FF6B35',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0, 0.5);
    orderContainer.add(orderNumber);
    
    // Food emoji
    const foodEmoji = this.add.text(-55, 0, dishConfig.emoji, {
      fontSize: '16px'
    }).setOrigin(0, 0.5);
    orderContainer.add(foodEmoji);
    
    // Food name
    const foodName = this.add.text(-35, 0, dishConfig.name, {
      fontSize: '12px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    orderContainer.add(foodName);
    
    // Arrival time
    const arrivalTime = this.add.text(40, 0, `AT:${order.arrivalTime}s`, {
      fontSize: '10px',
      color: '#666666',
      fontStyle: 'italic'
    }).setOrigin(0, 0.5);
    orderContainer.add(arrivalTime);
    
    // Make interactive for clicking to cook and tooltip
    orderContainer.setInteractive(new Phaser.Geom.Rectangle(-80, -12, 160, 24), Phaser.Geom.Rectangle.Contains);
    
    // Hover effects
    orderContainer.on('pointerover', () => {
      if (this.gamePhase === 'cooking' && !order.isCompleted && !order.isCooking) {
        // Highlight on hover during cooking phase
        orderBg.clear();
        orderBg.fillStyle(0xFFFFAA, 0.95);
        orderBg.fillRoundedRect(-80, -12, 160, 24, 6);
        orderBg.lineStyle(3, 0xFF6B35, 1);
        orderBg.strokeRoundedRect(-80, -12, 160, 24, 6);
      }
      this.showOrderTooltip(order, orderContainer);
    });
    
    orderContainer.on('pointerout', () => {
      if (!order.isCompleted && !order.isCooking) {
        // Reset normal appearance
        orderBg.clear();
        orderBg.fillStyle(0xFFFFFF, 0.95);
        orderBg.fillRoundedRect(-80, -12, 160, 24, 6);
        orderBg.lineStyle(2, 0xFF6B35, 1);
        orderBg.strokeRoundedRect(-80, -12, 160, 24, 6);
      }
      this.hideOrderTooltip();
    });
    
    // Click to dispatch order
    orderContainer.on('pointerdown', () => {
      if (this.gamePhase === 'cooking') {
        this.tryDispatchOrder(order);
      }
    });
    
    // Animate appearance
    orderContainer.setAlpha(0);
    orderContainer.setY(orderContainer.y - 20);
    this.tweens.add({
      targets: orderContainer,
      alpha: 1,
      y: startY + (orderIndex * lineHeight),
      duration: 500,
      ease: 'Back.out'
    });
    
    this.orderBoardTexts.push(orderContainer);
    order.orderContainer = orderContainer;
  }

  private showOrderTooltip(order: FoodOrder, container: Phaser.GameObjects.Container) {
    const tooltip = this.add.container(container.x, container.y - 40);
    tooltip.setDepth(25);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-90, -35, 180, 35, 8);
    bg.lineStyle(2, 0xFFD700, 1);
    bg.strokeRoundedRect(-90, -35, 180, 35, 8);
    tooltip.add(bg);
    
    const text = this.add.text(0, -18, `Arrival: ${order.arrivalTime}s | Burst: ${order.burstTime}s`, {
      fontSize: '11px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);
    tooltip.add(text);
    
    const text2 = this.add.text(0, -6, order.isCooking ? ' Cooking...' : ' Waiting in queue', {
      fontSize: '11px',
      color: order.isCooking ? '#FFD700' : '#00FF00',
      align: 'center'
    }).setOrigin(0.5);
    tooltip.add(text2);
    
    container.setData('tooltip', tooltip);
  }

  private hideOrderTooltip() {
    this.orderBoardTexts.forEach(container => {
      const tooltip = container.getData('tooltip');
      if (tooltip) {
        tooltip.destroy();
        container.setData('tooltip', null);
      }
    });
  }

  private startCookingPhase() {
    this.gamePhase = 'cooking';
    this.phaseText.setText('Phase: Cooking (FCFS)');
    this.instructionText.setText('🎯 Click on orders in the queue to cook - Remember FCFS: First order must be served first!');
    
    // Don't create dispatch button - orders are now clickable
  }

  private tryDispatchOrder(clickedOrder: FoodOrder) {
    // Check if order is already completed or cooking
    if (clickedOrder.isCompleted) {
      this.showMessage('⚠️ This order is already completed!', '#FF0000');
      return;
    }

    if (clickedOrder.isCooking) {
      this.showMessage('⚠️ This order is currently cooking!', '#FF0000');
      return;
    }

    // Check if chef is busy
    if (this.currentCookingOrder) {
      this.showMessage('⚠️ Chef is busy! Wait for current order to finish.', '#FF0000');
      return;
    }

    // Check if there are any orders in the queue
    if (this.readyQueue.length === 0) {
      this.showMessage('⚠️ No orders in queue!', '#FF0000');
      return;
    }

    // FCFS Validation: Check if this is the first order in queue
    const firstOrderInQueue = this.readyQueue[0];
    
    if (clickedOrder.id !== firstOrderInQueue.id) {
      // Wrong order selected! Not following FCFS
      this.wrongAttempts++;
      this.totalScore = Math.max(0, this.totalScore - 10); // Deduct 10 points
      this.scoreText.setText(`Score: ${this.totalScore}`);
      
      this.showMessage(`❌ Wrong! Order #${firstOrderInQueue.orderNumber} must be served first (FCFS)!`, '#FF0000');
      
      // Flash the correct order that should be selected
      if (firstOrderInQueue.orderContainer) {
        this.flashCorrectOrder(firstOrderInQueue.orderContainer);
      }
      return;
    }

    // Correct! Dispatch the order
    this.dispatchOrder(clickedOrder);
  }

  private flashCorrectOrder(container: Phaser.GameObjects.Container) {
    // Flash animation to highlight the correct order
    this.tweens.add({
      targets: container,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Power2'
    });
  }

  private dispatchOrder(order: FoodOrder) {
    // Remove from queue
    const index = this.readyQueue.indexOf(order);
    if (index > -1) {
      this.readyQueue.splice(index, 1);
    }

    // Start cooking
    this.currentCookingOrder = order;
    order.isCooking = true;
    order.startTime = this.currentTime;
    
    // Add points for correct selection
    this.totalScore += 20;
    this.scoreText.setText(`Score: ${this.totalScore}`);
    
    // Update order board visual
    this.updateOrderBoardVisuals();
    
    // Start cooking
    this.cookOrder(order);
  }

  private createDispatchButton() {
    const { width } = this.sys.game.canvas;
    const buttonX = width - 180;
    const buttonY = 780; // lower near right wall
    const buttonWidth = 150;
    const buttonHeight = 60;

    this.dispatchButton = this.add.container(buttonX, buttonY);
    this.dispatchButton.setDepth(20);
    
    const bg = this.add.graphics();
    bg.fillStyle(0xFFD700, 1);
    bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    bg.lineStyle(3, 0xFF8C00, 1);
    bg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    this.dispatchButton.add(bg);
    
    this.dispatchButtonText = this.add.text(0, 0, '⚡ DISPATCH', {
      fontSize: '18px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.dispatchButton.add(this.dispatchButtonText);
    
    this.dispatchButton.setInteractive(new Phaser.Geom.Rectangle(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    
    this.dispatchButton.on('pointerover', () => {
      if (this.readyQueue.length > 0) {
        bg.clear();
        bg.fillStyle(0xFFA500, 1);
        bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
        bg.lineStyle(3, 0xFF8C00, 1);
        bg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
      }
    });
    
    this.dispatchButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xFFD700, 1);
      bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
      bg.lineStyle(3, 0xFF8C00, 1);
      bg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
    });
    
    this.dispatchButton.on('pointerdown', () => {
      this.dispatchNextOrder();
    });
  }

  private dispatchNextOrder() {
    if (this.readyQueue.length === 0) {
      this.showMessage('⚠️ No orders in queue!', '#FF0000');
      return;
    }

    if (this.currentCookingOrder) {
      this.showMessage('⚠️ Chef is busy! Wait for current order to finish.', '#FF0000');
      return;
    }

    // Get first order from queue (FCFS)
    const order = this.readyQueue.shift()!;
    this.currentCookingOrder = order;
    order.isCooking = true;
    order.startTime = this.currentTime;
    
    // Update order board visual
    this.updateOrderBoardVisuals();
    
    // Start cooking
    this.cookOrder(order);
  }

  private cookOrder(order: FoodOrder) {
    const dishConfig = this.DISH_CONFIGS[order.dishType];
    
    this.instructionText.setText(`👨‍🍳 Chef is cooking Order #${order.orderNumber}: ${dishConfig.name} (${order.burstTime}s)`);
    
    // Show progress bar
    this.progressBarBg.setVisible(true);
    this.progressBar.setVisible(true);
    
    // Change chef animation
    this.chefSprite.setTexture('chef-cutting');
    this.addChefCookingAnimation();
    
    // Play cooking sound
    this.cookingSound = this.sound.add('cooking');
    this.cookingSound.play({ 
      loop: true,
      volume: 0.4 
    });
    
    // Cooking progress
    const cookTime = order.burstTime * 1000;
    this.currentProgress = 0;
    
    const progressTween = this.tweens.add({
      targets: this,
      currentProgress: 1,
      duration: cookTime,
      ease: 'Linear',
      onUpdate: () => {
        this.updateProgressBar();
      },
      onComplete: () => {
        this.stopChefCookingAnimation();
        this.chefSprite.setTexture('chef-standing');
        
        // Stop cooking sound
        if (this.cookingSound && this.cookingSound.isPlaying) {
          this.cookingSound.stop();
        }
        
        // Mark as completed
        order.isCompleted = true;
        order.completionTime = this.currentTime;
        order.turnaroundTime = order.completionTime - order.arrivalTime;
        order.waitingTime = order.turnaroundTime - order.burstTime;
        
        this.completedOrders.push(order);
        this.currentCookingOrder = undefined;
        
        // Hide progress bar
        this.progressBarBg.setVisible(false);
        this.progressBar.setVisible(false);
        
        // Update order board
        this.updateOrderBoardVisuals();
        
        // Show completion message
        this.showMessage(`✅ Order #${order.orderNumber} completed!`, '#00FF00');
        
        // Immediately deliver the order after cooking
        this.time.delayedCall(500, () => {
          this.deliveryBoyDeliversOrder(order);
        });
      }
    });
  }

  private deliveryBoyDeliversOrder(order: FoodOrder) {
    // Find the customer who ordered this
    const targetCustomer = this.customers.find(c => c.order.id === order.id);
    
    if (!targetCustomer || !this.deliveryBoySprite) return;
    
    const dishConfig = this.DISH_CONFIGS[order.dishType];
    
    this.instructionText.setText(`🚴 Delivery boy is delivering Order #${order.orderNumber}: ${dishConfig.name} to ${order.customerName}`);
    
    const deliveryBoyStartX = this.deliveryBoySprite.x;
    const deliveryBoyStartY = this.deliveryBoySprite.y;
    
    // Determine if customer is to the left or right
    const isCustomerLeft = targetCustomer.x < this.deliveryBoySprite.x;
    
    // Phase 1: Move toward customer
    const moveToCustomerTexture = isCustomerLeft ? 'deliver3' : 'deliver2';
    this.deliveryBoySprite.setTexture(moveToCustomerTexture);
    
    const deliveryDuration = 1500;
    const targetX = targetCustomer.x - 65;
    const targetY = targetCustomer.y - 10;
    
    // Play walking sound with reduced duration
    const walkSound = this.sound.add('person-walk');
    walkSound.play({ volume: 0.5 });
    this.time.delayedCall(1500, () => {
      if (walkSound.isPlaying) {
        walkSound.stop();
      }
    });
    
    // Move delivery boy to customer
    this.tweens.add({
      targets: this.deliveryBoySprite,
      x: targetX,
      y: targetY,
      duration: deliveryDuration,
      ease: 'Power2',
      onComplete: () => {
        // Delivered!
        order.isDelivered = true;
        this.totalScore += 100;
        this.updateScoreDisplay();
        
        // Update order details on stand to show "DONE" status
        if (targetCustomer.standOrderText && targetCustomer.standSprite) {
          // Clear the old order details
          targetCustomer.standOrderText.destroy();
          
          // Create new "DONE" display on stand
          const standX = targetCustomer.standSprite.x;
          const standY = targetCustomer.standSprite.y;
          
          targetCustomer.standOrderText = this.add.container(standX + 5, standY);
          targetCustomer.standOrderText.setDepth(2);
          
          // Green checkmark
          const checkmark = this.add.text(0, -8, '✓', {
            fontSize: '15px',
            color: '#00FF00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }).setOrigin(0.5);
          targetCustomer.standOrderText.add(checkmark);
          
          // "DONE" text below checkmark
          const doneText = this.add.text(0, 10, 'DONE', {
            fontSize: '10px',
            color: '#00FF00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }).setOrigin(0.5);
          targetCustomer.standOrderText.add(doneText);
          
          // Animate appearance with scale and alpha
          targetCustomer.standOrderText.setAlpha(0);
          targetCustomer.standOrderText.setScale(0.5);
          this.tweens.add({
            targets: targetCustomer.standOrderText,
            alpha: 1,
            scale: 1,
            duration: 400,
            ease: 'Back.out'
          });
        }
        
        targetCustomer.moodIcon.setText('😊');
        this.addCustomerEatingAnimation(targetCustomer);
        
        const successText = this.add.text(
          targetCustomer.x,
          targetCustomer.y - 100,
          `✅ Delivered!\n+100 Points\nTotal: ${this.totalScore}`,
          {
            fontSize: '16px',
            color: '#00FF00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
            align: 'center'
          }
        ).setOrigin(0.5);

        this.tweens.add({
          targets: successText,
          alpha: 0,
          y: targetCustomer.y - 150,
          duration: 2000,
          ease: 'Power2',
          onComplete: () => successText.destroy()
        });
        
        // Phase 2: Return to starting position
        this.time.delayedCall(1000, () => {
          if (!this.deliveryBoySprite) return;
          
          // Change to appropriate texture for return journey
          const isReturningLeft = deliveryBoyStartX < this.deliveryBoySprite.x;
          const returnTexture = isReturningLeft ? 'deliver3' : 'deliver2';
          this.deliveryBoySprite.setTexture(returnTexture);
          
          // Play walking sound with reduced duration
          const walkSound = this.sound.add('person-walk');
          walkSound.play({ volume: 0.5 });
          this.time.delayedCall(1500, () => {
            if (walkSound.isPlaying) {
              walkSound.stop();
            }
          });
          
          this.tweens.add({
            targets: this.deliveryBoySprite,
            x: deliveryBoyStartX,
            y: deliveryBoyStartY,
            duration: deliveryDuration,
            ease: 'Power2',
            onComplete: () => {
              // Back to standing pose
              if (this.deliveryBoySprite) {
                this.deliveryBoySprite.setTexture('deliver1');
              }
              
              // Check if all orders have been cooked AND delivered
              const allOrdersCookedAndDelivered = this.orders.every(o => o.isCompleted && o.isDelivered);
              
              if (allOrdersCookedAndDelivered) {
                this.instructionText.setText('✅ All orders delivered! Calculating results...');
                this.time.delayedCall(1500, () => {
                  this.showResults();
                });
              } else {
                // Continue cooking next order
                this.instructionText.setText('🎯 Click on the next order in the queue (FCFS order)!');
              }
            }
          });
        });
      }
    });
  }

  private addChefCookingAnimation() {
    this.tweens.add({
      targets: this.chefSprite,
      y: this.chefSprite.y - 8,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.addSteamEffect();
  }

  private stopChefCookingAnimation() {
    this.tweens.killTweensOf(this.chefSprite);
    this.chefSprite.y = this.CHEF_HOME_Y;
    
    this.children.list.forEach(child => {
      if (child.name === 'steam') {
        child.destroy();
      }
    });
  }

  private addSteamEffect() {
    for (let i = 0; i < 3; i++) {
      const steam = this.add.circle(
        this.chefSprite.x + Phaser.Math.Between(-20, 20),
        this.chefSprite.y - 30,
        Phaser.Math.Between(8, 15),
        0xFFFFFF,
        0.3
      );
      steam.setName('steam');
      
      this.tweens.add({
        targets: steam,
        y: steam.y - 40,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => steam.destroy()
      });
    }
  }

  private updateProgressBar() {
    const { width } = this.sys.game.canvas;
    const barWidth = 400 * this.currentProgress;
    
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00FF00, 1);
    this.progressBar.fillRoundedRect(width / 2 - 200, 115, barWidth, 20, 10);
  }

  private updateOrderBoardVisuals() {
    this.orderBoardTexts.forEach(container => {
      const orderId = container.getData('orderId');
      const order = this.orders.find(o => o.id === orderId);
      
      if (!order) return;
      
      if (order.isCompleted) {
        // Add checkmark
        const checkmark = this.add.text(container.x + 75, container.y, '✅', {
          fontSize: '16px'
        }).setOrigin(0.5);
        checkmark.setDepth(16);
        
        // Fade and tint green
        this.tweens.add({
          targets: container,
          alpha: 0.7,
          tint: 0x90EE90,
          duration: 500
        });
      } else if (order.isCooking) {
        // Highlight cooking order
        this.tweens.add({
          targets: container,
          tint: 0xFFD700,
          duration: 500
        });
      }
    });
  }

  private startServingPhase() {
    this.gamePhase = 'serving';
    this.phaseText.setText('Phase: Delivery');
    this.instructionText.setText('�️ Click on customers to deliver orders - Follow FCFS order sequence!');
    
    // Delivery boy is already created and visible at the end of first row
    // Just ensure it's visible and in the right position
    if (this.deliveryBoySprite) {
      this.deliveryBoySprite.setTexture('deliver1'); // Ensure standing pose
      this.deliveryBoySprite.setDepth(2);
    }
    
    // Make customers with completed orders clickable
    this.makeCustomersClickableForDelivery();
  }

  private makeCustomersClickableForDelivery() {
    this.customers.forEach((customer) => {
      // Only make clickable if their order is completed but not delivered
      if (customer.order.isCompleted && !customer.order.isDelivered) {
        customer.sprite.setInteractive({ cursor: 'pointer' });
        
        // Add pulsing glow circle
        const glowCircle = this.add.graphics();
        glowCircle.lineStyle(4, 0x00FF00, 1); // Green border for delivery
        glowCircle.fillStyle(0x00FF88, 0.3); // Green fill
        glowCircle.fillCircle(customer.x, customer.y, 65);
        glowCircle.strokeCircle(customer.x, customer.y, 65);
        glowCircle.setDepth(10);
        customer.sprite.setData('deliveryGlowCircle', glowCircle);
        
        // Pulsing animation
        this.tweens.add({
          targets: glowCircle,
          alpha: { from: 0.5, to: 1 },
          scaleX: { from: 1, to: 1.1 },
          scaleY: { from: 1, to: 1.1 },
          x: { from: customer.x, to: customer.x },
          y: { from: customer.y, to: customer.y },
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        
        // Click handler for delivery
        customer.sprite.on('pointerdown', () => {
          this.onCustomerClickForDelivery(customer);
        });
        
        // Hover effects
        customer.sprite.on('pointerover', () => {
          if (!customer.order.isDelivered) {
            customer.sprite.setTint(0x00FF00); // Green highlight
            glowCircle.clear();
            glowCircle.lineStyle(5, 0x00FF00, 1);
            glowCircle.fillStyle(0x00FF00, 0.5);
            glowCircle.fillCircle(customer.x, customer.y, 65);
            glowCircle.strokeCircle(customer.x, customer.y, 65);
          }
        });
        
        customer.sprite.on('pointerout', () => {
          if (!customer.order.isDelivered) {
            customer.sprite.clearTint();
            glowCircle.clear();
            glowCircle.lineStyle(4, 0x00FF00, 1);
            glowCircle.fillStyle(0x00FF88, 0.3);
            glowCircle.fillCircle(customer.x, customer.y, 65);
            glowCircle.strokeCircle(customer.x, customer.y, 65);
          }
        });
      }
    });
  }

  private onCustomerClickForDelivery(customer: Customer) {
    // Check if order already delivered
    if (customer.order.isDelivered) {
      this.showMessage('⚠️ Order already delivered to this customer!', '#FF0000');
      return;
    }
    
    // Check if delivery boy is currently busy
    if (this.deliveryBoySprite && this.tweens.getTweensOf(this.deliveryBoySprite).length > 0) {
      this.showMessage('⚠️ Delivery boy is busy! Wait for current delivery.', '#FF0000');
      return;
    }
    
    // Check FCFS order - must deliver to the first completed order
    const nextOrderToDeliver = this.completedOrders.find(o => !o.isDelivered);
    
    if (!nextOrderToDeliver) {
      this.showMessage('⚠️ No orders to deliver!', '#FF0000');
      return;
    }
    
    // Validate FCFS - check if clicked customer is the correct one
    if (customer.order.id !== nextOrderToDeliver.id) {
      // Wrong customer! Deduct points
      this.wrongAttempts++;
      this.totalScore = Math.max(0, this.totalScore - 10);
      this.updateScoreDisplay();
      
      // Find the correct customer to highlight
      const correctCustomer = this.customers.find(c => c.order.id === nextOrderToDeliver.id);
      
      this.showMessage(`❌ Wrong! Must deliver Order #${nextOrderToDeliver.orderNumber} first (FCFS)! -10 points`, '#FF0000');
      
      // Flash the correct customer
      if (correctCustomer) {
        this.tweens.add({
          targets: correctCustomer.sprite,
          scaleX: 0.28,
          scaleY: 0.28,
          duration: 200,
          yoyo: true,
          repeat: 2,
          ease: 'Power2'
        });
      }
      
      // Shake wrong customer
      this.tweens.add({
        targets: customer.sprite,
        x: customer.x + 5,
        duration: 100,
        yoyo: true,
        repeat: 3,
        ease: 'Power2'
      });
      
      return;
    }
    
    // Correct customer! Remove interactivity and glow
    customer.sprite.removeInteractive();
    customer.sprite.clearTint();
    
    const glowCircle = customer.sprite.getData('deliveryGlowCircle');
    if (glowCircle) {
      this.tweens.killTweensOf(glowCircle);
      this.tweens.add({
        targets: glowCircle,
        alpha: 0,
        duration: 300,
        onComplete: () => glowCircle.destroy()
      });
    }
    
    // Deliver to this customer
    this.deliverToCustomer(customer, customer.order);
  }

  private pickUpNextOrder() {
    const nextOrder = this.completedOrders.find(o => !o.isDelivered);
    
    if (!nextOrder) {
      this.instructionText.setText('All orders delivered! Calculating results...');
      // Hide delivery boy
      if (this.deliveryBoySprite) {
        this.deliveryBoySprite.setVisible(false);
      }
      this.time.delayedCall(2000, () => {
        this.showResults();
      });
      return;
    }

    const dishConfig = this.DISH_CONFIGS[nextOrder.dishType];
    
    // Find target customer
    const targetCustomer = this.customers.find(c => c.order.id === nextOrder.id);
    
    if (!targetCustomer || !this.deliveryBoySprite) return;
    
    this.instructionText.setText(
      `🚴 Delivering Order #${nextOrder.orderNumber}: ${dishConfig.name} to ${nextOrder.customerName}`
    );
    
    // No food sprite during delivery - delivery boy delivers without visible food
    
    // Start delivery animation
    this.deliverToCustomer(targetCustomer, nextOrder);
  }

  private deliverToCustomer(customer: Customer, order: FoodOrder) {
    if (!this.deliveryBoySprite) return;
    
    // Automatically deliver to the correct customer (no clicking needed)
    this.performDelivery(customer, order);
  }

  private showError(customer: Customer) {
    this.totalScore -= 10;
    this.wrongAttempts++;
    this.updateScoreDisplay();
    
    this.cameras.main.shake(300, 0.01);
    
    const errorText = this.add.text(
      customer.x,
      customer.y - 100,
      `❌ WRONG CUSTOMER!\nFollow FCFS order!\n-10 Points`,
      {
        fontSize: '16px',
        color: '#FF0000',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 },
        align: 'center'
      }
    ).setOrigin(0.5);

    customer.moodIcon.setText('');
    
    this.tweens.add({
      targets: customer.sprite,
      x: customer.x + 5,
      duration: 100,
      yoyo: true,
      repeat: 3,
      ease: 'Power2'
    });
    
    this.tweens.add({
      targets: errorText,
      alpha: 0,
      y: customer.y - 150,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        errorText.destroy();
        customer.moodIcon.setText('');
      }
    });

    this.instructionText.setText(`⚠️ Wrong customer! Deliver in FCFS order! (-10 points)`);
  }

  private performDelivery(customer: Customer, order: FoodOrder) {
    if (!this.deliveryBoySprite) return;
    
    const deliveryBoyStartX = this.deliveryBoySprite.x;
    const deliveryBoyStartY = this.deliveryBoySprite.y;
    
    // Determine if customer is to the left or right
    const isCustomerLeft = customer.x < this.deliveryBoySprite.x;
    
    // Phase 1: Move toward customer (use deliver2 for right, deliver3 for left)
    const moveToCustomerTexture = isCustomerLeft ? 'deliver3' : 'deliver2';
    this.deliveryBoySprite.setTexture(moveToCustomerTexture);
    
    const deliveryDuration = 1500;
    const targetX = customer.x - 65;
    const targetY = customer.y - 10;
    
    // Move delivery boy to customer (no food sprite)
    this.tweens.add({
      targets: this.deliveryBoySprite,
      x: targetX,
      y: targetY,
      duration: deliveryDuration,
      ease: 'Power2',
      onComplete: () => {
        // Delivered!
        order.isDelivered = true;
        this.totalScore += 100;
        this.updateScoreDisplay();
        
        // Update order details on stand to show "DONE" status
        if (customer.standOrderText && customer.standSprite) {
            // Clear the old order details
            customer.standOrderText.destroy();
            
            // Create new "DONE" display on stand
            const standX = customer.standSprite.x;
            const standY = customer.standSprite.y;
            
            customer.standOrderText = this.add.container(standX + 5, standY);
            customer.standOrderText.setDepth(2);
            
            // Green checkmark
            const checkmark = this.add.text(0, -8, '✓', {
              fontSize: '15px',
              color: '#00FF00',
              fontStyle: 'bold',
              stroke: '#000000',
              strokeThickness: 2
            }).setOrigin(0.5);
            customer.standOrderText.add(checkmark);
            
            // "DONE" text below checkmark
            const doneText = this.add.text(0, 10, 'DONE', {
              fontSize: '10px',
              color: '#00FF00',
              fontStyle: 'bold',
              stroke: '#000000',
              strokeThickness: 2
            }).setOrigin(0.5);
            customer.standOrderText.add(doneText);
            
            // Animate appearance with scale and alpha
            customer.standOrderText.setAlpha(0);
            customer.standOrderText.setScale(0.5);
            this.tweens.add({
              targets: customer.standOrderText,
              alpha: 1,
              scale: 1,
              duration: 400,
              ease: 'Back.out'
            });
          }
          
          customer.moodIcon.setText('');
          this.addCustomerEatingAnimation(customer);
          
          const successText = this.add.text(
            customer.x,
            customer.y - 100,
            `✅ Delivered!\n+100 Points\nTotal: ${this.totalScore}`,
            {
              fontSize: '16px',
              color: '#00FF00',
              fontStyle: 'bold',
              stroke: '#000000',
              strokeThickness: 3,
              backgroundColor: '#000000',
              padding: { x: 10, y: 5 },
              align: 'center'
            }
          ).setOrigin(0.5);

          this.tweens.add({
            targets: successText,
            alpha: 0,
            y: customer.y - 150,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => successText.destroy()
          });
          
          // Phase 2: Return to starting position at end of first row
          this.time.delayedCall(1000, () => {
            if (!this.deliveryBoySprite) return;
            
            // Change to appropriate texture for return journey
            const isReturningLeft = deliveryBoyStartX < this.deliveryBoySprite.x;
            const returnTexture = isReturningLeft ? 'deliver3' : 'deliver2';
            this.deliveryBoySprite.setTexture(returnTexture);
            
            this.tweens.add({
              targets: this.deliveryBoySprite,
              x: deliveryBoyStartX,
              y: deliveryBoyStartY,
              duration: deliveryDuration,
              ease: 'Power2',
              onComplete: () => {
                // Back to standing pose
                if (this.deliveryBoySprite) {
                  this.deliveryBoySprite.setTexture('deliver1');
                }
                
                const remainingOrders = this.completedOrders.filter(o => !o.isDelivered);
                if (remainingOrders.length > 0) {
                  // Update instruction and show how many orders remaining
                  const deliveredCount = this.completedOrders.filter(o => o.isDelivered).length;
                  this.instructionText.setText(`🖱️ Click next customer to deliver (${deliveredCount}/${this.completedOrders.length} delivered)`);
                } else {
                  this.instructionText.setText('✅ All orders delivered!');
                  this.time.delayedCall(1000, () => {
                    this.showResults();
                  });
                }
              }
            });
          });
      }
    });
  }

  private addCustomerEatingAnimation(customer: Customer) {
    this.tweens.add({
      targets: customer.sprite,
      y: customer.y - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.tweens.add({
      targets: customer.moodIcon,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 600,
      yoyo: true,
      repeat: 2,
      ease: 'Back.out'
    });
  }

  private async showResults() {
    this.gamePhase = 'results';
    this.phaseText.setText('Phase: Results & Analysis');
    
    const { width, height } = this.sys.game.canvas;

    // Dark overlay to hide background completely
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);

    // Results box - made taller to accommodate content
    const boxWidth = 1000;
    const boxHeight = 750;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const box = this.add.graphics();
    box.fillStyle(0x1a1a2e, 0.98);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.lineStyle(4, 0x00FF00, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.setDepth(101);

    // Title
    this.add.text(width / 2, boxY + 35, '📊 FCFS SIMULATION RESULTS', {
      fontSize: '32px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(102);

    // Calculate metrics
    const avgWaitingTime = this.orders.reduce((sum, o) => sum + (o.waitingTime || 0), 0) / this.orders.length;
    const avgTurnaroundTime = this.orders.reduce((sum, o) => sum + (o.turnaroundTime || 0), 0) / this.orders.length;
    const throughput = this.orders.length / (this.currentTime / 1000);

    // Gantt Chart Section
    const ganttY = boxY + 90;
    this.add.text(width / 2, ganttY, '📊 GANTT CHART (Execution Timeline)', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);
    
    this.drawGanttChart(boxX + 50, ganttY + 35, boxWidth - 100);

    // Performance Metrics Section
    const metricsY = ganttY + 140;
    this.add.text(boxX + 50, metricsY, '📈 PERFORMANCE METRICS', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setDepth(102);

    const metricsText = `Average Waiting Time: ${avgWaitingTime.toFixed(2)}s
Average Turnaround Time: ${avgTurnaroundTime.toFixed(2)}s
Throughput: ${throughput.toFixed(2)} processes/second
Total Time: ${(this.currentTime ).toFixed(2)}s
Final Score: ${this.totalScore} points`;

    this.add.text(boxX + 50, metricsY + 35, metricsText, {
      fontSize: '16px',
      color: '#FFFFFF',
      lineSpacing: 8
    }).setDepth(102);

    // Order Details Table
    const detailsY = metricsY + 155;
    this.add.text(boxX + 50, detailsY, '📋 ORDER DETAILS', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setDepth(102);

    // Table header with proper spacing
    const tableHeaderY = detailsY + 35;
    this.add.text(boxX + 50, tableHeaderY, 
      'Order |  Arrival |      Burst |      Start |      Complete |      Wait |       Turnaround', {
      fontSize: '14px',
      color: '#00FFFF',
      fontStyle: 'bold',
      fontFamily: 'monospace'
    }).setDepth(102);

    // Separator line
    this.add.text(boxX + 50, tableHeaderY + 20, 
      '─'.repeat(70), {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'monospace'
    }).setDepth(102);
    
// Table rows with proper spacing and alignment - sorted by order number
const sortedOrders = [...this.orders].sort((a, b) => a.orderNumber - b.orderNumber);
sortedOrders.forEach((order, index) => {
  const rowY = tableHeaderY + 40 + (index * 22);

  // Format values to 3 decimal points if they are numbers
  const orderNumber = order.orderNumber?.toString().padStart(2);
  const arrivalTime = Number(order.arrivalTime).toFixed(3).padStart(7);
  const burstTime = Number(order.burstTime).toFixed(3).padStart(7);
  const startTime = Number(order.startTime || 0).toFixed(3).padStart(7);
  const completionTime = Number(order.completionTime || 0).toFixed(3).padStart(9);
  const waitingTime = Number(order.waitingTime || 0).toFixed(3).padStart(8);
  const turnaroundTime = Number(order.turnaroundTime || 0).toFixed(3).padStart(10);

  const rowText = `  ${orderNumber}   |   ${arrivalTime}   |   ${burstTime}   |   ${startTime}   |   ${completionTime}   |   ${waitingTime}   |   ${turnaroundTime}`;

  this.add.text(boxX + 50, rowY, rowText, {
    fontSize: '13px',
    color: '#FFFFFF',
    fontFamily: 'monospace'
  }).setDepth(102);
});


    // AI Feedback Button (Left side)
    const aiFeedbackButtonWidth = 220;
    const aiFeedbackButtonHeight = 50;
    const aiFeedbackButtonX = boxX + 50;
    const aiFeedbackButtonY = boxY + boxHeight - 70;

    const aiFeedbackButton = this.add.graphics();
    aiFeedbackButton.fillStyle(0x4CAF50, 1);
    aiFeedbackButton.fillRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
    aiFeedbackButton.lineStyle(3, 0x2E7D32, 1);
    aiFeedbackButton.strokeRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
    aiFeedbackButton.setDepth(102);
    aiFeedbackButton.setInteractive(
      new Phaser.Geom.Rectangle(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight),
      Phaser.Geom.Rectangle.Contains
    );
    aiFeedbackButton.setData('isAIButton', true);
    
    // Store button references for later access
    this.registry.set('aiFeedbackButton', aiFeedbackButton);

    const aiFeedbackButtonText = this.add.text(aiFeedbackButtonX + aiFeedbackButtonWidth / 2, aiFeedbackButtonY + 25, '💬 Chat with AI', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    aiFeedbackButtonText.setDepth(103);

    aiFeedbackButton.on('pointerover', () => {
      aiFeedbackButton.clear();
      aiFeedbackButton.fillStyle(0x66BB6A, 1);
      aiFeedbackButton.fillRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
      aiFeedbackButton.lineStyle(3, 0x2E7D32, 1);
      aiFeedbackButton.strokeRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
    });

    aiFeedbackButton.on('pointerout', () => {
      aiFeedbackButton.clear();
      aiFeedbackButton.fillStyle(0x4CAF50, 1);
      aiFeedbackButton.fillRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
      aiFeedbackButton.lineStyle(3, 0x2E7D32, 1);
      aiFeedbackButton.strokeRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
    });

    aiFeedbackButton.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      // Prevent multiple clicks while processing
      if (aiFeedbackButton.getData('isProcessing')) return;
      aiFeedbackButton.setData('isProcessing', true);
      
      // Toggle chatbot open/close - don't disable other buttons
      this.showAIFeedback(boxX, boxY, boxWidth, boxHeight).finally(() => {
        aiFeedbackButton.setData('isProcessing', false);
      });
    });

    // Next Level button (Right side)
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = boxX + boxWidth - buttonWidth - 50;
    const buttonY = boxY + boxHeight - 70;

    const button = this.add.graphics();
    button.fillStyle(0xFFD700, 1);
    button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    button.lineStyle(3, 0xFF8C00, 1);
    button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    button.setDepth(102);
    button.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );
    
    // Store button reference for later access
    this.registry.set('nextLevelButton', button);

    // Submit score to backend
    this.submitScore();

    const buttonText = this.add.text(buttonX + buttonWidth / 2, buttonY + 25, 'Next Level', {
      fontSize: '24px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    buttonText.setDepth(103);
    
    button.on('pointerover', () => {
      button.clear();
      button.fillStyle(0xFFA500, 1);
      button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0xFF8C00, 1);
      button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    });

    button.on('pointerout', () => {
      button.clear();
      button.fillStyle(0xFFD700, 1);
      button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0xFF8C00, 1);
      button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    });

    button.on('pointerdown', () => {
      // Don't restart if chatbot is open
      if (this.isChatbotOpen) return;
      this.scene.restart();
    });
  }

private drawGanttChart(x: number, y: number, width: number) {
  // Calculate maximum time and scale
  const maxTime = Math.max(...this.orders.map(o => o.completionTime || 0));
  const scale = width / maxTime;

  const barHeight = 40;
  const barY = y;

  // 🎨 Draw timeline axis
  const axisY = barY + barHeight + 20;
  const axis = this.add.graphics();
  axis.lineStyle(2, 0xFFFFFF, 0.6);
  axis.lineBetween(x, axisY, x + width, axisY);
  axis.setDepth(102);

  // 🟦 Define colors for bars
  const colors = [0x4CAF50, 0x2196F3, 0xFF9800, 0x9C27B0, 0xE91E63, 0x00BCD4, 0x8BC34A];

  // 🔹 Draw each order as a Gantt bar
  this.orders.forEach((order, index) => {
    const startTime = Number(order.startTime || 0);
    const completionTime = Number(order.completionTime || 0);
    const startX = x + startTime * scale;
    const barWidth = (completionTime - startTime) * scale;

    const color = colors[index % colors.length];

    // Bar with border and shadow
    const bar = this.add.graphics();
    bar.fillStyle(color, 0.85);
    bar.fillRoundedRect(startX, barY, barWidth, barHeight, 8);
    bar.lineStyle(2, 0xffffff, 0.8);
    bar.strokeRoundedRect(startX, barY, barWidth, barHeight, 8);
    bar.setDepth(102);

    // Process label inside bar
    const labelX = startX + barWidth / 2;
    const labelY = barY + barHeight / 2;
    this.add.text(labelX, labelY, `P${order.orderNumber}`, {
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(103);

    // 📍 Start time marker
    this.add.text(startX, axisY + 5, `${startTime.toFixed(0)}`, {
      fontSize: '12px',
      color: '#00FFFF',
      fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setDepth(102);

    // 📍 End time marker (only if last or next doesn’t share same time)
    const isLast = index === this.orders.length - 1;
    const nextOrder = !isLast ? this.orders[index + 1] : null;
    const showEndTime = isLast || (nextOrder && nextOrder.startTime !== order.completionTime);

    if (showEndTime) {
      this.add.text(startX + barWidth, axisY + 5, `${completionTime.toFixed(0)}`, {
        fontSize: '12px',
        color: '#00FFFF',
        fontFamily: 'monospace'
      }).setOrigin(0.5, 0).setDepth(102);
    }
  });

  // 🕒 Add labels for clarity
  this.add.text(x, axisY + 25, 'Time (s)', {
    fontSize: '13px',
    color: '#FFFFFF',
    fontStyle: 'italic'
  }).setDepth(102);
}

  private async showAIFeedback(boxX: number, boxY: number, boxWidth: number, boxHeight: number) {
    console.log('showAIFeedback called, isChatbotOpen:', this.isChatbotOpen);
    
    if (this.isChatbotOpen) {
      // If chatbot is already open, just close it
      this.closeChatbot();
      return;
    }
    
    this.isChatbotOpen = true;
    
    // Don't dim the results screen - keep it visible
    // Just add a slight overlay behind chatbot for emphasis
    
    // Initialize chat with performance summary
    const avgWaitingTime = this.orders.reduce((sum, o) => sum + (o.waitingTime || 0), 0) / this.orders.length;
    const avgTurnaroundTime = this.orders.reduce((sum, o) => sum + (o.turnaroundTime || 0), 0) / this.orders.length;
    const throughput = this.orders.length / (this.currentTime / 1000);
    
    const initialContext = `Player's Performance Summary:
- Total Orders: ${this.orders.length}
- Final Score: ${this.totalScore} points
- Wrong Attempts: ${this.wrongAttempts}
- Average Waiting Time: ${avgWaitingTime.toFixed(2)}s
- Average Turnaround Time: ${avgTurnaroundTime.toFixed(2)}s
- Throughput: ${throughput.toFixed(2)} processes/second

Please provide a brief welcome message and performance overview (2-3 sentences).`;
    
    this.createChatbotUI();
    console.log('Chatbot UI created, container:', this.chatbotContainer);
    
    // Send initial AI greeting
    await this.sendMessageToAI(initialContext, true);
  }

  private createChatbotUI() {
    const { width, height } = this.sys.game.canvas;
    
    // Don't create full-screen overlay - just a subtle backdrop for the chatbot
    // Results screen remains fully visible and interactive
    
    // Chatbot container positioned at right side
    const chatWidth = 500;
    const chatHeight = 680;
    const chatX = width - chatWidth - 10;
    const chatY = (height - chatHeight) / 2; // Vertically centered
    
    this.chatbotContainer = this.add.container(chatX, chatY);
    this.chatbotContainer.setDepth(300);
    this.chatbotContainer.setVisible(true);
    
    // Add an invisible blocking layer to prevent clicks from propagating through
    const blockingLayer = this.add.graphics();
    blockingLayer.fillStyle(0x000000, 0.01); // Nearly transparent
    blockingLayer.fillRect(0, 0, chatWidth, chatHeight);
    blockingLayer.setInteractive(new Phaser.Geom.Rectangle(0, 0, chatWidth, chatHeight), Phaser.Geom.Rectangle.Contains);
    blockingLayer.on('pointerdown', (pointer: any, localX: number, localY: number, event: any) => {
      // Stop event propagation to prevent clicks from reaching game elements below
      event.stopPropagation();
    });
    this.chatbotContainer.add(blockingLayer);
    
    // Chat background with shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.5);
    shadow.fillRoundedRect(5, 5, chatWidth, chatHeight, 15);
    this.chatbotContainer.add(shadow);
    
    const chatBg = this.add.graphics();
    chatBg.fillStyle(0x1a1a2e, 0.98);
    chatBg.fillRoundedRect(0, 0, chatWidth, chatHeight, 15);
    chatBg.lineStyle(3, 0x4CAF50, 1);
    chatBg.strokeRoundedRect(0, 0, chatWidth, chatHeight, 15);
    this.chatbotContainer.add(chatBg);
    
    // Header
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x4CAF50, 1);
    headerBg.fillRoundedRect(0, 0, chatWidth, 60, 15);
    headerBg.fillRect(0, 45, chatWidth, 15); // Square bottom for seamless connection
    headerBg.setData('isHeader', true);
    this.chatbotContainer.add(headerBg);
    
    const headerText = this.add.text(20, 20, '🤖 AI Performance Coach', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });
    headerText.setData('isHeader', true);
    this.chatbotContainer.add(headerText);
    
    // Close button
    const closeBtn = this.add.text(chatWidth - 40, 15, '✕', {
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', (pointer: any, localX: number, localY: number, event: any) => {
      event.stopPropagation();
      this.closeChatbot();
    });
    closeBtn.on('pointerover', () => closeBtn.setColor('#FF5555'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#FFFFFF'));
    closeBtn.setData('isHeader', true);
    this.chatbotContainer.add(closeBtn);
    
    // Messages area
    const messagesAreaHeight = chatHeight - 140;
    this.chatbotContainer.setData('messagesY', 70);
    this.chatbotContainer.setData('messagesHeight', messagesAreaHeight);
    this.chatbotContainer.setData('chatWidth', chatWidth);
    
    // Create interactive area for messages (for scroll detection)
    const messagesArea = this.add.graphics();
    messagesArea.fillStyle(0x000000, 0.01); // Nearly transparent
    messagesArea.fillRect(0, 70, chatWidth, messagesAreaHeight);
    messagesArea.setInteractive(new Phaser.Geom.Rectangle(0, 70, chatWidth, messagesAreaHeight), Phaser.Geom.Rectangle.Contains);
    messagesArea.on('pointerdown', (pointer: any, localX: number, localY: number, event: any) => {
      // Stop event propagation
      event.stopPropagation();
    });
    this.chatbotContainer.add(messagesArea);
    
    // Add scroll listener
    messagesArea.on('wheel', (pointer: any, deltaX: number, deltaY: number, deltaZ: number, event: any) => {
      event.stopPropagation();
      this.handleChatScroll(deltaY);
    });
    
    // Add overlay panels to hide overflow (after messages are rendered)
    // These will be added with high depth to cover anything that overflows
    const topOverlay = this.add.graphics();
    topOverlay.fillStyle(0x1a1a2e, 1);
    topOverlay.fillRect(0, 0, chatWidth, 70);
    topOverlay.setData('isOverlay', true);
    topOverlay.setDepth(310); // Higher than messages
    this.chatbotContainer.add(topOverlay);
    
    const bottomOverlay = this.add.graphics();
    bottomOverlay.fillStyle(0x1a1a2e, 1);
    bottomOverlay.fillRect(0, chatHeight - 70, chatWidth, 70);
    bottomOverlay.setData('isOverlay', true);
    bottomOverlay.setDepth(310); // Higher than messages
    this.chatbotContainer.add(bottomOverlay);
    
    // Re-add header on top
    this.chatbotContainer.bringToTop(headerBg);
    this.chatbotContainer.bringToTop(headerText);
    this.chatbotContainer.bringToTop(closeBtn);
    
    // Input area background
    const inputBg = this.add.graphics();
    inputBg.fillStyle(0x2a2a3e, 1);
    inputBg.fillRoundedRect(0, chatHeight - 70, chatWidth, 70, 0);
    inputBg.lineStyle(2, 0x4CAF50, 0.5);
    inputBg.strokeRoundedRect(10, chatHeight - 60, chatWidth - 20, 50, 10);
    inputBg.setData('isInput', true);
    this.chatbotContainer.add(inputBg);
    
    // User input (will be handled via DOM input - no placeholder text needed)
    this.createDOMInput(chatX + 10, chatY + chatHeight - 60, chatWidth - 100);
    
    // Send button
    const sendBtn = this.add.graphics();
    sendBtn.fillStyle(0x4CAF50, 1);
    sendBtn.fillRoundedRect(chatWidth - 70, chatHeight - 55, 55, 40, 8);
    sendBtn.setData('isInput', true);
    this.chatbotContainer.add(sendBtn);
    
    const sendIcon = this.add.text(chatWidth - 50, chatHeight - 35, '➤', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    sendIcon.setData('isInput', true);
    this.chatbotContainer.add(sendIcon);
    
    sendBtn.setInteractive(
      new Phaser.Geom.Rectangle(chatWidth - 70, chatHeight - 55, 55, 40),
      Phaser.Geom.Rectangle.Contains
    );
    sendBtn.on('pointerdown', (pointer: any, localX: number, localY: number, event: any) => {
      event.stopPropagation();
      this.handleSendMessage();
    });
    sendBtn.on('pointerover', () => {
      sendBtn.clear();
      sendBtn.fillStyle(0x66BB6A, 1);
      sendBtn.fillRoundedRect(chatWidth - 70, chatHeight - 55, 55, 40, 8);
    });
    sendBtn.on('pointerout', () => {
      sendBtn.clear();
      sendBtn.fillStyle(0x4CAF50, 1);
      sendBtn.fillRoundedRect(chatWidth - 70, chatHeight - 55, 55, 40, 8);
    });
    
    // Bring input area and send button above overlays
    this.chatbotContainer.bringToTop(bottomOverlay);
    this.chatbotContainer.bringToTop(inputBg);
    this.chatbotContainer.bringToTop(sendBtn);
    this.chatbotContainer.bringToTop(sendIcon);
    
    // Suggested questions
    const suggestions = ['How can I improve?', 'Explain FCFS', 'What did I do wrong?'];
    this.chatbotContainer.setData('suggestions', suggestions);
  }

  private createDOMInput(x: number, y: number, width: number) {
    // Remove any existing input first
    this.removeDOMInput();
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'chatbot-input';
    input.placeholder = 'Type your question here...';
    input.style.position = 'absolute';
    input.style.left = `${x + 15}px`;
    input.style.top = `${y + 10}px`;
    input.style.width = `${width - 10}px`;
    input.style.height = '35px';
    input.style.backgroundColor = 'rgba(42, 42, 62, 0.9)';
    input.style.border = '2px solid #4CAF50';
    input.style.borderRadius = '8px';
    input.style.outline = 'none';
    input.style.color = '#FFFFFF';
    input.style.fontSize = '15px';
    input.style.fontFamily = 'Arial, sans-serif';
    input.style.padding = '0 12px';
    input.style.zIndex = '1000';
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSendMessage();
      }
    });
    
    try {
      document.body.appendChild(input);
      setTimeout(() => input.focus(), 100);
      console.log('DOM input created and focused');
    } catch (error) {
      console.error('Error creating DOM input:', error);
    }
  }

  private removeDOMInput() {
    const input = document.getElementById('chatbot-input');
    if (input) {
      input.remove();
      console.log('DOM input removed');
    }
    // Also try to remove any stray inputs
    const allInputs = document.querySelectorAll('input[id="chatbot-input"]');
    allInputs.forEach(inp => inp.remove());
  }

  private async handleSendMessage() {
    const input = document.getElementById('chatbot-input') as HTMLInputElement;
    if (!input || !input.value.trim()) return;
    
    const userMessage = input.value.trim();
    input.value = '';
    input.focus();
    
    // Add user message to chat
    this.addMessageToChat('user', userMessage);
    
    // Send to AI
    await this.sendMessageToAI(userMessage, false);
  }

  private addMessageToChat(role: 'user' | 'ai' | null, message: string) {
    if (!this.chatbotContainer) return;
    
    // Only add new message if role and message are provided
    if (role && message) {
      this.chatMessages.push({ role, message });
    }
    
    const chatWidth = this.chatbotContainer.getData('chatWidth');
    const messagesY = this.chatbotContainer.getData('messagesY');
    const messagesHeight = this.chatbotContainer.getData('messagesHeight');
    
    // Clear existing messages display
    const existingMessages = this.chatbotContainer.list.filter((obj: any) => obj.getData && obj.getData('isMessage'));
    existingMessages.forEach((obj: any) => obj.destroy());
    
    // Redraw all messages
    let currentY = messagesY + 10;
    const maxWidth = chatWidth - 60;
    let totalContentHeight = 0;
    
    // Draw all messages
    this.chatMessages.forEach((msg) => {
      const isUser = msg.role === 'user';
      const bubbleColor = isUser ? 0x4CAF50 : 0x2a2a3e;
      const textColor = '#FFFFFF';
      const align = isUser ? 'right' : 'left';
      const xPos = isUser ? chatWidth - 30 : 30;
      
      // Calculate position with scroll offset
      const yPos = currentY - this.chatScrollOffset;
      
      // Create temporary text to calculate height
      const tempText = this.add.text(0, 0, msg.message, {
        fontSize: '13px',
        color: textColor,
        wordWrap: { width: maxWidth - 40 },
        align: align
      });
      const padding = 10;
      const bubbleHeight = tempText.height + padding * 2;
      tempText.destroy();
      
      // Only render if message is COMPLETELY within visible area (strict bounds)
      const messageBottom = yPos + bubbleHeight;
      const visibleTop = messagesY; // Exact top boundary
      const visibleBottom = messagesY + messagesHeight; // Exact bottom boundary
      
      // Message must be completely within bounds to render
      if (yPos >= visibleTop && messageBottom <= visibleBottom) {
        // Create message bubble
        const messageText = this.add.text(xPos, yPos, msg.message, {
          fontSize: '13px',
          color: textColor,
          wordWrap: { width: maxWidth - 40 },
          align: align
        });
        messageText.setOrigin(isUser ? 1 : 0, 0);
        messageText.setData('isMessage', true);
        
        const bubbleWidth = Math.min(messageText.width + padding * 2, maxWidth);
        
        const bubble = this.add.graphics();
        bubble.fillStyle(bubbleColor, 0.9);
        if (isUser) {
          bubble.fillRoundedRect(xPos - bubbleWidth, yPos - padding, bubbleWidth, bubbleHeight, 10);
        } else {
          bubble.fillRoundedRect(xPos - padding, yPos - padding, bubbleWidth, bubbleHeight, 10);
        }
        bubble.setData('isMessage', true);
        
        if (this.chatbotContainer) {
          this.chatbotContainer.add(bubble);
          this.chatbotContainer.add(messageText);
        }
      }
      
      currentY += bubbleHeight + 8;
      totalContentHeight = currentY - messagesY;
    });
    
    // Update max scroll and auto-scroll to bottom for new messages
    this.maxChatScroll = Math.max(0, totalContentHeight - messagesHeight + 20);
    
    // Only auto-scroll if adding a new message (not just redrawing for scroll)
    if (role && message) {
      this.chatScrollOffset = this.maxChatScroll;
    }
    
    // Draw scrollbar if content is scrollable
    const existingScrollbar = this.chatbotContainer.list.filter((obj: any) => obj.getData && obj.getData('isScrollbar'));
    existingScrollbar.forEach((obj: any) => obj.destroy());
    
    if (this.maxChatScroll > 0) {
      const scrollbarWidth = 6;
      const scrollbarX = chatWidth - 15;
      const scrollbarTrackY = messagesY;
      const scrollbarTrackHeight = messagesHeight;
      
      // Draw scrollbar track
      const scrollbarTrack = this.add.graphics();
      scrollbarTrack.fillStyle(0x2a2a3e, 0.3);
      scrollbarTrack.fillRoundedRect(scrollbarX, scrollbarTrackY, scrollbarWidth, scrollbarTrackHeight, 3);
      scrollbarTrack.setData('isScrollbar', true);
      this.chatbotContainer.add(scrollbarTrack);
      
      // Calculate scrollbar thumb size and position
      const contentRatio = messagesHeight / (totalContentHeight + 20);
      const thumbHeight = Math.max(30, scrollbarTrackHeight * contentRatio);
      const scrollRatio = this.chatScrollOffset / this.maxChatScroll;
      const thumbY = scrollbarTrackY + (scrollbarTrackHeight - thumbHeight) * scrollRatio;
      
      // Draw scrollbar thumb
      const scrollbarThumb = this.add.graphics();
      scrollbarThumb.fillStyle(0x4CAF50, 0.6);
      scrollbarThumb.fillRoundedRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight, 3);
      scrollbarThumb.setData('isScrollbar', true);
      this.chatbotContainer.add(scrollbarThumb);
    }
    
    // Ensure overlays are on top to hide any overflow
    if (this.chatbotContainer) {
      const overlays = this.chatbotContainer.list.filter((obj: any) => obj.getData && obj.getData('isOverlay'));
      overlays.forEach((overlay: any) => this.chatbotContainer!.bringToTop(overlay));
      
      // Then bring header, input area, and send button on top of overlays
      const header = this.chatbotContainer.list.filter((obj: any) => obj.getData && obj.getData('isHeader'));
      header.forEach((h: any) => this.chatbotContainer!.bringToTop(h));
      
      const inputElements = this.chatbotContainer.list.filter((obj: any) => obj.getData && obj.getData('isInput'));
      inputElements.forEach((el: any) => this.chatbotContainer!.bringToTop(el));
    }
  }
  
  private handleChatScroll(deltaY: number) {
    const scrollSpeed = 30; // Pixels per scroll tick
    const scrollAmount = deltaY > 0 ? scrollSpeed : -scrollSpeed;
    
    // Update scroll offset with bounds checking
    this.chatScrollOffset = Math.max(0, Math.min(this.maxChatScroll, this.chatScrollOffset + scrollAmount));
    
    // Redraw messages at new scroll position
    this.addMessageToChat(null as any, ''); // Trigger redraw without adding new message
  }

  private async sendMessageToAI(message: string, isInitial: boolean) {
    if (!this.chatbotContainer) return;
    
    // Show typing indicator
    this.addMessageToChat('ai', '💭 Thinking...');
    
    // Prepare context
    const avgWaitingTime = this.orders.reduce((sum, o) => sum + (o.waitingTime || 0), 0) / this.orders.length;
    const avgTurnaroundTime = this.orders.reduce((sum, o) => sum + (o.turnaroundTime || 0), 0) / this.orders.length;
    const throughput = this.orders.length / (this.currentTime / 1000);
    
    const sortedOrders = [...this.orders].sort((a, b) => a.orderNumber - b.orderNumber);
    const gameData = {
      totalOrders: this.orders.length,
      avgWaitingTime,
      avgTurnaroundTime,
      throughput,
      totalTime: this.currentTime / 1000,
      finalScore: this.totalScore,
      wrongAttempts: this.wrongAttempts,
      orders: sortedOrders.map(o => ({
        orderNumber: o.orderNumber,
        arrivalTime: o.arrivalTime,
        burstTime: o.burstTime,
        startTime: o.startTime || 0,
        completionTime: o.completionTime || 0,
        waitingTime: o.waitingTime || 0,
        turnaroundTime: o.turnaroundTime || 0
      })),
      conversationHistory: this.chatMessages.slice(0, -1), // Exclude the "Thinking..." message
      userQuestion: message,
      isInitial
    };
    
    try {
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData)
      });
      
      const result = await response.json();
      
      // Remove typing indicator
      this.chatMessages.pop();
      
      if (result.success && result.data.feedback) {
        this.addMessageToChat('ai', result.data.feedback);
      } else {
        this.addMessageToChat('ai', '❌ Sorry, I had trouble processing that. Can you try again?');
      }
    } catch (error) {
      console.error('Error fetching AI response:', error);
      this.chatMessages.pop();
      this.addMessageToChat('ai', '❌ Network error. Please check your connection and try again.');
    }
  }

  private closeChatbot() {
    if (this.chatbotContainer) {
      this.chatbotContainer.destroy();
      this.chatbotContainer = undefined;
    }
    this.removeDOMInput();
    this.isChatbotOpen = false;
    this.chatMessages = [];
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
    const { width, height } = this.sys.game.canvas;
    
    const message = this.add.text(width / 2, height / 2, text, {
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

  update() {
    if (this.waiterFoodSprite && this.gamePhase === 'serving') {
      this.waiterFoodSprite.x = this.waiterSprite.x + 8;
      this.waiterFoodSprite.y = this.waiterSprite.y - 20;
    }
  }

  private async submitScore() {
    try {
      const timeSpent = Math.floor((Date.now() - this.gameStartTime) / 1000);
      const avgWaitingTime = this.orders.reduce((sum, o) => sum + (o.waitingTime || 0), 0) / this.orders.length;
      const avgTurnaroundTime = this.orders.reduce((sum, o) => sum + (o.turnaroundTime || 0), 0) / this.orders.length;
      const throughput = this.orders.length / (timeSpent || 1);

      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'fcfs-l1',
          moduleId: 'cpu-scheduling',
          levelId: 'l1',
          score: Math.max(0, this.totalScore),
          timeSpent,
          accuracy: this.wrongAttempts === 0 ? 100 : Math.max(0, 100 - (this.wrongAttempts * 10)),
          wrongAttempts: this.wrongAttempts,
          metadata: {
            totalOrders: this.orders.length,
            avgWaitingTime,
            avgTurnaroundTime,
            throughput
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.achievementsUnlocked && result.achievementsUnlocked.length > 0) {
          this.showMessage(
            `🎉 Achievement Unlocked! ${result.achievementsUnlocked.length} new achievement(s)`,
            '#00FF00',
            3000
          );
        }
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }

  private showMessage(text: string, color: string, duration: number = 2000) {
    const { width, height } = this.sys.game.canvas;
    const message = this.add.text(width / 2, height / 2, text, {
      fontSize: '24px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(500);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: message.y - 50,
      duration,
      onComplete: () => message.destroy()
    });
  }

  shutdown() {
    // Clean up DOM input when scene is destroyed
    this.removeDOMInput();
    this.closeChatbot();
  }
}

// Export config
export const FCFSGameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1600,
    height: 1000,
  },
  backgroundColor: '#000000',
  scene: FCFSGame,
};
