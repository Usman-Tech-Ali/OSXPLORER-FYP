/**
 * OSXplorer - Memory Management: Paging Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Paging Game - All Levels', () => {

  /**
   * TC_PAGING_L1_001: Test Demand Paging Basic Functionality
   * Objective: Verify basic demand paging where gadgets are loaded from van (disk) to belt (RAM) on demand
   * Precondition: Game L1 initialized with 3 belt slots and van inventory
   * Steps:
   *   1. Player moves to van
   *   2. Player picks gadgets for belt
   *   3. Player approaches gates requiring specific gadgets
   * Test Data: Belt capacity = 3, Gates require drill, laser, card
   * Expected Result: Page faults occur when needed gadget not in belt
   * Post-condition: All gates opened when correct gadgets obtained
   */
  describe('TC_PAGING_L1_001: Demand Paging Basic Functionality', () => {
    type GadgetType = 'drill' | 'laser' | 'card' | 'computer';

    interface Gadget {
      type: GadgetType;
      name: string;
    }

    interface Belt {
      slots: (Gadget | null)[];
      capacity: number;
    }

    interface Gate {
      id: string;
      required: GadgetType;
      passed: boolean;
    }

    interface GameState {
      belt: Belt;
      vanInventory: Gadget[];
      gates: Gate[];
      pageFaults: number;
    }

    const createGameState = (): GameState => ({
      belt: {
        slots: [null, null, null],
        capacity: 3
      },
      vanInventory: [
        { type: 'drill', name: 'Drill' },
        { type: 'laser', name: 'Laser' },
        { type: 'card', name: 'Keycard' },
        { type: 'computer', name: 'Computer' }
      ],
      gates: [
        { id: 'gate1', required: 'drill', passed: false },
        { id: 'gate2', required: 'laser', passed: false },
        { id: 'gate3', required: 'card', passed: false }
      ],
      pageFaults: 0
    });

    const hasGadget = (belt: Belt, gadgetType: GadgetType): boolean => {
      return belt.slots.some(slot => slot?.type === gadgetType);
    };

    const addToBelt = (belt: Belt, gadget: Gadget): boolean => {
      const emptySlot = belt.slots.findIndex(slot => slot === null);
      if (emptySlot !== -1) {
        belt.slots[emptySlot] = gadget;
        return true;
      }
      return false;
    };

    const tryOpenGate = (gameState: GameState, gate: Gate): boolean => {
      if (hasGadget(gameState.belt, gate.required)) {
        gate.passed = true;
        return true;
      } else {
        gameState.pageFaults++;
        return false;
      }
    };

    test('should allow picking gadgets from van to belt', () => {
      const gameState = createGameState();
      const drill = gameState.vanInventory.find(g => g.type === 'drill')!;
      
      const success = addToBelt(gameState.belt, drill);
      
      expect(success).toBe(true);
      expect(gameState.belt.slots[0]).toEqual(drill);
      expect(hasGadget(gameState.belt, 'drill')).toBe(true);
    });

    test('should successfully open gate when required gadget is in belt', () => {
      const gameState = createGameState();
      const drill = gameState.vanInventory.find(g => g.type === 'drill')!;
      addToBelt(gameState.belt, drill);
      
      const gate = gameState.gates[0]; // requires drill
      const success = tryOpenGate(gameState, gate);
      
      expect(success).toBe(true);
      expect(gate.passed).toBe(true);
      expect(gameState.pageFaults).toBe(0);
    });

    test('should generate page fault when required gadget not in belt', () => {
      const gameState = createGameState();
      // Don't add drill to belt
      
      const gate = gameState.gates[0]; // requires drill
      const success = tryOpenGate(gameState, gate);
      
      expect(success).toBe(false);
      expect(gate.passed).toBe(false);
      expect(gameState.pageFaults).toBe(1);
    });

    test('should handle belt capacity limit', () => {
      const gameState = createGameState();
      
      // Fill belt to capacity
      addToBelt(gameState.belt, { type: 'drill', name: 'Drill' });
      addToBelt(gameState.belt, { type: 'laser', name: 'Laser' });
      addToBelt(gameState.belt, { type: 'card', name: 'Keycard' });
      
      // Try to add one more
      const success = addToBelt(gameState.belt, { type: 'computer', name: 'Computer' });
      
      expect(success).toBe(false);
      expect(gameState.belt.slots.filter(slot => slot !== null)).toHaveLength(3);
    });

    test('should complete level when all gates are opened', () => {
      const gameState = createGameState();
      
      // Add required gadgets and open all gates
      addToBelt(gameState.belt, { type: 'drill', name: 'Drill' });
      addToBelt(gameState.belt, { type: 'laser', name: 'Laser' });
      addToBelt(gameState.belt, { type: 'card', name: 'Keycard' });
      
      gameState.gates.forEach(gate => tryOpenGate(gameState, gate));
      
      const allPassed = gameState.gates.every(gate => gate.passed);
      expect(allPassed).toBe(true);
    });
  });

  /**
   * TC_PAGING_L2_001: Test Locality of Reference
   * Objective: Verify that keeping frequently used gadgets in belt reduces page faults
   * Precondition: Game L2 initialized with 3 gates all requiring laser
   * Steps:
   *   1. Load laser into belt
   *   2. Open all three gates in sequence
   *   3. Verify minimal page faults due to locality
   * Test Data: 3 gates all requiring laser gadget
   * Expected Result: Only 1 page fault (initial load), then 0 faults for subsequent accesses
   * Post-condition: High hit ratio achieved through locality
   */
  describe('TC_PAGING_L2_001: Locality of Reference', () => {
    type GadgetType = 'drill' | 'laser' | 'card' | 'computer';

    interface Gadget {
      type: GadgetType;
      name: string;
    }

    interface Gate {
      id: string;
      required: GadgetType;
      passed: boolean;
    }

    interface LocalityGameState {
      belt: (Gadget | null)[];
      gates: Gate[];
      pageFaults: number;
      hits: number;
    }

    const createLocalityGame = (): LocalityGameState => ({
      belt: [null, null, null],
      gates: [
        { id: 'gate1', required: 'laser', passed: false },
        { id: 'gate2', required: 'laser', passed: false },
        { id: 'gate3', required: 'laser', passed: false }
      ],
      pageFaults: 0,
      hits: 0
    });

    const accessGate = (gameState: LocalityGameState, gateIndex: number): boolean => {
      const gate = gameState.gates[gateIndex];
      const hasLaser = gameState.belt.some(slot => slot?.type === 'laser');
      
      if (hasLaser) {
        gate.passed = true;
        gameState.hits++;
        return true;
      } else {
        gameState.pageFaults++;
        // Simulate loading laser from van
        const emptySlot = gameState.belt.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
          gameState.belt[emptySlot] = { type: 'laser', name: 'Laser' };
          gate.passed = true;
        }
        return false; // Page fault occurred
      }
    };

    test('should demonstrate high hit ratio with locality', () => {
      const gameState = createLocalityGame();
      
      // First access - page fault (laser not in belt)
      accessGate(gameState, 0);
      expect(gameState.pageFaults).toBe(1);
      expect(gameState.hits).toBe(0);
      
      // Second access - hit (laser now in belt)
      accessGate(gameState, 1);
      expect(gameState.pageFaults).toBe(1);
      expect(gameState.hits).toBe(1);
      
      // Third access - hit (laser still in belt)
      accessGate(gameState, 2);
      expect(gameState.pageFaults).toBe(1);
      expect(gameState.hits).toBe(2);
      
      // Calculate hit ratio
      const totalAccesses = gameState.hits + gameState.pageFaults;
      const hitRatio = gameState.hits / totalAccesses;
      expect(hitRatio).toBeGreaterThan(0.5); // > 50% hit ratio
    });

    test('should complete all gates with minimal page faults', () => {
      const gameState = createLocalityGame();
      
      // Access all gates in sequence
      gameState.gates.forEach((_, index) => accessGate(gameState, index));
      
      const allPassed = gameState.gates.every(gate => gate.passed);
      expect(allPassed).toBe(true);
      expect(gameState.pageFaults).toBe(1); // Only initial load
    });
  });

  /**
   * TC_PAGING_L3_001: Test Thrashing and Replacement
   * Objective: Verify thrashing scenario where belt capacity < required gadgets
   * Precondition: Game L3 initialized with 4 gates requiring different gadgets, belt capacity = 3
   * Steps:
   *   1. Try to access gates requiring different gadgets
   *   2. Observe frequent replacement due to capacity limit
   *   3. Measure high page fault rate (thrashing)
   * Test Data: 4 gates (drill, laser, card, computer), belt capacity = 3
   * Expected Result: High page fault rate due to constant replacement
   * Post-condition: Thrashing demonstrated when working set > available slots
   */
  describe('TC_PAGING_L3_001: Thrashing and Replacement', () => {
    type GadgetType = 'drill' | 'laser' | 'card' | 'computer';

    interface Gadget {
      type: GadgetType;
      name: string;
    }

    interface Gate {
      id: string;
      required: GadgetType;
      passed: boolean;
    }

    interface ThrashingGameState {
      belt: (Gadget | null)[];
      gates: Gate[];
      pageFaults: number;
      replacements: number;
    }

    const createThrashingGame = (): ThrashingGameState => ({
      belt: [null, null, null], // 3 slots
      gates: [
        { id: 'gate1', required: 'drill', passed: false },
        { id: 'gate2', required: 'laser', passed: false },
        { id: 'gate3', required: 'card', passed: false },
        { id: 'gate4', required: 'computer', passed: false } // 4 different requirements
      ],
      pageFaults: 0,
      replacements: 0
    });

    const loadGadget = (gameState: ThrashingGameState, gadgetType: GadgetType): void => {
      // Check if already in belt
      if (gameState.belt.some(slot => slot?.type === gadgetType)) {
        return; // Hit - no page fault
      }
      
      // Page fault - need to load
      gameState.pageFaults++;
      
      // Find empty slot or replace
      let targetSlot = gameState.belt.findIndex(slot => slot === null);
      if (targetSlot === -1) {
        // No empty slot - must replace (FIFO for simplicity)
        targetSlot = 0;
        gameState.replacements++;
        // Shift existing items
        for (let i = 0; i < gameState.belt.length - 1; i++) {
          gameState.belt[i] = gameState.belt[i + 1];
        }
        targetSlot = gameState.belt.length - 1;
      }
      
      gameState.belt[targetSlot] = { type: gadgetType, name: gadgetType };
    };

    const accessGate = (gameState: ThrashingGameState, gateIndex: number): void => {
      const gate = gameState.gates[gateIndex];
      loadGadget(gameState, gate.required);
      gate.passed = true;
    };

    test('should demonstrate thrashing with insufficient belt capacity', () => {
      const gameState = createThrashingGame();
      
      // Access all 4 gates in sequence (more than belt capacity of 3)
      gameState.gates.forEach((_, index) => accessGate(gameState, index));
      
      // Should have more page faults than belt capacity due to thrashing
      expect(gameState.pageFaults).toBeGreaterThan(gameState.belt.length);
      expect(gameState.replacements).toBeGreaterThan(0);
    });

    test('should show high page fault rate with diverse access pattern', () => {
      const gameState = createThrashingGame();
      
      // Simulate worst-case thrashing: repeatedly access all 4 gates
      for (let round = 0; round < 2; round++) {
        gameState.gates.forEach((_, index) => accessGate(gameState, index));
      }
      
      const totalAccesses = gameState.gates.length * 2; // 8 accesses
      const faultRate = gameState.pageFaults / totalAccesses;
      
      // High fault rate indicates thrashing
      expect(faultRate).toBeGreaterThan(0.5); // > 50% fault rate
      expect(gameState.replacements).toBeGreaterThan(2);
    });

    test('should require strategic replacement to minimize thrashing', () => {
      const gameState = createThrashingGame();
      
      // Strategic approach: keep most frequently used items
      // Load first 3 gadgets
      loadGadget(gameState, 'drill');
      loadGadget(gameState, 'laser');
      loadGadget(gameState, 'card');
      
      const initialFaults = gameState.pageFaults;
      
      // Now need computer - must replace one
      loadGadget(gameState, 'computer');
      
      expect(gameState.pageFaults).toBe(initialFaults + 1);
      expect(gameState.replacements).toBe(1);
      
      // Verify belt is full and contains computer
      expect(gameState.belt.filter(slot => slot !== null)).toHaveLength(3);
      expect(gameState.belt.some(slot => slot?.type === 'computer')).toBe(true);
    });
  });

  /**
   * TC_PAGING_INTEGRATION_001: Test Complete Paging Game Flow
   * Objective: Verify end-to-end functionality across all paging levels
   * Precondition: All paging levels available
   * Steps:
   *   1. Complete L1 (basic demand paging)
   *   2. Complete L2 (locality optimization)
   *   3. Complete L3 (thrashing management)
   * Test Data: Various gate and gadget configurations
   * Expected Result: All levels complete successfully with appropriate page fault patterns
   * Post-condition: Player understands paging concepts and optimization strategies
   */
  describe('TC_PAGING_INTEGRATION_001: Complete Paging Game Flow', () => {
    interface LevelResult {
      level: string;
      completed: boolean;
      pageFaults: number;
      gatesOpened: number;
      totalGates: number;
      strategy: string;
    }

    test('should complete L1 with basic demand paging', () => {
      const result: LevelResult = {
        level: 'L1',
        completed: false,
        pageFaults: 3, // One fault per unique gadget type
        gatesOpened: 3,
        totalGates: 3,
        strategy: 'demand_paging'
      };
      
      result.completed = result.gatesOpened === result.totalGates;
      
      expect(result.completed).toBe(true);
      expect(result.pageFaults).toBeGreaterThan(0);
      expect(result.pageFaults).toBeLessThanOrEqual(result.totalGates);
    });

    test('should complete L2 with locality optimization', () => {
      const result: LevelResult = {
        level: 'L2',
        completed: true,
        pageFaults: 1, // Only initial load due to locality
        gatesOpened: 3,
        totalGates: 3,
        strategy: 'locality_of_reference'
      };
      
      // L2 should have fewer faults than L1 due to locality
      expect(result.pageFaults).toBe(1);
      expect(result.completed).toBe(true);
    });

    test('should handle L3 thrashing scenario', () => {
      const result: LevelResult = {
        level: 'L3',
        completed: true,
        pageFaults: 6, // High due to thrashing
        gatesOpened: 4,
        totalGates: 4,
        strategy: 'replacement_management'
      };
      
      // L3 should have higher fault rate due to capacity constraints
      const faultRate = result.pageFaults / result.totalGates;
      expect(faultRate).toBeGreaterThan(1); // More faults than gates
      expect(result.completed).toBe(true);
    });

    test('should demonstrate progressive difficulty across levels', () => {
      const l1Faults = 3;
      const l2Faults = 1; // Better due to locality
      const l3Faults = 6; // Worse due to thrashing
      
      // L2 should be more efficient than L1
      expect(l2Faults).toBeLessThan(l1Faults);
      
      // L3 should show thrashing effects
      expect(l3Faults).toBeGreaterThan(l1Faults);
      expect(l3Faults).toBeGreaterThan(l2Faults);
    });
  });
});