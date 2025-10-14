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
  private readonly ORDER_BOARD_X = 300;
  private readonly ORDER_BOARD_Y = 220;
  
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
  private arrivalIntervals: number[] = [0, 2, 4, 6, 8]; // Staggered arrivals
  private arrivalIndex: number = 0;
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
    this.waiterSprite = this.add.sprite(this.WAITER_HOME_X, this.WAITER_HOME_Y, 'waiter');
    this.waiterSprite.setScale(0.22);
    this.waiterSprite.setDepth(-10);
  }

  private createChef() {
    this.chefSprite = this.add.sprite(this.CHEF_HOME_X, this.CHEF_HOME_Y, 'chef-standing');
    this.chefSprite.setScale(0.25);
    this.chefSprite.setDepth(-10);
  }

  private createOrderBoard() {
    this.orderBoard = this.add.image(this.ORDER_BOARD_X, this.ORDER_BOARD_Y, 'order-board-bg');
    this.orderBoard.setScale(1.0);
    this.orderBoard.setAlpha(1);
    this.orderBoard.setDepth(-10);
    
    const shadow = this.add.image(this.ORDER_BOARD_X + 5, this.ORDER_BOARD_Y + 5, 'order-board-bg');
    shadow.setScale(1.0);
    shadow.setAlpha(0.3);
    shadow.setTint(0x000000);
    shadow.setDepth(-10);
    
    const boardTitle = this.add.text(this.ORDER_BOARD_X, this.ORDER_BOARD_Y - 80, '📋 READY QUEUE (FIFO) 📋', {
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
    this.instructionText = this.add.text(width / 2, height - 40, '', {
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

    // Scenario box
    const boxWidth = 700;
    const boxHeight = 460;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const scenarioBox = this.add.graphics();
    scenarioBox.fillStyle(0x1a1a2e, 0.98);
    scenarioBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 25);
    scenarioBox.lineStyle(4, 0xFFD700, 1);
    scenarioBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 25);

    const gradientBox = this.add.graphics();
    gradientBox.fillGradientStyle(0xFFD700, 0xFFA500, 0xFF8C00, 0xFF4500, 0.1);
    gradientBox.fillRoundedRect(boxX + 5, boxY + 5, boxWidth - 10, boxHeight - 10, 20);

    const title = this.add.text(width / 2, boxY + 50, '🎯 FCFS CPU SCHEDULING', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, boxY + 95, 'First Come First Served Algorithm', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'normal'
    }).setOrigin(0.5);

    const scenarioText = `📚 LEARNING OBJECTIVES:
• Understand FCFS scheduling algorithm
• Visualize FIFO queue behavior
• Learn about convoy effect
• Calculate waiting & turnaround times

🎮 GAMEPLAY:
1️⃣ Customers arrive with orders (jobs)
2️⃣ Orders enqueue in FIFO order
3️⃣ Click DISPATCH to send order to chef (CPU)
4️⃣ Chef cooks one order at a time (non-preemptive)
5️⃣ Deliver completed orders to customers

⚠️ FCFS RULES:
• No skipping orders in queue
• First order arrives = First to be served
• Long orders can delay short ones (convoy effect)

🎯 METRICS TO TRACK:
• Waiting Time = Start Time - Arrival Time
• Turnaround Time = Completion Time - Arrival Time
• Average Waiting Time
• Average Turnaround Time`;

    const text = this.add.text(width / 2, boxY + 270, scenarioText, {
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'normal',
      align: 'center',
      lineSpacing: 3
    }).setOrigin(0.5);

    // Start button
    const buttonWidth = 250;
    const buttonHeight = 60;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 70;

    const startButton = this.add.graphics();
    startButton.fillStyle(0xFFD700, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    startButton.lineStyle(3, 0xFF8C00, 1);
    startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);

    const buttonText = this.add.text(width / 2, buttonY + 30, '🚀 START SIMULATION', {
      fontSize: '24px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

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
    this.chefSprite.setDepth(0);
    
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
    this.phaseText.setText('Phase: Customer Arrival');
    this.instructionText.setText('⏳ Customers arriving with orders...');
    
    // Start clock
    this.timeEvent = this.time.addEvent({
      delay: 100,
      callback: this.updateClock,
      callbackScope: this,
      loop: true
    });
    
    // Schedule customer arrivals
    this.scheduleCustomerArrivals();
  }

  private scheduleCustomerArrivals() {
    if (this.arrivalIndex >= this.arrivalIntervals.length) {
      // All customers arrived, wait a bit then move to cooking phase
      this.time.delayedCall(2000, () => {
        this.startCookingPhase();
      });
      return;
    }

    const arrivalDelay = this.arrivalIntervals[this.arrivalIndex] * 1000;
    
    this.time.delayedCall(arrivalDelay, () => {
      this.arriveCustomer(this.arrivalIndex);
      this.arrivalIndex++;
      this.scheduleCustomerArrivals();
    });
  }

  private arriveCustomer(customerIndex: number) {
    const { width, height } = this.sys.game.canvas;
    
    // Position customer
    const numCustomers = 5;
    const customersPerRow = 3;
    const row1Y = height - 190;
    const row2Y = height - 100;
    const rowSpacing = width * 0.18;
    const row1StartX = width * 0.2;
    const row2StartX = width * 0.25;

    const isFirstRow = customerIndex < customersPerRow;
    const posInRow = isFirstRow ? customerIndex : customerIndex - customersPerRow;
    const customerY = isFirstRow ? row1Y : row2Y;
    const startX = isFirstRow ? row1StartX : row2StartX;
    const x = startX + (posInRow * rowSpacing);

    const customerImages = ['customer', 'customer2'];
    const customerImage = customerImages[Math.floor(Math.random() * customerImages.length)];
    const customerSprite = this.add.sprite(x, customerY, customerImage);
    customerSprite.setScale(0.25);
    customerSprite.setDepth(2);

    const name = this.CUSTOMER_NAMES[customerIndex];
    const nameText = this.add.text(x, customerY + 45, name, {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    nameText.setDepth(2);

    const moodIcon = this.add.text(x, customerY - 40, '😊', {
      fontSize: '24px'
    }).setOrigin(0.5);
    moodIcon.setDepth(2);

    // Create order
    const dishTypes: Array<keyof typeof this.DISH_CONFIGS> = ['burger', 'pizza', 'sandwich', 'mushroom', 'chicken'];
    const dishType = dishTypes[customerIndex];
    const dishConfig = this.DISH_CONFIGS[dishType];
    
    const order: FoodOrder = {
      id: `order-${customerIndex + 1}`,
      orderNumber: customerIndex + 1,
      customerName: name,
      arrivalTime: this.currentTime,
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
      moodIcon: moodIcon
    };

    this.customers.push(customer);
    this.orders.push(order);
    this.readyQueue.push(order);

    // Add order to board
    this.addOrderToBoard(order);

    // Show arrival notification
    this.showArrivalNotification(customer, order);
  }

  private showArrivalNotification(customer: Customer, order: FoodOrder) {
    const dishConfig = this.DISH_CONFIGS[order.dishType];
    
    const notification = this.add.text(customer.x, customer.y - 80, 
      `📝 Order Arrived!\n${dishConfig.emoji} ${dishConfig.name}\nBurst: ${order.burstTime}s`, {
      fontSize: '14px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      backgroundColor: '#000000AA',
      padding: { x: 8, y: 4 },
      align: 'center'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: notification,
      alpha: 0,
      y: customer.y - 120,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => notification.destroy()
    });
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
    
    // Make interactive for tooltip
    orderContainer.setInteractive(new Phaser.Geom.Rectangle(-80, -12, 160, 24), Phaser.Geom.Rectangle.Contains);
    orderContainer.on('pointerover', () => {
      this.showOrderTooltip(order, orderContainer);
    });
    orderContainer.on('pointerout', () => {
      this.hideOrderTooltip();
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
    this.instructionText.setText('🎯 Click DISPATCH button to send orders to chef (CPU) - FCFS order enforced!');
    
    // Create dispatch button
    this.createDispatchButton();
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
          this.instructionText.setText('🎯 Click DISPATCH to send next order to chef (FCFS)!');
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
    this.instructionText.setText('🎯 Click WAITER to pick up food, then click CUSTOMER to deliver!');
    
    // Make waiter interactive
    this.waiterSprite.setInteractive({ useHandCursor: true });
    this.waiterSprite.on('pointerdown', () => {
      this.pickUpNextOrder();
    });
  }

  private pickUpNextOrder() {
    const nextOrder = this.completedOrders.find(o => !o.isDelivered);
    
    if (!nextOrder) {
      this.instructionText.setText('All orders delivered! Calculating results...');
      this.time.delayedCall(2000, () => {
        this.showResults();
      });
      return;
    }

    const dishConfig = this.DISH_CONFIGS[nextOrder.dishType];
    
    // Show food sprite
    this.waiterFoodSprite = this.add.sprite(
      this.waiterSprite.x + 8,
      this.waiterSprite.y - 20,
      dishConfig.asset
    );
    this.waiterFoodSprite.setScale(0.15);
    this.waiterFoodSprite.setDepth(3);
    
    // Find target customer
    const targetCustomer = this.customers.find(c => c.order.id === nextOrder.id);
    
    this.instructionText.setText(
      `Waiter holding Order #${nextOrder.orderNumber}: ${dishConfig.name}\n` +
      `Deliver to: ${nextOrder.customerName}`
    );
    
    // Make customers clickable
    this.customers.forEach(customer => {
      customer.sprite.setInteractive({ useHandCursor: true });
      customer.sprite.on('pointerdown', () => {
        this.deliverToCustomer(customer, nextOrder);
      });
    });
  }

  private deliverToCustomer(customer: Customer, order: FoodOrder) {
    if (customer.order.id !== order.id) {
      this.showError(customer);
      return;
    }

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

    customer.moodIcon.setText('😡');
    
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
        customer.moodIcon.setText('😊');
      }
    });

    this.instructionText.setText(`⚠️ Wrong customer! Deliver in FCFS order! (-10 points)`);
  }

  private performDelivery(customer: Customer, order: FoodOrder) {
    this.customers.forEach(c => {
      c.sprite.removeInteractive();
      c.sprite.off('pointerdown');
    });

    const deliveryDuration = 1500;
    
    this.tweens.add({
      targets: [this.waiterSprite, this.waiterFoodSprite],
      x: customer.x,
      y: customer.y - 10,
      duration: deliveryDuration,
      ease: 'Power2',
      onComplete: () => {
        order.isDelivered = true;
        this.totalScore += 100;
        this.updateScoreDisplay();
        
        if (this.waiterFoodSprite) {
          this.waiterFoodSprite.destroy();
          this.waiterFoodSprite = undefined;
        }
        
        customer.moodIcon.setText('😍');
        this.addCustomerEatingAnimation(customer);
        
        const successText = this.add.text(
          customer.x,
          customer.y - 100,
          `✅ Correct!\n+100 Points\nTotal: ${this.totalScore}`,
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
        
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: this.waiterSprite,
            x: this.WAITER_HOME_X,
            y: this.WAITER_HOME_Y,
            duration: deliveryDuration,
            ease: 'Power2',
            onComplete: () => {
              this.waiterSprite.setTexture('waiter');
              
              const remainingOrders = this.completedOrders.filter(o => !o.isDelivered);
              if (remainingOrders.length > 0) {
                this.instructionText.setText('🎯 Click WAITER again to pick up next order!');
              } else {
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

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, width, height);

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

    // Title
    this.add.text(width / 2, boxY + 40, '📊 FCFS SIMULATION RESULTS', {
      fontSize: '36px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

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
    });

    const metricsText = `Average Waiting Time: ${avgWaitingTime.toFixed(2)}s
Average Turnaround Time: ${avgTurnaroundTime.toFixed(2)}s
Throughput: ${throughput.toFixed(2)} processes/second
Total Time: ${(this.currentTime / 1000).toFixed(1)}s`;

    this.add.text(boxX + 50, metricsY + 40, metricsText, {
      fontSize: '16px',
      color: '#FFFFFF',
      lineSpacing: 8
    });

    // Individual Order Details
    const detailsY = boxY + 480;
    this.add.text(boxX + 50, detailsY, '📋 ORDER DETAILS', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    });

    let detailsText = 'Order | Arrival | Burst | Start | Complete | Wait | Turnaround\n';
    detailsText += '─'.repeat(80) + '\n';
    
    this.orders.forEach(order => {
      detailsText += `${order.orderNumber}      ${order.arrivalTime}       ${order.burstTime}       ${order.startTime}        ${order.completionTime}          ${order.waitingTime}      ${order.turnaroundTime}\n`;
    });

    this.add.text(boxX + 50, detailsY + 40, detailsText, {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'monospace'
    });

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
    button.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    const buttonText = this.add.text(width / 2, buttonY + 25, 'Next Level', {
      fontSize: '24px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
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
    }).setOrigin(0.5);

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
      
      // Order number
      const orderText = this.add.text(currentX + barWidth / 2, barY + barHeight / 2, 
        `P${order.orderNumber}`, {
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Time labels
      const startLabel = this.add.text(currentX, barY + barHeight + 5, 
        `${order.startTime}`, {
        fontSize: '11px',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      
      const endLabel = this.add.text(currentX + barWidth, barY + barHeight + 5,
        `${order.completionTime}`, {
        fontSize: '11px',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      
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
