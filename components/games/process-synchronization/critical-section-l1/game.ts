import Phaser from 'phaser';

/**
 * Simplified Scene - Console and Background Display
 * 
 * Left side: Console panel
 * Right side: Background image with person sprites
 */

export class SimpleScene extends Phaser.Scene {
  private codePanel!: Phaser.GameObjects.Container;
  private codeText!: Phaser.GameObjects.Text;
  
  // Game dimensions
  private GAME_WIDTH!: number;
  private GAME_HEIGHT!: number;
  private CONSOLE_WIDTH!: number;
  private GAME_AREA_WIDTH!: number;

  // Person sprites tracking
  private personSprites: Phaser.GameObjects.Sprite[] = [];
  private personLabels: Phaser.GameObjects.Text[] = [];
  private currentPersonIndex: number = 0;

  // ATM status
  private atmStatusText!: Phaser.GameObjects.Text;
  private atmStatusBg!: Phaser.GameObjects.Graphics;
  private isAtmOccupied: boolean = false;

  // ATM position
  private readonly ATM_X = 150; // relative to CONSOLE_WIDTH
  private readonly ATM_Y = 360;

  constructor() {
    super({ key: 'SimpleScene' });
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
    // Initialize dimensions
    this.initializeDimensions();
    
    // Create left console area
    this.createConsoleArea();
    
    // Create right background area
    this.createBackgroundArea();
    
    // Load person sprites
    this.loadPersonSprites();
    
    // Listen for resize events
    this.scale.on('resize', this.handleResize, this);
    
    // Update labels to follow sprites every frame
    this.events.on('update', () => {
      this.personSprites.forEach(sprite => {
        const label = sprite.getData('label');
        if (label && !label.scene) return; // Skip if destroyed
        if (label) {
          label.x = sprite.x;
          label.y = sprite.y - 60;
        }
      });
    });
  }

  private initializeDimensions() {
    this.GAME_WIDTH = this.cameras.main.width;
    this.GAME_HEIGHT = this.cameras.main.height;
    
    // No split screen - full background
    this.CONSOLE_WIDTH = 0;
    this.GAME_AREA_WIDTH = this.GAME_WIDTH;
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.GAME_WIDTH = gameSize.width;
    this.GAME_HEIGHT = gameSize.height;
    this.CONSOLE_WIDTH = 0;
    this.GAME_AREA_WIDTH = this.GAME_WIDTH;
  }

  private createConsoleArea() {
    // No separate console area - just create the console panel overlay
    this.createCodePanel();
  }

  private createCodePanel() {
    const panelWidth = 300;
    const panelHeight = Math.min(this.GAME_HEIGHT * 0.7, 500);
    // Position console panel on the right side with some padding
    const panelX = this.GAME_WIDTH - 20 - panelWidth / 2;
    const panelY = this.GAME_HEIGHT / 2;

    // Console panel container
    this.codePanel = this.add.container(panelX, panelY);
    this.codePanel.setDepth(100); // Ensure it appears on top
    
    // Panel background with more opacity for better readability
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1e1e1e, 0.85);
    panelBg.lineStyle(2, 0x4a90e2);
    panelBg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);
    panelBg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);

    // Title bar
    const titleBar = this.add.graphics();
    titleBar.fillStyle(0x2d2d30);
    titleBar.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, 35, 8);
    titleBar.lineStyle(1, 0x3c3c3c);
    titleBar.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, 35, 8);

    // Title text
    const titleText = this.add.text(0, -panelHeight / 2 + 17, 'Console', {
      fontSize: '14px',
      color: '#cccccc',
      fontFamily: 'Consolas, monospace'
    }).setOrigin(0.5, 0.5);

    // Console text content
    this.codeText = this.add.text(-panelWidth / 2 + 15, -panelHeight / 2 + 45, '', {
      fontSize: '11px',
      color: '#d4d4d4',
      fontFamily: 'Consolas, monospace',
      align: 'left',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 30 }
    }).setOrigin(0, 0);

    this.codePanel.add([panelBg, titleBar, titleText, this.codeText]);
    
    // Initial console message
    this.updateConsole('System initialized...\n\nBackground loaded\nPerson sprites loaded\n\nReady!');
  }

  private createBackgroundArea() {
    // Background image - full screen
    const bgX = this.GAME_WIDTH / 2;
    const bgY = this.GAME_HEIGHT / 2;
    
    const background = this.add.image(bgX, bgY, 'background-1');
    background.setOrigin(0.5, 0.5);
    background.setDisplaySize(this.GAME_WIDTH, this.GAME_HEIGHT);
    background.setDepth(0); // Ensure background is behind everything

    // Create ATM status indicator
    this.createAtmStatusIndicator();
  }
private createAtmStatusIndicator() {
  // Position near the ATM (adjusted for full screen)
  const atmX = 150;
  const atmY = 260;

  // Background box for status
  this.atmStatusBg = this.add.graphics();
  this.atmStatusBg.setDepth(50); // Above background, below console

  // Status text (smaller, clean font)
  this.atmStatusText = this.add.text(atmX, atmY, 'FREE', {
    fontSize: '20px',
    color: '#00ff88', // soft green
    fontFamily: 'Poppins, Arial, sans-serif',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2,
    shadow: { offsetX: 0, offsetY: 0, color: '#000', blur: 6, fill: true }
  }).setOrigin(0.5);
  this.atmStatusText.setDepth(50); // Above background, below console

  // Set initial status
  this.updateAtmStatus(false);
}

private updateAtmStatus(occupied: boolean) {
  this.isAtmOccupied = occupied;

  const text = occupied ? 'OCCUPIED' : 'FREE';
  const color = occupied ? '#ff4b4b' : '#00ff88';
  const bgColor = occupied ? 0xff4b4b : 0x00ff88;
  const bgWidth = occupied ? 110 : 80;
  const bgHeight = 40;

  // Update text
  this.atmStatusText.setText(text);
  this.atmStatusText.setColor(color);

  // Redraw background with gradient-like style
  this.atmStatusBg.clear();
  this.atmStatusBg.fillStyle(bgColor, 0.25);
  this.atmStatusBg.fillRoundedRect(
    this.atmStatusText.x - bgWidth / 2,
    this.atmStatusText.y - bgHeight / 2,
    bgWidth,
    bgHeight,
    12
  );
  this.atmStatusBg.lineStyle(2, bgColor, 1);
  this.atmStatusBg.strokeRoundedRect(
    this.atmStatusText.x - bgWidth / 2,
    this.atmStatusText.y - bgHeight / 2,
    bgWidth,
    bgHeight,
    12
  );
}
  // Add a soft glow effe

  private loadPersonSprites() {
    // Queue positions - people will walk to these positions (adjusted for full screen)
    const startX = 350;
    const startY = this.GAME_HEIGHT / 2  + 80;
    const spacing = 100;

    // Create all sprites off-screen to the right
    for (let i = 1; i <= 4; i++) {
      const targetX = startX + (i - 1) * spacing;
      
      // Start position: far right off-screen
      const startingX = this.GAME_WIDTH + 100;
      
     // Create the sprite
const sprite = this.add.sprite(startingX, startY, `person-${i}`);
sprite.setScale(0.8);
sprite.setAlpha(0);
sprite.setDepth(10); // Above background, below console
sprite.setInteractive({ useHandCursor: true }); // Make sprite directly interactive

      
      // Add label (will follow the person)
      const label = this.add.text(startingX, startY - 60, `Person ${i}`, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      label.setAlpha(0); // Start invisible
      label.setDepth(10); // Above background, below console
      
      // Store target position and data for this person
      sprite.setData('targetX', targetX);
      sprite.setData('targetY', startY);
      sprite.setData('personId', i);
      sprite.setData('isAtAtm', false);
      sprite.setData('isMoving', false);
      sprite.setData('label', label); // Store label reference
      
      // Click handler for the sprite
      sprite.on('pointerdown', () => {
        this.onPersonClick(sprite, label, i);
      });
      
      // Hover effects on sprite
      sprite.on('pointerover', () => {
        if (!sprite.getData('isMoving')) {
          sprite.setTint(0xaaaaff);
        }
      });

      sprite.on('pointerout', () => {
        sprite.clearTint();
      });
      
      this.personSprites.push(sprite);
      this.personLabels.push(label);
    }
    
    // Update console
    this.updateConsole('System initialized...\n\nBackground loaded\nQueue is empty...\n\nWaiting for first person...');
    
    // Start showing people one by one
    this.time.delayedCall(1000, () => {
      this.showNextPerson();
    });
  }

  private showNextPerson() {
    if (this.currentPersonIndex >= this.personSprites.length) {
      // All people have arrived
      this.updateConsole('System initialized...\n\nBackground loaded\nAll people have arrived!\n\nTotal: 4 people in queue');
      return;
    }

    const sprite = this.personSprites[this.currentPersonIndex];
    const label = sprite.getData('label');
    const personNum = this.currentPersonIndex + 1;
    const targetX = sprite.getData('targetX');

    // Update console
    this.updateConsole(`System initialized...\n\nBackground loaded\nPerson ${personNum} is arriving...\n\nWalking to queue position...`);

    // Fade in the person
    this.tweens.add({
      targets: [sprite, label],
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });

    // Walk to queue position - label follows automatically via update loop
    this.tweens.add({
      targets: sprite,
      x: targetX,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => {
        // Person has reached their position
        this.updateConsole(`System initialized...\n\nBackground loaded\nPerson ${personNum} joined the queue!\n\nQueue size: ${personNum}`);
        
        this.currentPersonIndex++;
        
        // Next person arrives after a delay
        this.time.delayedCall(1000, () => {
          this.showNextPerson();
        });
      }
    });
  }

  private updateConsole(message: string) {
    this.codeText.setText(message);
  }

  private onPersonClick(sprite: Phaser.GameObjects.Sprite, label: Phaser.GameObjects.Text, personId: number) {
    // Check if person is already moving or ATM is occupied
    if (sprite.getData('isMoving')) {
      this.updateConsole(`Person ${personId} is already moving!`);
      return;
    }

    if (this.isAtmOccupied) {
      this.updateConsole(`ATM is occupied!\nPerson ${personId} must wait...`);
      return;
    }

    // Check if person has joined the queue yet
    if (sprite.alpha === 0) {
      this.updateConsole(`Person ${personId} hasn't arrived yet!`);
      return;
    }

    // Mark as moving
    sprite.setData('isMoving', true);
    sprite.clearTint();

    const atmX = this.ATM_X;
    const atmY = this.ATM_Y;

    this.updateConsole(`Person ${personId} is walking to ATM...`);

    // Mark ATM as occupied
    this.updateAtmStatus(true);

    // Walk to ATM - label follows automatically via update loop
    this.tweens.add({
      targets: sprite,
      x: atmX,
      y: atmY,
      duration: 1500,
      ease: 'Linear',
      onComplete: () => {
        sprite.setData('isAtAtm', true);
        
        this.updateConsole(`Person ${personId} is using ATM...\nTransaction in progress...`);

        // Do transaction (wait 3 seconds)
        this.time.delayedCall(3000, () => {
          this.updateConsole(`Person ${personId} finished transaction!\nLeaving the ATM...`);

          // Walk away and fade out (exit to the right)
          const exitX = this.GAME_WIDTH + 100;
          
          // Move sprite and fade both - label follows automatically
          this.tweens.add({
            targets: sprite,
            x: exitX,
            duration: 1500,
            ease: 'Linear'
          });

          this.tweens.add({
            targets: [sprite, label],
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
              // Free up the ATM
              this.updateAtmStatus(false);
              
              // Destroy the objects
              sprite.destroy();
              label.destroy();
              
              this.updateConsole(`Person ${personId} has left.\nATM is now FREE!`);
            }
          });
        });
      }
    });
  }
}

// Export game configuration
export const CriticalSectionGameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#181c24',
  scene: SimpleScene,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};
