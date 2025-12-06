import Phaser from 'phaser';

interface Compartment {
  id: string;
  compartmentNumber: number;
  size: number; // Total size in units
  remainingSpace: number; // Remaining available space in units
  x: number;
  y: number;
  width: number;
  height: number;
  occupied: boolean; // True if any gift is placed here
  gifts: Gift[]; // Array of gifts placed in this compartment
  compartmentBg?: Phaser.GameObjects.Graphics;
  compartmentLabel?: Phaser.GameObjects.Text;
  fragmentationOverlay?: Phaser.GameObjects.Graphics;
  fragmentationText?: Phaser.GameObjects.Text;
}

interface Gift {
  id: string;
  giftNumber: number;
  size: number;
  name: string;
  asset: string; // gift1, gift2, etc.
  sprite?: Phaser.GameObjects.Sprite;
  sizeLabel?: Phaser.GameObjects.Text;
  isOnTable: boolean;
  isPlaced: boolean;
  assignedCompartment?: Compartment;
  tableX: number; // X position on the table
  tableY: number; // Y position on the table
}

export class BestFitGame extends Phaser.Scene {
  // Game State
  private gamePhase: 'intro' | 'placing' | 'results' = 'intro';
  private compartments: Compartment[] = [];
  private gifts: Gift[] = [];
  private currentGiftIndex: number = 0;
  private selectedGift?: Gift;
  private totalFragmentation: number = 0;
  private totalAllocated: number = 0;
  private totalCompartmentSpace: number = 0;
  private score: number = 0;
  private wrongAttempts: number = 0;
  private externalFragmentationCount: number = 0; // Track rejected gifts
  private gameStartTime: number = 0; // Track when game started

  // UI Elements
  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private fragmentationText!: Phaser.GameObjects.Text;
  private efficiencyText!: Phaser.GameObjects.Text;

  // AI Chatbot Properties
  private chatbotContainer?: Phaser.GameObjects.Container;
  private chatMessages: Array<{ role: 'user' | 'ai', message: string }> = [];
  private isChatbotOpen: boolean = false;
  private chatScrollOffset: number = 0;
  private maxChatScroll: number = 0;

  // Audio
  private bgm?: Phaser.Sound.BaseSound;

  // Layout constants
  private readonly CUPBOARD_X = 900; // Right side - cupboard area
  private readonly TABLE_X = 250; // Left side - table area (where gifts appear on counter)
  private readonly TABLE_Y = 650; // Y position of the table/counter (lower on screen)

  // Gift configurations - based on existing assets
  private readonly GIFT_CONFIGS = {
    gift1: { 
      name: 'Small Gift', 
      size: 15, 
      asset: 'gift1',
      emoji: '🎁',
      scale: 0.12  // Smaller scale
    },
    gift2: { 
      name: 'Medium Gift', 
      size: 35, 
      asset: 'gift2',
      emoji: '🎁',
      scale: 0.14  // Smaller scale
    },
    gift3: { 
      name: 'Large Gift', 
      size: 55, 
      asset: 'gift3',
      emoji: '🎁',
      scale: 0.16  // Smaller scale
    },
    gift4: { 
      name: 'Extra Large Gift', 
      size: 75, 
      asset: 'gift4',
      emoji: '🎁',
      scale: 0.18  // Smaller scale
    },
    gift5: { 
      name: 'Huge Gift', 
      size: 95, 
      asset: 'gift5',
      emoji: '🎁',
      scale: 0.20  // Smaller scale
    },
    gift6: { 
      name: 'Massive Gift', 
      size: 120, 
      asset: 'gift6',
      emoji: '🎁',
      scale: 0.22  // Smaller scale
    }
  };

  // Cupboard compartments - based on screenshot layout
  // Matching the actual cupboard structure from background image
  // Top row, middle row, bottom row layout
  private readonly COMPARTMENT_CONFIGS = [
    // Top row - left to right
    { compartmentNumber: 1, size: 300, x: 760, y: 240, width: 180, height: 230, label: 'C1: 300' },
    { compartmentNumber: 2, size: 150, x: 960, y: 190, width: 130, height: 160, label: 'C2: 150' },
    { compartmentNumber: 3, size: 130, x: 960, y: 320, width: 150, height: 80, label: 'C3: 120' },
    { compartmentNumber: 4, size: 50, x: 1160, y: 170, width: 70, height: 75, label: 'C4: 50' },
    { compartmentNumber: 5, size: 50, x: 1280, y: 170, width: 70, height: 75, label: 'C5: 50' },
    { compartmentNumber: 6, size: 100, x: 1430, y: 170, width: 90, height: 75, label: 'C6: 100' },
    { compartmentNumber: 7, size: 100, x: 1200, y: 450, width: 150, height: 80, label: 'C7: 100' },
    { compartmentNumber: 8, size: 200, x: 1300, y: 300, width: 400, height: 100, label: 'C8: 200' },
    
    // Middle row
    { compartmentNumber: 9, size: 90, x: 1400, y: 450, width: 140, height: 80, label: 'C9: 90' },
    
    // Bottom row
    { compartmentNumber: 10, size: 140, x: 760, y: 450, width: 140, height: 80, label: 'C10: 110' }
  ];

  // Gifts that will appear on the table sequentially
  private GIFTS_CONFIG: Array<{ giftType: 'gift1' | 'gift2' | 'gift3' | 'gift4' | 'gift5' | 'gift6', id: string }> = [];

  constructor() {
    super({ key: 'BestFitGame' });
  }

  /**
   * Generates a random set of gifts for the game
   * Returns between 6-10 gifts with random types
   */
  private generateRandomGifts(): Array<{ giftType: 'gift1' | 'gift2' | 'gift3' | 'gift4' | 'gift5' | 'gift6', id: string }> {
    const numGifts = Phaser.Math.Between(6, 10);
    const giftTypes: Array<'gift1' | 'gift2' | 'gift3' | 'gift4' | 'gift5' | 'gift6'> = 
      ['gift1', 'gift2', 'gift3', 'gift4', 'gift5', 'gift6'];
    
    const gifts: Array<{ giftType: 'gift1' | 'gift2' | 'gift3' | 'gift4' | 'gift5' | 'gift6', id: string }> = [];
    
    for (let i = 0; i < numGifts; i++) {
      const randomType = Phaser.Utils.Array.GetRandom(giftTypes);
      gifts.push({
        giftType: randomType,
        id: `g${i + 1}`
      });
    }
    
    return gifts;
  }

  preload() {
    const assetPath = '/games/memory-management/bestfit/';
    
    // Load background
    this.load.image('background', `${assetPath}background.png`);
    
    // Load gift sprites
    this.load.image('gift1', `${assetPath}gift1.png`);
    this.load.image('gift2', `${assetPath}gift2.png`);
    this.load.image('gift3', `${assetPath}gift3.png`);
    this.load.image('gift4', `${assetPath}gift4.png`);
    this.load.image('gift5', `${assetPath}gift5.png`);
    this.load.image('gift6', `${assetPath}gift6.png`);

    // Load sounds (reuse from first-fit if available)
    const soundsPath = '/games/memory-management/sounds/';
    this.load.audio('bg-music', `${soundsPath}background_music.flac`);
  }

  create() {
    const { width, height } = this.sys.game.canvas;
    
    // Generate random gifts for this game session
    this.GIFTS_CONFIG = this.generateRandomGifts();
    
    // Create background
    this.createBackground(width, height);
    
    // Create UI
    this.createUI(width, height);
    
    // Initialize compartments
    this.initializeCompartments();
    
    // Start background music
    if (!this.bgm) {
      this.bgm = this.sound.add('bg-music', { loop: true, volume: 0.35 });
    }
    if (this.bgm && !this.bgm.isPlaying) {
      this.bgm.play();
    }

    // Cleanup sounds on shutdown/destroy
    this.events.on('shutdown', () => {
      if (this.bgm && this.bgm.isPlaying) {
        this.bgm.stop();
      }
    });
    this.events.on('destroy', () => {
      if (this.bgm && this.bgm.isPlaying) {
        this.bgm.stop();
      }
    });

    // Show intro
    this.showIntroScenario(width, height);
  }

  private createBackground(width: number, height: number) {
    const bg = this.add.image(width / 2, height / 2, 'background');
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
    bg.setDepth(-100);
  }

  private createUI(width: number, height: number) {
    // Title - smaller and cleaner
    const titleText = this.add.text(width / 2, 30, '🎁 BEST FIT Gift Cupboard', {
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#000000CC',
      padding: { x: 15, y: 8 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    titleText.setDepth(200);

    // Phase indicator - smaller
    this.phaseText = this.add.text(width / 2, 65, 'Phase: Intro', {
      fontSize: '16px',
      color: '#00FF88',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      backgroundColor: '#000000CC',
      padding: { x: 10, y: 5 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    this.phaseText.setDepth(200);

    // Instruction text - bottom center, cleaner, dark text
    this.instructionText = this.add.text(width / 2, height - 30, 'Welcome! Click to start...', {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 2,
      backgroundColor: '#FFFFFFDD',
      padding: { x: 12, y: 6 },
      align: 'center',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    this.instructionText.setDepth(200);

    // Metrics panel - top left, compact
    const metricsBg = this.add.graphics();
    metricsBg.fillStyle(0x000000, 0.8);
    metricsBg.fillRoundedRect(10, 90, 200, 100, 8);
    metricsBg.setDepth(199);
    
    // Score
    this.scoreText = this.add.text(20, 105, 'Score: 0', {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    });
    this.scoreText.setDepth(200);

    // Fragmentation
    this.fragmentationText = this.add.text(20, 130, 'Fragmentation: 0%', {
      fontSize: '16px',
      color: '#FF6B6B',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    });
    this.fragmentationText.setDepth(200);

    // Efficiency
    this.efficiencyText = this.add.text(20, 155, 'Efficiency: 100%', {
      fontSize: '16px',
      color: '#00FF88',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    });
    this.efficiencyText.setDepth(200);
  }

  private initializeCompartments() {
    this.compartments = [];
    this.totalCompartmentSpace = 0;

    this.COMPARTMENT_CONFIGS.forEach(config => {
      const compartment: Compartment = {
        id: `comp-${config.compartmentNumber}`,
        compartmentNumber: config.compartmentNumber,
        size: config.size,
        remainingSpace: config.size,
        x: config.x,
        y: config.y,
        width: config.width,
        height: config.height,
        occupied: false,
        gifts: []
      };

      // Create visual representation
      this.createCompartmentVisual(compartment, config.label);
      
      this.compartments.push(compartment);
      this.totalCompartmentSpace += config.size;
    });
  }

  private createCompartmentVisual(compartment: Compartment, label: string) {
    // Label showing size - dark text, visible, smaller font
    const labelText = this.add.text(compartment.x, compartment.y, label, {
      fontSize: '11px',
      color: '#000000',
      fontStyle: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 1.5,
      align: 'center',
      backgroundColor: '#FFFFFFEE',
      padding: { x: 4, y: 2 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    labelText.setDepth(10);
    labelText.setInteractive({ useHandCursor: true });
    compartment.compartmentLabel = labelText;
    
    // Make label clickable
    labelText.on('pointerdown', () => {
      if (this.selectedGift && this.gamePhase === 'placing') {
        this.attemptPlaceGift(this.selectedGift, compartment);
      }
    });
    
    // Create invisible clickable area (no visual box - cupboard already has boxes)
    const clickArea = this.add.zone(
      compartment.x,
      compartment.y,
      compartment.width,
      compartment.height
    );
    clickArea.setInteractive({ useHandCursor: true });
    clickArea.setDepth(5);
    
    clickArea.on('pointerdown', () => {
      if (this.selectedGift && this.gamePhase === 'placing') {
        this.attemptPlaceGift(this.selectedGift, compartment);
      }
    });
    
    // Optional: subtle highlight on hover (very subtle, no box)
    clickArea.on('pointerover', () => {
      if (this.selectedGift && this.gamePhase === 'placing') {
        // Just show a subtle glow effect, no box
        if (!compartment.compartmentBg) {
          const glow = this.add.graphics();
          glow.lineStyle(2, 0xFFD700, 0.5);
          glow.strokeRect(
            compartment.x - compartment.width / 2,
            compartment.y - compartment.height / 2,
            compartment.width,
            compartment.height
          );
          glow.setDepth(4);
          compartment.compartmentBg = glow;
        }
      }
    });
    
    labelText.on('pointerover', () => {
      if (this.selectedGift && this.gamePhase === 'placing') {
        // Just show a subtle glow effect, no box
        if (!compartment.compartmentBg) {
          const glow = this.add.graphics();
          glow.lineStyle(2, 0xFFD700, 0.5);
          glow.strokeRect(
            compartment.x - compartment.width / 2,
            compartment.y - compartment.height / 2,
            compartment.width,
            compartment.height
          );
          glow.setDepth(4);
          compartment.compartmentBg = glow;
        }
      }
    });
    
    clickArea.on('pointerout', () => {
      if (compartment.compartmentBg) {
        compartment.compartmentBg.destroy();
        compartment.compartmentBg = undefined;
      }
    });
    
    labelText.on('pointerout', () => {
      if (compartment.compartmentBg) {
        compartment.compartmentBg.destroy();
        compartment.compartmentBg = undefined;
      }
    });
  }

  private showIntroScenario(width: number, height: number) {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    const boxWidth = 800;
    const boxHeight = 500;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const box = this.add.graphics();
    box.fillStyle(0x1a1a2e, 0.98);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.lineStyle(4, 0xFFD700, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.setDepth(301);

    // Title
    const titleText = this.add.text(width / 2, boxY + 50, '🎁 BEST FIT Algorithm', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    // Explanation
    const explanation = `Welcome to the Best-Fit Gift Cupboard!

📋 RULES:
• Gifts arrive on the table (left side)
• Click a gift to select it
• Find the SMALLEST compartment that fits
• Best-Fit minimizes wasted space

🎯 GOAL:
Place each gift in the smallest compartment
that can hold it. This minimizes leftover
space but may create many small fragments.

⚠️ WARNING:
Best-Fit can cause external fragmentation
when many small unusable spaces accumulate!`;

    const explanationText = this.add.text(width / 2, boxY + 180, explanation, {
      fontSize: '18px',
      color: '#E0E0E0',
      align: 'center',
      lineSpacing: 8,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    // Start button
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 100;

    const button = this.add.graphics();
    button.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
    button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    button.lineStyle(3, 0xFFFFFF, 1);
    button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    button.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );
    button.setDepth(302);

    const buttonText = this.add.text(width / 2, buttonY + 30, 'Start Game', {
      fontSize: '24px',
      color: '#000000',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    buttonText.setDepth(303);

    button.on('pointerover', () => {
      button.clear();
      button.fillGradientStyle(0xFFFF00, 0xFFFF00, 0xFFD700, 0xFFD700, 1);
      button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0xFFFFFF, 1);
      button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'pointer';
    });

    button.on('pointerout', () => {
      button.clear();
      button.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
      button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0xFFFFFF, 1);
      button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'default';
    });

    button.on('pointerdown', () => {
      overlay.destroy();
      box.destroy();
      button.destroy();
      buttonText.destroy();
      titleText.destroy();
      explanationText.destroy();
      this.gamePhase = 'placing';
      this.gameStartTime = Date.now(); // Track game start time
      this.phaseText.setText('Phase: Placing Gifts');
      this.bringNextGift();
    });
  }

  private bringNextGift() {
    if (this.currentGiftIndex >= this.GIFTS_CONFIG.length) {
      this.checkGameEnd();
      return;
    }

    const giftConfig = this.GIFTS_CONFIG[this.currentGiftIndex];
    const config = this.GIFT_CONFIGS[giftConfig.giftType];
    const giftNumber = this.currentGiftIndex + 1;
    const totalGifts = this.GIFTS_CONFIG.length;

    // Calculate position on table (spread gifts horizontally on counter)
    const tableSpacing = 100;
    const startX = this.TABLE_X;
    const giftX = startX + (this.currentGiftIndex * tableSpacing);
    const giftY = this.TABLE_Y; // On the counter/table surface

    const gift: Gift = {
      id: giftConfig.id,
      giftNumber: giftNumber,
      size: config.size,
      name: config.name,
      asset: config.asset,
      isOnTable: true,
      isPlaced: false,
      tableX: giftX,
      tableY: giftY
    };

    // Create gift sprite
    const sprite = this.add.sprite(giftX, giftY, config.asset);
    sprite.setScale(config.scale);
    sprite.setDepth(5);
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => {
      this.selectGift(gift);
    });
    gift.sprite = sprite;

    // Size label - dark text, smaller
    const sizeLabel = this.add.text(giftX, giftY - 20, `${config.size}u`, {
      fontSize: '11px',
      color: '#000000',
      fontStyle: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 1,
      backgroundColor: '#FFFFFFDD',
      padding: { x: 4, y: 2 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    sizeLabel.setDepth(6);
    gift.sizeLabel = sizeLabel;

    this.gifts.push(gift);

    // Update instruction
    this.instructionText.setText(`🎁 ${config.name} (${giftNumber}/${totalGifts}) - Click gift, then SMALLEST compartment!`);

    this.currentGiftIndex++;
  }

  private selectGift(gift: Gift) {
    // Deselect previous
    if (this.selectedGift && this.selectedGift.sprite) {
      this.selectedGift.sprite.clearTint();
    }

    this.selectedGift = gift;
    
    if (gift.sprite) {
      gift.sprite.setTint(0xFFD700); // Gold tint
    }

    this.instructionText.setText(`✅ ${gift.name} (${gift.size} units) → Click SMALLEST compartment that fits!`);
  }

  private attemptPlaceGift(gift: Gift, compartment: Compartment) {
    // Check if compartment has enough remaining space
    if (compartment.remainingSpace < gift.size) {
      this.showError('❌ Compartment has insufficient remaining space! Best Fit requires remaining space ≥ gift size!');
      this.wrongAttempts++;
      this.score -= 20;
      this.updateScore();
      this.cameras.main.shake(200, 0.006);
      return;
    }

    // Find all compartments that can fit this gift
    const fittingCompartments = this.compartments.filter(comp => 
      comp.remainingSpace >= gift.size
    );

    if (fittingCompartments.length === 0) {
      this.showError('❌ No compartment available for this gift!');
      this.wrongAttempts++;
      this.score -= 20;
      this.updateScore();
      this.cameras.main.shake(200, 0.006);
      return;
    }

    // Find the smallest fitting compartment (Best-Fit)
    const bestFitCompartment = fittingCompartments.reduce((smallest, comp) => {
      return comp.remainingSpace < smallest.remainingSpace ? comp : smallest;
    }, fittingCompartments[0]);

    // Validate user selection
    if (compartment.id !== bestFitCompartment.id) {
      this.showError(`❌ Wrong! Best Fit = SMALLEST compartment that fits!\nC${bestFitCompartment.compartmentNumber} (${bestFitCompartment.remainingSpace} units) is smaller than C${compartment.compartmentNumber} (${compartment.remainingSpace} units)!`);
      this.wrongAttempts++;
      this.score -= 20;
      this.updateScore();
      this.cameras.main.shake(200, 0.006);
      
      // Flash the correct compartment
      this.flashCorrectCompartment(bestFitCompartment);
      return;
    }

    // Correct allocation!
    this.placeGiftInCompartment(gift, compartment);
  }

  private flashCorrectCompartment(compartment: Compartment) {
    // Flash the label instead of a box
    if (compartment.compartmentLabel) {
      this.tweens.add({
        targets: compartment.compartmentLabel,
        scale: 1.2,
        duration: 150,
        yoyo: true,
        repeat: 3,
        ease: 'Power2'
      });
    }
  }

  private placeGiftInCompartment(gift: Gift, compartment: Compartment) {
    // Add gift to compartment's gifts array
    compartment.gifts.push(gift);
    compartment.occupied = true;
    
    // Update remaining space
    compartment.remainingSpace -= gift.size;
    
    gift.assignedCompartment = compartment;
    gift.isOnTable = false;
    gift.isPlaced = true;

    const config = this.GIFT_CONFIGS[gift.asset as keyof typeof this.GIFT_CONFIGS];
    
    // Calculate position within compartment - center the gift
    const giftIndex = compartment.gifts.length - 1;
    const xOffset = (giftIndex % 2) * 30; // Alternate left/right
    const yOffset = Math.floor(giftIndex / 2) * 40; // Stack vertically
    const placementX = compartment.x - compartment.width / 2 + compartment.width / 2 + xOffset;
    const placementY = compartment.y - compartment.height / 2 + compartment.height / 2 + yOffset;

    // Animate gift from table to compartment
    if (gift.sprite && gift.sizeLabel) {
      gift.sprite.disableInteractive();
      gift.sprite.clearTint();

      this.tweens.add({
        targets: [gift.sprite, gift.sizeLabel],
        x: placementX,
        y: placementY,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
          // Hide size label when placed
          if (gift.sizeLabel) {
            gift.sizeLabel.setVisible(false);
          }

          // Update compartment visual
          this.updateCompartmentAfterPlacement(compartment, gift);
          
          // Calculate metrics
          this.calculateMetrics();
          
          // Award points
          this.score += 100;
          this.updateScore();
          
          // Show success message
          const wastedSpace = compartment.remainingSpace;
          if (wastedSpace > 0 && compartment.remainingSpace < this.getSmallestGiftSize()) {
            this.showMessage(`✅ Placed! ${compartment.remainingSpace} units left but too small for any gift`, '#FFA500');
          } else if (wastedSpace > 0) {
            this.showMessage(`✅ Placed! ${compartment.remainingSpace} units still available`, '#00FF88');
          } else {
            this.showMessage(`✅ Perfect fit! Compartment fully utilized! +100`, '#00FF88');
          }

          // Check if all gifts are processed
          this.checkGameEnd();
        }
      });
    }

    // Update compartment label - shorter format
    if (compartment.compartmentLabel) {
      compartment.compartmentLabel.setText(`C${compartment.compartmentNumber}: ${compartment.remainingSpace}`);
    }
  }

  private getSmallestGiftSize(): number {
    const remainingGifts = this.GIFTS_CONFIG.slice(this.currentGiftIndex);
    if (remainingGifts.length === 0) {
      return Math.min(...Object.values(this.GIFT_CONFIGS).map(g => g.size));
    }
    return Math.min(...remainingGifts.map(g => this.GIFT_CONFIGS[g.giftType].size));
  }

  private updateCompartmentAfterPlacement(compartment: Compartment, gift: Gift) {
    // Remove old fragmentation text if exists
    if (compartment.fragmentationText) {
      compartment.fragmentationText.destroy();
      compartment.fragmentationText = undefined;
    }
    
    // Show fragmentation info based on remaining space
    if (compartment.remainingSpace > 0) {
      const smallestGift = this.getSmallestGiftSize();
      const isUsable = compartment.remainingSpace >= smallestGift;
      
      let warningText = '';
      let warningColor = '';
      
      if (!isUsable) {
        warningText = `⚠️ ${compartment.remainingSpace}u`;
        warningColor = '#FF0000';
      } else {
        warningText = `✓ ${compartment.remainingSpace}u`;
        warningColor = '#00FF88';
      }
      
      const fragmentationText = this.add.text(
        compartment.x,
        compartment.y + compartment.height / 2 + 15,
        warningText,
        {
          fontSize: '11px',
          color: warningColor,
          fontStyle: 'bold',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 1.5,
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }
      ).setOrigin(0.5);
      fragmentationText.setDepth(15);
      compartment.fragmentationText = fragmentationText;
    } else {
      // Compartment is perfectly full
      const fragmentationText = this.add.text(
        compartment.x,
        compartment.y + compartment.height / 2 + 15,
        `✓ Full`,
        {
          fontSize: '11px',
          color: '#00FF88',
          fontStyle: 'bold',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 1.5,
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }
      ).setOrigin(0.5);
      fragmentationText.setDepth(15);
      compartment.fragmentationText = fragmentationText;
    }
  }

  private calculateMetrics() {
    this.totalAllocated = 0;
    this.totalFragmentation = 0;

    this.compartments.forEach(compartment => {
      if (compartment.occupied && compartment.gifts.length > 0) {
        const usedSpace = compartment.size - compartment.remainingSpace;
        this.totalAllocated += compartment.size;
        
        const smallestGift = this.getSmallestGiftSize();
        if (compartment.remainingSpace > 0 && compartment.remainingSpace < smallestGift) {
          this.totalFragmentation += compartment.remainingSpace;
        }
      }
    });

    const fragmentationPercent = this.totalAllocated > 0 
      ? (this.totalFragmentation / this.totalAllocated) * 100 
      : 0;
    
    const efficiency = 100 - fragmentationPercent;

    this.fragmentationText.setText(`Fragmentation: ${fragmentationPercent.toFixed(1)}%`);
    this.efficiencyText.setText(`Efficiency: ${efficiency.toFixed(1)}%`);
  }

  private updateScore() {
    this.scoreText.setText(`Score: ${Math.max(0, this.score)}`);
  }

  private showError(message: string) {
    const { width, height } = this.sys.game.canvas;
    
    const errorText = this.add.text(width / 2, height / 2, message, {
      fontSize: '26px',
      color: '#FF0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
      backgroundColor: '#000000DD',
      padding: { x: 25, y: 18 },
      align: 'center',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    errorText.setDepth(300);

    this.tweens.add({
      targets: errorText,
      alpha: 0,
      y: errorText.y - 60,
      duration: 3500,
      ease: 'Power2',
      onComplete: () => errorText.destroy()
    });
  }

  private showMessage(message: string, color: string) {
    const { width, height } = this.sys.game.canvas;
    
    const messageText = this.add.text(width / 2, height / 2 - 120, message, {
      fontSize: '24px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
      backgroundColor: '#000000BB',
      padding: { x: 20, y: 12 },
      align: 'center',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    messageText.setDepth(300);

    this.tweens.add({
      targets: messageText,
      alpha: 0,
      y: messageText.y - 60,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => messageText.destroy()
    });
  }

  private checkGameEnd() {
    const placedCount = this.gifts.filter(g => g.isPlaced).length;
    const totalGifts = this.GIFTS_CONFIG.length;
    
    // Check if all gifts have been processed (placed or rejected)
    // All gifts have arrived when currentGiftIndex >= totalGifts
    // But we need to wait for the last gift to be placed
    if (this.currentGiftIndex >= totalGifts) {
      // Check if all arrived gifts are placed
      const allPlaced = this.gifts.length === totalGifts && this.gifts.every(g => g.isPlaced || !g.isOnTable);
      if (allPlaced || placedCount + this.externalFragmentationCount >= totalGifts) {
        this.time.delayedCall(1000, () => {
          this.showResults();
        });
        return;
      }
    }
    
    // Bring next gift if available
    if (this.currentGiftIndex < totalGifts) {
      this.selectedGift = undefined;
      this.time.delayedCall(1500, () => {
        this.bringNextGift();
      });
    }
  }

  private showResults() {
    this.gamePhase = 'results';
    this.phaseText.setText('Phase: Results & Analysis');
    
    const { width, height } = this.sys.game.canvas;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.92);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(400);

    const boxWidth = 700;
    const boxHeight = 550;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const box = this.add.graphics();
    box.fillStyle(0x0a0e27, 0.98);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.lineStyle(4, 0xFFD700, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.setDepth(401);

    // Title
    this.add.text(width / 2, boxY + 50, '📊 GAME RESULTS', {
      fontSize: '36px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(402);

    // Calculate final metrics
    const placedGifts = this.gifts.filter(g => g.isPlaced).length;
    const totalGiftsGenerated = this.GIFTS_CONFIG.length;
    const rejectedGifts = this.externalFragmentationCount;
    const internalFragmentation = this.totalFragmentation;
    const internalFragPercent = this.totalAllocated > 0 
      ? (internalFragmentation / this.totalAllocated) * 100 
      : 0;
    const efficiency = 100 - internalFragPercent;
    const utilization = (this.totalAllocated / this.totalCompartmentSpace) * 100;
    const usedSpace = this.totalAllocated - internalFragmentation;

    const metricsY = boxY + 110;
    
    // Gifts Summary
    this.add.text(boxX + 50, metricsY, '🎁 Gifts Summary', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    const giftSummary = `   Generated: ${totalGiftsGenerated}  |  Placed: ${placedGifts}  |  Rejected: ${rejectedGifts}`;
    this.add.text(boxX + 50, metricsY + 35, giftSummary, {
      fontSize: '18px',
      color: '#E0E0E0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    // Space Summary
    this.add.text(boxX + 50, metricsY + 85, '📦 Space Summary', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    const spaceSummary = `   Total: ${this.totalCompartmentSpace} units  |  Allocated: ${this.totalAllocated} units  |  Used: ${usedSpace} units`;
    this.add.text(boxX + 50, metricsY + 120, spaceSummary, {
      fontSize: '18px',
      color: '#E0E0E0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    // Fragmentation
    this.add.text(boxX + 50, metricsY + 170, '⚠️ Fragmentation Analysis', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    const fragText = `   Internal: ${internalFragmentation} units (${internalFragPercent.toFixed(1)}%)  |  External: ${rejectedGifts} gift(s)`;
    this.add.text(boxX + 50, metricsY + 205, fragText, {
      fontSize: '18px',
      color: rejectedGifts > 0 || internalFragmentation > 0 ? '#FF6B6B' : '#00FF88',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    // Performance
    this.add.text(boxX + 50, metricsY + 255, '📊 Performance', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    const perfText = `   Efficiency: ${efficiency.toFixed(1)}%  |  Utilization: ${utilization.toFixed(1)}%`;
    this.add.text(boxX + 50, metricsY + 290, perfText, {
      fontSize: '18px',
      color: '#00FF88',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    // Score
    this.add.text(width / 2, boxY + boxHeight - 120, `Final Score: ${Math.max(0, this.score)}`, {
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(402);

    // Submit score to backend
    this.submitScore();

    // Buttons
    const buttonY = boxY + boxHeight - 70;
    this.createResultButton(width / 2 - 100, buttonY, 'Restart', () => {
      this.scene.restart();
    });

    this.createResultButton(width / 2 + 100, buttonY, 'Exit', () => {
      this.showMessage('Exiting game...', '#FFD700');
    });
  }

  private createResultButton(x: number, y: number, label: string, callback: () => void) {
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonX = x - buttonWidth / 2;

    const button = this.add.graphics();
    button.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
    button.fillRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
    button.lineStyle(3, 0xFFFFFF, 1);
    button.strokeRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
    button.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, y, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );
    button.setDepth(402);

    const buttonText = this.add.text(x, y + 25, label, {
      fontSize: '20px',
      color: '#000000',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    buttonText.setDepth(403);

    button.on('pointerover', () => {
      button.clear();
      button.fillGradientStyle(0xFFFF00, 0xFFFF00, 0xFFD700, 0xFFD700, 1);
      button.fillRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0xFFFFFF, 1);
      button.strokeRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'pointer';
    });

    button.on('pointerout', () => {
      button.clear();
      button.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFA500, 0xFFA500, 1);
      button.fillRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0xFFFFFF, 1);
      button.strokeRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'default';
    });

    button.on('pointerdown', callback);
  }

  private async submitScore() {
    try {
      const timeSpent = Math.floor((Date.now() - this.gameStartTime) / 1000); // Convert to seconds
      const accuracy = this.totalAllocated > 0 
        ? Math.round((1 - (this.totalFragmentation / this.totalAllocated)) * 100)
        : 100;
      
      const internalFragPercent = this.totalAllocated > 0 
        ? (this.totalFragmentation / this.totalAllocated) * 100 
        : 0;
      const efficiency = 100 - internalFragPercent;
      const utilization = (this.totalAllocated / this.totalCompartmentSpace) * 100;

      const response = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: 'best-fit-l1',
          moduleId: 'memory-management',
          levelId: 'l1',
          score: Math.max(0, this.score),
          timeSpent,
          accuracy,
          wrongAttempts: this.wrongAttempts,
          metadata: {
            placedGifts: this.gifts.filter(g => g.isPlaced).length,
            totalGifts: this.gifts.length,
            efficiency,
            utilization,
            internalFragmentation: this.totalFragmentation,
            externalFragmentation: this.externalFragmentationCount
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.achievementsUnlocked && result.achievementsUnlocked.length > 0) {
          // Show achievement notification
          this.showMessage(
            `🎉 Achievement Unlocked! ${result.achievementsUnlocked.length} new achievement(s)`,
            '#00FF00',
            3000
          );
        }
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
      // Don't show error to user, just log it
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
}

