import Phaser from 'phaser';

interface ParkingSlot {
  id: string;
  slotNumber: number;
  size: number; // Size in units (50=small, 100=medium, 200=large)
  x: number;
  y: number;
  width: number;
  height: number;
  occupied: boolean;
  vehicle?: Vehicle;
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
    { slotNumber: 1, size: 100, x: 830, y: 300, label: 'S1: 🚛 Truck\n100 units' },    // Truck 1
    { slotNumber: 2, size: 100, x: 990, y: 300, label: 'S2: 🚛 Truck\n100 units' },   // Truck 2
    { slotNumber: 3, size: 100, x: 1140, y: 300, label: 'S3: 🚛 Truck\n100 units' },   // Truck 3
    { slotNumber: 4, size: 25, x: 1260, y: 300, label: 'S4: \n Bike\n25 units' },     // Bike 1
    { slotNumber: 5, size: 25, x: 1340, y: 300, label: 'S5: \n Bike\n25 units' },     // Bike 2
    { slotNumber: 6, size: 25, x: 1430, y: 300, label: 'S6:  \nBike\n25 units' },     // Bike 3
    
    // Bottom row - 5 Cars (50 units each) - NOW ON RIGHT SIDE
    { slotNumber: 7, size: 50, x: 830, y: 430, label: 'S7: 🚗 Car\n50 units' },        // Car 1
    { slotNumber: 8, size: 50, x: 970, y: 430, label: 'S8: 🚗 Car\n50 units' },       // Car 2
    { slotNumber: 9, size: 50, x: 1120, y: 430, label: 'S9: 🚗 Car\n50 units' },       // Car 3
    { slotNumber: 10, size: 50, x: 1260, y: 430, label: 'S10: 🚗 Car\n50 units' },     // Car 4
    { slotNumber: 11, size: 50, x: 1400, y: 430, label: 'S11: 🚗 Car\n50 units' },     // Car 5
  ];

  // Vehicles that will arrive on the road sequentially
  private readonly VEHICLES_CONFIG = [
    { type: 'car' as const, id: 'v1' },
    { type: 'truck' as const, id: 'v2' },
    { type: 'bike' as const, id: 'v3' },
    { type: 'car' as const, id: 'v4' }
  ];

  constructor() {
    super({ key: 'FirstFitGame' });
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
    overlay.fillStyle(0x000000, 0.88);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    const boxWidth = 950; // Increased width for better text fit
    const boxHeight = 750; // Increased height to accommodate all text without overflow
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const scenarioBox = this.add.graphics();
    scenarioBox.fillStyle(0x0a0e27, 0.98);
    scenarioBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 25);
    scenarioBox.lineStyle(5, 0x00E5FF, 1);
    scenarioBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 25);
    scenarioBox.setDepth(301);

    const title = this.add.text(width / 2, boxY + 55, '🅿️ FIRST FIT PARKING ALLOCATOR', {
      fontSize: '40px',
      color: '#00E5FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(width / 2, boxY + 110, 'Memory Management - First Fit Algorithm', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: '600',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(302);

    const scenarioText = `📚 LEARNING OBJECTIVES:
• Understand First Fit memory allocation
• Learn about internal fragmentation
• Calculate memory efficiency

🎮 GAMEPLAY:
1️⃣ Vehicles arrive on the road (right side)
2️⃣ Click a vehicle on the road to select it
3️⃣ Click a parking slot (P area) to park
4️⃣ FIRST FIT RULE: Park in the FIRST slot that fits!

⚠️ FIRST FIT RULES:
• Check slots from top to bottom (S1, S2, S3...)
• Park in the FIRST slot that can fit the vehicle
• Small vehicle in large slot = wasted space!

🎯 METRICS TO TRACK:
• Fragmentation % = Wasted Space / Total Allocated
• Efficiency = 100% - Fragmentation %

💡 TIP: First Fit is fast but can leave unusable gaps!`;

    const text = this.add.text(width / 2, boxY + 380, scenarioText, {
      fontSize: '16px',
      color: '#E0E0E0',
      fontStyle: 'normal',
      align: 'center',
      lineSpacing: 5,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      wordWrap: { width: boxWidth - 80, useAdvancedWrap: true }
    }).setOrigin(0.5).setDepth(302);

    // Start button
    const buttonWidth = 280;
    const buttonHeight = 65;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 85; // Adjusted for larger panel

    const startButton = this.add.graphics();
    startButton.fillGradientStyle(0x00E5FF, 0x00E5FF, 0x00A8CC, 0x00A8CC, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    startButton.lineStyle(4, 0x00FFFF, 1);
    startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
    startButton.setDepth(302);

    const buttonText = this.add.text(width / 2, buttonY + 32, '🚀 START PARKING', {
      fontSize: '28px',
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
      startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
      startButton.lineStyle(4, 0x00FFFF, 1);
      startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
      this.sys.canvas.style.cursor = 'pointer';
    });

    startButton.on('pointerout', () => {
      startButton.clear();
      startButton.fillGradientStyle(0x00E5FF, 0x00E5FF, 0x00A8CC, 0x00A8CC, 1);
      startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
      startButton.lineStyle(4, 0x00FFFF, 1);
      startButton.strokeRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
      this.sys.canvas.style.cursor = 'default';
    });

    startButton.on('pointerdown', () => {
      overlay.destroy();
      scenarioBox.destroy();
      title.destroy();
      subtitle.destroy();
      text.destroy();
      startButton.destroy();
      buttonText.destroy();
      
      this.startParkingPhase();
    });
  }

  private startParkingPhase() {
    this.gamePhase = 'parking';
    this.phaseText.setText('Phase: Parking (First Fit)');
    this.instructionText.setText('🚗 Click the vehicle on the road, then click the FIRST available slot!');
    
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
        x: config.x,
        y: config.y,
        width: 80,
        height: 80,
        occupied: false
      };

      // Create invisible interactive area that matches the existing background asset circles/P marks
      // NO custom graphics drawing - just an invisible hit area
      const slotBg = this.add.graphics();
      slotBg.setDepth(5);
      
      // Make slot interactive using the existing background asset area
      const hitArea = new Phaser.Geom.Circle(slot.x, slot.y, 40);
      slotBg.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
      
      slotBg.on('pointerover', () => {
        if (!slot.occupied && this.selectedVehicle) {
          // Only change cursor, NO visual feedback circles
          this.sys.canvas.style.cursor = 'pointer';
        }
      });

      slotBg.on('pointerout', () => {
        this.sys.canvas.style.cursor = 'default';
      });

      slotBg.on('pointerdown', () => {
        if (this.selectedVehicle && !slot.occupied) {
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
    
    this.vehicles.push(vehicle);

    // Animate vehicle coming onto the road (moving right from left) at ground level
    this.tweens.add({
      targets: [sprite, sizeLabel],
      x: this.ROAD_START_X,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => {
        // Vehicle has arrived, ready to be parked
        this.instructionText.setText(`🚗 ${config.name} arrived! Click it, then click the FIRST slot that fits!`);
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
    // Check if slot can fit the vehicle
    if (slot.size < vehicle.size) {
      this.showError('❌ Slot too small! First Fit requires slot ≥ vehicle size!');
      this.wrongAttempts++;
      this.score -= 20;
      this.updateScore();
      this.cameras.main.shake(200, 0.006);
      return;
    }

    // Check if this is the first fit (first available slot from top to bottom)
    const firstFitSlot = this.parkingSlots.find(s => !s.occupied && s.size >= vehicle.size);

    if (!firstFitSlot) {
      this.showError('❌ No slot available for this vehicle!');
      this.wrongAttempts++;
      this.score -= 20;
      this.updateScore();
      this.cameras.main.shake(200, 0.006);
      return;
    }

    if (slot.id !== firstFitSlot.id) {
      this.showError(`❌ Wrong! First Fit = FIRST available slot that fits!\nS${firstFitSlot.slotNumber} comes before S${slot.slotNumber}!`);
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
    slot.occupied = true;
    slot.vehicle = vehicle;
    vehicle.assignedSlot = slot;
    vehicle.isOnRoad = false;

    const config = this.VEHICLE_CONFIGS[vehicle.type];
    
    // Adjust parking Y position based on slot row
    // Row 1 (slots 1-6): y = 300, Row 2 (slots 7-11): y = 430
    const parkingY = slot.slotNumber <= 6 ? slot.y-50 : slot.y + 160; // Add offset for bottom row

    // Animate vehicle from road to parking slot
    if (vehicle.sprite && vehicle.sizeLabel) {
      vehicle.sprite.disableInteractive();
      vehicle.sprite.clearTint();

      this.tweens.add({
        targets: [vehicle.sprite, vehicle.sizeLabel],
        x: slot.x,
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
            vehicle.sprite.setPosition(slot.x, parkingY);
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
          const fragmentation = slot.size - vehicle.size;
          if (fragmentation > 0) {
            this.showMessage(`✅ Parked! But ${fragmentation} units wasted (fragmentation)`, '#FFA500');
          } else {
            this.showMessage(`✅ Perfect fit! No fragmentation! +100`, '#00FF88');
          }

          // Check if 4 vehicles are parked (end game after 4 successful parkings)
          const parkedCount = this.vehicles.filter(v => v.isParked).length;
          if (parkedCount >= 4) {
            this.time.delayedCall(2500, () => {
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
      });
    }

    // Slot is now occupied - no visual feedback circles needed
    // The existing background asset circles remain unchanged
  }

  private updateSlotAfterParking(slot: ParkingSlot, vehicle: Vehicle) {
    const fragmentation = slot.size - vehicle.size;
    
    if (fragmentation > 0) {
      // Show fragmentation warning below the slot
      const fragmentationText = this.add.text(
        slot.x,
        slot.y + 80,
        `⚠️ ${fragmentation} units wasted`,
        {
          fontSize: '14px',
          color: '#FF0000',
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
      if (slot.occupied && slot.vehicle) {
        this.totalAllocated += slot.size;
        const waste = slot.size - slot.vehicle.size;
        this.totalFragmentation += waste;
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

  private showResults() {
    this.gamePhase = 'results';
    this.phaseText.setText('Phase: Results & Analysis');
    
    const { width, height } = this.sys.game.canvas;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.92);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(400);

    const boxWidth = 950;
    const boxHeight = 680;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const box = this.add.graphics();
    box.fillStyle(0x0a0e27, 0.98);
    box.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 22);
    box.lineStyle(5, 0x00E5FF, 1);
    box.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 22);
    box.setDepth(401);

    // Title
    this.add.text(width / 2, boxY + 55, '📊 FIRST FIT ALLOCATION RESULTS', {
      fontSize: '40px',
      color: '#00E5FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5).setDepth(402);

    // Calculate final metrics
    const fragmentationPercent = this.totalAllocated > 0 
      ? (this.totalFragmentation / this.totalAllocated) * 100 
      : 0;
    const efficiency = 100 - fragmentationPercent;
    const utilization = (this.totalAllocated / this.totalSlotSpace) * 100;

    // Performance summary
    const summaryY = boxY + 130;
    this.add.text(boxX + 60, summaryY, '📈 PERFORMANCE METRICS', {
      fontSize: '26px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    const metricsText = `Total Slot Space: ${this.totalSlotSpace} units
Total Allocated: ${this.totalAllocated} units
Wasted Space (Fragmentation): ${this.totalFragmentation} units
Fragmentation %: ${fragmentationPercent.toFixed(2)}%
Efficiency: ${efficiency.toFixed(2)}%
Utilization: ${utilization.toFixed(2)}%
Wrong Attempts: ${this.wrongAttempts}
Final Score: ${Math.max(0, this.score)}`;

    this.add.text(boxX + 60, summaryY + 50, metricsText, {
      fontSize: '20px',
      color: '#E0E0E0',
      lineSpacing: 12,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    // Allocation details
    const detailsY = boxY + 400;
    this.add.text(boxX + 60, detailsY, '🚗 ALLOCATION DETAILS', {
      fontSize: '26px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setDepth(402);

    let detailsText = 'Vehicle | Size | Slot | Slot Size | Wasted | Efficiency\n';
    detailsText += '─'.repeat(68) + '\n';
    
    this.vehicles.forEach(vehicle => {
      if (vehicle.assignedSlot) {
        const slot = vehicle.assignedSlot;
        const wasted = slot.size - vehicle.size;
        const slotEfficiency = ((vehicle.size / slot.size) * 100).toFixed(1);
        detailsText += `${vehicle.name.padEnd(7)} | ${vehicle.size.toString().padEnd(4)} | S${slot.slotNumber} | ${slot.size.toString().padEnd(9)} | ${wasted.toString().padEnd(6)} | ${slotEfficiency}%\n`;
      }
    });

    this.add.text(boxX + 60, detailsY + 50, detailsText, {
      fontSize: '15px',
      color: '#E0E0E0',
      fontFamily: 'Consolas, "Courier New", monospace',
      lineSpacing: 6
    }).setDepth(402);

    // Educational note
    this.add.text(width / 2, boxY + boxHeight - 130, 
      '💡 First Fit is fast (O(n)) but can waste space. Compare with Best Fit!',
      {
        fontSize: '18px',
        color: '#00E5FF',
        fontStyle: '600',
        align: 'center',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }
    ).setOrigin(0.5).setDepth(402);

    // Buttons
    const buttonY = boxY + boxHeight - 75;
    this.createResultButton(width / 2 - 140, buttonY, 'Restart', () => {
      this.scene.restart();
    });

    this.createResultButton(width / 2 + 140, buttonY, 'Next Level', () => {
      this.showMessage('Next level coming soon!', '#FFD700');
    });
  }

  private createResultButton(x: number, y: number, label: string, callback: () => void) {
    const buttonWidth = 220;
    const buttonHeight = 55;
    const buttonX = x - buttonWidth / 2;

    const button = this.add.graphics();
    button.fillGradientStyle(0x00E5FF, 0x00E5FF, 0x00A8CC, 0x00A8CC, 1);
    button.fillRoundedRect(buttonX, y, buttonWidth, buttonHeight, 12);
    button.lineStyle(4, 0x00FFFF, 1);
    button.strokeRoundedRect(buttonX, y, buttonWidth, buttonHeight, 12);
    button.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, y, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );
    button.setDepth(402);

    const buttonText = this.add.text(x, y + 27, label, {
      fontSize: '22px',
      color: '#000000',
      fontStyle: 'bold',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }).setOrigin(0.5);
    buttonText.setDepth(403);

    button.on('pointerover', () => {
      button.clear();
      button.fillGradientStyle(0x00FFFF, 0x00FFFF, 0x00CCEE, 0x00CCEE, 1);
      button.fillRoundedRect(buttonX, y, buttonWidth, buttonHeight, 12);
      button.lineStyle(4, 0x00FFFF, 1);
      button.strokeRoundedRect(buttonX, y, buttonWidth, buttonHeight, 12);
      this.sys.canvas.style.cursor = 'pointer';
    });

    button.on('pointerout', () => {
      button.clear();
      button.fillGradientStyle(0x00E5FF, 0x00E5FF, 0x00A8CC, 0x00A8CC, 1);
      button.fillRoundedRect(buttonX, y, buttonWidth, buttonHeight, 12);
      button.lineStyle(4, 0x00FFFF, 1);
      button.strokeRoundedRect(buttonX, y, buttonWidth, buttonHeight, 12);
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