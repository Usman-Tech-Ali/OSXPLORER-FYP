/**
 * OSXplorer - Memory Management: First-Fit Algorithm Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('First-Fit Game - First-Fit Memory Allocation Algorithm', () => {

  /**
   * TC_FF_001: Test first-fit slot selection
   * Objective: Verify that first available slot with enough space is selected
   * Precondition: Parking slots initialized with varying sizes
   * Steps:
   *   1. Create parking slots with different sizes
   *   2. Request allocation for a vehicle
   *   3. Verify first fitting slot is selected
   * Test Data: Slots [50, 100, 75], Vehicle size = 60
   * Expected Result: Slot 2 (100 units) selected as first fit
   * Post-condition: Vehicle allocated to first fitting slot
   */
  describe('TC_FF_001: First-Fit Slot Selection', () => {
    interface ParkingSlot {
      id: string;
      slotNumber: number;
      size: number;
      remainingSpace: number;
      occupied: boolean;
    }

    const findFirstFit = (slots: ParkingSlot[], vehicleSize: number): ParkingSlot | null => {
      for (const slot of slots) {
        if (slot.remainingSpace >= vehicleSize) {
          return slot;
        }
      }
      return null;
    };

    test('should select first slot with sufficient space', () => {
      const slots: ParkingSlot[] = [
        { id: 's1', slotNumber: 1, size: 50, remainingSpace: 50, occupied: false },
        { id: 's2', slotNumber: 2, size: 100, remainingSpace: 100, occupied: false },
        { id: 's3', slotNumber: 3, size: 75, remainingSpace: 75, occupied: false }
      ];

      const vehicleSize = 60;
      const selectedSlot = findFirstFit(slots, vehicleSize);

      expect(selectedSlot).not.toBeNull();
      expect(selectedSlot?.slotNumber).toBe(2);
    });

    test('should select first slot even if later slots are better fit', () => {
      const slots: ParkingSlot[] = [
        { id: 's1', slotNumber: 1, size: 100, remainingSpace: 100, occupied: false },
        { id: 's2', slotNumber: 2, size: 60, remainingSpace: 60, occupied: false } // Perfect fit
      ];

      const vehicleSize = 60;
      const selectedSlot = findFirstFit(slots, vehicleSize);

      // First-Fit should select slot 1, not the perfect fit slot 2
      expect(selectedSlot?.slotNumber).toBe(1);
    });

    test('should return null when no slot fits', () => {
      const slots: ParkingSlot[] = [
        { id: 's1', slotNumber: 1, size: 50, remainingSpace: 50, occupied: false },
        { id: 's2', slotNumber: 2, size: 40, remainingSpace: 40, occupied: false }
      ];

      const vehicleSize = 60;
      const selectedSlot = findFirstFit(slots, vehicleSize);

      expect(selectedSlot).toBeNull();
    });
  });

  /**
   * TC_FF_002: Test internal fragmentation calculation
   * Objective: Verify correct internal fragmentation calculation after allocation
   * Precondition: Vehicle allocated to slot
   * Steps:
   *   1. Allocate vehicle to slot
   *   2. Calculate remaining space (fragmentation)
   *   3. Update slot state
   * Test Data: Slot size=100, Vehicle size=60
   * Expected Result: Internal fragmentation = 40
   * Post-condition: Fragmentation displayed correctly
   */
  describe('TC_FF_002: Internal Fragmentation Calculation', () => {
    interface AllocationResult {
      slotId: string;
      vehicleSize: number;
      slotSize: number;
      fragmentation: number;
    }

    const calculateFragmentation = (slotSize: number, vehicleSize: number): number => {
      return slotSize - vehicleSize;
    };

    const allocateVehicle = (slotSize: number, vehicleSize: number): AllocationResult => {
      return {
        slotId: 'slot1',
        vehicleSize,
        slotSize,
        fragmentation: calculateFragmentation(slotSize, vehicleSize)
      };
    };

    test('should calculate correct internal fragmentation', () => {
      const result = allocateVehicle(100, 60);
      expect(result.fragmentation).toBe(40);
    });

    test('should have zero fragmentation for perfect fit', () => {
      const result = allocateVehicle(50, 50);
      expect(result.fragmentation).toBe(0);
    });

    test('should calculate total fragmentation across multiple allocations', () => {
      const allocations = [
        allocateVehicle(100, 60),  // 40
        allocateVehicle(75, 50),   // 25
        allocateVehicle(50, 25)    // 25
      ];

      const totalFragmentation = allocations.reduce((sum, a) => sum + a.fragmentation, 0);
      expect(totalFragmentation).toBe(90);
    });
  });

  /**
   * TC_FF_003: Test vehicle size configurations
   * Objective: Verify correct vehicle size assignments
   * Precondition: Vehicle type configurations defined
   * Steps:
   *   1. Define vehicle configurations
   *   2. Verify size for each vehicle type
   * Test Data: Bike=25, Car=50, Truck=100
   * Expected Result: Correct size for each type
   * Post-condition: Vehicles created with correct sizes
   */
  describe('TC_FF_003: Vehicle Size Configurations', () => {
    const VEHICLE_CONFIGS = {
      bike: { name: 'Bike', size: 25 },
      car: { name: 'Car', size: 50 },
      truck: { name: 'Truck', size: 100 }
    };

    test('should return correct size for bike', () => {
      expect(VEHICLE_CONFIGS.bike.size).toBe(25);
    });

    test('should return correct size for car', () => {
      expect(VEHICLE_CONFIGS.car.size).toBe(50);
    });

    test('should return correct size for truck', () => {
      expect(VEHICLE_CONFIGS.truck.size).toBe(100);
    });
  });

  /**
   * TC_FF_004: Test external fragmentation (rejection)
   * Objective: Verify vehicle rejection when no slot can accommodate
   * Precondition: All slots too small for vehicle
   * Steps:
   *   1. Fill slots with small vehicles
   *   2. Attempt to allocate large vehicle
   *   3. Verify rejection
   * Test Data: All slots remaining <100, Truck size=100
   * Expected Result: Truck rejected (external fragmentation)
   * Post-condition: Rejection counter incremented
   */
  describe('TC_FF_004: External Fragmentation (Rejection)', () => {
    interface GameState {
      externalFragmentationCount: number;
      vehiclesRejected: number;
    }

    interface ParkingSlot {
      remainingSpace: number;
    }

    const checkExternalFragmentation = (slots: ParkingSlot[], vehicleSize: number): boolean => {
      const totalFreeSpace = slots.reduce((sum, slot) => sum + slot.remainingSpace, 0);
      const canFit = slots.some(slot => slot.remainingSpace >= vehicleSize);
      
      // External fragmentation: enough total space but no single slot fits
      return totalFreeSpace >= vehicleSize && !canFit;
    };

    const handleRejection = (state: GameState, isExternalFragmentation: boolean): GameState => ({
      externalFragmentationCount: isExternalFragmentation 
        ? state.externalFragmentationCount + 1 
        : state.externalFragmentationCount,
      vehiclesRejected: state.vehiclesRejected + 1
    });

    test('should detect external fragmentation', () => {
      const slots: ParkingSlot[] = [
        { remainingSpace: 40 },
        { remainingSpace: 40 },
        { remainingSpace: 40 }
      ];

      // Total = 120, but no single slot can fit 100
      const isExternalFrag = checkExternalFragmentation(slots, 100);
      expect(isExternalFrag).toBe(true);
    });

    test('should not report external fragmentation when slot fits', () => {
      const slots: ParkingSlot[] = [
        { remainingSpace: 40 },
        { remainingSpace: 100 },
        { remainingSpace: 40 }
      ];

      const isExternalFrag = checkExternalFragmentation(slots, 100);
      expect(isExternalFrag).toBe(false);
    });

    test('should increment rejection counter', () => {
      let state: GameState = { externalFragmentationCount: 0, vehiclesRejected: 0 };
      
      state = handleRejection(state, true);
      
      expect(state.externalFragmentationCount).toBe(1);
      expect(state.vehiclesRejected).toBe(1);
    });
  });

  /**
   * TC_FF_005: Test memory efficiency calculation
   * Objective: Verify correct efficiency calculation
   * Precondition: Multiple allocations completed
   * Steps:
   *   1. Track total allocated space
   *   2. Track total slot space
   *   3. Calculate efficiency percentage
   * Test Data: Allocated=300, Total=500
   * Expected Result: Efficiency = 60%
   * Post-condition: Efficiency displayed correctly
   */
  describe('TC_FF_005: Memory Efficiency Calculation', () => {
    const calculateEfficiency = (totalAllocated: number, totalSlotSpace: number): number => {
      if (totalSlotSpace === 0) return 0;
      return (totalAllocated / totalSlotSpace) * 100;
    };

    test('should calculate correct efficiency percentage', () => {
      const efficiency = calculateEfficiency(300, 500);
      expect(efficiency).toBe(60);
    });

    test('should return 0 for no allocations', () => {
      const efficiency = calculateEfficiency(0, 500);
      expect(efficiency).toBe(0);
    });

    test('should return 100 for full utilization', () => {
      const efficiency = calculateEfficiency(500, 500);
      expect(efficiency).toBe(100);
    });

    test('should handle zero total space', () => {
      const efficiency = calculateEfficiency(0, 0);
      expect(efficiency).toBe(0);
    });
  });

  /**
   * TC_FF_006: Test score calculation for correct allocations
   * Objective: Verify score increases for correct first-fit selections
   * Precondition: Game in parking phase
   * Steps:
   *   1. Player selects correct first-fit slot
   *   2. Verify score increase
   *   3. Player selects wrong slot
   *   4. Verify penalty
   * Test Data: Correct = +100, Wrong = -20
   * Expected Result: Score reflects actions
   * Post-condition: Final score calculated
   */
  describe('TC_FF_006: Score Calculation', () => {
    const CORRECT_POINTS = 100;
    const WRONG_PENALTY = 20;

    interface GameState {
      score: number;
      wrongAttempts: number;
    }

    const handleCorrectAllocation = (state: GameState): GameState => ({
      ...state,
      score: state.score + CORRECT_POINTS
    });

    const handleWrongAllocation = (state: GameState): GameState => ({
      score: Math.max(0, state.score - WRONG_PENALTY),
      wrongAttempts: state.wrongAttempts + 1
    });

    test('should increase score for correct allocation', () => {
      let state: GameState = { score: 0, wrongAttempts: 0 };
      state = handleCorrectAllocation(state);
      expect(state.score).toBe(100);
    });

    test('should decrease score for wrong allocation', () => {
      let state: GameState = { score: 100, wrongAttempts: 0 };
      state = handleWrongAllocation(state);
      expect(state.score).toBe(80);
      expect(state.wrongAttempts).toBe(1);
    });

    test('should calculate final score after multiple allocations', () => {
      let state: GameState = { score: 0, wrongAttempts: 0 };
      
      state = handleCorrectAllocation(state); // 100
      state = handleCorrectAllocation(state); // 200
      state = handleWrongAllocation(state);   // 180
      state = handleCorrectAllocation(state); // 280
      
      expect(state.score).toBe(280);
      expect(state.wrongAttempts).toBe(1);
    });
  });
});
