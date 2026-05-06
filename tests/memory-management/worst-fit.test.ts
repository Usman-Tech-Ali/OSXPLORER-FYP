/**
 * OSXplorer - Memory Management: Worst-Fit Algorithm Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Worst-Fit Game - Worst-Fit Memory Allocation Algorithm', () => {

  /**
   * TC_WF_001: Test worst-fit slot selection
   * Objective: Verify that the largest available slot is selected
   * Precondition: Boxes initialized with varying capacities
   * Steps:
   *   1. Create boxes with different capacities
   *   2. Request allocation for a tool
   *   3. Verify largest slot is selected
   * Test Data: Boxes [50, 100, 75], Tool size = 40
   * Expected Result: Box 2 (100 units) selected as worst fit
   * Post-condition: Tool allocated to largest box
   */
  describe('TC_WF_001: Worst-Fit Slot Selection', () => {
    interface Box {
      id: string;
      boxNumber: number;
      capacity: number;
      remainingSpace: number;
    }

    const findWorstFit = (boxes: Box[], toolSize: number): Box | null => {
      let worstFit: Box | null = null;
      let maxSpace = -1;

      for (const box of boxes) {
        if (box.remainingSpace >= toolSize && box.remainingSpace > maxSpace) {
          maxSpace = box.remainingSpace;
          worstFit = box;
        }
      }
      return worstFit;
    };

    test('should select box with maximum remaining space', () => {
      const boxes: Box[] = [
        { id: 'b1', boxNumber: 1, capacity: 50, remainingSpace: 50 },
        { id: 'b2', boxNumber: 2, capacity: 100, remainingSpace: 100 },
        { id: 'b3', boxNumber: 3, capacity: 75, remainingSpace: 75 }
      ];

      const toolSize = 40;
      const selectedBox = findWorstFit(boxes, toolSize);

      expect(selectedBox).not.toBeNull();
      expect(selectedBox?.boxNumber).toBe(2); // Largest box
    });

    test('should select largest even when smaller boxes fit better', () => {
      const boxes: Box[] = [
        { id: 'b1', boxNumber: 1, capacity: 45, remainingSpace: 45 }, // Near perfect fit
        { id: 'b2', boxNumber: 2, capacity: 100, remainingSpace: 100 }
      ];

      const toolSize = 40;
      const selectedBox = findWorstFit(boxes, toolSize);

      // Worst-Fit should select largest box, not the better fit
      expect(selectedBox?.boxNumber).toBe(2);
    });

    test('should return null when no box fits', () => {
      const boxes: Box[] = [
        { id: 'b1', boxNumber: 1, capacity: 30, remainingSpace: 30 },
        { id: 'b2', boxNumber: 2, capacity: 35, remainingSpace: 35 }
      ];

      const toolSize = 40;
      const selectedBox = findWorstFit(boxes, toolSize);

      expect(selectedBox).toBeNull();
    });
  });

  /**
   * TC_WF_002: Test worst-fit fragmentation behavior
   * Objective: Verify that worst-fit leaves larger remaining fragments
   * Precondition: Allocation compared across algorithms
   * Steps:
   *   1. Apply worst-fit allocation
   *   2. Calculate remaining fragment
   *   3. Compare with best-fit fragment
   * Test Data: Box=100, Tool=40
   * Expected Result: Worst-fit fragment = 60 (larger than best-fit)
   * Post-condition: Fragment sizes recorded
   */
  describe('TC_WF_002: Fragmentation Behavior', () => {
    interface AllocationResult {
      boxCapacity: number;
      toolSize: number;
      remainingFragment: number;
    }

    const worstFitAllocate = (boxes: number[], toolSize: number): AllocationResult | null => {
      const sortedBoxes = [...boxes].sort((a, b) => b - a); // Descending
      const largest = sortedBoxes.find(b => b >= toolSize);
      
      if (!largest) return null;
      
      return {
        boxCapacity: largest,
        toolSize,
        remainingFragment: largest - toolSize
      };
    };

    const bestFitAllocate = (boxes: number[], toolSize: number): AllocationResult | null => {
      const validBoxes = boxes.filter(b => b >= toolSize);
      if (validBoxes.length === 0) return null;
      
      const smallest = Math.min(...validBoxes);
      
      return {
        boxCapacity: smallest,
        toolSize,
        remainingFragment: smallest - toolSize
      };
    };

    test('should leave larger fragment than best-fit', () => {
      const boxes = [50, 100, 75];
      const toolSize = 40;

      const worstFitResult = worstFitAllocate(boxes, toolSize);
      const bestFitResult = bestFitAllocate(boxes, toolSize);

      expect(worstFitResult?.remainingFragment).toBe(60); // 100 - 40
      expect(bestFitResult?.remainingFragment).toBe(10);  // 50 - 40
      expect(worstFitResult!.remainingFragment).toBeGreaterThan(bestFitResult!.remainingFragment);
    });

    test('should maximize remaining space for future allocations', () => {
      const boxes = [80, 100, 60];
      const toolSize = 30;

      const result = worstFitAllocate(boxes, toolSize);
      
      expect(result?.boxCapacity).toBe(100);
      expect(result?.remainingFragment).toBe(70);
    });
  });

  /**
   * TC_WF_003: Test tool size configurations
   * Objective: Verify correct tool size assignments
   * Precondition: Tool type configurations defined
   * Steps:
   *   1. Define tool configurations
   *   2. Verify size for each tool type
   * Test Data: tool1-tool6 with varying sizes
   * Expected Result: Correct size for each tool
   * Post-condition: Tools created with correct sizes
   */
  describe('TC_WF_003: Tool Size Configurations', () => {
    const TOOL_CONFIGS = [
      { id: 'tool1', size: 15, name: 'Screwdriver' },
      { id: 'tool2', size: 25, name: 'Hammer' },
      { id: 'tool3', size: 35, name: 'Wrench' },
      { id: 'tool4', size: 50, name: 'Drill' },
      { id: 'tool5', size: 65, name: 'Saw' },
      { id: 'tool6', size: 80, name: 'Grinder' }
    ];

    test('should have correct number of tool types', () => {
      expect(TOOL_CONFIGS.length).toBe(6);
    });

    test('should have valid sizes for all tools', () => {
      TOOL_CONFIGS.forEach(tool => {
        expect(tool.size).toBeGreaterThan(0);
      });
    });

    test('should retrieve tool by id', () => {
      const tool = TOOL_CONFIGS.find(t => t.id === 'tool3');
      expect(tool).toBeDefined();
      expect(tool?.size).toBe(35);
    });
  });

  /**
   * TC_WF_004: Test conveyor belt mechanics
   * Objective: Verify boxes move correctly on conveyor belt
   * Precondition: Game in playing phase
   * Steps:
   *   1. Spawn box at start position
   *   2. Simulate time passage
   *   3. Verify box position updated
   *   4. Check box removal when off-screen
   * Test Data: Start X=-150, Speed=120 px/s
   * Expected Result: Box moves across screen
   * Post-condition: Box position tracked correctly
   */
  describe('TC_WF_004: Conveyor Belt Mechanics', () => {
    const BOX_START_X = -150;
    const BOX_SPEED = 120; // Pixels per second
    const SCREEN_WIDTH = 1920;

    interface Box {
      x: number;
      isActive: boolean;
    }

    const updateBoxPosition = (box: Box, deltaSeconds: number): Box => {
      const newX = box.x + BOX_SPEED * deltaSeconds;
      return {
        x: newX,
        isActive: newX <= SCREEN_WIDTH
      };
    };

    test('should move box at correct speed', () => {
      let box: Box = { x: BOX_START_X, isActive: true };
      
      // After 1 second
      box = updateBoxPosition(box, 1);
      expect(box.x).toBe(-150 + 120);
      expect(box.x).toBe(-30);
    });

    test('should mark box inactive when off-screen', () => {
      let box: Box = { x: SCREEN_WIDTH - 50, isActive: true };
      
      // Move past screen width
      box = updateBoxPosition(box, 1);
      expect(box.isActive).toBe(false);
    });

    test('should keep box active while on screen', () => {
      let box: Box = { x: 500, isActive: true };
      
      box = updateBoxPosition(box, 1);
      expect(box.isActive).toBe(true);
    });
  });

  /**
   * TC_WF_005: Test missed box penalty
   * Objective: Verify penalty applied when box leaves without tool
   * Precondition: Box on conveyor without allocated tool
   * Steps:
   *   1. Box reaches end of conveyor
   *   2. Check if tool was placed
   *   3. Apply penalty if missed
   * Test Data: Miss penalty = -30 points
   * Expected Result: Score decreases on miss
   * Post-condition: Missed counter updated
   */
  describe('TC_WF_005: Missed Box Penalty', () => {
    const MISS_PENALTY = 30;

    interface GameState {
      score: number;
      missedBoxes: number;
      boxesProcessed: number;
    }

    const handleBoxMissed = (state: GameState): GameState => ({
      score: Math.max(0, state.score - MISS_PENALTY),
      missedBoxes: state.missedBoxes + 1,
      boxesProcessed: state.boxesProcessed + 1
    });

    const handleBoxSuccess = (state: GameState, points: number): GameState => ({
      score: state.score + points,
      missedBoxes: state.missedBoxes,
      boxesProcessed: state.boxesProcessed + 1
    });

    test('should apply penalty for missed box', () => {
      let state: GameState = { score: 100, missedBoxes: 0, boxesProcessed: 0 };
      state = handleBoxMissed(state);
      
      expect(state.score).toBe(70);
      expect(state.missedBoxes).toBe(1);
    });

    test('should not go below zero score', () => {
      let state: GameState = { score: 20, missedBoxes: 0, boxesProcessed: 0 };
      state = handleBoxMissed(state);
      
      expect(state.score).toBe(0);
    });

    test('should track total processed boxes', () => {
      let state: GameState = { score: 100, missedBoxes: 0, boxesProcessed: 0 };
      
      state = handleBoxSuccess(state, 50);
      state = handleBoxMissed(state);
      state = handleBoxSuccess(state, 50);
      
      expect(state.boxesProcessed).toBe(3);
      expect(state.missedBoxes).toBe(1);
    });
  });

  /**
   * TC_WF_006: Test score calculation for correct allocations
   * Objective: Verify score increases for correct worst-fit selections
   * Precondition: Game in playing phase
   * Steps:
   *   1. Player selects correct worst-fit box
   *   2. Verify score increase
   *   3. Player selects wrong box
   *   4. Verify penalty
   * Test Data: Correct = +100, Wrong = -20
   * Expected Result: Score reflects selections
   * Post-condition: Final score calculated
   */
  describe('TC_WF_006: Score Calculation', () => {
    const CORRECT_POINTS = 100;
    const WRONG_PENALTY = 20;

    interface GameState {
      score: number;
      wrongAttempts: number;
    }

    const isWorstFitSelection = (selectedBox: number, boxes: number[], toolSize: number): boolean => {
      const validBoxes = boxes.filter(b => b >= toolSize);
      if (validBoxes.length === 0) return false;
      const largest = Math.max(...validBoxes);
      return selectedBox === largest;
    };

    test('should verify correct worst-fit selection', () => {
      const boxes = [50, 100, 75];
      const toolSize = 40;
      
      expect(isWorstFitSelection(100, boxes, toolSize)).toBe(true);
      expect(isWorstFitSelection(75, boxes, toolSize)).toBe(false);
      expect(isWorstFitSelection(50, boxes, toolSize)).toBe(false);
    });

    test('should award points for correct selection', () => {
      let state: GameState = { score: 0, wrongAttempts: 0 };
      
      const isCorrect = isWorstFitSelection(100, [50, 100, 75], 40);
      if (isCorrect) {
        state.score += CORRECT_POINTS;
      }
      
      expect(state.score).toBe(100);
    });

    test('should penalize wrong selection', () => {
      let state: GameState = { score: 100, wrongAttempts: 0 };
      
      const isCorrect = isWorstFitSelection(50, [50, 100, 75], 40);
      if (!isCorrect) {
        state.score = Math.max(0, state.score - WRONG_PENALTY);
        state.wrongAttempts++;
      }
      
      expect(state.score).toBe(80);
      expect(state.wrongAttempts).toBe(1);
    });
  });

  /**
   * TC_WF_007: Test game completion conditions
   * Objective: Verify game ends correctly after all boxes processed
   * Precondition: Game in playing phase
   * Steps:
   *   1. Process all boxes
   *   2. Check completion condition
   *   3. Transition to results phase
   * Test Data: Total boxes = 12
   * Expected Result: Game transitions to results after 12 boxes
   * Post-condition: Results screen displayed
   */
  describe('TC_WF_007: Game Completion Conditions', () => {
    const TOTAL_BOXES = 12;

    type GamePhase = 'intro' | 'playing' | 'results';

    interface GameState {
      phase: GamePhase;
      boxesProcessed: number;
      totalBoxes: number;
    }

    const checkCompletion = (state: GameState): GameState => {
      if (state.boxesProcessed >= state.totalBoxes) {
        return { ...state, phase: 'results' };
      }
      return state;
    };

    test('should remain in playing phase until all boxes processed', () => {
      let state: GameState = { phase: 'playing', boxesProcessed: 5, totalBoxes: TOTAL_BOXES };
      state = checkCompletion(state);
      
      expect(state.phase).toBe('playing');
    });

    test('should transition to results when all boxes processed', () => {
      let state: GameState = { phase: 'playing', boxesProcessed: 12, totalBoxes: TOTAL_BOXES };
      state = checkCompletion(state);
      
      expect(state.phase).toBe('results');
    });

    test('should handle exactly at completion threshold', () => {
      let state: GameState = { phase: 'playing', boxesProcessed: 11, totalBoxes: TOTAL_BOXES };
      state = checkCompletion(state);
      expect(state.phase).toBe('playing');
      
      state.boxesProcessed = 12;
      state = checkCompletion(state);
      expect(state.phase).toBe('results');
    });
  });
});
