import Phaser from 'phaser';

interface FoodOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  orderTime: number;
  prepTime: number;
  dishType: 'burger' | 'pizza' | 'sandwich' | 'mushroom' | 'chicken';
  completionTime?: number;
  isCompleted: boolean;
  isDelivered: boolean;
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
}

export class FCFSGame extends Phaser.Scene {
  // Game State
  private gamePhase: 'intro' | 'waiter-collecting' | 'chef-cooking' | 'user-delivery' | 'complete' = 'intro';
  private customers: Customer[] = [];
  private orders: FoodOrder[] = [];
  private completedOrders: FoodOrder[] = [];
  private currentOrderBeingMade: number = 0;
  
  // Sprites & Objects
  private waiterSprite!: Phaser.GameObjects.Sprite;
  private chefSprite!: Phaser.GameObjects.Sprite;
  private orderBoard!: Phaser.GameObjects.Image;
  private orderBoardTexts: Phaser.GameObjects.Container[] = [];
  private waiterFoodSprite?: Phaser.GameObjects.Sprite;

  // UI Elements
  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private currentProgress: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  
  // Positions - Kitchen at bottom floor parallel to customers
  private readonly CHEF_HOME_X = 150;
  private readonly CHEF_HOME_Y = 450;
  private readonly WAITER_HOME_X = 200;
  private readonly WAITER_HOME_Y = 520;
  private readonly ORDER_BOARD_X = 180;
  private readonly ORDER_BOARD_Y = 120;
  
  // Game scoring
  private totalScore: number = 0;
  private wrongAttempts: number = 0;
  
  // Game Data
  private readonly CUSTOMER_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Emma'];
  private readonly DISH_CONFIGS = {
    burger: { name: 'Burger', emoji: '🍔', prepTime: 4, asset: 'burger' },
    pizza: { name: 'Pizza', emoji: '🍕', prepTime: 6, asset: 'pizza' },
    sandwich: { name: 'Sandwich', emoji: '🥪', prepTime: 3, asset: 'sandwich' },
    mushroom: { name: 'Mushroom Soup', emoji: '🍄', prepTime: 5, asset: 'mashroom' },
    chicken: { name: 'Fried Chicken', emoji: '🍗', prepTime: 5, asset: 'chicken' }
  };

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
    this.load.image('burger', `${assetPath}burger.png`);
    this.load.image('pizza', `${assetPath}pizza.png`);
    this.load.image('sandwich', `${assetPath}sandwich.png`);
    this.load.image('mashroom', `${assetPath}mashroom.png`);
    this.load.image('chicken', `${assetPath}chicken.png`);
  }

  create() {
    const { width, height } = this.sys.game.canvas;
    
    // Full screen background - cover entire screen without black bars
    const bgImage = this.add.image(width / 2, height / 2, 'bg-restaurant');
    const scaleX = width / bgImage.width;
    const scaleY = height / bgImage.height;
    // Use Math.max to ensure no black bars appear
    const scale = Math.max(scaleX, scaleY);
    bgImage.setScale(scale);
    bgImage.setDepth(-100); // Ensure background is behind everything

    // Setup game elements
    this.createKitchenStation(width, height);
    this.createCustomers(width, height);
    this.createWaiter();
    this.createChef();
    this.createOrderBoard();
    this.createUI(width, height);
    
    // Show intro scenario
    this.showIntroScenario(width, height);
  }

  private createKitchenStation(width: number, height: number) {
    // Kitchen equipment moved to bottom-left (in front of chef)
    const equipment = this.add.image(this.CHEF_HOME_X, this.CHEF_HOME_Y, 'station-equipment');
    equipment.setScale(0.35);
    equipment.setAlpha(0.9);
    equipment.setDepth(1); // Kitchen table in front
  }

  private createCustomers(width: number, height: number) {
    // Customers positioned to be parallel with kitchen at bottom
    const numCustomers = 5;
    const startX = width * 0.5;  // Moved further right to be parallel with kitchen
    const endX = width * 0.9;    // Extend to the right edge
    const spacing = (endX - startX) / (numCustomers - 1);
    const customerY = height - 180;

    const dishTypes: Array<keyof typeof this.DISH_CONFIGS> = ['burger', 'pizza', 'sandwich', 'mushroom', 'chicken'];

    for (let i = 0; i < numCustomers; i++) {
      const x = startX + (i * spacing);
      const customerSprite = this.add.sprite(x, customerY, 'customer');
      customerSprite.setScale(0.25);
      customerSprite.setDepth(2); // Customers in front

      const name = this.CUSTOMER_NAMES[i];
      const nameText = this.add.text(x, customerY + 45, name, {
        fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

      const moodIcon = this.add.text(x, customerY - 40, '😊', {
        fontSize: '24px'
    }).setOrigin(0.5);

      // Create order
      const dishType = dishTypes[i];
      const order: FoodOrder = {
        id: `order-${i + 1}`,
        orderNumber: i + 1,
        customerName: name,
        orderTime: i,
        prepTime: this.DISH_CONFIGS[dishType].prepTime,
        dishType: dishType,
        isCompleted: false,
        isDelivered: false
      };

      const customer: Customer = {
        id: `customer-${i + 1}`,
        name: name,
        sprite: customerSprite,
        nameText: nameText,
        order: order,
        x: x,
        y: customerY,
        tableNumber: i + 1,
        moodIcon: moodIcon
      };

      this.customers.push(customer);
      this.orders.push(order);
    }
  }

  private createWaiter() {
    this.waiterSprite = this.add.sprite(this.WAITER_HOME_X, this.WAITER_HOME_Y, 'waiter');
    this.waiterSprite.setScale(0.22);
    this.waiterSprite.setDepth(2); // Waiter in front of everything
  }

  private createChef() {
    this.chefSprite = this.add.sprite(this.CHEF_HOME_X, this.CHEF_HOME_Y, 'chef-standing');
    this.chefSprite.setScale(0.25);
    this.chefSprite.setDepth(0); // Chef behind the kitchen table
  }

  private createOrderBoard() {
    this.orderBoard = this.add.image(this.ORDER_BOARD_X, this.ORDER_BOARD_Y, 'order-board-bg');
    this.orderBoard.setScale(0.8);
    this.orderBoard.setAlpha(0);
    this.orderBoard.setTint(0xFFF8DC);
    this.orderBoard.setDepth(1); // Order board in front
    
    // Add a subtle shadow effect
    const shadow = this.add.image(this.ORDER_BOARD_X + 3, this.ORDER_BOARD_Y + 3, 'order-board-bg');
    shadow.setScale(0.8);
    shadow.setAlpha(0.2);
    shadow.setTint(0x000000);
    shadow.setDepth(0); // Shadow behind the board
  }

  private createUI(width: number, height: number) {
    // Title
    this.add.text(width / 2, 40, '🍽️ Kitchen FCFS - First Come First Served 🍽️', {
      fontSize: '32px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);

    // Phase indicator
    this.phaseText = this.add.text(width / 2, 85, 'Phase: Intro', {
      fontSize: '20px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Score display
    this.scoreText = this.add.text(width - 150, 85, 'Score: 0', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });

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

    // Scenario box - Modern design
    const boxWidth = 750;
    const boxHeight = 480;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    // Create modern card design
    const scenarioBox = this.add.graphics();
    scenarioBox.fillStyle(0x1a1a2e, 0.98);
    scenarioBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 25);
    scenarioBox.lineStyle(4, 0xFFD700, 1);
    scenarioBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 25);

    // Add gradient effect
    const gradientBox = this.add.graphics();
    gradientBox.fillGradientStyle(0xFFD700, 0xFFA500, 0xFF8C00, 0xFF4500, 0.1);
    gradientBox.fillRoundedRect(boxX + 5, boxY + 5, boxWidth - 10, boxHeight - 10, 20);

    // Title - Clean and modern
    const title = this.add.text(width / 2, boxY + 50, '🎯 MISSION BRIEFING', {
      fontSize: '42px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, boxY + 95, 'Welcome to Kitchen Rush!', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'normal'
    }).setOrigin(0.5);

    // Scenario text - Cleaner formatting
    const scenarioText = `You are managing a busy kitchen that follows the 
FCFS (First Come First Served) scheduling algorithm.

📋 YOUR MISSION:
1️⃣ Waiter will collect orders from customers (in order)
2️⃣ Chef will prepare all orders (in FCFS sequence)  
3️⃣ YOU must deliver completed orders to customers
4️⃣ Deliver in FCFS order - earliest customer first!

⚠️ WARNING: Wrong delivery = FAILED ORDER!

Remember: FCFS means the FIRST customer to order 
gets served FIRST, no matter what they ordered!`;

    const text = this.add.text(width / 2, boxY + 250, scenarioText, {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'normal',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);

    // Modern start button
    const buttonWidth = 250;
    const buttonHeight = 60;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 80;

    const startButton = this.add.graphics();
    startButton.fillStyle(0xFFD700, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    startButton.lineStyle(3, 0xFF8C00, 1);
    startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);

    const buttonText = this.add.text(width / 2, buttonY + 30, '🚀 START GAME', {
      fontSize: '24px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Hover effects
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

    // Click to start
    startButton.on('pointerdown', () => {
      overlay.destroy();
      scenarioBox.destroy();
      gradientBox.destroy();
      title.destroy();
      subtitle.destroy();
      text.destroy();
      startButton.destroy();
      buttonText.destroy();
      
      // Start the game
      this.time.delayedCall(2000, () => {
        this.startWaiterCollecting();
      });
      
      this.instructionText.setText('Customers are waiting... Waiter will arrive soon!');
    });
  }

  private startWaiterCollecting() {
    this.gamePhase = 'waiter-collecting';
    this.phaseText.setText('Phase: Taking Orders');
    this.instructionText.setText('Waiter is collecting orders from customers...');
    
    this.collectOrdersSequentially(0);
  }

  private collectOrdersSequentially(customerIndex: number) {
    if (customerIndex >= this.customers.length) {
      // All orders collected, waiter goes to chef
      this.waiterGoesToChef();
      return;
    }

    const customer = this.customers[customerIndex];
    const waiterDelay = 1500;
    
    // Waiter walks to customer
    this.tweens.add({
      targets: this.waiterSprite,
      x: customer.x,
      y: customer.y,
      duration: waiterDelay,
      ease: 'Power2',
      onComplete: () => {
        // Show what customer ordered
        const dishConfig = this.DISH_CONFIGS[customer.order.dishType];
        customer.orderText = this.add.text(
          customer.x,
          customer.y - 60,
          `${dishConfig.emoji} ${dishConfig.name}`,
          {
            fontSize: '14px',
            color: '#FFD700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
          }
        ).setOrigin(0.5);

        // Wait a moment, then move to next customer
        this.time.delayedCall(1000, () => {
          this.collectOrdersSequentially(customerIndex + 1);
        });
      }
    });
  }

  private waiterGoesToChef() {
    this.instructionText.setText('Waiter is delivering orders to the chef...');
    
    // Waiter walks to chef
    this.tweens.add({
      targets: this.waiterSprite,
      x: this.CHEF_HOME_X + 50,
      y: this.CHEF_HOME_Y,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        // Show order board with all orders
        this.showOrderBoard();
        
        // Waiter returns home
        this.tweens.add({
          targets: this.waiterSprite,
          x: this.WAITER_HOME_X,
          y: this.WAITER_HOME_Y,
          duration: 1200,
          ease: 'Power2'
        });
      }
    });
  }

  private showOrderBoard() {
    this.instructionText.setText('Chef received all orders! Starting to cook...');
    
    // Make sure order board is visible and positioned correctly
    this.orderBoard.setAlpha(1);
    this.orderBoard.setVisible(true);
    
    // Fade in order board with animation
    this.tweens.add({
      targets: this.orderBoard,
      alpha: 1,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 800,
      ease: 'Back.out'
    });

    // Display orders on board with modern styling
    const startY = this.ORDER_BOARD_Y - 35;
    const lineHeight = 28;

    this.orders.forEach((order, index) => {
      const dishConfig = this.DISH_CONFIGS[order.dishType];
      
      // Create a container for each order
      const orderContainer = this.add.container(this.ORDER_BOARD_X - 70, startY + (index * lineHeight));
      
      // Background for order
      const orderBg = this.add.graphics();
      orderBg.fillStyle(0xFFFFFF, 0.9);
      orderBg.fillRoundedRect(-90, -12, 180, 24, 12);
      orderBg.lineStyle(2, 0x333333, 0.3);
      orderBg.strokeRoundedRect(-90, -12, 180, 24, 12);
      orderContainer.add(orderBg);
      
      // Order number
      const orderNumber = this.add.text(-75, 0, `${order.orderNumber}.`, {
        fontSize: '14px',
        color: '#FF6B35',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      orderContainer.add(orderNumber);
      
      // Food emoji
      const foodEmoji = this.add.text(-50, 0, dishConfig.emoji, {
        fontSize: '16px'
      }).setOrigin(0, 0.5);
      orderContainer.add(foodEmoji);
      
      // Food name
      const foodName = this.add.text(-25, 0, dishConfig.name, {
        fontSize: '13px',
        color: '#333333',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      orderContainer.add(foodName);
      
      // Prep time
      const prepTime = this.add.text(65, 0, `(${order.prepTime}s)`, {
        fontSize: '12px',
        color: '#666666',
        fontStyle: 'italic'
      }).setOrigin(0, 0.5);
      orderContainer.add(prepTime);
      
      orderContainer.setAlpha(0);
      this.tweens.add({
        targets: orderContainer,
        alpha: 1,
        duration: 400,
        delay: index * 250,
        ease: 'Back.out'
      });
      
      // Store reference for later updates
      this.orderBoardTexts.push(orderContainer);
    });

    // Start cooking after showing all orders
    this.time.delayedCall(2500, () => {
      this.startCooking();
    });
  }

  private startCooking() {
    this.gamePhase = 'chef-cooking';
    this.phaseText.setText('Phase: Cooking Orders');
    this.instructionText.setText(`Chef is cooking Order #${this.currentOrderBeingMade + 1}...`);
    
    // Show progress bar
    this.progressBarBg.setVisible(true);
    this.progressBar.setVisible(true);
    
    // Change chef to cutting animation
    this.chefSprite.setTexture('chef-cutting');
    
    this.cookNextOrder();
  }

  private cookNextOrder() {
    if (this.currentOrderBeingMade >= this.orders.length) {
      // All orders cooked!
      this.startUserDeliveryPhase();
      return;
    }

    const order = this.orders[this.currentOrderBeingMade];
    const cookTime = order.prepTime * 1000; // Convert to milliseconds
    this.currentProgress = 0;

    this.instructionText.setText(
      `Chef is cooking Order #${order.orderNumber}: ${this.DISH_CONFIGS[order.dishType].name}...`
    );

    // Add realistic chef cooking animation
    this.addChefCookingAnimation();

    // Animate progress bar
    const progressTween = this.tweens.add({
      targets: this,
      currentProgress: 1,
      duration: cookTime,
      ease: 'Linear',
      onUpdate: () => {
        this.updateProgressBar();
      },
      onComplete: () => {
        // Stop cooking animation
        this.stopChefCookingAnimation();
        
        // Mark as completed
        order.isCompleted = true;
        this.completedOrders.push(order);
        
        // Update order board with checkmark
        const orderContainer = this.orderBoardTexts[this.currentOrderBeingMade];
        
        // Add checkmark
        const checkmark = this.add.text(
          orderContainer.x + 75,
          orderContainer.y,
          '✅',
          {
            fontSize: '20px'
          }
        ).setOrigin(0.5);
        
        // Fade out the order container and fade in with green tint
    this.tweens.add({
          targets: orderContainer,
          alpha: 0.7,
          tint: 0x90EE90,
          duration: 500
        });

        // Move to next order
        this.currentOrderBeingMade++;
        
        if (this.currentOrderBeingMade < this.orders.length) {
          this.time.delayedCall(800, () => {
            this.cookNextOrder();
          });
        } else {
          // All done cooking
          this.time.delayedCall(1000, () => {
            this.startUserDeliveryPhase();
          });
        }
      }
    });
  }

  private addChefCookingAnimation() {
    // Change chef to cutting sprite
    this.chefSprite.setTexture('chef-cutting');
      
      // Add bobbing animation for active cooking
      this.tweens.add({
      targets: this.chefSprite,
      y: this.chefSprite.y - 8,
      duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    
    // Add steam effect
    this.addSteamEffect();
  }

  private stopChefCookingAnimation() {
    // Stop bobbing animation
    this.tweens.killTweensOf(this.chefSprite);
    
    // Reset chef position and texture
    this.chefSprite.setTexture('chef-standing');
    this.chefSprite.y = this.CHEF_HOME_Y;
    
    // Remove steam effect
    this.children.list.forEach(child => {
      if (child.name === 'steam') {
        child.destroy();
      }
    });
  }

  private addSteamEffect() {
    // Create steam particles
    for (let i = 0; i < 3; i++) {
      const steam = this.add.circle(
        this.chefSprite.x + Phaser.Math.Between(-20, 20),
        this.chefSprite.y - 30,
        Phaser.Math.Between(8, 15),
        0xFFFFFF,
        0.3
      );
      steam.setName('steam');
      
      // Animate steam
      this.tweens.add({
        targets: steam,
        y: steam.y - 40,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => {
          steam.destroy();
        }
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

  private updateScoreDisplay() {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${Math.max(0, this.totalScore)}`);
    }
  }

  private startUserDeliveryPhase() {
    this.gamePhase = 'user-delivery';
    this.phaseText.setText('Phase: YOUR TURN - Deliver Orders!');
    this.chefSprite.setTexture('chef-standing');
    
    // Hide progress bar
    this.progressBarBg.setVisible(false);
    this.progressBar.setVisible(false);
    
    this.instructionText.setText('🎯 Click the WAITER to pick up food, then click CUSTOMER to deliver (FCFS order!)');
    
    // Make waiter interactive (waiter delivers, not chef)
    this.waiterSprite.setInteractive({ useHandCursor: true });
    this.waiterSprite.on('pointerdown', () => {
      this.pickUpNextOrder();
    });
  }

  private pickUpNextOrder() {
    // Find next undelivered order
    const nextOrder = this.completedOrders.find(o => !o.isDelivered);
    
    if (!nextOrder) {
      this.instructionText.setText('All orders delivered! Great job!');
      this.time.delayedCall(2000, () => {
        this.showCompletionScreen();
      });
      return;
    }

    // Waiter picks up food from chef
    this.waiterSprite.setTexture('waiter');
    
    // Show food sprite in waiter's hands (more realistic)
    const dishConfig = this.DISH_CONFIGS[nextOrder.dishType];
    this.waiterFoodSprite = this.add.sprite(
      this.waiterSprite.x + 8,
      this.waiterSprite.y - 20,
      dishConfig.asset
    );
    this.waiterFoodSprite.setScale(0.15);
    this.waiterFoodSprite.setDepth(3); // Food in front of waiter
    
    this.instructionText.setText(
      `Waiter is holding Order #${nextOrder.orderNumber}: ${dishConfig.name}\n` +
      `Deliver to: ${nextOrder.customerName} (Click on customer!)`
    );
    
    // Make customers clickable
    this.customers.forEach(customer => {
      customer.sprite.setInteractive({ useHandCursor: true });
      customer.sprite.on('pointerdown', () => {
        this.deliverToCustomer(customer, nextOrder);
      });
    });
  }

  private deliverToCustomer(customer: Customer, orderBeingDelivered: FoodOrder) {
    // Check if this is the correct customer (FCFS order)
    const correctOrder = this.completedOrders.find(o => !o.isDelivered);
    
    if (orderBeingDelivered.id !== correctOrder?.id || customer.order.id !== orderBeingDelivered.id) {
      // Wrong customer!
      this.showError(customer);
      return;
    }

    // Correct delivery!
    this.performDelivery(customer, orderBeingDelivered);
  }

  private showError(customer: Customer) {
    // Deduct points for wrong attempt
    this.totalScore -= 10;
    this.wrongAttempts++;
    this.updateScoreDisplay();
    
    // Shake camera
    this.cameras.main.shake(300, 0.01);
    
    // Show error message with point deduction
    const errorText = this.add.text(
      customer.x,
      customer.y - 100,
      `❌ WRONG ORDER!\nFollow FCFS!\n-10 Points`,
      {
        fontSize: '18px',
        color: '#FF0000',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 },
        align: 'center'
      }
    ).setOrigin(0.5);

    // Update customer mood to angry
    customer.moodIcon.setText('😡');
    
    // Add angry customer animation
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

    this.instructionText.setText(`⚠️ Wrong customer! Deliver to the FIRST customer who ordered! (-10 points)`);
  }

  private performDelivery(customer: Customer, order: FoodOrder) {
    // Remove customer interactivity
    this.customers.forEach(c => {
      c.sprite.removeInteractive();
      c.sprite.off('pointerdown');
    });

    // Walk to customer
    const deliveryDuration = 1500;
    
    this.tweens.add({
      targets: [this.waiterSprite, this.waiterFoodSprite],
      x: customer.x,
      y: customer.y - 10,
      duration: deliveryDuration,
      ease: 'Power2',
      onComplete: () => {
        // Delivery complete!
        order.isDelivered = true;
        this.totalScore += 100; // Award points for correct delivery
        this.updateScoreDisplay();
        
        // Remove food sprite
        if (this.waiterFoodSprite) {
          this.waiterFoodSprite.destroy();
          this.waiterFoodSprite = undefined;
        }
        
        // Customer is happy and starts eating animation
        customer.moodIcon.setText('😍');
        this.addCustomerEatingAnimation(customer);
        
        // Show success message
        const successText = this.add.text(
          customer.x,
          customer.y - 100,
          `✅ Correct!\n+100 Points\nTotal: ${this.totalScore}`,
          {
            fontSize: '18px',
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
        
        // Return waiter to kitchen
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: this.waiterSprite,
            x: this.WAITER_HOME_X,
            y: this.WAITER_HOME_Y,
            duration: deliveryDuration,
            ease: 'Power2',
            onComplete: () => {
              this.waiterSprite.setTexture('waiter');
              
              // Check if more orders to deliver
              const remainingOrders = this.completedOrders.filter(o => !o.isDelivered);
              if (remainingOrders.length > 0) {
                this.instructionText.setText('🎯 Click WAITER again to pick up the next order!');
              } else {
                this.time.delayedCall(1000, () => {
                  this.showCompletionScreen();
                });
              }
            }
          });
        });
      }
    });
  }

  private addCustomerEatingAnimation(customer: Customer) {
    // Happy eating animation - bobbing up and down
    this.tweens.add({
      targets: customer.sprite,
      y: customer.y - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Also animate the mood icon
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

  private showCompletionScreen() {
    this.gamePhase = 'complete';
    this.phaseText.setText('Phase: COMPLETE!');
    
    const { width, height } = this.sys.game.canvas;

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);

    // Results box
    const boxWidth = 600;
    const boxHeight = 400;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const box = this.add.graphics();
    box.fillStyle(0x1a1a2e, 0.95);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.lineStyle(4, 0x00FF00, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);

    // Title
    this.add.text(width / 2, boxY + 50, '🎉 LEVEL COMPLETE! 🎉', {
      fontSize: '40px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Calculate final score and rating
    const perfectScore = this.orders.length * 100;
    const finalScore = Math.max(0, this.totalScore);
    const scorePercentage = Math.round((finalScore / perfectScore) * 100);
    
    let stars = '';
    let rating = '';
    
    if (scorePercentage >= 90) {
      stars = '⭐⭐⭐';
      rating = 'Perfect!';
    } else if (scorePercentage >= 70) {
      stars = '⭐⭐';
      rating = 'Good!';
    } else if (scorePercentage >= 50) {
      stars = '⭐';
      rating = 'Okay!';
    } else {
      stars = '';
      rating = 'Try Again!';
    }

    // Success message with actual scoring
    const successMsg = `Congratulations!

You successfully delivered all orders following
the FCFS (First Come First Served) algorithm!

✅ Orders delivered: ${this.orders.length}
❌ Wrong attempts: ${this.wrongAttempts}
💰 Points earned: ${finalScore} / ${perfectScore}

Score: ${scorePercentage}%
${stars} ${rating}`;

    this.add.text(width / 2, boxY + 200, successMsg, {
      fontSize: '18px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5);

    // Next level button
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
      // Restart or go to next level
      this.scene.restart();
    });
  }

  update() {
    // Update food sprite position to follow waiter if it exists
    if (this.waiterFoodSprite && this.gamePhase === 'user-delivery') {
      this.waiterFoodSprite.x = this.waiterSprite.x + 8;
      this.waiterFoodSprite.y = this.waiterSprite.y - 20;
    }
  }
}

// Export config for easy importing
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
