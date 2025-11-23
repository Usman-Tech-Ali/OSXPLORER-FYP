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

export class SJFGame extends Phaser.Scene {
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

  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private currentProgress: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  private readonly RECEPTIONIST_X = 350;
  private readonly RECEPTIONIST_Y = 350;
  private readonly PAINTING_TABLE_X = 850;
  private readonly PAINTING_TABLE_Y = 120;
  private readonly ORDER_BOARD_X = 270;
  private readonly ORDER_BOARD_Y = 200;

  private totalScore: number = 0;
  private wrongAttempts: number = 0;

  private readonly PERSON_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Emma'];
  private readonly FILE_CONFIGS = {
    small: { name: 'Small File', size: '📄', burstTime: 3 },
    medium: { name: 'Medium File', size: '📋', burstTime: 5 },
    large: { name: 'Large File', size: '📁', burstTime: 7 }
  };

  private numPeople: number = 0;
  private timeEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'SJFGame' });
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

    const bgImage = this.add.image(width / 2, height / 2, 'bg-office');
    const scaleX = width / bgImage.width;
    const scaleY = height / bgImage.height;
    const scale = Math.max(scaleX, scaleY);
    bgImage.setScale(scale);
    bgImage.setDepth(-100);

    this.createReceptionist();
    this.createPaintingTable();
    this.createOrderBoard();
    this.createUI(width, height);
    
    this.showIntroScenario(width, height);
  }

  private createReceptionist() {
    this.receptionistSprite = this.add.sprite(this.RECEPTIONIST_X, this.RECEPTIONIST_Y, 'receptionist');
    this.receptionistSprite.setScale(0.15);
    this.receptionistSprite.setDepth(1);
    this.receptionistSprite.setVisible(true);
  }

  private createPaintingTable() {
    this.paintingTable = this.add.image(this.PAINTING_TABLE_X, this.PAINTING_TABLE_Y, 'painting-table');
    this.paintingTable.setScale(0.12);
    this.paintingTable.setDepth(1);
    this.paintingTable.setVisible(true);
  }

  private createOrderBoard() {
    this.orderBoard = this.add.image(this.ORDER_BOARD_X, this.ORDER_BOARD_Y + 80, 'order-board-bg');
    this.orderBoard.setScale(0.5);
    this.orderBoard.setDepth(1);
    this.orderBoard.setVisible(true);

    const boardTitle = this.add.text(this.ORDER_BOARD_X, this.ORDER_BOARD_Y - 30, 'REQUEST QUEUE', {
      fontSize: '18px',
      color: '#FF6B35',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#000000AA',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
    boardTitle.setDepth(11);
  }

  private createUI(width: number, height: number) {
    const titleText = this.add.text(width / 2, 40, '📁 SJF CPU Scheduling Simulator 📁', {
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#00000099',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5);
    titleText.setDepth(12);

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

    this.instructionText = this.add.text(width / 2, height - 20, '', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);

    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0x333333, 0.8);
    this.progressBarBg.fillRoundedRect(width / 2 - 200, 115, 400, 20, 10);
    this.progressBarBg.setVisible(false);

    this.progressBar = this.add.graphics();
    this.progressBar.setVisible(false);
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
    this.gameStartTime = this.time.now;
    this.currentTime = 0;
    
    this.numPeople = Phaser.Math.Between(3, 5);
    
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
    const startX = width - 200;
    const startY = height / 2;
    const spacing = 120;

    const fileSizes: Array<keyof typeof this.FILE_CONFIGS> = ['small', 'medium', 'large'];

    for (let i = 0; i < this.numPeople; i++) {
      const x = startX;
      const y = startY + (i - Math.floor(this.numPeople / 2)) * spacing;

      // Use different person sprites
      const personImage = `person-${(i % 5) + 1}`;
      const personSprite = this.add.sprite(x, y, personImage);
      personSprite.setScale(0.3);
      personSprite.setDepth(2);

      const name = this.PERSON_NAMES[i];
      const nameText = this.add.text(x, y - 60, name, {
        fontSize: '16px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      nameText.setDepth(2);

      const fileSize = fileSizes[Math.floor(Math.random() * fileSizes.length)];
      const fileConfig = this.FILE_CONFIGS[fileSize];
      
      // Use single file image with different scales for different sizes
      const fileSprite = this.add.sprite(x + 40, y - 20, 'file');
      const fileScale = fileSize === 'small' ? 0.15 : fileSize === 'medium' ? 0.2 : 0.25;
      fileSprite.setScale(fileScale);
      fileSprite.setDepth(2);

      const request: FileRequest = {
        id: `request-${i + 1}`,
        requestNumber: 0,
        personName: name,
        arrivalTime: 0,
        burstTime: fileConfig.burstTime,
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
        x: x,
        y: y,
        fileSprite: fileSprite
      };

      this.people.push(person);
      this.requests.push(request);
    }
  }

  private startCollectingRequests() {
    this.phaseText.setText('Phase: Collecting Requests');
    this.instructionText.setText('🖱️ Click on people to collect their file requests!');
    
    this.people.forEach((person) => {
      person.sprite.setInteractive({ cursor: 'pointer' });
      person.sprite.setData('hasRequest', false);
      
      person.sprite.on('pointerdown', () => {
        this.onPersonClick(person);
      });
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
    person.request.arrivalTime = Math.round(this.currentTime);
    
    this.tweens.add({
      targets: [person.sprite, person.nameText, person.fileSprite],
      x: this.RECEPTIONIST_X + 100,
      y: this.RECEPTIONIST_Y,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.addRequestToBoard(person.request);
        this.readyQueue.push(person.request);
        
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
    });
  }

  private addRequestToBoard(request: FileRequest) {
    const startY = this.ORDER_BOARD_Y - 20;
    const lineHeight = 28;
    const requestIndex = this.orderBoardTexts.length;
    
    const fileConfig = this.FILE_CONFIGS[request.fileSize];
    
    const requestContainer = this.add.container(this.ORDER_BOARD_X, startY + (requestIndex * lineHeight));
    requestContainer.setDepth(15);
    requestContainer.setData('requestId', request.id);
    
    const requestBg = this.add.graphics();
    requestBg.fillStyle(0xFFFFFF, 0.95);
    requestBg.fillRoundedRect(-80, -12, 160, 24, 6);
    requestBg.lineStyle(2, 0xFF6B35, 1);
    requestBg.strokeRoundedRect(-80, -12, 160, 24, 6);
    requestContainer.add(requestBg);
    
    const requestNum = this.add.text(-75, 0, `${request.requestNumber}.`, {
      fontSize: '14px',
      color: '#FF6B35',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    requestContainer.add(requestNum);
    
    const fileEmoji = this.add.text(-55, 0, fileConfig.size, {
      fontSize: '16px'
    }).setOrigin(0, 0.5);
    requestContainer.add(fileEmoji);
    
    const fileName = this.add.text(-35, 0, fileConfig.name, {
      fontSize: '12px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    requestContainer.add(fileName);
    
    const burstText = this.add.text(40, 0, `BT:${request.burstTime}s`, {
      fontSize: '10px',
      color: '#666666'
    }).setOrigin(0, 0.5);
    requestContainer.add(burstText);
    
    requestContainer.setInteractive(new Phaser.Geom.Rectangle(-80, -12, 160, 24), Phaser.Geom.Rectangle.Contains);
    
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
    this.instructionText.setText('🎯 Click on the SHORTEST file in the queue!');
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

  private updateProgressBar() {
    const { width } = this.sys.game.canvas;
    const barWidth = 400 * this.currentProgress;
    
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00FF00, 1);
    this.progressBar.fillRoundedRect(width / 2 - 200, 115, barWidth, 20, 10);
  }

  private updateClock() {
    this.currentTime = (this.time.now - this.gameStartTime) / 1000;
    this.timeText.setText(`Time: ${Math.floor(this.currentTime)}s`);
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
}
