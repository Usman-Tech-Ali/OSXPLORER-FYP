/**
 * OSXplorer - Process Synchronization: Counting Semaphore Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Counting Semaphore Game - Counting Semaphore Process Synchronization', () => {

  /**
   * TC_CSM_001: Test semaphore wait operation with multiple resources
   * Objective: Verify wait() decrements semaphore and blocks when 0
   * Precondition: Semaphore value is 5 (5 parachute packs available)
   * Steps:
   *   1. Call wait() on semaphore
   *   2. Verify semaphore value decrements
   *   3. Verify diver gets pack and jumps
   *   4. Continue until S=0, verify blocking
   * Test Data: Initial S=5, 6 divers
   * Expected Result: First 5 divers get packs, 6th blocks
   * Post-condition: 5 divers airborne, 1 on bench
   */
  describe('TC_CSM_001: Wait Operation with Multiple Resources', () => {
    interface Diver {
      id: number;
      state: 'waiting' | 'jumping' | 'falling' | 'landed' | 'benched';
      hasPack: boolean;
    }

    interface SemaphoreState {
      S: number;
      blockedQueue: Diver[];
    }

    const performWait = (state: SemaphoreState, diver: Diver): { state: SemaphoreState; success: boolean } => {
      if (state.S > 0) {
        return {
          state: {
            S: state.S - 1,
            blockedQueue: state.blockedQueue
          },
          success: true
        };
      }
      return {
        state: {
          S: state.S,
          blockedQueue: [...state.blockedQueue, { ...diver, state: 'benched' }]
        },
        success: false
      };
    };

    test('should decrement semaphore when resources available', () => {
      let state: SemaphoreState = { S: 5, blockedQueue: [] };
      const diver: Diver = { id: 1, state: 'waiting', hasPack: false };
      
      const result = performWait(state, diver);
      
      expect(result.success).toBe(true);
      expect(result.state.S).toBe(4);
    });

    test('should block diver when no resources available', () => {
      let state: SemaphoreState = { S: 0, blockedQueue: [] };
      const diver: Diver = { id: 6, state: 'waiting', hasPack: false };
      
      const result = performWait(state, diver);
      
      expect(result.success).toBe(false);
      expect(result.state.blockedQueue.length).toBe(1);
      expect(result.state.blockedQueue[0].state).toBe('benched');
    });

    test('should handle multiple blocked divers', () => {
      let state: SemaphoreState = { S: 0, blockedQueue: [] };
      
      const diver1: Diver = { id: 6, state: 'waiting', hasPack: false };
      const diver2: Diver = { id: 7, state: 'waiting', hasPack: false };
      
      let result = performWait(state, diver1);
      state = result.state;
      result = performWait(state, diver2);
      
      expect(result.state.blockedQueue.length).toBe(2);
    });
  });

  /**
   * TC_CSM_002: Test semaphore signal operation with queue management
   * Objective: Verify signal() increments S and wakes blocked processes in FIFO order
   * Precondition: S=0, blocked queue has divers
   * Steps:
   *   1. Call signal() on semaphore
   *   2. Verify first blocked diver is awakened
   *   3. Verify FIFO order maintained
   * Test Data: S=0, blocked queue [D1, D2, D3]
   * Expected Result: D1 awakened first, queue becomes [D2, D3]
   * Post-condition: Queue processed in order
   */
  describe('TC_CSM_002: Signal Operation with Queue Management', () => {
    interface Diver {
      id: number;
      state: 'waiting' | 'jumping' | 'falling' | 'landed' | 'benched';
    }

    interface SemaphoreState {
      S: number;
      blockedQueue: Diver[];
    }

    const performSignal = (state: SemaphoreState): { state: SemaphoreState; awakenedDiver: Diver | null } => {
      if (state.blockedQueue.length > 0) {
        const [first, ...rest] = state.blockedQueue;
        return {
          state: {
            S: state.S, // S stays same, diver immediately uses resource
            blockedQueue: rest
          },
          awakenedDiver: { ...first, state: 'jumping' }
        };
      }
      return {
        state: {
          S: state.S + 1,
          blockedQueue: []
        },
        awakenedDiver: null
      };
    };

    test('should awaken first blocked diver in FIFO order', () => {
      let state: SemaphoreState = {
        S: 0,
        blockedQueue: [
          { id: 1, state: 'benched' },
          { id: 2, state: 'benched' },
          { id: 3, state: 'benched' }
        ]
      };
      
      const result = performSignal(state);
      
      expect(result.awakenedDiver?.id).toBe(1);
      expect(result.state.blockedQueue.length).toBe(2);
      expect(result.state.blockedQueue[0].id).toBe(2);
    });

    test('should increment semaphore when no blocked divers', () => {
      let state: SemaphoreState = { S: 2, blockedQueue: [] };
      
      const result = performSignal(state);
      
      expect(result.state.S).toBe(3);
      expect(result.awakenedDiver).toBeNull();
    });
  });

  /**
   * TC_CSM_003: Test Level 1 - Clear Skies basic allocation
   * Objective: Verify basic counting semaphore with S=5, 5 divers
   * Precondition: Level 1 initialized
   * Steps:
   *   1. Spawn 5 divers
   *   2. Each diver performs wait()
   *   3. All divers should get packs
   *   4. Divers land and perform signal()
   * Test Data: S=5, targetDivers=5
   * Expected Result: All divers complete successfully
   * Post-condition: Level completed
   */
  describe('TC_CSM_003: Level 1 - Clear Skies Basic Allocation', () => {
    interface LevelState {
      S: number;
      diverLaunched: number;
      diverLanded: number;
      targetDivers: number;
      blockedQueue: any[];
    }

    const simulateLevel1 = (): LevelState => {
      let state: LevelState = {
        S: 5,
        diverLaunched: 0,
        diverLanded: 0,
        targetDivers: 5,
        blockedQueue: []
      };

      // Simulate 5 divers launching
      for (let i = 0; i < 5; i++) {
        if (state.S > 0) {
          state.S--;
          state.diverLaunched++;
        }
      }

      // Simulate 5 divers landing
      for (let i = 0; i < 5; i++) {
        state.S++;
        state.diverLanded++;
      }

      return state;
    };

    test('should complete Level 1 with all divers successful', () => {
      const result = simulateLevel1();
      
      expect(result.diverLaunched).toBe(5);
      expect(result.diverLanded).toBe(5);
      expect(result.S).toBe(5); // Back to original
      expect(result.blockedQueue.length).toBe(0);
    });
  });

  /**
   * TC_CSM_004: Test Level 2 - The Hangar Jam blocked queue
   * Objective: Verify blocked queue management with S=3, 10 divers
   * Precondition: Level 2 initialized
   * Steps:
   *   1. Spawn 10 divers
   *   2. First 3 get packs, rest block
   *   3. As divers land, blocked divers wake
   * Test Data: S=3, targetDivers=10
   * Expected Result: Queue processes all divers
   * Post-condition: All 10 divers complete
   */
  describe('TC_CSM_004: Level 2 - The Hangar Jam Blocked Queue', () => {
    interface Level2State {
      S: number;
      diverLaunched: number;
      diverLanded: number;
      blockedQueue: number[];
      targetDivers: number;
    }

    const simulateLevel2Scenario = (): Level2State => {
      let state: Level2State = {
        S: 3,
        diverLaunched: 0,
        diverLanded: 0,
        blockedQueue: [],
        targetDivers: 10
      };

      // Spawn 10 divers
      for (let diverId = 1; diverId <= 10; diverId++) {
        if (state.S > 0) {
          state.S--;
          state.diverLaunched++;
        } else {
          state.blockedQueue.push(diverId);
        }
      }

      return state;
    };

    test('should block excess divers when resources exhausted', () => {
      const result = simulateLevel2Scenario();
      
      expect(result.diverLaunched).toBe(3);
      expect(result.blockedQueue.length).toBe(7);
      expect(result.S).toBe(0);
    });

    test('should wake blocked divers as resources become available', () => {
      let state = simulateLevel2Scenario();
      
      // Simulate first diver landing (signal)
      if (state.blockedQueue.length > 0) {
        const nextDiver = state.blockedQueue.shift();
        state.diverLaunched++;
        // S stays 0 as awakened diver immediately uses resource
      }
      
      expect(state.diverLaunched).toBe(4);
      expect(state.blockedQueue.length).toBe(6);
    });
  });

  /**
   * TC_CSM_005: Test Level 3 - The Infinite Fall resource leak
   * Objective: Verify stuck diver detection and recovery
   * Precondition: Level 3 initialized with stuck chance
   * Steps:
   *   1. Diver gets stuck mid-air
   *   2. Detect resource leak
   *   3. Force recovery mechanism
   * Test Data: S=3, stuckChance=0.4
   * Expected Result: Stuck divers can be recovered
   * Post-condition: Resources not permanently lost
   */
  describe('TC_CSM_005: Level 3 - The Infinite Fall Resource Leak', () => {
    interface StuckDiver {
      id: number;
      state: 'stuck';
      stuckTimer: number;
      hasWarning: boolean;
    }

    interface Level3State {
      S: number;
      stuckDivers: StuckDiver[];
      blockedQueue: any[];
    }

    const simulateStuckDiver = (diverId: number): StuckDiver => ({
      id: diverId,
      state: 'stuck',
      stuckTimer: 5000,
      hasWarning: false
    });

    const detectResourceLeak = (state: Level3State): boolean => {
      const stuckCount = state.stuckDivers.length;
      return stuckCount >= state.S && state.blockedQueue.length > 0;
    };

    const forceRecoverStuck = (state: Level3State, diverId: number): Level3State => {
      const updatedStuck = state.stuckDivers.filter(d => d.id !== diverId);
      return {
        ...state,
        S: state.S + 1, // Resource recovered
        stuckDivers: updatedStuck
      };
    };

    test('should detect resource leak when all resources stuck', () => {
      const state: Level3State = {
        S: 3,
        stuckDivers: [
          simulateStuckDiver(1),
          simulateStuckDiver(2),
          simulateStuckDiver(3)
        ],
        blockedQueue: [{ id: 4 }, { id: 5 }]
      };
      
      expect(detectResourceLeak(state)).toBe(true);
    });

    test('should recover resource when stuck diver is force-landed', () => {
      let state: Level3State = {
        S: 0,
        stuckDivers: [simulateStuckDiver(1)],
        blockedQueue: []
      };
      
      state = forceRecoverStuck(state, 1);
      
      expect(state.S).toBe(1);
      expect(state.stuckDivers.length).toBe(0);
    });
  });

  /**
   * TC_CSM_006: Test deadlock detection and prevention
   * Objective: Verify deadlock detection when all resources held by stuck processes
   * Precondition: All semaphore resources allocated to stuck divers
   * Steps:
   *   1. All divers get stuck with resources
   *   2. New divers try to wait()
   *   3. Detect deadlock condition
   *   4. Trigger recovery mechanism
   * Test Data: S=3, 3 stuck divers, waiting queue
   * Expected Result: Deadlock detected and resolved
   * Post-condition: System recovers from deadlock
   */
  describe('TC_CSM_006: Deadlock Detection and Prevention', () => {
    interface DeadlockState {
      S: number;
      stuckWithResources: number;
      waitingQueue: number;
      deadlockDetected: boolean;
    }

    const checkDeadlock = (state: DeadlockState): DeadlockState => {
      const deadlock = state.S === 0 && 
                      state.stuckWithResources > 0 && 
                      state.waitingQueue > 0;
      
      return { ...state, deadlockDetected: deadlock };
    };

    const resolveDeadlock = (state: DeadlockState): DeadlockState => {
      if (state.deadlockDetected) {
        return {
          S: state.stuckWithResources, // Recover all stuck resources
          stuckWithResources: 0,
          waitingQueue: Math.max(0, state.waitingQueue - state.stuckWithResources),
          deadlockDetected: false
        };
      }
      return state;
    };

    test('should detect deadlock when resources held by stuck processes', () => {
      let state: DeadlockState = {
        S: 0,
        stuckWithResources: 3,
        waitingQueue: 2,
        deadlockDetected: false
      };
      
      state = checkDeadlock(state);
      
      expect(state.deadlockDetected).toBe(true);
    });

    test('should resolve deadlock by recovering stuck resources', () => {
      let state: DeadlockState = {
        S: 0,
        stuckWithResources: 3,
        waitingQueue: 2,
        deadlockDetected: true
      };
      
      state = resolveDeadlock(state);
      
      expect(state.S).toBe(3);
      expect(state.stuckWithResources).toBe(0);
      expect(state.deadlockDetected).toBe(false);
    });
  });

  /**
   * TC_CSM_007: Test score calculation across levels
   * Objective: Verify correct scoring for successful operations
   * Precondition: Game in progress
   * Steps:
   *   1. Successful diver launch (+points)
   *   2. Successful diver landing (+points)
   *   3. Wrong attempts (-points)
   * Test Data: Various game actions
   * Expected Result: Score reflects performance
   * Post-condition: Final score calculated
   */
  describe('TC_CSM_007: Score Calculation', () => {
    const LAUNCH_POINTS = 5;
    const LANDING_POINTS = 10;
    const WRONG_PENALTY = 5;

    interface GameScore {
      score: number;
      diverLaunched: number;
      diverLanded: number;
      wrongAttempts: number;
    }

    const calculateScore = (state: GameScore): number => {
      return (state.diverLaunched * LAUNCH_POINTS) + 
             (state.diverLanded * LANDING_POINTS) - 
             (state.wrongAttempts * WRONG_PENALTY);
    };

    test('should calculate correct score for successful operations', () => {
      const state: GameScore = {
        score: 0,
        diverLaunched: 5,
        diverLanded: 5,
        wrongAttempts: 0
      };
      
      const finalScore = calculateScore(state);
      
      expect(finalScore).toBe(75); // (5*5) + (5*10) - (0*5)
    });

    test('should apply penalty for wrong attempts', () => {
      const state: GameScore = {
        score: 0,
        diverLaunched: 3,
        diverLanded: 3,
        wrongAttempts: 2
      };
      
      const finalScore = calculateScore(state);
      
      expect(finalScore).toBe(35); // (3*5) + (3*10) - (2*5)
    });
  });

  /**
   * TC_CSM_008: Test win condition validation
   * Objective: Verify game completion when target reached
   * Precondition: Game in playing phase
   * Steps:
   *   1. Track divers landed count
   *   2. Compare with target
   *   3. Trigger completion when reached
   * Test Data: Target varies by level
   * Expected Result: Game completes at correct count
   * Post-condition: Victory screen displayed
   */
  describe('TC_CSM_008: Win Condition Validation', () => {
    interface WinCondition {
      diverLanded: number;
      targetDivers: number;
      gameCompleted: boolean;
    }

    const checkWinCondition = (state: WinCondition): WinCondition => {
      return {
        ...state,
        gameCompleted: state.diverLanded >= state.targetDivers
      };
    };

    test('should complete Level 1 after 5 divers landed', () => {
      let state: WinCondition = {
        diverLanded: 5,
        targetDivers: 5,
        gameCompleted: false
      };
      
      state = checkWinCondition(state);
      
      expect(state.gameCompleted).toBe(true);
    });

    test('should complete Level 2 after 10 divers landed', () => {
      let state: WinCondition = {
        diverLanded: 10,
        targetDivers: 10,
        gameCompleted: false
      };
      
      state = checkWinCondition(state);
      
      expect(state.gameCompleted).toBe(true);
    });

    test('should not complete before target reached', () => {
      let state: WinCondition = {
        diverLanded: 8,
        targetDivers: 15,
        gameCompleted: false
      };
      
      state = checkWinCondition(state);
      
      expect(state.gameCompleted).toBe(false);
    });
  });

  /**
   * TC_CSM_009: Test semaphore value bounds
   * Objective: Verify semaphore value stays within valid bounds
   * Precondition: Semaphore operations in progress
   * Steps:
   *   1. Verify S never goes below 0
   *   2. Verify S doesn't exceed initial value inappropriately
   *   3. Test edge cases
   * Test Data: Various semaphore operations
   * Expected Result: S remains in valid range
   * Post-condition: Semaphore integrity maintained
   */
  describe('TC_CSM_009: Semaphore Value Bounds', () => {
    interface SemaphoreBounds {
      S: number;
      initialValue: number;
      minValue: number;
    }

    const validateSemaphoreBounds = (state: SemaphoreBounds): boolean => {
      return state.S >= state.minValue && state.S <= state.initialValue;
    };

    const performBoundedWait = (state: SemaphoreBounds): SemaphoreBounds => {
      return {
        ...state,
        S: Math.max(state.minValue, state.S - 1)
      };
    };

    const performBoundedSignal = (state: SemaphoreBounds): SemaphoreBounds => {
      return {
        ...state,
        S: Math.min(state.initialValue, state.S + 1)
      };
    };

    test('should not allow semaphore to go below 0', () => {
      let state: SemaphoreBounds = { S: 0, initialValue: 5, minValue: 0 };
      
      state = performBoundedWait(state);
      
      expect(state.S).toBe(0);
      expect(validateSemaphoreBounds(state)).toBe(true);
    });

    test('should not allow semaphore to exceed initial value', () => {
      let state: SemaphoreBounds = { S: 5, initialValue: 5, minValue: 0 };
      
      state = performBoundedSignal(state);
      
      expect(state.S).toBe(5);
      expect(validateSemaphoreBounds(state)).toBe(true);
    });

    test('should maintain bounds during normal operations', () => {
      let state: SemaphoreBounds = { S: 3, initialValue: 5, minValue: 0 };
      
      // Multiple operations
      state = performBoundedWait(state); // S = 2
      state = performBoundedWait(state); // S = 1
      state = performBoundedSignal(state); // S = 2
      
      expect(validateSemaphoreBounds(state)).toBe(true);
      expect(state.S).toBe(2);
    });
  });
});