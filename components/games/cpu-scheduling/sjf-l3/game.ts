import Phaser from 'phaser';

interface FileRequest {
  id: string;
  requestNumber: number;
  personName: string;
  arrivalTime: number;
  burstTime: number; // File size / processing time
  startTime?: number;
  completionTime?: number;
  waitingTime?: number;
  turnaroundTime?: number;
  fileSize: 'small' | 'medium' | 'large';
  isCompleted: boolean;
  isProcessing: boolean;
  requestContainer?: Phaser.GameObjects.Container;
}

interface Person {
  id: string;
  name: string;
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  request: FileRequest;
  x: number;
  y: number;
  fileSprite?: Phaser.GameObjects.Sprite;
}

export class SJFGameL3 extends Phaser.Scene {
  private gamePhase: 'intro' | 'arrival' | 'processing' | 'results' = 'intro';
  private people: Person[] = [];
  private requests: FileRequest[] = [];
  private readyQueue: FileRequest[] = [];
  private completedRequests: FileRequest[] = [];
  private currentProcessingRequest?: FileRequest;
  private gameStartTime: number = 0;
  private currentTime: number = 0;

  private receptionistSprite!: Phaser.GameObjects.Sprite;
  private paintingTable!: Phaser.GameObjects.Image;
  private orderBoard!: Phaser.GameObjects.Image;
  private orderBoardTexts: Phaser.GameObjects.Container[] = [];
  private deliveryPersonSprite?: Phaser.GameObjects.Sprite;  // Person who collects and delivers files

  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private currentProgress: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  // Moved to bottom for cleaner UI
  private readonly RECEPTIONIST_X = 300;
  private readonly RECEPTIONIST_Y = 600;  // Moved up for better visibility
  private readonly PAINTING_TABLE_X = 900;  // Moved more to center-left
  private readonly PAINTING_TABLE_Y = 500;   // Bottom area
  private readonly ORDER_BOARD_X = 300;  // Moved more to the left
  private readonly ORDER_BOARD_Y = 250;  // Moved up for better visibility

  private totalScore: number = 0;
  private wrongAttempts: number = 0;

  // Extended names for Hard difficulty
  private readonly PERSON_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Emma', 'Frank', 'Grace', 'Henry'];
  private readonly FILE_CONFIGS = {
    small: { name: 'Small File', size: '📄', burstTime: 3 },
    medium: { name: 'Medium File', size: '📋', burstTime: 5 },
    large: { name: 'Large File', size: '📁', burstTime: 7 }
  };

  private numPeople: number = 0; // Will be randomly set (5-8) for Hard difficulty
  private timeEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'SJFGameL3' });
  }

  preload() {
    const assetPath = '/games/cpu-scheduling/assets/sjf/';
    
    this.load.image('bg-office', `${assetPath}background.png`);
    this.load.image('order-board-bg', `${assetPath}order_board.png`);
    this.load.image('painting-table', `${assetPath}printing table.png`);
    this.load.image('receptionist', `${assetPath}reception.png`);
    this.load.image('person-1', `${assetPath}person-1.png`);
    this.load.image('person-2', `${assetPath}person-2.png`);
    this.load.image('person-3', `${assetPath}person-3.png`);
    this.load.image('person-4', `${assetPath}person-4.png`);
    this.load.image('person-5', `${assetPath}person-5.png`);
    this.load.image('file', `${assetPath}file.png`);
  }

  create() {
    const { width, height } = this.sys.game.canvas;

    // Clear previous game data
    this.cleanupPreviousGame();

    const bgImage = this.add.image(width / 2, height / 2, 'bg-office');
    const scaleX = width / bgImage.width;
    const scaleY = height / bgImage.height;
    const scale = Math.max(scaleX, scaleY);
    bgImage.setScale(scale);
    bgImage.setDepth(-100);

    this.createReceptionist();
    this.createPaintingTable();
    this.createDeliveryPerson();
    this.createOrderBoard();
    this.createUI(width, height);
    
    this.showIntroScenario(width, height);
  }

  private cleanupPreviousGame() {
    // Clear all arrays
    this.people = [];
    this.requests = [];
    this.readyQueue = [];
    this.completedRequests = [];
    this.orderBoardTexts = [];
    
    // Reset game state
    this.currentProcessingRequest = undefined;
    this.gameStartTime = 0;
    this.currentTime = 0;
    this.totalScore = 0;
    this.wrongAttempts = 0;
    this.currentProgress = 0;
    this.numPeople = 0;
  }

  private createReceptionist() {
    this.receptionistSprite = this.add.sprite(this.RECEPTIONIST_X, this.RECEPTIONIST_Y, 'receptionist');
    this.receptionistSprite.setScale(0.25);  // Increased size for better visibility
    this.receptionistSprite.setDepth(10);  // Higher depth to be on top
    this.receptionistSprite.setVisible(true);
  }

  private createPaintingTable() {
    this.paintingTable = this.add.image(this.PAINTING_TABLE_X, this.PAINTING_TABLE_Y, 'painting-table');
    this.paintingTable.setScale(0.12);  // Reduced size as requested
    this.paintingTable.setDepth(10);  // Higher depth to be on top
    this.paintingTable.setVisible(true);
  }

  private createDeliveryPerson() {
    // Position delivery person at painting table
    this.deliveryPersonSprite = this.add.sprite(this.PAINTING_TABLE_X - 80, this.PAINTING_TABLE_Y + 50, 'person-1');
    this.deliveryPersonSprite.setScale(0.5);
    this.deliveryPersonSprite.setDepth(2);
    this.deliveryPersonSprite.setVisible(true);
  }

  private createOrderBoard() {
    this.orderBoard = this.add.image(this.ORDER_BOARD_X, this.ORDER_BOARD_Y + 100, 'order-board-bg');
    this.orderBoard.setScale(0.5);  // Slightly larger for better visibility
    this.orderBoard.setDepth(5);
    this.orderBoard.setVisible(true);

    const boardTitle = this.add.text(this.ORDER_BOARD_X, this.ORDER_BOARD_Y - 20, 'REQUEST QUEUE', {
      fontSize: '18px',  // Larger font
      color: '#FF6B35',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000CC',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);
    boardTitle.setDepth(15);
  }

  private createUI(width: number, height: number) {
    // Title - cleaner and more prominent
    const titleText = this.add.text(width / 2, 35, '🖨️ SJF CPU Scheduling Simulator', {
      fontSize: '32px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
      backgroundColor: '#000000DD',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    titleText.setDepth(20);

    // Shop name subtitle
    const shopName = this.add.text(width / 2, 75, 'FAST PRINT SHOP', {
      fontSize: '24px',
      color: '#2196F3',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000AA',
      padding: { x: 15, y: 6 }
    }).setOrigin(0.5);
    shopName.setDepth(20);

    // Phase indicator - cleaner positioning
    this.phaseText = this.add.text(width / 2, 110, 'Phase: Intro', {
      fontSize: '18px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#000000CC',
      padding: { x: 12, y: 5 }
    }).setOrigin(0.5);
    this.phaseText.setDepth(20);

    // Score - top right, cleaner
    this.scoreText = this.add.text(width - 180, 50, 'Score: 0', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000DD',
      padding: { x: 12, y: 6 }
    });
    this.scoreText.setDepth(20);

    // Time - top left, cleaner
    this.timeText = this.add.text(180, 50, 'Time: 0s', {
      fontSize: '18px',
      color: '#00FFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000DD',
      padding: { x: 12, y: 6 }
    });
    this.timeText.setDepth(20);

    // Instruction text - bottom center, above printer area
    this.instructionText = this.add.text(width / 2, height - 100, '', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000DD',
      padding: { x: 15, y: 8 },
      align: 'center'
    }).setOrigin(0.5);
    this.instructionText.setDepth(20);

    // Progress bar - below phase text
    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0x333333, 0.9);
    this.progressBarBg.fillRoundedRect(width / 2 - 250, 140, 500, 25, 12);
    this.progressBarBg.setVisible(false);
    this.progressBarBg.setDepth(19);

    this.progressBar = this.add.graphics();
    this.progressBar.setVisible(false);
    this.progressBar.setDepth(19);
  }

  private showIntroScenario(width: number, height: number) {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

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

    const title = this.add.text(width / 2, boxY + 50, '🎯 SJF SCHEDULING', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(width / 2, boxY + 95, 'Shortest Job First - Office Game', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: '600'
    }).setOrigin(0.5).setDepth(302);

    const contentY = boxY + 145;

    const howToPlayTitle = this.add.text(boxX + 50, contentY, '🎮 How to Play', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setDepth(302);

    const howToPlay = `   1. People arrive with files of different sizes
   2. Click on people to collect their requests
   3. Requests appear in the queue
   4. Click the SHORTEST file to process first`;

    const howToPlayText = this.add.text(boxX + 50, contentY + 35, howToPlay, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6
    }).setDepth(302);

    const rulesTitle = this.add.text(boxX + 50, contentY + 145, '⚠️ SJF Rules', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setDepth(302);

    const rules = `   • Always select the SHORTEST file in queue
   • Minimize average waiting time
   • Process one file at a time
   • Correct selection: +20 pts | Wrong: -10 pts`;

    const rulesText = this.add.text(boxX + 50, contentY + 180, rules, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6
    }).setDepth(302);

    const goalTitle = this.add.text(boxX + 50, contentY + 280, '🎯 Goal', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setDepth(302);

    const goal = `   Process all files using SJF (Shortest Job First)!`;

    const goalText = this.add.text(boxX + 50, contentY + 315, goal, {
      fontSize: '16px',
      color: '#00ff88',
      fontStyle: '600'
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
      
      this.startArrivalPhase();
    });
  }

  private startArrivalPhase() {
    this.gamePhase = 'arrival';
    this.gameStartTime = Date.now(); // Track game start time
    this.gameStartTime = this.time.now;
    this.currentTime = 0;
    
    // Hard difficulty: 5-8 people
    this.numPeople = Phaser.Math.Between(5, 8);
    
    this.phaseText.setText('Phase: People Arriving');
    this.instructionText.setText(`🎲 ${this.numPeople} people have arrived with files!`);
    
    this.timeEvent = this.time.addEvent({
      delay: 100,
      callback: this.updateClock,
      callbackScope: this,
      loop: true
    });
    
    this.createAllPeople();
    
    this.time.delayedCall(2000, () => {
      this.startCollectingRequests();
    });
  }

  private createAllPeople() {
    const { width, height } = this.sys.game.canvas;
    const startX = width + 100; // Start off-screen right
    const startY = height - 150;
    const spacing = 140;

    const fileSizes: Array<keyof typeof this.FILE_CONFIGS> = ['small', 'medium', 'large'];

    for (let i = 0; i < this.numPeople; i++) {
      const y = startY + (i - Math.floor(this.numPeople / 2)) * spacing;

      const personImage = `person-${(i % 5) + 1}`;
      const personSprite = this.add.sprite(startX, y, personImage);
      personSprite.setScale(1.2); // Increased from 0.8
      personSprite.setDepth(8);
      personSprite.setAlpha(0);

      const name = this.PERSON_NAMES[i];
      const nameText = this.add.text(startX, y - 120, name, {
        fontSize: '24px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        backgroundColor: '#000000AA',
        padding: { x: 10, y: 5 }
      }).setOrigin(0.5);
      nameText.setDepth(9);
      nameText.setAlpha(0);

      // High randomness in file selection for Hard difficulty
      const fileSize = fileSizes[Phaser.Math.Between(0, fileSizes.length - 1)];
      const fileConfig = this.FILE_CONFIGS[fileSize];
      
      // Significant variation to burst time (±2 seconds) for Hard difficulty
      const burstTimeVariation = Phaser.Math.Between(-2, 2);
      const adjustedBurstTime = Math.max(2, Math.min(10, fileConfig.burstTime + burstTimeVariation));
      
      // Highly varied arrival times (0-6 seconds) for Hard difficulty
      const arrivalTime = Phaser.Math.Between(0, 6);
      
      const fileSprite = this.add.sprite(startX + 40, y - 30, 'file');
      const fileScale = fileSize === 'small' ? 0.10 : fileSize === 'medium' ? 0.14 : 0.18; // Increased
      fileSprite.setScale(fileScale);
      fileSprite.setDepth(9);
      fileSprite.setAlpha(0);

      const request: FileRequest = {
        id: `request-${i + 1}`,
        requestNumber: i + 1,
        personName: name,
        arrivalTime: arrivalTime, // Highly varied arrival times
        burstTime: adjustedBurstTime, // Highly varied burst times
        fileSize: fileSize,
        isCompleted: false,
        isProcessing: false
      };

      const person: Person = {
        id: `person-${i + 1}`,
        name: name,
        sprite: personSprite,
        nameText: nameText,
        request: request,
        x: startX,
        y: y,
        fileSprite: fileSprite
      };

      this.people.push(person);
      this.requests.push(request);
    }
  }

  private startCollectingRequests() {
    this.phaseText.setText('Phase: People Arriving');
    this.instructionText.setText('⏳ Watch people arrive with their files...');
    
    // Animate people arriving one by one
    this.people.forEach((person, index) => {
      this.time.delayedCall(index * 2000, () => {
        this.animatePersonArrival(person);
      });
    });
  }

  private animatePersonArrival(person: Person) {
    // Fade in and walk directly to receptionist (no pause)
    person.sprite.setAlpha(1);
    person.nameText.setAlpha(1);
    if (person.fileSprite) person.fileSprite.setAlpha(1);
    
    // Walk directly to reception
    this.walkToReceptionAndSubmit(person);
  }



  private walkToReceptionAndSubmit(person: Person) {
    const receptionX = this.RECEPTIONIST_X + 100;
    const receptionY = this.RECEPTIONIST_Y;
    
    // Walk to reception
    this.tweens.add({
      targets: [person.sprite, person.nameText, person.fileSprite],
      x: receptionX,
      y: receptionY,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        // Drop file on reception desk
        this.dropFileOnDesk(person);
        
        // Person walks away
        this.time.delayedCall(500, () => {
          this.tweens.add({
            targets: [person.sprite, person.nameText],
            x: -100,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
              person.sprite.setAlpha(0);
              person.nameText.setAlpha(0);
            }
          });
        });
      }
    });
  }

  private dropFileOnDesk(person: Person) {
    if (!person.fileSprite) return;
    
    // File stays on desk
    const deskX = this.RECEPTIONIST_X + 50;
    const deskY = this.RECEPTIONIST_Y - 20;
    
    this.tweens.add({
      targets: person.fileSprite,
      x: deskX,
      y: deskY,
      duration: 300,
      ease: 'Bounce.out',
      onComplete: () => {
        // Add to board and show file size highlight
        this.addRequestToBoard(person.request);
        this.readyQueue.push(person.request);
        
        // Highlight file size
        this.showFileSizeHighlight(person.fileSprite!, person.request);
        
        // Check if all files submitted
        const allSubmitted = this.people.every(p => this.readyQueue.includes(p.request));
        if (allSubmitted) {
          this.time.delayedCall(1000, () => {
            this.startProcessingPhase();
          });
        }
      }
    });
  }

  private showFileSizeHighlight(fileSprite: Phaser.GameObjects.Sprite, request: FileRequest) {
    const fileConfig = this.FILE_CONFIGS[request.fileSize];
    
    // Show burst time above file
    const sizeText = this.add.text(fileSprite.x, fileSprite.y - 30, `${fileConfig.burstTime}s`, {
      fontSize: '16px',
      color: request.fileSize === 'small' ? '#00FF00' : request.fileSize === 'medium' ? '#FFFF00' : '#FF6B35',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#000000AA',
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5);
    sizeText.setDepth(10);
    
    // Pulse animation
    this.tweens.add({
      targets: sizeText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        sizeText.destroy();
      }
    });
  }

  private onPersonClick(person: Person) {
    if (person.sprite.getData('hasRequest')) {
      return;
    }
    
    person.sprite.setData('hasRequest', true);
    person.sprite.removeInteractive();
    
    const requestNumber = this.people.filter(p => p.sprite.getData('hasRequest')).length;
    person.request.requestNumber = requestNumber;
    // For L3, preserve pre-set varied arrival time (already set during creation)
    // The varied arrival times (0-6 seconds) represent when they actually arrive
    // Only set to current time if arrival time wasn't properly initialized
    if (person.request.arrivalTime === undefined) {
      person.request.arrivalTime = Math.round(this.currentTime);
    }
    
    // Delivery person goes to customer to collect file
    if (this.deliveryPersonSprite && person.fileSprite) {
      // Move delivery person to customer
      this.tweens.add({
        targets: this.deliveryPersonSprite,
        x: person.x - 50,
        y: person.y,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          // Hide customer's file (delivery person takes it)
          if (person.fileSprite) {
            person.fileSprite.setAlpha(0);
          }
          
          // Move delivery person back to table with file
          this.tweens.add({
            targets: this.deliveryPersonSprite,
            x: this.PAINTING_TABLE_X - 50,
            y: this.PAINTING_TABLE_Y - 30,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
              // File is now on table, add to queue
              this.readyQueue.push(person.request);
              // Sort queue by SJF (shortest burst time first)
              this.sortQueueBySJF();
              // Rebuild board to show sorted order
              this.rebuildQueueBoard();
              
              // Return delivery person to starting position
              this.tweens.add({
                targets: this.deliveryPersonSprite,
                x: this.RECEPTIONIST_X + 100,
                y: this.RECEPTIONIST_Y,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                  // Keep customers visible (they'll receive printed files later)
                  // Just mark that their file has been collected
                  const collected = this.people.filter(p => p.sprite.getData('hasRequest')).length;
                  if (collected >= this.people.length) {
                    this.time.delayedCall(500, () => {
                      this.startProcessingPhase();
                    });
                  }
                }
              });
            }
          });
        }
      });
    } else {
      // Fallback if delivery person not available
      this.readyQueue.push(person.request);
      this.sortQueueBySJF();
      this.rebuildQueueBoard();
      
      person.sprite.setAlpha(0);
      person.nameText.setAlpha(0);
      if (person.fileSprite) person.fileSprite.setAlpha(0);
      
      const collected = this.people.filter(p => p.sprite.getData('hasRequest')).length;
      if (collected >= this.people.length) {
        this.time.delayedCall(500, () => {
          this.startProcessingPhase();
        });
      }
    }
  }

  private addRequestToBoard(request: FileRequest) {
    const startY = this.ORDER_BOARD_Y + 20;
    const lineHeight = 28;  // Slightly less spacing for smaller text
    const requestIndex = this.orderBoardTexts.length;
    
    const fileConfig = this.FILE_CONFIGS[request.fileSize];
    
    const requestContainer = this.add.container(this.ORDER_BOARD_X, startY + (requestIndex * lineHeight));
    requestContainer.setDepth(15);
    requestContainer.setData('requestId', request.id);
    
    // Smaller background for smaller text
    const requestBg = this.add.graphics();
    requestBg.fillStyle(0xFFFFFF, 0.98);
    requestBg.fillRoundedRect(-80, -12, 160, 24, 6);
    requestBg.lineStyle(2, 0xFF6B35, 1);
    requestBg.strokeRoundedRect(-80, -12, 160, 24, 6);
    requestContainer.add(requestBg);
    
    // Request number - smaller
    const requestNum = this.add.text(-75, 0, `${request.requestNumber}.`, {
      fontSize: '12px',  // Decreased size
      color: '#FF6B35',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0, 0.5);
    requestContainer.add(requestNum);
    
    // File emoji - smaller
    const fileEmoji = this.add.text(-55, 0, fileConfig.size, {
      fontSize: '14px'  // Decreased size
    }).setOrigin(0, 0.5);
    requestContainer.add(fileEmoji);
    
    // File name - smaller
    const fileName = this.add.text(-35, 0, fileConfig.name, {
      fontSize: '11px',  // Decreased size
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    requestContainer.add(fileName);
    
    // Burst time - smaller but still visible
    const burstText = this.add.text(40, 0, `BT:${request.burstTime}s`, {
      fontSize: '11px',  // Decreased size
      color: '#2196F3',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0, 0.5);
    requestContainer.add(burstText);
    
    // Updated interactive area to match new smaller size
    requestContainer.setInteractive(new Phaser.Geom.Rectangle(-80, -12, 160, 24), Phaser.Geom.Rectangle.Contains);
    
    // Hover effects for better UX
    requestContainer.on('pointerover', () => {
      if (this.gamePhase === 'processing' && !request.isCompleted && !request.isProcessing) {
        requestBg.clear();
        requestBg.fillStyle(0xE3F2FD, 0.98);
        requestBg.fillRoundedRect(-80, -12, 160, 24, 6);
        requestBg.lineStyle(2, 0x2196F3, 1);
        requestBg.strokeRoundedRect(-80, -12, 160, 24, 6);
      }
    });
    
    requestContainer.on('pointerout', () => {
      if (!request.isCompleted && !request.isProcessing) {
        requestBg.clear();
        requestBg.fillStyle(0xFFFFFF, 0.98);
        requestBg.fillRoundedRect(-80, -12, 160, 24, 6);
        requestBg.lineStyle(2, 0xFF6B35, 1);
        requestBg.strokeRoundedRect(-80, -12, 160, 24, 6);
      }
    });
    
    requestContainer.on('pointerdown', () => {
      if (this.gamePhase === 'processing') {
        this.tryProcessRequest(request);
      }
    });
    
    this.orderBoardTexts.push(requestContainer);
    request.requestContainer = requestContainer;
  }

  private startProcessingPhase() {
    this.gamePhase = 'processing';
    this.phaseText.setText('Phase: Processing (SJF)');
    this.instructionText.setText('🎯 Click on the SHORTEST file for delivery boy to process!');
    
    // Make board items clickable
    this.orderBoardTexts.forEach(container => {
      const requestId = container.getData('requestId');
      const request = this.requests.find(r => r.id === requestId);
      
      if (request && !request.isCompleted && !request.isProcessing) {
        container.setInteractive();
        container.on('pointerdown', () => {
          this.onBoardFileClick(request);
        });
      }
    });
  }

  private onBoardFileClick(clickedRequest: FileRequest) {
    if (clickedRequest.isCompleted || clickedRequest.isProcessing) {
      return;
    }

    if (this.currentProcessingRequest) {
      this.showMessage('⚠️ Delivery boy is busy processing!', '#FF0000');
      return;
    }

    if (this.readyQueue.length === 0) {
      return;
    }

    // Check if this is the shortest file
    const shortestRequest = this.readyQueue.reduce((prev, curr) => 
      curr.burstTime < prev.burstTime ? curr : prev
    );
    
    if (clickedRequest.id !== shortestRequest.id) {
      // Wrong selection - penalty!
      this.wrongAttempts++;
      this.totalScore = Math.max(0, this.totalScore - 10);
      this.scoreText.setText(`Score: ${this.totalScore}`);
      this.showMessage(`❌ Wrong! Select the SHORTEST file (${shortestRequest.burstTime}s)!`, '#FF0000');
      
      // Flash correct file
      if (shortestRequest.requestContainer) {
        this.tweens.add({
          targets: shortestRequest.requestContainer,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200,
          yoyo: true,
          repeat: 2
        });
      }
      return;
    }

    // Correct! Animate delivery boy
    this.animateDeliveryBoyPickup(clickedRequest);
  }

  private animateDeliveryBoyPickup(request: FileRequest) {
    this.instructionText.setText(`🚶 Delivery boy picking up ${request.personName}'s file...`);
    
    // Process the file
    this.time.delayedCall(1000, () => {
      this.processRequest(request);
    });
  }

  private showMessage(text: string, color: string) {
    const { width, height } = this.sys.game.canvas;
    const message = this.add.text(width / 2, height / 2, text, {
      fontSize: '24px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000DD',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    message.setDepth(100);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: height / 2 - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => message.destroy()
    });
  }

  private tryProcessRequest(clickedRequest: FileRequest) {
    if (clickedRequest.isCompleted || clickedRequest.isProcessing) {
      return;
    }

    if (this.currentProcessingRequest) {
      return;
    }

    if (this.readyQueue.length === 0) {
      return;
    }

    const shortestRequest = this.readyQueue.reduce((prev, curr) => 
      curr.burstTime < prev.burstTime ? curr : prev
    );
    
    if (clickedRequest.id !== shortestRequest.id) {
      this.wrongAttempts++;
      this.totalScore = Math.max(0, this.totalScore - 10);
      this.scoreText.setText(`Score: ${this.totalScore}`);
      
      // Better error message
      const fileConfig = this.FILE_CONFIGS[shortestRequest.fileSize];
      this.showMessage(
        `❌ Wrong! SJF = Shortest Job First!\n` +
        `Select Request #${shortestRequest.requestNumber} (${shortestRequest.burstTime}s) first!\n` +
        `You selected Request #${clickedRequest.requestNumber} (${clickedRequest.burstTime}s)`,
        '#FF0000'
      );
      
      // Flash the correct request
      if (shortestRequest.requestContainer) {
        this.flashCorrectRequest(shortestRequest.requestContainer);
      }
      return;
    }

    this.processRequest(clickedRequest);
  }

  private processRequest(request: FileRequest) {
    const index = this.readyQueue.indexOf(request);
    if (index > -1) {
      this.readyQueue.splice(index, 1);
    }

    this.currentProcessingRequest = request;
    request.isProcessing = true;
    request.startTime = this.currentTime;
    
    this.totalScore += 20;
    this.scoreText.setText(`Score: ${this.totalScore}`);
    
    const fileConfig = this.FILE_CONFIGS[request.fileSize];
    this.instructionText.setText(`📁 Processing ${fileConfig.name} (${request.burstTime}s)`);
    
    this.progressBarBg.setVisible(true);
    this.progressBar.setVisible(true);
    
    // Add printer animation (movement) when printing
    this.startPrinterAnimation();
    
    const processTime = request.burstTime * 1000;
    this.currentProgress = 0;
    
    this.tweens.add({
      targets: this,
      currentProgress: 1,
      duration: processTime,
      ease: 'Linear',
      onUpdate: () => {
        this.updateProgressBar();
      },
      onComplete: () => {
        // Stop printer animation
        this.stopPrinterAnimation();
        request.isCompleted = true;
        request.completionTime = this.currentTime;
        request.turnaroundTime = request.completionTime - request.arrivalTime;
        request.waitingTime = request.turnaroundTime - request.burstTime;
        
        this.completedRequests.push(request);
        this.currentProcessingRequest = undefined;
        
        this.progressBarBg.setVisible(false);
        this.progressBar.setVisible(false);
        
        this.totalScore += 100;
        this.scoreText.setText(`Score: ${this.totalScore}`);
        
        if (request.requestContainer) {
          request.requestContainer.setAlpha(0.3);
        }
        
        // Check if all done
        if (this.completedRequests.length >= this.requests.length) {
          this.time.delayedCall(1000, () => {
            this.showResults();
          });
        } else {
          this.instructionText.setText('🎯 Click on the SHORTEST file for delivery boy to process!');
        }
      }
    });
  }

  private updateProgressBar() {
    const { width } = this.sys.game.canvas;
    const barWidth = 500 * this.currentProgress;
    
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00FF00, 1);
    this.progressBar.fillRoundedRect(width / 2 - 250, 140, barWidth, 25, 12);
  }

  private updateClock() {
    this.currentTime = (this.time.now - this.gameStartTime) / 1000;
    this.timeText.setText(`Time: ${Math.floor(this.currentTime)}s`);
  }

  private flashCorrectRequest(container: Phaser.GameObjects.Container) {
    // Flash animation to highlight the correct request
    this.tweens.add({
      targets: container,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Power2'
    });
  }

  private sortQueueBySJF() {
    // Sort by burst time (shortest first), then by arrival time if equal
    this.readyQueue.sort((a, b) => {
      if (a.burstTime !== b.burstTime) {
        return a.burstTime - b.burstTime;  // Shortest first
      }
      return a.arrivalTime - b.arrivalTime;  // If same burst time, earlier arrival first
    });
  }

  private rebuildQueueBoard() {
    // Clear existing board items
    this.orderBoardTexts.forEach(container => container.destroy());
    this.orderBoardTexts = [];
    
    // Rebuild board with sorted queue
    this.readyQueue.forEach(request => {
      this.addRequestToBoard(request);
    });
  }

  private startPrinterAnimation() {
    // Add subtle movement to printer when printing
    this.tweens.add({
      targets: this.paintingTable,
      y: this.paintingTable.y - 3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private stopPrinterAnimation() {
    // Stop printer animation and reset position
    this.tweens.killTweensOf(this.paintingTable);
    this.paintingTable.y = this.PAINTING_TABLE_Y;
  }

  private deliverFileToCustomer(request: FileRequest) {
    // Find the customer who owns this request
    const customer = this.people.find(p => p.request.id === request.id);
    
    if (!customer || !this.deliveryPersonSprite) {
      // If customer not found or delivery person not available, continue normally
      if (this.completedRequests.length >= this.requests.length) {
        this.time.delayedCall(1000, () => {
          this.showResults();
        });
      } else {
        this.instructionText.setText('🎯 Click on the SHORTEST file in the queue!');
      }
      return;
    }

    // Ensure customer is visible (they should already be visible)
    customer.sprite.setAlpha(1);
    customer.nameText.setAlpha(1);
    
    // Move delivery person to printer to pick up printed file
    this.tweens.add({
      targets: this.deliveryPersonSprite,
      x: this.PAINTING_TABLE_X - 50,
      y: this.PAINTING_TABLE_Y - 30,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        // Delivery person picks up file (visual: show file sprite following delivery person)
        const printedFile = this.add.sprite(
          this.deliveryPersonSprite!.x,
          this.deliveryPersonSprite!.y - 20,
          'file'
        );
        // Scale based on original file size
        const fileConfig = this.FILE_CONFIGS[request.fileSize];
        const fileScale = request.fileSize === 'small' ? 0.08 : request.fileSize === 'medium' ? 0.12 : 0.16;
        printedFile.setScale(fileScale);
        printedFile.setDepth(12);
        
        // Move delivery person to customer with file
        this.tweens.add({
          targets: [this.deliveryPersonSprite, printedFile],
          x: customer.x - 50,
          y: customer.y,
          duration: 1000,
          ease: 'Power2',
          onComplete: () => {
            // File delivered! Replace customer's file with printed version
            printedFile.destroy();
            
            // Show customer with delivered printed file (small file in hand)
            if (customer.fileSprite) {
              customer.fileSprite.setAlpha(1);
              // Keep the file size small (printed version)
              const deliveredFileScale = request.fileSize === 'small' ? 0.08 : request.fileSize === 'medium' ? 0.12 : 0.16;
              customer.fileSprite.setScale(deliveredFileScale);
            }
            
            // Customer happy animation
            this.tweens.add({
              targets: customer.sprite,
              scaleX: customer.sprite.scaleX * 1.1,
              scaleY: customer.sprite.scaleY * 1.1,
              duration: 300,
              yoyo: true,
              ease: 'Power2'
            });
            
            // Show success message
            this.showMessage(`✅ File delivered to ${customer.name}!`, '#00FF00');
            
            // Return delivery person to starting position
            this.tweens.add({
              targets: this.deliveryPersonSprite,
              x: this.RECEPTIONIST_X + 100,
              y: this.RECEPTIONIST_Y,
              duration: 800,
              ease: 'Power2',
              onComplete: () => {
                // Check if all requests completed
                if (this.completedRequests.length >= this.requests.length) {
                  this.time.delayedCall(1000, () => {
                    this.showResults();
                  });
                } else {
                  this.instructionText.setText('🎯 Click on the SHORTEST file in the queue!');
                }
              }
            });
          }
        });
      }
    });
  }


  private showResults() {
    this.gamePhase = 'results';
    this.phaseText.setText('Phase: Results');
    
    const { width, height } = this.sys.game.canvas;
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    const boxWidth = 600;
    const boxHeight = 400;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const resultsBox = this.add.graphics();
    resultsBox.fillStyle(0x0a0e27, 0.98);
    resultsBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    resultsBox.lineStyle(4, 0xFFD700, 1);
    resultsBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    resultsBox.setDepth(301);

    const title = this.add.text(width / 2, boxY + 60, '🎉 GAME COMPLETE!', {
      fontSize: '32px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);

    // Submit score to backend
    this.submitScore();

    const scoreText = this.add.text(width / 2, boxY + 120, `Final Score: ${this.totalScore}`, {
      fontSize: '28px',
      color: '#00FF00',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);

    const wrongText = this.add.text(width / 2, boxY + 170, `Wrong Attempts: ${this.wrongAttempts}`, {
      fontSize: '20px',
      color: '#FF6B35'
    }).setOrigin(0.5).setDepth(302);

    const avgWaiting = this.completedRequests.reduce((sum, r) => sum + (r.waitingTime || 0), 0) / this.completedRequests.length;
    const avgTurnaround = this.completedRequests.reduce((sum, r) => sum + (r.turnaroundTime || 0), 0) / this.completedRequests.length;

    const statsText = this.add.text(width / 2, boxY + 220, 
      `Avg Waiting Time: ${avgWaiting.toFixed(2)}s\nAvg Turnaround Time: ${avgTurnaround.toFixed(2)}s`, {
      fontSize: '18px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5).setDepth(302);

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

    restartButton.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  private async submitScore() {
    try {
      const timeSpent = Math.floor((Date.now() - this.gameStartTime) / 1000);
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'sjf-l3',
          moduleId: 'cpu-scheduling',
          levelId: 'l1',
          score: Math.max(0, this.totalScore),
          timeSpent,
          accuracy: this.wrongAttempts === 0 ? 100 : Math.max(0, 100 - (this.wrongAttempts * 10)),
          wrongAttempts: this.wrongAttempts,
          metadata: {
            totalRequests: this.completedRequests.length,
            avgWaitingTime: this.completedRequests.reduce((sum, r) => sum + (r.waitingTime || 0), 0) / this.completedRequests.length || 0
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
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(500);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: message.y - 50,
      duration,
      onComplete: () => message.destroy()
    });
  }
}
