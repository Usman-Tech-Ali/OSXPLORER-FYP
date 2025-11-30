import Phaser from 'phaser';

interface Box {
  id: string;
  boxNumber: number;
  capacity: number; // Total capacity
  remainingSpace: number; // Available space
  x: number;
  y: number;
  sprite?: Phaser.GameObjects.Sprite;
  capacityText?: Phaser.GameObjects.Text;
  items: Tool[];
}

interface Tool {
  id: string;
  size: number;
  type: string;
  sprite?: Phaser.GameObjects.Sprite;
  sizeText?: Phaser.GameObjects.Text;
  isPlaced: boolean;
  assignedBox?: Box;
}

export class WorstFitGame extends Phaser.Scene {
  private gamePhase: 'intro' | 'playing' | 'results' = 'intro';
  private boxes: Box[] = [];
  private tools: Tool[] = [];
  private activeBoxes: Box[] = []; // Boxes currently on conveyor
  private activeTools: Tool[] = []; // Tools currently visible
  private score: number = 0;
  private wrongAttempts: number = 0;
  private missedBoxes: number = 0;
  private boxesProcessed: number = 0;
  private totalBoxes: number = 12; // Total boxes to spawn
  private toolsUsed: number = 0;
  
  private instructionText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private missedText!: Phaser.GameObjects.Text;
  
  private readonly CONVEYOR_Y = 340;
  private readonly BOX_START_X = -150;
  private readonly BOX_SPEED = 120; // Pixels per second (much faster movement)
  private readonly BOX_SPAWN_INTERVAL = 2500; // Spawn box every 2.5 seconds
  private readonly MAX_BOXES_ON_BELT = 4; // Maximum 4 boxes on belt at once
  private readonly MAX_TOOLS_VISIBLE = 6; // Show 6 tools at once
  
  private boxSpawnTimer?: Phaser.Time.TimerEvent;
  
  constructor() {
    super({ key: 'WorstFitGame' });
  }

  preload() {
    const assetPath = '/games/memory-management/worstfit/';
    
    this.load.image('background', `${assetPath}background.png`);
    
    // Load boxes
    for (let i = 1; i <= 4; i++) {
      this.load.image(`box${i}`, `${assetPath}box${i}.png`);
    }
    
    // Load tools
    for (let i = 1; i <= 6; i++) {
      this.load.image(`tool${i}`, `${assetPath}tool${i}.png`);
    }
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.image(width / 2, height / 2, 'background');
    bg.setDisplaySize(width, height);
    bg.setDepth(0);

    this.createUI(width, height);
    this.showIntroScenario(width, height);
  }

  private createUI(width: number, height: number) {
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    }).setDepth(100);

    this.missedText = this.add.text(20, 55, 'Missed: 0', {
      fontSize: '18px',
      color: '#FF4444',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    }).setDepth(100);

    this.instructionText = this.add.text(width / 2, height - 40, '', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      backgroundColor: '#000000DD',
      padding: { x: 15, y: 8 },
      align: 'center'
    }).setOrigin(0.5).setDepth(100);
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

    const title = this.add.text(width / 2, boxY + 50, '📦 WORST FIT', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(width / 2, boxY + 95, 'Memory Management - Conveyor Belt', {
      fontSize: '18px',
      color: '#FFFFFF'
    }).setOrigin(0.5).setDepth(302);

    const contentY = boxY + 145;

    const howToPlay = `🎮 How to Play:
   • Boxes move on the conveyor belt from left to right
   • Tools appear above - drag them into boxes
   • Each tool has a size, each box has capacity`;

    const howToPlayText = this.add.text(boxX + 50, contentY, howToPlay, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6
    }).setDepth(302);

    const rules = `⚠️ Worst Fit Rules:
   • Always place tool in the LARGEST available box
   • This leaves maximum remaining space
   • Reduces small unusable fragments
   • Correct placement: +20 pts | Wrong: -10 pts`;

    const rulesText = this.add.text(boxX + 50, contentY + 120, rules, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6
    }).setDepth(302);

    const goal = `🎯 Goal: Place all tools using Worst Fit strategy!`;

    const goalText = this.add.text(boxX + 50, contentY + 250, goal, {
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
      howToPlayText.destroy();
      rulesText.destroy();
      goalText.destroy();
      startButton.destroy();
      buttonText.destroy();
      
      this.startGame();
    });
  }

  private startGame() {
    this.gamePhase = 'playing';
    this.instructionText.setText('Drag tools to the LARGEST available box! Don\'t let boxes pass empty!');
    
    // Initialize boxes and tools
    this.createBoxes();
    this.createTools();
    
    // Start spawning boxes at intervals
    this.boxSpawnTimer = this.time.addEvent({
      delay: this.BOX_SPAWN_INTERVAL,
      callback: this.spawnNextBox,
      callbackScope: this,
      loop: true
    });
    
    // Spawn first box immediately
    this.spawnNextBox();
    
    // Show ALL tools at once
    this.spawnAllTools();
  }

  private spawnAllTools() {
    const { width } = this.scale;
    const spacing = 120;
    const startX = width / 2 - (this.tools.length - 1) * spacing / 2;
    
    this.tools.forEach((tool, index) => {
      const toolX = startX + index * spacing;
      const toolY = 120;
      
      // Create a container for tool + text
      const container = this.add.container(toolX, toolY);
      container.setSize(80, 80);
      container.setDepth(10);
      
      // Add sprite to container
      const sprite = this.add.sprite(0, 0, tool.type);
      sprite.setScale(0.16);
      container.add(sprite);
      
      // Add text to container
      const sizeText = this.add.text(0, 35, `${tool.size}`, {
        fontSize: '12px',
        color: '#FFD700',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
      container.add(sizeText);
      
      // Make container interactive and draggable
      container.setInteractive({ draggable: true, useHandCursor: true });
      
      // Store references
      tool.sprite = sprite;
      tool.sizeText = sizeText;
      container.setData('originalX', toolX);
      container.setData('originalY', toolY);
      container.setData('toolRef', tool);
      container.setData('container', container);
      
      // Set up drag handlers on the container
      container.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (!tool.isPlaced) {
          container.x = dragX;
          container.y = dragY;
        }
      });
      
      container.on('dragend', (pointer: Phaser.Input.Pointer) => {
        if (!tool.isPlaced) {
          this.checkToolPlacement(tool, pointer.x, pointer.y);
        }
      });
      
      // Store container reference in tool
      tool.sprite.setData('container', container);
      
      this.activeTools.push(tool);
    });
  }

  private createBoxes() {
    // Create 12 boxes with varying capacities for more gameplay
    const capacities = [100, 80, 60, 40, 100, 70, 50, 90, 60, 80, 100, 50];
    
    for (let i = 0; i < this.totalBoxes; i++) {
      const box: Box = {
        id: `box-${i + 1}`,
        boxNumber: (i % 4) + 1, // Cycle through 4 box types
        capacity: capacities[i],
        remainingSpace: capacities[i],
        x: this.BOX_START_X,
        y: this.CONVEYOR_Y,
        items: []
      };
      
      this.boxes.push(box);
    }
  }

  private createTools() {
    // Create 6 tools that will all be visible at once
    const sizes = [20, 30, 15, 25, 35, 40];
    
    for (let i = 0; i < 6; i++) {
      const tool: Tool = {
        id: `tool-${i + 1}`,
        size: sizes[i],
        type: `tool${i + 1}`,
        isPlaced: false
      };
      
      this.tools.push(tool);
    }
  }

  private spawnNextBox() {
    // Check if we've spawned all boxes
    if (this.boxesProcessed >= this.totalBoxes) {
      if (this.boxSpawnTimer) {
        this.boxSpawnTimer.remove();
      }
      // Wait for all boxes to leave screen
      this.time.delayedCall(5000, () => {
        if (this.activeBoxes.length === 0) {
          this.showResults();
        }
      });
      return;
    }

    // Check if we can spawn more boxes (max 3 on belt)
    if (this.activeBoxes.length >= this.MAX_BOXES_ON_BELT) {
      return;
    }

    const box = this.boxes[this.boxesProcessed];
    const { width } = this.scale;
    
    // Create box sprite - positioned lower on the belt
    box.sprite = this.add.sprite(this.BOX_START_X, this.CONVEYOR_Y + 50, `box${box.boxNumber}`);
    box.sprite.setScale(0.28); // Slightly larger boxes
    box.sprite.setInteractive();
    box.sprite.setDepth(3); // Above conveyor
    
    // Capacity text
    box.capacityText = this.add.text(box.sprite.x, box.sprite.y - 60, `${box.remainingSpace}/${box.capacity}`, {
      fontSize: '15px',
      color: '#FFFFFF',
      backgroundColor: '#000000',
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setDepth(4);
    
    this.activeBoxes.push(box);
    this.boxesProcessed++;
    
    // Move box across screen
    const duration = (width + 400) / this.BOX_SPEED * 1000;
    this.tweens.add({
      targets: [box.sprite, box.capacityText],
      x: width + 200,
      duration: duration,
      ease: 'Linear',
      onUpdate: () => {
        box.x = box.sprite!.x;
      },
      onComplete: () => {
        // Box left screen - check if it was filled
        if (box.items.length === 0) {
          // Missed box - penalty
          this.missedBoxes++;
          this.score = Math.max(0, this.score - 15);
          this.scoreText.setText(`Score: ${this.score}`);
          this.missedText.setText(`Missed: ${this.missedBoxes}`);
          this.showMessage('⚠️ Box left empty! -15 pts', '#FF6600');
        }
        
        box.sprite?.destroy();
        box.capacityText?.destroy();
        
        // Remove from active boxes
        const index = this.activeBoxes.indexOf(box);
        if (index > -1) {
          this.activeBoxes.splice(index, 1);
        }
        
        // Check if game is over
        if (this.boxesProcessed >= this.totalBoxes && this.activeBoxes.length === 0) {
          this.showResults();
        }
      }
    });
  }



  private checkToolPlacement(tool: Tool, x: number, y: number) {
    // Find which box the tool was dropped on (only active boxes on conveyor)
    // Check all boxes and find the closest one to the drop point
    let closestBox: Box | undefined;
    let closestDistance = Infinity;
    
    this.activeBoxes.forEach(b => {
      if (b.sprite) {
        const distance = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, x, y);
        if (distance < 100 && distance < closestDistance) {
          closestDistance = distance;
          closestBox = b;
        }
      }
    });
    
    const box = closestBox;
    
    if (!box) {
      // Return tool to original position
      const container = tool.sprite!.getData('container');
      if (container) {
        const originalX = container.getData('originalX');
        const originalY = container.getData('originalY');
        container.x = originalX;
        container.y = originalY;
      }
      return;
    }
    
    // Check if tool fits
    if (tool.size > box.remainingSpace) {
      this.showMessage('❌ Tool too large for this box!', '#FF0000');
      this.wrongAttempts++;
      this.score = Math.max(0, this.score - 5);
      this.scoreText.setText(`Score: ${this.score}`);
      const container = tool.sprite!.getData('container');
      if (container) {
        const originalX = container.getData('originalX');
        const originalY = container.getData('originalY');
        container.x = originalX;
        container.y = originalY;
      }
      return;
    }
    
    // Check if this is the worst fit (largest available space among active boxes)
    const availableBoxes = this.activeBoxes.filter(b => b.remainingSpace >= tool.size && b.sprite);
    
    if (availableBoxes.length === 0) {
      this.showMessage('❌ No box can fit this tool!', '#FF0000');
      const container = tool.sprite!.getData('container');
      if (container) {
        const originalX = container.getData('originalX');
        const originalY = container.getData('originalY');
        container.x = originalX;
        container.y = originalY;
      }
      return;
    }
    
    const largestBox = availableBoxes.reduce((prev, curr) => 
      curr.remainingSpace > prev.remainingSpace ? curr : prev
    );
    
    if (box.id !== largestBox.id) {
      this.wrongAttempts++;
      this.score = Math.max(0, this.score - 10);
      this.scoreText.setText(`Score: ${this.score}`);
      this.showMessage(`❌ Wrong! Use LARGEST box (${largestBox.remainingSpace} space left)`, '#FF0000');
      const container = tool.sprite!.getData('container');
      if (container) {
        const originalX = container.getData('originalX');
        const originalY = container.getData('originalY');
        container.x = originalX;
        container.y = originalY;
      }
      return;
    }
    
    // Correct placement
    this.score += 20;
    this.scoreText.setText(`Score: ${this.score}`);
    this.showMessage('✅ Correct! Worst Fit!', '#00FF00');
    
    // Place tool in box
    box.remainingSpace -= tool.size;
    box.items.push(tool);
    tool.isPlaced = true;
    tool.assignedBox = box;
    this.toolsUsed++;
    
    // Update box capacity text
    box.capacityText!.setText(`${box.remainingSpace}/${box.capacity}`);
    
    // Get the container and destroy it, then create a small sprite in the box
    const container = tool.sprite!.getData('container');
    if (container) {
      container.destroy();
    }
    
    // Create a small tool sprite in the box
    const smallToolSprite = this.add.sprite(box.sprite!.x, box.sprite!.y, tool.type);
    smallToolSprite.setScale(0.08);
    smallToolSprite.setDepth(4);
    
    // Make tool follow the box as it moves
    const updateToolPosition = () => {
      if (smallToolSprite && box.sprite && !box.sprite.scene) {
        // Box has been destroyed, destroy tool too
        smallToolSprite.destroy();
      } else if (smallToolSprite && box.sprite) {
        smallToolSprite.x = box.sprite.x;
        smallToolSprite.y = box.sprite.y;
      }
    };
    
    // Update tool position every frame
    this.events.on('update', updateToolPosition);
    
    // Clean up when box is destroyed
    box.sprite!.once('destroy', () => {
      this.events.off('update', updateToolPosition);
      if (smallToolSprite) {
        smallToolSprite.destroy();
      }
    });
  }

  private showMessage(text: string, color: string) {
    const { width, height } = this.scale;
    const message = this.add.text(width / 2, height / 2, text, {
      fontSize: '24px',
      color: color,
      fontStyle: 'bold',
      backgroundColor: '#000000DD',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    message.setDepth(100);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: height / 2 - 50,
      duration: 2000,
      onComplete: () => message.destroy()
    });
  }

  private showResults() {
    this.gamePhase = 'results';
    const { width, height } = this.scale;

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
    resultsBox.lineStyle(4, 0x00FF00, 1);
    resultsBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    resultsBox.setDepth(301);

    const title = this.add.text(width / 2, boxY + 50, '🎉 GAME COMPLETE!', {
      fontSize: '32px',
      color: '#00FF00',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);

    const stats = `
Final Score: ${this.score}
Boxes Processed: ${this.boxesProcessed}
Missed Boxes: ${this.missedBoxes}
Wrong Attempts: ${this.wrongAttempts}
    `;

    const statsText = this.add.text(width / 2, boxY + 150, stats, {
      fontSize: '20px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5).setDepth(302);

    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 80;

    const restartButton = this.add.graphics();
    restartButton.fillGradientStyle(0x4CAF50, 0x4CAF50, 0x388E3C, 0x388E3C, 1);
    restartButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    restartButton.setDepth(302);

    const buttonText = this.add.text(width / 2, buttonY + 25, '🔄 PLAY AGAIN', {
      fontSize: '20px',
      color: '#FFFFFF',
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
