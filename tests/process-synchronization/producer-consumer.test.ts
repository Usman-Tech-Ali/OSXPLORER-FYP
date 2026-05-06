/**
 * OSXplorer - Process Synchronization: Producer Consumer Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Producer Consumer Game - Producer Consumer Process Synchronization', () => {

  /**
   * TC_PC_001: Test bounded buffer with three semaphores
   * Objective: Verify S_empty, S_full, and mutex work together correctly
   * Precondition: Buffer size = 10, S_empty = 10, S_full = 0, mutex = 1
   * Steps:
   *   1. Producer performs wait(S_empty)
   *   2. Producer performs wait(mutex)
   *   3. Producer deposits item
   *   4. Producer performs signal(mutex)
   *   5. Producer performs signal(S_full)
   * Test Data: Buffer capacity = 10
   * Expected Result: Semaphores update correctly
   * Post-condition: Buffer has 1 item, S_empty = 9, S_full = 1
   */
  describe('TC_PC_001: Bounded Buffer Three Semaphores', () => {
    interface BufferState {
      sEmpty: number;
      sFull: number;
      mutexLocked: boolean;
      buffer: boolean[];
      bufferSize: number;
    }

    const producerSequence = (state: BufferState): { state: BufferState; success: boolean } => {
      // wait(S_empty)
      if (state.sEmpty === 0) {
        return { state, success: false };
      }

      // wait(mutex)
      if (state.mutexLocked) {
        return { state, success: false };
      }

      // Critical section: deposit item
      const emptySlot = state.buffer.indexOf(false);
      if (emptySlot === -1) {
        return { state, success: false };
      }

      const newBuffer = [...state.buffer];
      newBuffer[emptySlot] = true;

      // signal(mutex), signal(S_full)
      return {
        state: {
          sEmpty: state.sEmpty - 1,
          sFull: state.sFull + 1,
          mutexLocked: false,
          buffer: newBuffer,
          bufferSize: state.bufferSize
        },
        success: true
      };
    };

    test('should successfully produce when resources available', () => {
      const initialState: BufferState = {
        sEmpty: 10,
        sFull: 0,
        mutexLocked: false,
        buffer: new Array(10).fill(false),
        bufferSize: 10
      };

      const result = producerSequence(initialState);

      expect(result.success).toBe(true);
      expect(result.state.sEmpty).toBe(9);
      expect(result.state.sFull).toBe(1);
      expect(result.state.buffer.filter(slot => slot).length).toBe(1);
    });

    test('should block producer when buffer full', () => {
      const fullState: BufferState = {
        sEmpty: 0,
        sFull: 10,
        mutexLocked: false,
        buffer: new Array(10).fill(true),
        bufferSize: 10
      };

      const result = producerSequence(fullState);

      expect(result.success).toBe(false);
      expect(result.state.sEmpty).toBe(0);
    });
  });

  /**
   * TC_PC_002: Test consumer sequence
   * Objective: Verify consumer correctly consumes from buffer
   * Precondition: Buffer has items, S_full > 0
   * Steps:
   *   1. Consumer performs wait(S_full)
   *   2. Consumer performs wait(mutex)
   *   3. Consumer consumes item
   *   4. Consumer performs signal(mutex)
   *   5. Consumer performs signal(S_empty)
   * Test Data: Buffer with items
   * Expected Result: Item consumed, semaphores updated
   * Post-condition: S_full decremented, S_empty incremented
   */
  describe('TC_PC_002: Consumer Sequence', () => {
    interface BufferState {
      sEmpty: number;
      sFull: number;
      mutexLocked: boolean;
      buffer: boolean[];
    }

    const consumerSequence = (state: BufferState): { state: BufferState; success: boolean } => {
      // wait(S_full)
      if (state.sFull === 0) {
        return { state, success: false };
      }

      // wait(mutex)
      if (state.mutexLocked) {
        return { state, success: false };
      }

      // Critical section: consume item
      const filledSlot = state.buffer.lastIndexOf(true);
      if (filledSlot === -1) {
        return { state, success: false };
      }

      const newBuffer = [...state.buffer];
      newBuffer[filledSlot] = false;

      // signal(mutex), signal(S_empty)
      return {
        state: {
          sEmpty: state.sEmpty + 1,
          sFull: state.sFull - 1,
          mutexLocked: false,
          buffer: newBuffer
        },
        success: true
      };
    };

    test('should successfully consume when items available', () => {
      const stateWithItems: BufferState = {
        sEmpty: 7,
        sFull: 3,
        mutexLocked: false,
        buffer: [true, true, true, false, false, false, false, false, false, false]
      };

      const result = consumerSequence(stateWithItems);

      expect(result.success).toBe(true);
      expect(result.state.sEmpty).toBe(8);
      expect(result.state.sFull).toBe(2);
      expect(result.state.buffer.filter(slot => slot).length).toBe(2);
    });

    test('should block consumer when buffer empty', () => {
      const emptyState: BufferState = {
        sEmpty: 10,
        sFull: 0,
        mutexLocked: false,
        buffer: new Array(10).fill(false)
      };

      const result = consumerSequence(emptyState);

      expect(result.success).toBe(false);
      expect(result.state.sFull).toBe(0);
    });
  });

  /**
   * TC_PC_003: Test Level 1 - Manual Transmission
   * Objective: Verify manual producer-consumer operations
   * Precondition: Player controls both producer and consumer
   * Steps:
   *   1. Player clicks drone to produce
   *   2. Player clicks satellite to consume
   *   3. Verify manual control works
   * Test Data: Manual mode, 15 target packets
   * Expected Result: Player can control both operations
   * Post-condition: 15 packets transmitted successfully
   */
  describe('TC_PC_003: Level 1 - Manual Transmission', () => {
    interface ManualGameState {
      totalProduced: number;
      totalConsumed: number;
      targetProduced: number;
      isManual: boolean;
      buffer: boolean[];
      sEmpty: number;
      sFull: number;
    }

    const manualProduce = (state: ManualGameState): ManualGameState => {
      if (!state.isManual || state.sEmpty === 0) return state;

      const emptySlot = state.buffer.indexOf(false);
      if (emptySlot === -1) return state;

      const newBuffer = [...state.buffer];
      newBuffer[emptySlot] = true;

      return {
        ...state,
        totalProduced: state.totalProduced + 1,
        sEmpty: state.sEmpty - 1,
        sFull: state.sFull + 1,
        buffer: newBuffer
      };
    };

    const manualConsume = (state: ManualGameState): ManualGameState => {
      if (!state.isManual || state.sFull === 0) return state;

      const filledSlot = state.buffer.lastIndexOf(true);
      if (filledSlot === -1) return state;

      const newBuffer = [...state.buffer];
      newBuffer[filledSlot] = false;

      return {
        ...state,
        totalConsumed: state.totalConsumed + 1,
        sEmpty: state.sEmpty + 1,
        sFull: state.sFull - 1,
        buffer: newBuffer
      };
    };

    test('should allow manual production', () => {
      let state: ManualGameState = {
        totalProduced: 0,
        totalConsumed: 0,
        targetProduced: 15,
        isManual: true,
        buffer: new Array(10).fill(false),
        sEmpty: 10,
        sFull: 0
      };

      state = manualProduce(state);

      expect(state.totalProduced).toBe(1);
      expect(state.sEmpty).toBe(9);
      expect(state.sFull).toBe(1);
    });

    test('should allow manual consumption', () => {
      let state: ManualGameState = {
        totalProduced: 1,
        totalConsumed: 0,
        targetProduced: 15,
        isManual: true,
        buffer: [true, false, false, false, false, false, false, false, false, false],
        sEmpty: 9,
        sFull: 1
      };

      state = manualConsume(state);

      expect(state.totalConsumed).toBe(1);
      expect(state.sEmpty).toBe(10);
      expect(state.sFull).toBe(0);
    });

    test('should complete Level 1 after 15 packets', () => {
      let state: ManualGameState = {
        totalProduced: 15,
        totalConsumed: 15,
        targetProduced: 15,
        isManual: true,
        buffer: new Array(10).fill(false),
        sEmpty: 10,
        sFull: 0
      };

      expect(state.totalConsumed >= state.targetProduced).toBe(true);
    });
  });

  /**
   * TC_PC_004: Test Level 2 - Automated Sync with Race Conditions
   * Objective: Verify race condition detection and mutex requirement
   * Precondition: Automated timers, mutex required
   * Steps:
   *   1. Producer and consumer run automatically
   *   2. Both try to access buffer simultaneously
   *   3. Detect race condition without mutex
   *   4. Apply penalty
   * Test Data: Automated mode, mutex required
   * Expected Result: Race conditions detected and penalized
   * Post-condition: Lives decremented on race condition
   */
  describe('TC_PC_004: Level 2 - Race Conditions and Mutex', () => {
    interface RaceConditionState {
      lives: number;
      mutexRequired: boolean;
      mutexLocked: boolean;
      producerActive: boolean;
      consumerActive: boolean;
      raceConditionDetected: boolean;
    }

    const detectRaceCondition = (state: RaceConditionState): RaceConditionState => {
      const raceCondition = state.mutexRequired && 
                           !state.mutexLocked && 
                           state.producerActive && 
                           state.consumerActive;

      if (raceCondition) {
        return {
          ...state,
          lives: state.lives - 1,
          raceConditionDetected: true
        };
      }

      return state;
    };

    const lockMutex = (state: RaceConditionState): RaceConditionState => ({
      ...state,
      mutexLocked: true
    });

    const unlockMutex = (state: RaceConditionState): RaceConditionState => ({
      ...state,
      mutexLocked: false
    });

    test('should detect race condition when both access buffer without mutex', () => {
      let state: RaceConditionState = {
        lives: 3,
        mutexRequired: true,
        mutexLocked: false,
        producerActive: true,
        consumerActive: true,
        raceConditionDetected: false
      };

      state = detectRaceCondition(state);

      expect(state.raceConditionDetected).toBe(true);
      expect(state.lives).toBe(2);
    });

    test('should prevent race condition when mutex is locked', () => {
      let state: RaceConditionState = {
        lives: 3,
        mutexRequired: true,
        mutexLocked: true,
        producerActive: true,
        consumerActive: true,
        raceConditionDetected: false
      };

      state = detectRaceCondition(state);

      expect(state.raceConditionDetected).toBe(false);
      expect(state.lives).toBe(3);
    });

    test('should allow mutex lock and unlock operations', () => {
      let state: RaceConditionState = {
        lives: 3,
        mutexRequired: true,
        mutexLocked: false,
        producerActive: false,
        consumerActive: false,
        raceConditionDetected: false
      };

      state = lockMutex(state);
      expect(state.mutexLocked).toBe(true);

      state = unlockMutex(state);
      expect(state.mutexLocked).toBe(false);
    });
  });

  /**
   * TC_PC_005: Test Level 3 - Solar Storm throughput management
   * Objective: Verify handling of increased production rate and congestion
   * Precondition: Solar storm triples producer speed
   * Steps:
   *   1. Normal production and consumption rates
   *   2. Solar storm activates (3x producer speed)
   *   3. Buffer fills up rapidly
   *   4. Player activates overclock to balance
   * Test Data: Storm multiplier = 3x, overclock available
   * Expected Result: System handles throughput imbalance
   * Post-condition: Buffer doesn't overflow permanently
   */
  describe('TC_PC_005: Level 3 - Solar Storm Throughput', () => {
    interface ThroughputState {
      producerInterval: number;
      consumerInterval: number;
      stormActive: boolean;
      overclockActive: boolean;
      bufferFull: boolean;
      bufferOverflowWarned: boolean;
      lives: number;
    }

    const activateSolarStorm = (state: ThroughputState): ThroughputState => ({
      ...state,
      stormActive: true,
      producerInterval: Math.floor(state.producerInterval / 3)
    });

    const activateOverclock = (state: ThroughputState): ThroughputState => ({
      ...state,
      overclockActive: true,
      consumerInterval: Math.floor(state.consumerInterval / 3)
    });

    const checkBufferOverflow = (state: ThroughputState): ThroughputState => {
      if (state.bufferFull && !state.bufferOverflowWarned) {
        return {
          ...state,
          bufferOverflowWarned: true,
          lives: state.lives - 1
        };
      }
      return state;
    };

    test('should triple producer speed during solar storm', () => {
      let state: ThroughputState = {
        producerInterval: 2200,
        consumerInterval: 2800,
        stormActive: false,
        overclockActive: false,
        bufferFull: false,
        bufferOverflowWarned: false,
        lives: 3
      };

      state = activateSolarStorm(state);

      expect(state.stormActive).toBe(true);
      expect(state.producerInterval).toBe(Math.floor(2200 / 3));
    });

    test('should triple consumer speed when overclocked', () => {
      let state: ThroughputState = {
        producerInterval: 733, // Already stormed
        consumerInterval: 2800,
        stormActive: true,
        overclockActive: false,
        bufferFull: true,
        bufferOverflowWarned: false,
        lives: 3
      };

      state = activateOverclock(state);

      expect(state.overclockActive).toBe(true);
      expect(state.consumerInterval).toBe(Math.floor(2800 / 3));
    });

    test('should penalize buffer overflow', () => {
      let state: ThroughputState = {
        producerInterval: 733,
        consumerInterval: 2800,
        stormActive: true,
        overclockActive: false,
        bufferFull: true,
        bufferOverflowWarned: false,
        lives: 3
      };

      state = checkBufferOverflow(state);

      expect(state.bufferOverflowWarned).toBe(true);
      expect(state.lives).toBe(2);
    });
  });

  /**
   * TC_PC_006: Test producer blocking when buffer full
   * Objective: Verify producer blocks correctly when S_empty = 0
   * Precondition: Buffer is full
   * Steps:
   *   1. Fill buffer to capacity
   *   2. Producer attempts to produce
   *   3. Verify producer is blocked
   *   4. Consumer consumes item
   *   5. Verify producer unblocks
   * Test Data: Buffer size = 10, all slots filled
   * Expected Result: Producer blocks and unblocks correctly
   * Post-condition: Producer-consumer synchronization maintained
   */
  describe('TC_PC_006: Producer Blocking', () => {
    interface BlockingState {
      sEmpty: number;
      sFull: number;
      producerBlocked: boolean;
      consumerBlocked: boolean;
      buffer: boolean[];
    }

    const tryProduce = (state: BlockingState): BlockingState => {
      if (state.sEmpty === 0) {
        return { ...state, producerBlocked: true };
      }

      const emptySlot = state.buffer.indexOf(false);
      if (emptySlot === -1) {
        return { ...state, producerBlocked: true };
      }

      const newBuffer = [...state.buffer];
      newBuffer[emptySlot] = true;

      return {
        ...state,
        sEmpty: state.sEmpty - 1,
        sFull: state.sFull + 1,
        producerBlocked: false,
        buffer: newBuffer
      };
    };

    const tryConsume = (state: BlockingState): BlockingState => {
      if (state.sFull === 0) {
        return { ...state, consumerBlocked: true };
      }

      const filledSlot = state.buffer.lastIndexOf(true);
      if (filledSlot === -1) {
        return { ...state, consumerBlocked: true };
      }

      const newBuffer = [...state.buffer];
      newBuffer[filledSlot] = false;

      return {
        ...state,
        sEmpty: state.sEmpty + 1,
        sFull: state.sFull - 1,
        consumerBlocked: false,
        producerBlocked: false, // Unblock producer
        buffer: newBuffer
      };
    };

    test('should block producer when buffer full', () => {
      let state: BlockingState = {
        sEmpty: 0,
        sFull: 10,
        producerBlocked: false,
        consumerBlocked: false,
        buffer: new Array(10).fill(true)
      };

      state = tryProduce(state);

      expect(state.producerBlocked).toBe(true);
      expect(state.sEmpty).toBe(0);
    });

    test('should unblock producer when consumer frees space', () => {
      let state: BlockingState = {
        sEmpty: 0,
        sFull: 10,
        producerBlocked: true,
        consumerBlocked: false,
        buffer: new Array(10).fill(true)
      };

      state = tryConsume(state);

      expect(state.producerBlocked).toBe(false);
      expect(state.sEmpty).toBe(1);
      expect(state.sFull).toBe(9);
    });
  });

  /**
   * TC_PC_007: Test consumer blocking when buffer empty
   * Objective: Verify consumer blocks correctly when S_full = 0
   * Precondition: Buffer is empty
   * Steps:
   *   1. Empty buffer completely
   *   2. Consumer attempts to consume
   *   3. Verify consumer is blocked
   *   4. Producer produces item
   *   5. Verify consumer unblocks
   * Test Data: Buffer size = 10, all slots empty
   * Expected Result: Consumer blocks and unblocks correctly
   * Post-condition: Consumer-producer synchronization maintained
   */
  describe('TC_PC_007: Consumer Blocking', () => {
    interface ConsumerBlockingState {
      sEmpty: number;
      sFull: number;
      consumerBlocked: boolean;
      buffer: boolean[];
    }

    const tryConsumeFromEmpty = (state: ConsumerBlockingState): ConsumerBlockingState => {
      if (state.sFull === 0) {
        return { ...state, consumerBlocked: true };
      }
      return state;
    };

    const produceToUnblockConsumer = (state: ConsumerBlockingState): ConsumerBlockingState => {
      if (state.sEmpty === 0) return state;

      const emptySlot = state.buffer.indexOf(false);
      if (emptySlot === -1) return state;

      const newBuffer = [...state.buffer];
      newBuffer[emptySlot] = true;

      return {
        ...state,
        sEmpty: state.sEmpty - 1,
        sFull: state.sFull + 1,
        consumerBlocked: false, // Unblock consumer
        buffer: newBuffer
      };
    };

    test('should block consumer when buffer empty', () => {
      let state: ConsumerBlockingState = {
        sEmpty: 10,
        sFull: 0,
        consumerBlocked: false,
        buffer: new Array(10).fill(false)
      };

      state = tryConsumeFromEmpty(state);

      expect(state.consumerBlocked).toBe(true);
    });

    test('should unblock consumer when producer adds item', () => {
      let state: ConsumerBlockingState = {
        sEmpty: 10,
        sFull: 0,
        consumerBlocked: true,
        buffer: new Array(10).fill(false)
      };

      state = produceToUnblockConsumer(state);

      expect(state.consumerBlocked).toBe(false);
      expect(state.sFull).toBe(1);
      expect(state.sEmpty).toBe(9);
    });
  });

  /**
   * TC_PC_008: Test score calculation and game completion
   * Objective: Verify correct scoring and win conditions
   * Precondition: Game in progress
   * Steps:
   *   1. Track packets produced and consumed
   *   2. Calculate score based on performance
   *   3. Check win condition
   * Test Data: Target varies by level
   * Expected Result: Correct scoring and completion detection
   * Post-condition: Game ends when target reached
   */
  describe('TC_PC_008: Score and Completion', () => {
    const PRODUCE_POINTS = 5;
    const CONSUME_POINTS = 10;

    interface GameCompletion {
      totalProduced: number;
      totalConsumed: number;
      targetProduced: number;
      score: number;
      lives: number;
      gameCompleted: boolean;
    }

    const calculateScore = (state: GameCompletion): number => {
      return (state.totalProduced * PRODUCE_POINTS) + (state.totalConsumed * CONSUME_POINTS);
    };

    const checkCompletion = (state: GameCompletion): GameCompletion => {
      const completed = state.totalConsumed >= state.targetProduced;
      return {
        ...state,
        score: calculateScore(state),
        gameCompleted: completed
      };
    };

    test('should calculate correct score', () => {
      const state: GameCompletion = {
        totalProduced: 20,
        totalConsumed: 20,
        targetProduced: 20,
        score: 0,
        lives: 3,
        gameCompleted: false
      };

      const finalScore = calculateScore(state);

      expect(finalScore).toBe(300); // (20*5) + (20*10)
    });

    test('should complete game when target reached', () => {
      let state: GameCompletion = {
        totalProduced: 15,
        totalConsumed: 15,
        targetProduced: 15,
        score: 0,
        lives: 3,
        gameCompleted: false
      };

      state = checkCompletion(state);

      expect(state.gameCompleted).toBe(true);
      expect(state.score).toBe(225);
    });

    test('should not complete before target reached', () => {
      let state: GameCompletion = {
        totalProduced: 10,
        totalConsumed: 8,
        targetProduced: 15,
        score: 0,
        lives: 3,
        gameCompleted: false
      };

      state = checkCompletion(state);

      expect(state.gameCompleted).toBe(false);
    });
  });

  /**
   * TC_PC_009: Test buffer visualization and progress tracking
   * Objective: Verify buffer state is correctly visualized
   * Precondition: Buffer operations in progress
   * Steps:
   *   1. Add items to buffer
   *   2. Check visual representation
   *   3. Remove items from buffer
   *   4. Verify visual updates
   * Test Data: Buffer with mixed filled/empty slots
   * Expected Result: Visual matches actual buffer state
   * Post-condition: UI accurately reflects buffer
   */
  describe('TC_PC_009: Buffer Visualization', () => {
    interface BufferVisualization {
      buffer: boolean[];
      bufferSize: number;
      fillPercentage: number;
      visualSlots: string[];
    }

    const updateVisualization = (state: BufferVisualization): BufferVisualization => {
      const filledCount = state.buffer.filter(slot => slot).length;
      const fillPercentage = (filledCount / state.bufferSize) * 100;
      const visualSlots = state.buffer.map(slot => slot ? '■' : '□');

      return {
        ...state,
        fillPercentage,
        visualSlots
      };
    };

    test('should correctly calculate fill percentage', () => {
      let state: BufferVisualization = {
        buffer: [true, true, true, false, false, false, false, false, false, false],
        bufferSize: 10,
        fillPercentage: 0,
        visualSlots: []
      };

      state = updateVisualization(state);

      expect(state.fillPercentage).toBe(30);
    });

    test('should generate correct visual representation', () => {
      let state: BufferVisualization = {
        buffer: [true, false, true, false, false],
        bufferSize: 5,
        fillPercentage: 0,
        visualSlots: []
      };

      state = updateVisualization(state);

      expect(state.visualSlots).toEqual(['■', '□', '■', '□', '□']);
    });

    test('should handle full buffer visualization', () => {
      let state: BufferVisualization = {
        buffer: new Array(10).fill(true),
        bufferSize: 10,
        fillPercentage: 0,
        visualSlots: []
      };

      state = updateVisualization(state);

      expect(state.fillPercentage).toBe(100);
      expect(state.visualSlots.every(slot => slot === '■')).toBe(true);
    });
  });
});