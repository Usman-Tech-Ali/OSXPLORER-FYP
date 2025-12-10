import Phaser from 'phaser';

interface ParkingSlot {
  id: string;
  slotNumber: number;
  size: number; // Total size in units (50=small, 100=medium, 200=large)
  remainingSpace: number; // Remaining available space in units
  x: number;
  y: number;
  width: number;
  height: number;
  occupied: boolean; // True if any vehicle is parked here
  vehicles: Vehicle[]; // Array of vehicles parked in this slot
  slotBg?: Phaser.GameObjects.Graphics;
  slotLabel?: Phaser.GameObjects.Text;
  fragmentationOverlay?: Phaser.GameObjects.Graphics;
  fragmentationText?: Phaser.GameObjects.Text;
}

interface Vehicle {
  id: string;
  type: 'bike' | 'car' | 'truck';
  size: number;
  name: string;
  sprite?: Phaser.GameObjects.Sprite;
  sizeLabel?: Phaser.GameObjects.Text;
  isOnRoad: boolean;
  isParked: boolean;
  assignedSlot?: ParkingSlot;
  roadY: number; // Y position on the road
}

export class FirstFitGameL2 extends Phaser.Scene {
  // Game State
  private gamePhase: 'intro' | 'parking' | 'results' = 'intro';
  private parkingSlots: ParkingSlot[] = [];
  private vehicles: Vehicle[] = [];
  private currentVehicleIndex: number = 0;
  private selectedVehicle?: Vehicle;
  private totalFragmentation: number = 0;
  private totalAllocated: number = 0;
  private totalSlotSpace: number = 0;
  private score: number = 0;
  private wrongAttempts: number = 0;
  private externalFragmentationCount: number = 0; // Track rejected trucks
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
  private currentMovingSound?: Phaser.Sound.BaseSound;

  // Layout constants
  private readonly PARKING_AREA_X = 900; // Right side - parking area
  private readonly ROAD_START_X = 400; // Left side - road area (where vehicle stops)
  private readonly ROAD_END_X = -200; // Start of road (off-screen left)
  private readonly ROAD_Y = 450; // Y position of the road (centered vertically in background2)

  // Vehicle configurations with larger scales
  private readonly VEHICLE_CONFIGS = {
    bike: { 
      name: 'Bike', 
      size: 25, 
      comingAsset: 'bike1-coming', 
      parkedAsset: 'bike1-parked', 
      emoji: '🏍️',
      scale: 0.5 // Smaller scale for 25 units
    },
    car: { 
      name: 'Car', 
      size: 50, 
      comingAsset: 'orange-car-coming', 
      parkedAsset: 'orange-car-parked', 
      emoji: '🚗',
      scale: 0.65 // Medium scale for 50 units
    },
    truck: { 
      name: 'Truck', 
      size: 100, 
      comingAsset: 'truck1-coming', 
      parkedAsset: 'truck-parked', 
      emoji: '🚛',
      scale: 0.8 // Larger scale for 100 units
    }
  };

  // Parking slots positioned to center vehicles in background asset circles
  private readonly PARKING_SLOTS_CONFIG = [
    // Top row - 3 Trucks (100 units each) and 3 Bikes (25 units each) - NOW ON RIGHT SIDE
    { slotNumber: 1, size: 100, x: 850, y: 300, label: 'S1: 100 units' },    // Truck 1
    { slotNumber: 2, size: 100, x: 1040, y: 300, label: 'S2: 100 units' },   // Truck 2
    { slotNumber: 3, size: 100, x: 1210, y: 300, label: 'S3: 100 units' },   // Truck 3
    { slotNumber: 4, size: 25, x: 1340, y: 300, label: 'S4: 25  \n units' },     // Bike 1
    { slotNumber: 5, size: 25, x: 1420, y: 300, label: 'S5: 25  \n units' },     // Bike 2
    { slotNumber: 6, size: 25, x: 1500, y: 300, label: 'S6: 25  \n units' },     // Bike 3

    // Bottom row - 5 Cars (50 units each) - NOW ON RIGHT SIDE
    { slotNumber: 7, size: 50, x: 830, y: 430, label: 'S7: 50 units' },        // Car 1
    { slotNumber: 8, size: 50, x: 970, y: 430, label: 'S8: 50 units' },       // Car 2
    { slotNumber: 9, size: 50, x: 1120, y: 430, label: 'S9: 50 units' },       // Car 3
    { slotNumber: 10, size: 50, x: 1260, y: 430, label: 'S10: 50 units' },     // Car 4
    { slotNumber: 11, size: 50, x: 1400, y: 430, label: 'S11: 50 units' },     // Car 5
  ];

  // Vehicles that will arrive on the road sequentially (will be randomized in constructor)
  private VEHICLES_CONFIG: Array<{ type: 'bike' | 'car' | 'truck', id: string }> = [];

  constructor() {
    super({ key: 'FirstFitGameL2' });
  }

  /**
   * Generates a random set of vehicles for the game
   * Returns between 4-7 vehicles with random types
   * Constraints: Max 3 trucks, Max 6 cars, Unlimited bikes
   * Note: Trucks can be generated even if no 100-unit space is available
   * (they will trigger external fragmentation when they arrive)
   */
  private generateRandomVehicles(): Array<{ type: 'bike' | 'car' | 'truck', id: string }> {
    const numVehicles = Phaser.Math.Between(8, 12); // Medium difficulty: 8-12 vehicles
    const vehicles: Array<{ type: 'bike' | 'car' | 'truck', id: string }> = [];
    
    // Track counts to enforce limits
    let truckCount = 0;
    let carCount = 0;
    const MAX_TRUCKS = 4;
    const MAX_CARS = 8;
    
    for (let i = 0; i < numVehicles; i++) {
      // Build available types based on current counts
      const availableTypes: Array<'bike' | 'car' | 'truck'> = ['bike']; // Bikes always available
      
      if (carCount < MAX_CARS) {
        availableTypes.push('car');
      }
      
      if (truckCount < MAX_TRUCKS) {
        availableTypes.push('truck');
      }
      
      // Select random type from available options
      const randomType = Phaser.Utils.Array.GetRandom(availableTypes);
      
      // Update counts
      if (randomType === 'truck') {
        truckCount++;
      } else if (randomType === 'car') {
        carCount++;
      }
      
      vehicles.push({
        type: randomType,
        id: `v${i + 1}`
      });
    }
    
    return vehicles;
  }

  preload() {
    const assetPath = '/games/memory-management/';
    
    // Load backgrounds
    this.load.image('bg-1', `${assetPath}background-1.png`);
    this.load.image('bg-2', `${assetPath}background-2.png`);
    
    // Load vehicle sprites
    this.load.image('bike1-coming', `${assetPath}bike1-coming.png`);
    this.load.image('bike1-parked', `${assetPath}bike1-parked.png`);
    this.load.image('bike2-coming', `${assetPath}bike2-coming.png`);
    this.load.image('bike2-parked', `${assetPath}bike2-parked.png`);
    this.load.image('orange-car-coming', `${assetPath}orange-car-coming.png`);
    this.load.image('orange-car-parked', `${assetPath}orange-car-parked.png`);
    this.load.image('orange2-car-coming', `${assetPath}orange2-car-coming.png`);
    this.load.image('orange2-car-parked', `${assetPath}orange2-car-parked.png`);
    this.load.image('truck1-coming', `${assetPath}truck2-coming.png`);
    this.load.image('truck2-coming', `${assetPath}truck2-coming.png`);
    this.load.image('truck-parked', `${assetPath}truck-parked.png`);

    // Load sounds
    const soundsPath = `${assetPath}sounds/`;
    this.load.audio('bg-music', `${soundsPath}background_music.flac`);
    this.load.audio('bike-moving', `${soundsPath}bike_moving.wav`);
    this.load.audio('car-moving', `${soundsPath}car_moving.wav`);
    this.load.audio('truck-moving', `${soundsPath}truck_moving.mp3`);
    this.load.audio('vehicle-parked', `${soundsPath}vehicle_parked.mp3`);
  }

  create() {
    const { width, height } = this.sys.game.canvas;
    
    // Generate random vehicles for this game session
    this.VEHICLES_CONFIG = this.generateRandomVehicles();
    
    // Create dual background
    this.createBackground(width, height);
    
    // Create UI
    this.createUI(width, height);
    
    // Start background music
    if (!this.bgm) {
      this.bgm = this.sound.add('bg-music', { loop: true, volume: 0.35 });
    }
    if (this.bgm && !this.bgm.isPlaying) {
      this.bgm.play();
    }

    // Cleanup sounds on shutdown/destroy
    this.events.on('shutdown', () => {
      if (this.currentMovingSound && this.currentMovingSound.isPlaying) {
        this.currentMovingSound.stop();
      }
      if (this.bgm && this.bgm.isPlaying) {
        this.bgm.stop();
      }
    });
    this.events.on('destroy', () => {
      if (this.currentMovingSound && this.currentMovingSound.isPlaying) {
        this.currentMovingSound.stop();
      }
      if (this.bgm && this.bgm.isPlaying) {
        this.bgm.stop();
      }
    });

    // Show intro
    this.showIntroScenario(width, height);
  }

  private playMovingSoundFor(type: 'bike' | 'car' | 'truck') {
    if (this.currentMovingSound && this.currentMovingSound.isPlaying) {
      this.currentMovingSound.stop();
    }
    const key = type === 'bike' ? 'bike-moving' : type === 'car' ? 'car-moving' : 'truck-moving';
    const vol = type === 'truck' ? 0.6 : type === 'car' ? 0.5 : 0.45;
    this.currentMovingSound = this.sound.add(key, { volume: vol });
    this.currentMovingSound.play();
  }

  private stopMovingSound() {
    if (this.currentMovingSound && this.currentMovingSound.isPlaying) {
      this.currentMovingSound.stop();
    }
  }

  private playParkedSound() {
    this.sound.play('vehicle-parked', { volume: 0.6 });
  }

  private createBackground(width: number, height: number) {
    // Background 2 (left half - road area)
    const bg2 = this.add.image(0, height / 2, 'bg-2');
    bg2.setOrigin(0, 0.4);
    const scale2X = (width / 2) / bg2.width;
    const scale2Y = height / bg2.height-50;
    const scale2 = Math.max(scale2X, scale2Y);
    bg2.setScale(scale2);
    bg2.setDepth(-100);

    // Background 1 (right half - parking area)
    const bg1 = this.add.image(width / 2 , height / 2, 'bg-1');
    bg1.setOrigin(0, 0.4);
    const scale1X = (width / 2) / bg1.width;
    const scale1Y = height / bg1.height-50;
    const scale1 = Math.max(scale1X, scale1Y);
    bg1.setScale(scale1);
    bg1.setDepth(-100);
  }

  private createUI(width: number, height: number) {
    // Title with modern styling
    const titleText = this.add.text(width / 2, 45, '🅿️ FIRST FIT Parking Allocator', {
      fontSize: '36px',
      color: '#00E5FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
      backgroundColor: '#00000099',
      padding: { x: 20, y: 10 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    titleText.setDepth(200);

    // Phase indicator
    this.phaseText = this.add.text(width / 2, 95, 'Phase: Intro', {
      fontSize: '20px',
      color: '#00FF88',
      fontStyle: '600',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 12, y: 6 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    this.phaseText.setDepth(200);

    // Score
    this.scoreText = this.add.text(width - 200, 100, 'Score: 0', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: '600',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 12, y: 6 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    });
    this.scoreText.setDepth(200);

    // Fragmentation - moved to proper top-left position
    this.fragmentationText = this.add.text(5, 30, 'Fragmentation: 0%', {
      fontSize: '20px',
      color: '#FF6B6B',
      fontStyle: '600',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 12, y: 6 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    });
    this.fragmentationText.setDepth(200);

    // Efficiency - moved to proper top-left position
    this.efficiencyText = this.add.text(5, 67, 'Efficiency: 100%', {
      fontSize: '20px',
      color: '#00E5FF',
      fontStyle: '600',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 12, y: 6 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    });
    this.efficiencyText.setDepth(200);

    // Instruction text
    this.instructionText = this.add.text(width / 2, height - 50, '', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: '600',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    this.instructionText.setDepth(200);
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
    scenarioBox.lineStyle(4, 0x00E5FF, 1);
    scenarioBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    scenarioBox.setDepth(301);

    const title = this.add.text(width / 2, boxY + 50, '🅿️ FIRST FIT ALGORITHM', {
      fontSize: '36px',
      color: '#00E5FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(width / 2, boxY + 95, 'Memory Management Game', {
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
      color: '#00E5FF',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const howToPlay = `   1. Vehicles arrive randomly on the road
   2. Click a vehicle to select it
   3. Click the FIRST available parking slot
   4. Multiple vehicles can share a slot if space allows`;

    const howToPlayText = this.add.text(boxX + 50, contentY + 35, howToPlay, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Rules
    const rulesTitle = this.add.text(boxX + 50, contentY + 145, '⚠️ First Fit Rules', {
      fontSize: '20px',
      color: '#00E5FF',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const rules = `   • Always choose the FIRST slot with enough space
   • Slots are checked from top to bottom (S1 → S11)
   • Unused remaining space = Internal Fragmentation
   • Rejected trucks = External Fragmentation`;

    const rulesText = this.add.text(boxX + 50, contentY + 180, rules, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Goals
    const goalTitle = this.add.text(boxX + 50, contentY + 280, '🎯 Goal', {
      fontSize: '20px',
      color: '#00E5FF',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    const goal = `   Park all vehicles efficiently while minimizing fragmentation!`;

    const goalText = this.add.text(boxX + 50, contentY + 315, goal, {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: '600',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(302);

    // Start button
    const buttonWidth = 200;
    const buttonHeight = 55;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 75;

    const startButton = this.add.graphics();
    startButton.fillGradientStyle(0x00E5FF, 0x00E5FF, 0x00A8CC, 0x00A8CC, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    startButton.lineStyle(3, 0x00FFFF, 1);
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
      startButton.fillGradientStyle(0x00FFFF, 0x00FFFF, 0x00CCEE, 0x00CCEE, 1);
      startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      startButton.lineStyle(3, 0x00FFFF, 1);
      startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      this.sys.canvas.style.cursor = 'pointer';
    });

    startButton.on('pointerout', () => {
      startButton.clear();
      startButton.fillGradientStyle(0x00E5FF, 0x00E5FF, 0x00A8CC, 0x00A8CC, 1);
      startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      startButton.lineStyle(3, 0x00FFFF, 1);
      startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
      this.sys.canvas.style.cursor = 'default';
    });

    startButton.on('pointerdown', () => {
      // Destroy all intro elements
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
      
      this.startParkingPhase();
    });
  }

  private startParkingPhase() {
      this.gamePhase = 'parking';
      this.gameStartTime = Date.now(); // Track game start time
    const totalVehicles = this.VEHICLES_CONFIG.length;
    this.phaseText.setText(`Phase: Parking (First Fit) | ${totalVehicles} Vehicles`);
    this.instructionText.setText(`🚗 ${totalVehicles} random vehicles will arrive! Click vehicle → Click FIRST available slot!`);
    
    // Create parking slots on the left (parking area)
    this.createParkingSlots();
    
    // Start bringing vehicles onto the road
    this.bringNextVehicle();
  }

  private createParkingSlots() {
    this.PARKING_SLOTS_CONFIG.forEach((config, index) => {
      const slot: ParkingSlot = {
        id: `slot-${config.slotNumber}`,
        slotNumber: config.slotNumber,
        size: config.size,
        remainingSpace: config.size, // Initially all space is available
        x: config.x,
        y: config.y,
        width: 80,
        height: 80,
        occupied: false,
        vehicles: [] // Initially no vehicles
      };

      // Create invisible interactive area that matches the existing background asset circles/P marks
      // NO custom graphics drawing - just an invisible hit area
      const slotBg = this.add.graphics();
      slotBg.setDepth(5);
      
      // Make slot interactive using the existing background asset area
      let new_y = 0;
      if (config.slotNumber > 6) {
        new_y += 160; // Adjust Y for bottom row slots
      }
      const hitArea = new Phaser.Geom.Circle(slot.x, slot.y + new_y, 60);
      slotBg.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
      
      slotBg.on('pointerover', () => {
        if (slot.remainingSpace > 0 && this.selectedVehicle) {
          // Only change cursor if slot has space available
          this.sys.canvas.style.cursor = 'pointer';
        }
      });

      slotBg.on('pointerout', () => {
        this.sys.canvas.style.cursor = 'default';
      });

      slotBg.on('pointerdown', () => {
        if (this.selectedVehicle && slot.remainingSpace > 0) {
          this.attemptParkVehicle(this.selectedVehicle, slot);
        }
      });

      // Slot label below the existing background asset - use custom label if provided
      const labelText = (config as any).label || `S${config.slotNumber}\n[${config.size} units]`;
      const slotLabel = this.add.text(slot.x, slot.y + 60, labelText, {
        fontSize: '14px',
        color: '#00E5FF',
        fontStyle: '600',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }).setOrigin(0.5);
      slotLabel.setDepth(6);

      slot.slotBg = slotBg;
      slot.slotLabel = slotLabel;
      
      this.parkingSlots.push(slot);
      this.totalSlotSpace += slot.size;
    });
  }

  private bringNextVehicle() {
    if (this.currentVehicleIndex >= this.VEHICLES_CONFIG.length) {
      console.log(`[BringNext] All vehicles processed. Index: ${this.currentVehicleIndex}`);
      return; // All vehicles have arrived
    }

    const vehicleConfig = this.VEHICLES_CONFIG[this.currentVehicleIndex];
    const config = this.VEHICLE_CONFIGS[vehicleConfig.type];
    
    console.log(`[BringNext] Bringing vehicle ${this.currentVehicleIndex + 1}/${this.VEHICLES_CONFIG.length}: ${config.name} (${vehicleConfig.type})`);
    
    const vehicle: Vehicle = {
      id: vehicleConfig.id,
      type: vehicleConfig.type,
      size: config.size,
      name: config.name,
      isOnRoad: true,
      isParked: false,
      roadY: this.ROAD_Y // Use the road Y position (ground level)
    };

    // Create sprite starting from far left (off-screen) at ground level
    const sprite = this.add.sprite(this.ROAD_END_X, this.ROAD_Y, config.comingAsset);
    sprite.setScale(config.scale);
    sprite.setDepth(50);
    sprite.setInteractive({ useHandCursor: true });
    sprite.setFlipX(true); // Face right (coming from left towards parking on right)

    // Size label above the vehicle
    const sizeLabel = this.add.text(this.ROAD_END_X, this.ROAD_Y - 50, `${config.emoji} ${config.name}\n${config.size} units`, {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: '600',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      backgroundColor: '#00000099',
      padding: { x: 10, y: 6 },
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    sizeLabel.setDepth(51);

    sprite.on('pointerdown', () => {
      if (vehicle.isOnRoad && !vehicle.isParked) {
        this.selectVehicle(vehicle);
      }
    });

    sprite.on('pointerover', () => {
      if (vehicle.isOnRoad && !vehicle.isParked) {
        this.sys.canvas.style.cursor = 'pointer';
      }
    });

    sprite.on('pointerout', () => {
      this.sys.canvas.style.cursor = 'default';
    });

    vehicle.sprite = sprite;
    vehicle.sizeLabel = sizeLabel;

    // Animate vehicle coming onto the road (moving right from left) at ground level
    this.tweens.add({
      targets: [sprite, sizeLabel],
      x: this.ROAD_START_X,
      duration: 2500,
      ease: 'Power2',
      onStart: () => {
        this.playMovingSoundFor(vehicleConfig.type);
      },
      onComplete: () => {
        this.stopMovingSound();
        // Vehicle has arrived
        const totalVehicles = this.VEHICLES_CONFIG.length;
        
        // Check for external fragmentation AFTER the truck arrives on the road
        if (vehicleConfig.type === 'truck') {
          const has100SpaceAvailable = this.parkingSlots.some(slot => slot.remainingSpace >= 100);
          
          if (!has100SpaceAvailable) {
            // Calculate total free space across all slots
            const totalFreeSpace = this.parkingSlots.reduce((sum, slot) => sum + slot.remainingSpace, 0);
            
            console.log(`[External Frag] Truck ${this.currentVehicleIndex} rejected. No 100-unit space available.`);
            
            // Show message that truck arrived
            this.instructionText.setText(`🚛 ${config.name} (High Process) arrived but cannot be parked!`);
            
            // Wait a moment, then show external fragmentation popup
            // NOTE: currentVehicleIndex was already incremented before this callback
            this.time.delayedCall(1500, () => {
              this.showExternalFragmentation(totalFreeSpace, vehicle);
            });
            return;
          }
        }
        
        // Add vehicle to the list only if it will be parked (not rejected)
        this.vehicles.push(vehicle);
        const vehicleNumber = this.vehicles.length;
        
        console.log(`[Vehicle Arrived] ${config.name} added to vehicles array. vehicles.length = ${this.vehicles.length}, currentIndex = ${this.currentVehicleIndex}`);
        
        this.instructionText.setText(`🚗 ${config.name} arrived (${vehicleNumber}/${totalVehicles})! Click it, then click the FIRST slot that fits!`);
      }
    });

    this.currentVehicleIndex++;
  }

  private selectVehicle(vehicle: Vehicle) {
    // Deselect previous
    if (this.selectedVehicle && this.selectedVehicle.sprite) {
      this.selectedVehicle.sprite.clearTint();
    }

    this.selectedVehicle = vehicle;
    
    if (vehicle.sprite) {
      vehicle.sprite.setTint(0xFFD700);
    }

    this.instructionText.setText(`✅ ${vehicle.name} selected (${vehicle.size} units) → Click the FIRST slot that fits!`);
  }

  private attemptParkVehicle(vehicle: Vehicle, slot: ParkingSlot) {
    // Check if slot has enough remaining space for the vehicle
    if (slot.remainingSpace < vehicle.size) {
      this.showError('❌ Slot has insufficient remaining space! First Fit requires remaining space ≥ vehicle size!');
      this.wrongAttempts++;
      this.score -= 20;
      this.updateScore();
      this.cameras.main.shake(200, 0.006);
      return;
    }

    // Check if this is the first fit (first available slot with enough space from top to bottom)
    const firstFitSlot = this.parkingSlots.find(s => s.remainingSpace >= vehicle.size);

    if (!firstFitSlot) {
      this.showError('❌ No slot available for this vehicle!');
      this.wrongAttempts++;
      this.score -= 20;
      this.updateScore();
      this.cameras.main.shake(200, 0.006);
      return;
    }

    if (slot.id !== firstFitSlot.id) {
      this.showError(`❌ Wrong! First Fit = FIRST available slot with enough space!\nS${firstFitSlot.slotNumber} comes before S${slot.slotNumber}!`);
      this.wrongAttempts++;
      this.score -= 20;
      this.updateScore();
      this.cameras.main.shake(200, 0.006);
      return;
    }

    // Correct allocation!
    this.parkVehicleInSlot(vehicle, slot);
  }

  private parkVehicleInSlot(vehicle: Vehicle, slot: ParkingSlot) {
    // Add vehicle to slot's vehicles array
    slot.vehicles.push(vehicle);
    slot.occupied = true;
    
    // Update remaining space
    slot.remainingSpace -= vehicle.size;
    
    vehicle.assignedSlot = slot;
    vehicle.isOnRoad = false;

    const config = this.VEHICLE_CONFIGS[vehicle.type];
    
    // Adjust parking Y position based on slot row
    // Row 1 (slots 1-6): y = 300, Row 2 (slots 7-11): y = 430
    const parkingY = slot.slotNumber <= 6 ? slot.y-50 : slot.y + 160; // Add offset for bottom row
    
    // Calculate X offset based on how many vehicles are already in this slot
    const vehicleIndex = slot.vehicles.length - 1;
    const xOffset = vehicleIndex * 45; // Space between multiple vehicles (increased from 25 to 45)
    const parkingX = slot.x + xOffset;

    // Animate vehicle from road to parking slot
    if (vehicle.sprite && vehicle.sizeLabel) {
      vehicle.sprite.disableInteractive();
      vehicle.sprite.clearTint();

      this.tweens.add({
        targets: [vehicle.sprite, vehicle.sizeLabel],
        x: parkingX,
        y: parkingY,
        duration: 1800,
        ease: 'Power2',
        onStart: () => {
          // Flip sprite to face right when moving to parking
          if (vehicle.sprite) {
            vehicle.sprite.setFlipX(false);
          }
          this.playMovingSoundFor(vehicle.type);
        },
        onComplete: () => {
          this.stopMovingSound();
          // Change to parked sprite
          if (vehicle.sprite) {
            vehicle.sprite.setTexture(config.parkedAsset);
            // Scale down when parked
            vehicle.sprite.setScale(config.scale * 0.7);
            // Ensure centering after texture and scale change
            vehicle.sprite.setPosition(parkingX, parkingY);
            vehicle.isParked = true;
          }

          // Hide size label when parked
          if (vehicle.sizeLabel) {
            vehicle.sizeLabel.setVisible(false);
          }

          // Play parked confirmation sound
          this.playParkedSound();

          // Update slot visual
          this.updateSlotAfterParking(slot, vehicle);
          
          // Calculate metrics
          this.calculateMetrics();
          
          // Award points
          this.score += 100;
          this.updateScore();
          
          // Show success message
          const usedSpace = slot.size - slot.remainingSpace;
          const wastedSpace = slot.remainingSpace;
          if (wastedSpace > 0 && slot.remainingSpace < this.getSmallestVehicleSize()) {
            this.showMessage(`✅ Parked! ${slot.remainingSpace} units left but too small for any vehicle`, '#FFA500');
          } else if (wastedSpace > 0) {
            this.showMessage(`✅ Parked! ${slot.remainingSpace} units still available in this slot`, '#00FF88');
          } else {
            this.showMessage(`✅ Perfect fit! Slot fully utilized! +100`, '#00FF88');
          }

          // Check if all vehicles are processed (parked or skipped due to external fragmentation)
          this.checkGameEnd();
        }
      });
    }

    // Slot now has vehicle(s) - update slot label to show remaining space
    if (slot.slotLabel) {
      slot.slotLabel.setText(`S${slot.slotNumber}\n${slot.remainingSpace}/${slot.size} units`);
    }
  }

  private getSmallestVehicleSize(): number {
    // Return the smallest vehicle size from remaining vehicles
    const remainingVehicles = this.VEHICLES_CONFIG.slice(this.currentVehicleIndex);
    if (remainingVehicles.length === 0) {
      return Math.min(...Object.values(this.VEHICLE_CONFIGS).map(v => v.size));
    }
    return Math.min(...remainingVehicles.map(v => this.VEHICLE_CONFIGS[v.type].size));
  }

  private updateSlotAfterParking(slot: ParkingSlot, vehicle: Vehicle) {
    // Remove old fragmentation text if exists
    if (slot.fragmentationText) {
      slot.fragmentationText.destroy();
      slot.fragmentationText = undefined;
    }
    
    // Show fragmentation info based on remaining space
    if (slot.remainingSpace > 0) {
      const smallestVehicle = this.getSmallestVehicleSize();
      const isUsable = slot.remainingSpace >= smallestVehicle;
      
      let warningText = '';
      let warningColor = '';
      
      if (!isUsable) {
        warningText = `⚠️ ${slot.remainingSpace} units wasted`;
        warningColor = '#FF0000';
      } else {
        warningText = `✓ ${slot.remainingSpace} units free`;
        warningColor = '#00FF88';
      }
      
      const fragmentationText = this.add.text(
        slot.x,
        slot.y + 80,
        warningText,
        {
          fontSize: '14px',
          color: warningColor,
          fontStyle: 'bold',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 2,
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }
      ).setOrigin(0.5);
      fragmentationText.setDepth(7);
      slot.fragmentationText = fragmentationText;
    } else {
      // Slot is perfectly full
      const fragmentationText = this.add.text(
        slot.x,
        slot.y + 80,
        `✓ Full`,
        {
          fontSize: '14px',
          color: '#00FF88',
          fontStyle: 'bold',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 2,
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }
      ).setOrigin(0.5);
      fragmentationText.setDepth(7);
      slot.fragmentationText = fragmentationText;
    }
  }

  private calculateMetrics() {
    this.totalAllocated = 0;
    this.totalFragmentation = 0;

    this.parkingSlots.forEach(slot => {
      if (slot.occupied && slot.vehicles.length > 0) {
        // Calculate total space used by this slot
        const usedSpace = slot.size - slot.remainingSpace;
        this.totalAllocated += slot.size; // Count the entire slot as allocated if any vehicle uses it
        
        // Fragmentation is the remaining space that cannot fit the smallest remaining vehicle
        const smallestVehicle = this.getSmallestVehicleSize();
        if (slot.remainingSpace > 0 && slot.remainingSpace < smallestVehicle) {
          // This remaining space is wasted (internal fragmentation)
          this.totalFragmentation += slot.remainingSpace;
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

  private showExternalFragmentation(totalFreeSpace: number, vehicle: Vehicle) {
    const { width, height } = this.sys.game.canvas;
    
    // Create semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(350);

    // Create smaller popup box
    const boxWidth = 550;
    const boxHeight = 320;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const box = this.add.graphics();
    box.fillStyle(0x1a0000, 0.95);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 16);
    box.lineStyle(5, 0xFF3333, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 16);
    box.setDepth(351);

    // Title
    const title = this.add.text(width / 2, boxY + 45, '⚠️ EXTERNAL FRAGMENTATION', {
      fontSize: '28px',
      color: '#FF3333',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    title.setDepth(352);

    // Explanation
    const explanationText = `🚛 Truck (100 units) cannot be parked!

No single slot has 100 contiguous units
Total free space: ${totalFreeSpace} units

This demonstrates EXTERNAL FRAGMENTATION:
Memory exists but not in a single block!`;

    const explanation = this.add.text(width / 2, boxY + 150, explanationText, {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: '600',
      align: 'center',
      lineSpacing: 8,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    explanation.setDepth(352);

    // Continue button
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 65;

    const button = this.add.graphics();
    button.fillGradientStyle(0xFF6B6B, 0xFF6B6B, 0xFF0000, 0xFF0000, 1);
    button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    button.lineStyle(3, 0xFF0000, 1);
    button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    button.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );
    button.setDepth(352);

    const buttonText = this.add.text(width / 2, buttonY + 25, 'Continue', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    buttonText.setDepth(353);

    button.on('pointerover', () => {
      button.clear();
      button.fillGradientStyle(0xFF8888, 0xFF8888, 0xFF2222, 0xFF2222, 1);
      button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0xFF0000, 1);
      button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'pointer';
    });

    button.on('pointerout', () => {
      button.clear();
      button.fillGradientStyle(0xFF6B6B, 0xFF6B6B, 0xFF0000, 0xFF0000, 1);
      button.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0xFF0000, 1);
      button.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'default';
    });

    button.on('pointerdown', () => {
      // Destroy popup
      overlay.destroy();
      box.destroy();
      title.destroy();
      explanation.destroy();
      button.destroy();
      buttonText.destroy();
      this.sys.canvas.style.cursor = 'default';
      
      // Increment external fragmentation counter
      this.externalFragmentationCount++;
      
      // Animate truck leaving (going back)
      if (vehicle.sprite && vehicle.sizeLabel) {
        vehicle.sprite.setTint(0xFF6666); // Red tint to show rejection
        this.tweens.add({
          targets: [vehicle.sprite, vehicle.sizeLabel],
          x: this.ROAD_END_X,
          duration: 2000,
          ease: 'Power2',
          onStart: () => {
            this.playMovingSoundFor(vehicle.type);
          },
          onComplete: () => {
            this.stopMovingSound();
            vehicle.sprite?.destroy();
            vehicle.sizeLabel?.destroy();
            
            // Check if game should end after truck leaves
            this.checkGameEnd();
          }
        });
      }
    });
  }

  private checkGameEnd() {
    const parkedCount = this.vehicles.filter(v => v.isParked).length;
    const totalVehicles = this.VEHICLES_CONFIG.length;
    
    console.log(`[CheckGameEnd] currentIndex: ${this.currentVehicleIndex}, total: ${totalVehicles}, parked: ${parkedCount}, rejected: ${this.externalFragmentationCount}, vehicles.length: ${this.vehicles.length}`);
    
    // Game ends when we've processed all vehicles in VEHICLES_CONFIG
    if (this.currentVehicleIndex >= totalVehicles) {
      // Final accounting check
      const accountedFor = parkedCount + this.externalFragmentationCount + (this.vehicles.length - parkedCount);
      console.log(`[Game End] Total: ${totalVehicles}, Parked: ${parkedCount}, Rejected: ${this.externalFragmentationCount}, On Road: ${this.vehicles.length - parkedCount}, Accounted: ${accountedFor}`);
      
      this.time.delayedCall(1000, () => {
        this.showResults();
      });
    } else {
      // Bring next vehicle
      this.selectedVehicle = undefined;
      this.time.delayedCall(1500, () => {
        this.bringNextVehicle();
      });
    }
  }

  private showResults() {
    this.gamePhase = 'results';
    this.phaseText.setText('Phase: Results & Analysis');
    
    // Close chatbot if it's open to prevent DOM input overlap
    if (this.isChatbotOpen) {
      this.closeChatbot();
    }
    
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
    box.lineStyle(4, 0x00E5FF, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    box.setDepth(401);

    // Title
    this.add.text(width / 2, boxY + 50, '📊 GAME RESULTS', {
      fontSize: '36px',
      color: '#00E5FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(402);

    // Calculate final metrics
    const parkedVehicles = this.vehicles.filter(v => v.isParked).length;
    const totalVehiclesGenerated = this.VEHICLES_CONFIG.length;
    const rejectedTrucks = this.externalFragmentationCount;
    
    // Vehicles on road are those that arrived but weren't parked yet (currentVehicleIndex tracks arrivals)
    // vehicles array only contains non-rejected vehicles
    const arrivedButNotParkedCount = this.vehicles.length - parkedVehicles;
    
    // Total processed should equal: parked + rejected + still on road
    // If there's a mismatch, it means some vehicles weren't added to the array properly
    
    // Internal fragmentation = wasted space within allocated slots
    const internalFragmentation = this.totalFragmentation;
    const internalFragPercent = this.totalAllocated > 0 
      ? (internalFragmentation / this.totalAllocated) * 100 
      : 0;
    
    const efficiency = 100 - internalFragPercent;
    const utilization = (this.totalAllocated / this.totalSlotSpace) * 100;
    const usedSpace = this.totalAllocated - internalFragmentation;

    // Clean metrics layout
    const metricsY = boxY + 110;
    
    // Vehicles Summary
    this.add.text(boxX + 50, metricsY, '� Vehicles Summary', {
      fontSize: '20px',
      color: '#00E5FF',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    const vehicleSummary = `   Generated: ${totalVehiclesGenerated}  |  Parked: ${parkedVehicles}  |  Rejected: ${rejectedTrucks}`;
    this.add.text(boxX + 50, metricsY + 35, vehicleSummary, {
      fontSize: '18px',
      color: '#E0E0E0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    // Space Summary
    this.add.text(boxX + 50, metricsY + 85, '📦 Space Summary', {
      fontSize: '20px',
      color: '#00E5FF',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    const spaceSummary = `   Total: ${this.totalSlotSpace} units  |  Allocated: ${this.totalAllocated} units  |  Used: ${usedSpace} units`;
    this.add.text(boxX + 50, metricsY + 120, spaceSummary, {
      fontSize: '18px',
      color: '#E0E0E0',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    // Fragmentation
    this.add.text(boxX + 50, metricsY + 170, '⚠️ Fragmentation Analysis', {
      fontSize: '20px',
      color: '#00E5FF',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    const fragText = `   Internal: ${internalFragmentation} units (${internalFragPercent.toFixed(1)}%)  |  External: ${rejectedTrucks} vehicle(s)`;
    this.add.text(boxX + 50, metricsY + 205, fragText, {
      fontSize: '18px',
      color: rejectedTrucks > 0 || internalFragmentation > 0 ? '#FF6B6B' : '#00FF88',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    // Performance
    this.add.text(boxX + 50, metricsY + 255, '📊 Performance', {
      fontSize: '20px',
      color: '#00E5FF',
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
    aiFeedbackButton.setDepth(402);
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
    aiFeedbackButtonText.setDepth(403);

    aiFeedbackButton.on('pointerover', () => {
      aiFeedbackButton.clear();
      aiFeedbackButton.fillStyle(0x66BB6A, 1);
      aiFeedbackButton.fillRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
      aiFeedbackButton.lineStyle(3, 0x2E7D32, 1);
      aiFeedbackButton.strokeRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
      this.sys.canvas.style.cursor = 'pointer';
    });

    aiFeedbackButton.on('pointerout', () => {
      aiFeedbackButton.clear();
      aiFeedbackButton.fillStyle(0x4CAF50, 1);
      aiFeedbackButton.fillRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
      aiFeedbackButton.lineStyle(3, 0x2E7D32, 1);
      aiFeedbackButton.strokeRoundedRect(aiFeedbackButtonX, aiFeedbackButtonY, aiFeedbackButtonWidth, aiFeedbackButtonHeight, 10);
      this.sys.canvas.style.cursor = 'default';
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

    // Buttons (adjusted positions)
    const buttonY = boxY + boxHeight - 70;
    this.createResultButton(width / 2 + 50, buttonY, 'Restart', () => {
      this.scene.restart();
    });

    this.createResultButton(width / 2 + 250, buttonY, 'Exit', () => {
      // Exit game or go back
      this.showMessage('Exiting game...', '#FFD700');
    });
  }

  private createResultButton(x: number, y: number, label: string, callback: () => void) {
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonX = x - buttonWidth / 2;

    const button = this.add.graphics();
    button.fillGradientStyle(0x00E5FF, 0x00E5FF, 0x00A8CC, 0x00A8CC, 1);
    button.fillRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
    button.lineStyle(3, 0x00FFFF, 1);
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
      button.fillGradientStyle(0x00FFFF, 0x00FFFF, 0x00CCEE, 0x00CCEE, 1);
      button.fillRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0x00FFFF, 1);
      button.strokeRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'pointer';
    });

    button.on('pointerout', () => {
      button.clear();
      button.fillGradientStyle(0x00E5FF, 0x00E5FF, 0x00A8CC, 0x00A8CC, 1);
      button.fillRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
      button.lineStyle(3, 0x00FFFF, 1);
      button.strokeRoundedRect(buttonX, y, buttonWidth, buttonHeight, 10);
      this.sys.canvas.style.cursor = 'default';
    });

    button.on('pointerdown', callback);
  }

  // AI Chatbot Methods
  private async showAIFeedback(boxX: number, boxY: number, boxWidth: number, boxHeight: number) {
    // If chatbot is already open, close it
    if (this.isChatbotOpen) {
      this.closeChatbot();
      return;
    }
    
    this.isChatbotOpen = true;
    this.chatMessages = [];
    this.chatScrollOffset = 0;
    
    // Create the chatbot UI
    this.createChatbotUI();
    
    // Calculate metrics for AI context
    const parkedVehicles = this.vehicles.filter(v => v.isParked).length;
    const totalVehiclesGenerated = this.VEHICLES_CONFIG.length;
    const rejectedTrucks = this.externalFragmentationCount;
    const internalFragmentation = this.totalFragmentation;
    const internalFragPercent = this.totalAllocated > 0 
      ? (internalFragmentation / this.totalAllocated) * 100 
      : 0;
    const efficiency = 100 - internalFragPercent;
    const utilization = (this.totalAllocated / this.totalSlotSpace) * 100;
    
    // Send initial performance summary to AI
    const initialMessage = `I just completed a First Fit memory allocation game. Here's my performance:
    
Vehicles: ${totalVehiclesGenerated} generated, ${parkedVehicles} parked, ${rejectedTrucks} rejected
Internal Fragmentation: ${internalFragmentation} units (${internalFragPercent.toFixed(1)}%)
External Fragmentation: ${rejectedTrucks} vehicle(s)
Efficiency: ${efficiency.toFixed(1)}%
Utilization: ${utilization.toFixed(1)}%
Final Score: ${this.score}

Can you analyze my performance and give me tips to improve?`;
    
    await this.sendMessageToAI(initialMessage, true);
  }

  private createChatbotUI() {
    const { width, height } = this.sys.game.canvas;
    const chatWidth = 500;
    const chatHeight = 680;
    const chatX = width - chatWidth - 10;
    const chatY = (height - chatHeight) / 2;
    
    this.chatbotContainer = this.add.container(chatX, chatY);
    this.chatbotContainer.setDepth(500); // Higher than results modal (400)
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
    
    const headerText = this.add.text(20, 20, '🤖 AI Memory Coach', {
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
    topOverlay.setDepth(510); // Higher than messages
    this.chatbotContainer.add(topOverlay);
    
    const bottomOverlay = this.add.graphics();
    bottomOverlay.fillStyle(0x1a1a2e, 1);
    bottomOverlay.fillRect(0, chatHeight - 70, chatWidth, 70);
    bottomOverlay.setData('isOverlay', true);
    bottomOverlay.setDepth(510); // Higher than messages
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
    this.chatbotContainer.bringToTop(inputBg);
    this.chatbotContainer.bringToTop(sendBtn);
    this.chatbotContainer.bringToTop(sendIcon);
  }

  private handleChatScroll(deltaY: number) {
    if (!this.chatbotContainer || this.maxChatScroll === 0) return;
    
    const scrollSpeed = 30;
    this.chatScrollOffset = Math.max(0, Math.min(this.maxChatScroll, this.chatScrollOffset + deltaY * scrollSpeed * 0.01));
    
    // Redraw messages with new scroll offset
    this.addMessageToChat(null as any, '');
  }

  private createDOMInput(x: number, y: number, width: number) {
    // Remove any existing input first
    this.removeDOMInput();
    
    const input = document.createElement('input');
    input.id = 'chatbot-input';
    input.type = 'text';
    input.placeholder = 'Ask me anything...';
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
    input.style.zIndex = '2000'; // Higher than chatbot container depth
    
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
      const scrollbarHeight = Math.max(30, (messagesHeight / totalContentHeight) * messagesHeight);
      const scrollbarY = messagesY + (this.chatScrollOffset / this.maxChatScroll) * (messagesHeight - scrollbarHeight);
      
      const scrollbar = this.add.graphics();
      scrollbar.fillStyle(0x4CAF50, 0.6);
      scrollbar.fillRoundedRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight, 3);
      scrollbar.setData('isScrollbar', true);
      scrollbar.setDepth(515); // Higher depth for chatbot
      
      if (this.chatbotContainer) {
        this.chatbotContainer.add(scrollbar);
      }
    }
  }

  private async sendMessageToAI(message: string, isInitial: boolean) {
    if (!this.chatbotContainer) return;
    
    // Show typing indicator
    this.addMessageToChat('ai', '💭 Thinking...');
    
    // Prepare context
    const parkedVehicles = this.vehicles.filter(v => v.isParked).length;
    const totalVehiclesGenerated = this.VEHICLES_CONFIG.length;
    const rejectedTrucks = this.externalFragmentationCount;
    const internalFragmentation = this.totalFragmentation;
    const internalFragPercent = this.totalAllocated > 0 
      ? (internalFragmentation / this.totalAllocated) * 100 
      : 0;
    const efficiency = 100 - internalFragPercent;
    const utilization = (this.totalAllocated / this.totalSlotSpace) * 100;
    
    const gameData = {
      gameType: 'memory-management-first-fit',
      totalVehicles: totalVehiclesGenerated,
      parkedVehicles,
      rejectedVehicles: rejectedTrucks,
      internalFragmentation,
      internalFragmentationPercent: internalFragPercent,
      externalFragmentation: rejectedTrucks,
      efficiency,
      utilization,
      totalSlotSpace: this.totalSlotSpace,
      totalAllocated: this.totalAllocated,
      finalScore: this.score,
      wrongAttempts: this.wrongAttempts,
      slots: this.parkingSlots.map(slot => ({
        slotNumber: slot.slotNumber,
        size: slot.size,
        remainingSpace: slot.remainingSpace,
        occupied: slot.occupied,
        vehicleCount: slot.vehicles.length,
        vehicles: slot.vehicles.map(v => ({
          type: v.type,
          size: v.size,
          name: v.name
        }))
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
    this.chatScrollOffset = 0;
    this.maxChatScroll = 0;
  }

  private async submitScore() {
    try {
      const timeSpent = Math.floor((Date.now() - this.gameStartTime) / 1000);
      const accuracy = this.totalAllocated > 0 
        ? Math.round((1 - (this.totalFragmentation / this.totalAllocated)) * 100)
        : 100;
      
      const internalFragPercent = this.totalAllocated > 0 
        ? (this.totalFragmentation / this.totalAllocated) * 100 
        : 0;
      const efficiency = 100 - internalFragPercent;
      const utilization = (this.totalAllocated / this.totalSlotSpace) * 100;

      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'first-fit-l2',
          moduleId: 'memory-management',
          levelId: 'l1',
          score: Math.max(0, this.score),
          timeSpent,
          accuracy,
          wrongAttempts: this.wrongAttempts,
          metadata: {
            parkedVehicles: this.vehicles.filter(v => v.isParked).length,
            totalVehicles: this.vehicles.length,
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
}

// Export config
export const FirstFitGameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1600,
    height: 1000,
  },
  backgroundColor: '#000000',
  scene: FirstFitGame,
};