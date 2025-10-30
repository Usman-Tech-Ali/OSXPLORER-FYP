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

export class FirstFitGame extends Phaser.Scene {
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

  // UI Elements
  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private fragmentationText!: Phaser.GameObjects.Text;
  private efficiencyText!: Phaser.GameObjects.Text;

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
    super({ key: 'FirstFitGame' });
  }

  /**
   * Generates a random set of vehicles for the game
   * Returns between 4-7 vehicles with random types
   * Constraints: Max 3 trucks, Max 6 cars, Unlimited bikes
   * Note: Trucks can be generated even if no 100-unit space is available
   * (they will trigger external fragmentation when they arrive)
   */
  private generateRandomVehicles(): Array<{ type: 'bike' | 'car' | 'truck', id: string }> {
    const numVehicles = Phaser.Math.Between(6, 10); // Random number between 4 and 7
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
  }

  create() {
    const { width, height } = this.sys.game.canvas;
    
    // Generate random vehicles for this game session
    this.VEHICLES_CONFIG = this.generateRandomVehicles();
    
    // Create dual background
    this.createBackground(width, height);
    
    // Create UI
    this.createUI(width, height);
    
    // Show intro
    this.showIntroScenario(width, height);
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
      return; // All vehicles have arrived
    }

    const vehicleConfig = this.VEHICLES_CONFIG[this.currentVehicleIndex];
    const config = this.VEHICLE_CONFIGS[vehicleConfig.type];
    
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
      onComplete: () => {
        // Vehicle has arrived
        const totalVehicles = this.VEHICLES_CONFIG.length;
        
        // Check for external fragmentation AFTER the truck arrives on the road
        if (vehicleConfig.type === 'truck') {
          const has100SpaceAvailable = this.parkingSlots.some(slot => slot.remainingSpace >= 100);
          
          if (!has100SpaceAvailable) {
            // Calculate total free space across all slots
            const totalFreeSpace = this.parkingSlots.reduce((sum, slot) => sum + slot.remainingSpace, 0);
            
            // Show message that truck arrived
            this.instructionText.setText(`🚛 ${config.name} (High Process) arrived but cannot be parked!`);
            
            // Increment index here since we're processing this vehicle
            this.currentVehicleIndex++;
            
            // Wait a moment, then show external fragmentation popup
            this.time.delayedCall(1500, () => {
              this.showExternalFragmentation(totalFreeSpace, vehicle);
            });
            return;
          }
        }
        
        // Add vehicle to the list only if it will be parked (not rejected)
        this.vehicles.push(vehicle);
        const vehicleNumber = this.vehicles.length;
        
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
    const xOffset = vehicleIndex * 25; // Slight offset for multiple vehicles
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
        },
        onComplete: () => {
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
          onComplete: () => {
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
    
    // Game ends when we've processed all vehicles in VEHICLES_CONFIG
    if (this.currentVehicleIndex >= totalVehicles) {
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

    // Buttons
    const buttonY = boxY + boxHeight - 70;
    this.createResultButton(width / 2 - 130, buttonY, 'Restart', () => {
      this.scene.restart();
    });

    this.createResultButton(width / 2 + 130, buttonY, 'Exit', () => {
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