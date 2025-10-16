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
  
  // Game Data
  private readonly CUSTOMER_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Emma'];
  private readonly DISH_CONFIGS = {
    burger: { name: 'Burger', emoji: '🍔', burstTime: 4, asset: 'burger' },
    pizza: { name: 'Pizza', emoji: '🍕', burstTime: 6, asset: 'pizza' },
    sandwich: { name: 'Sandwich', emoji: '🥪', burstTime: 3, asset: 'sandwich' },
    mushroom: { name: 'Mushroom Soup', emoji: '🍄', burstTime: 5, asset: 'mashroom' },
    chicken: { name: 'Fried Chicken', emoji: '🍗', burstTime: 5, asset: 'chicken' }
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
  }

  create() {
    const { width, height } = this.sys.game.canvas;
    
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
    // Dark overlay to hide background completely
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);

    // Compact scenario box
    const boxWidth = 850;
    const boxHeight = 550;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

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

    const title = this.add.text(width / 2, boxY + 40, '🎯 FCFS CPU SCHEDULING', {
      fontSize: '38px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    title.setDepth(102);

    const subtitle = this.add.text(width / 2, boxY + 90, 'First Come First Served Algorithm - Restaurant Simulation', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'normal'
    }).setOrigin(0.5);
    subtitle.setDepth(102);

    const scenarioText = `📚 LEARNING OBJECTIVES:
• Understand FCFS (First Come First Served) scheduling
• Visualize FIFO queue behavior & convoy effect

🎮 HOW TO PLAY:

1️⃣ ARRIVAL: Waiter collects orders from customers
2️⃣ COOKING: Click orders in Ready Queue
   ⚠️ Must select FIRST order only! (FCFS Rule)
3️⃣ DELIVERY: Delivery boy delivers completed orders

📋 RULES:
• Click the FIRST order in queue to cook
• No skipping orders (FCFS principle)
• Chef cooks one order at a time

🎯 SCORING:
✅ Correct order: +20 points
❌ Wrong order: -10 points
🚚 Delivery: +100 points`;

    const text = this.add.text(width / 2, boxY + 310, scenarioText, {
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
    const buttonX = width / 2 - buttonWidth / 2 + 240;
    const buttonY = boxY + boxHeight - 80;

    const startButton = this.add.graphics();
    startButton.fillStyle(0xFFD700, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    startButton.lineStyle(3, 0xFF8C00, 1);
    startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    startButton.setDepth(102);

    const buttonText = this.add.text(width / 2 + 240, buttonY + 28, '🚀 START', {
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
    this.instructionText.setText('👨‍🍳 Waiter is collecting orders from customers...');
    
    // Create randomized visit order (shuffle customer indices)
    this.waiterVisitOrder = [];
    for (let i = 0; i < this.customers.length; i++) {
      this.waiterVisitOrder.push(i);
    }
    // Shuffle the array using Fisher-Yates algorithm
    for (let i = this.waiterVisitOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.waiterVisitOrder[i], this.waiterVisitOrder[j]] = [this.waiterVisitOrder[j], this.waiterVisitOrder[i]];
    }
    
    this.currentWaiterCustomerIndex = 0;
    this.collectOrderFromCustomer();
  }

  private collectOrderFromCustomer() {
    if (this.currentWaiterCustomerIndex >= this.waiterVisitOrder.length) {
      // All orders collected, waiter returns and cooking phase starts
      this.waiterReturnsHome();
      return;
    }

    // Get customer using randomized visit order
    const customerIndex = this.waiterVisitOrder[this.currentWaiterCustomerIndex];
    const customer = this.customers[customerIndex];
    
    // Calculate realistic movement duration based on distance
    const distance = Phaser.Math.Distance.Between(
      this.waiterSprite.x,
      this.waiterSprite.y,
      customer.x - 100,
      customer.y
    );
    const moveDuration = Math.max(500, Math.min(1500, distance * 0.8)); // Scale duration by distance
    
    // Waiter walks to customer with smooth animation
    this.tweens.add({
      targets: this.waiterSprite,
      x: customer.x - 100, // Stand beside the customer
      y: customer.y,
      duration: moveDuration,
      ease: 'Sine.inOut', // More natural movement
      onComplete: () => {
        // Assign order number based on visit sequence (1st visit = order #1, 2nd visit = order #2, etc.)
        customer.order.orderNumber = this.currentWaiterCustomerIndex + 1;
        
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
        
        // Wait then move to next customer
        this.time.delayedCall(1500, () => {
          this.currentWaiterCustomerIndex++;
          this.collectOrderFromCustomer();
        });
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
    const orderNumber = this.add.text(-70, 0, `${order.orderNumber}.`, {
      fontSize: '14px',
      color: '#FF6B35',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0, 0.5);
    orderContainer.add(orderNumber);
    
    // Food emoji
    const foodEmoji = this.add.text(-50, 0, dishConfig.emoji, {
      fontSize: '16px'
    }).setOrigin(0, 0.5);
    orderContainer.add(foodEmoji);
    
    // Food name
    const foodName = this.add.text(-25, 0, dishConfig.name, {
      fontSize: '12px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    orderContainer.add(foodName);
    
    // Arrival time
    const arrivalTime = this.add.text(60, 0, `AT:${order.arrivalTime}s`, {
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
    
    const text2 = this.add.text(0, -2, order.isCooking ? '⚡ Cooking...' : '⏳ Waiting in queue', {
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
        
        // Check if all orders done
        if (this.completedOrders.length === this.orders.length) {
          this.time.delayedCall(1500, () => {
            this.startServingPhase();
          });
        } else {
          this.instructionText.setText('🎯 Click on the next order in the queue (FCFS order)!');
        }
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
    this.instructionText.setText('🚴 Delivery boy is preparing to deliver orders!');
    
    // Delivery boy is already created and visible at the end of first row
    // Just ensure it's visible and in the right position
    if (this.deliveryBoySprite) {
      this.deliveryBoySprite.setTexture('deliver1'); // Ensure standing pose
      this.deliveryBoySprite.setDepth(2);
    }
    
    // Start delivering orders automatically
    this.time.delayedCall(1000, () => {
      this.pickUpNextOrder();
    });
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
                  this.instructionText.setText('🚴 Preparing next delivery...');
                  this.time.delayedCall(500, () => {
                    this.pickUpNextOrder();
                  });
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

  private showResults() {
    this.gamePhase = 'results';
    this.phaseText.setText('Phase: Results & Analysis');
    
    const { width, height } = this.sys.game.canvas;

    // Dark overlay to hide background completely
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);

    // Results box
    const boxWidth = 900;
    const boxHeight = 700;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const box = this.add.graphics();
    box.fillStyle(0x1a1a2e, 0.98);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.lineStyle(4, 0x00FF00, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.setDepth(101);

    // Title
    this.add.text(width / 2, boxY + 40, '📊 FCFS SIMULATION RESULTS', {
      fontSize: '36px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(102);

    // Calculate metrics
    const avgWaitingTime = this.orders.reduce((sum, o) => sum + (o.waitingTime || 0), 0) / this.orders.length;
    const avgTurnaroundTime = this.orders.reduce((sum, o) => sum + (o.turnaroundTime || 0), 0) / this.orders.length;
    const throughput = this.orders.length / (this.currentTime / 1000);

    // Gantt Chart
    this.drawGanttChart(boxX + 50, boxY + 120, boxWidth - 100);

    // Metrics Table
    const metricsY = boxY + 380;
    this.add.text(boxX + 50, metricsY, '📈 PERFORMANCE METRICS', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setDepth(102);

    const metricsText = `Average Waiting Time: ${avgWaitingTime.toFixed(2)}s
Average Turnaround Time: ${avgTurnaroundTime.toFixed(2)}s
Throughput: ${throughput.toFixed(2)} processes/second
Total Time: ${(this.currentTime / 1000).toFixed(1)}s
Final Score: ${this.totalScore} points`;

    this.add.text(boxX + 50, metricsY + 40, metricsText, {
      fontSize: '16px',
      color: '#FFFFFF',
      lineSpacing: 8
    }).setDepth(102);

    // Individual Order Details
    const detailsY = boxY + 495;
    this.add.text(boxX + 50, detailsY, '📋 ORDER DETAILS', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setDepth(102);

    let detailsText = 'Order | Arrival | Burst | Start | Complete | Wait | Turnaround\n';
    detailsText += '─'.repeat(80) + '\n';
    
    this.orders.forEach(order => {
      detailsText += `${order.orderNumber}      ${order.arrivalTime}       ${order.burstTime}       ${order.startTime}        ${order.completionTime}          ${order.waitingTime}      ${order.turnaroundTime}\n`;
    });

    this.add.text(boxX + 50, detailsY + 40, detailsText, {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'monospace'
    }).setDepth(102);

    // Next Level button
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 80;

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

    const buttonText = this.add.text(width / 2, buttonY + 25, 'Next Level', {
      fontSize: '24px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    buttonText.setDepth(102);
    
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
      this.scene.restart();
    });
  }

  private drawGanttChart(x: number, y: number, width: number) {
    // Title
    this.add.text(x + width / 2, y, '📊 GANTT CHART (Execution Timeline)', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);

    // Calculate positions
    const maxTime = Math.max(...this.orders.map(o => o.completionTime || 0));
    const scale = (width - 100) / maxTime;
    
    let currentX = x + 50;
    const barHeight = 30;
    const barY = y + 40;
    const spacing = 10;

    this.orders.forEach((order, index) => {
      const barWidth = (order.completionTime! - order.startTime!) * scale;
      
      // Bar background
      const bar = this.add.graphics();
      bar.fillStyle(0x4CAF50, 1);
      bar.fillRect(currentX, barY, barWidth, barHeight);
      bar.lineStyle(2, 0x000000, 1);
      bar.strokeRect(currentX, barY, barWidth, barHeight);
      bar.setDepth(102);
      
      // Order number
      const orderText = this.add.text(currentX + barWidth / 2, barY + barHeight / 2, 
        `P${order.orderNumber}`, {
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(102);
      
      // Time labels
      const startLabel = this.add.text(currentX, barY + barHeight + 5, 
        `${order.startTime}`, {
        fontSize: '11px',
        color: '#FFFFFF'
      }).setOrigin(0.5).setDepth(102);
      
      const endLabel = this.add.text(currentX + barWidth, barY + barHeight + 5,
        `${order.completionTime}`, {
        fontSize: '11px',
        color: '#FFFFFF'
      }).setOrigin(0.5).setDepth(102);
      
      currentX += barWidth + spacing;
    });
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
