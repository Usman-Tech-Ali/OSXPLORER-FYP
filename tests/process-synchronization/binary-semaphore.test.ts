/**
 * OSXplorer - Process Synchronization: Binary Semaphore Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Binary Semaphore Game - Binary Semaphore Process Synchronization', () => {

  /**
   * TC_BS_001: Test semaphore wait operation
   * Objective: Verify wait() decrements semaphore and blocks when 0
   * Precondition: Semaphore value is 1 (unlocked)
   * Steps:
   *   1. Call wait() on semaphore
   *   2. Verify semaphore value becomes 0
   *   3. Verify subsequent wait() blocks
   * Test Data: Initial semaphore = 1
   * Expected Result: Semaphore = 0 after wait, blocked on second wait
   * Post-condition: Bridge locked
   */
  describe('TC_BS_001: Wait Operation', () => {
    interface Semaphore {
      value: number;
      waitingCars: number;
    }

    const wait = (sem: Semaphore): { success: boolean; semaphore: Semaphore } => {
      if (sem.value > 0) {
        return {
          success: true,
          semaphore: { value: sem.value - 1, waitingCars: sem.waitingCars }
        };
      }
      return {
        success: false,
        semaphore: { value: sem.value, waitingCars: sem.waitingCars + 1 }
      };
    };

    test('should decrement semaphore on wait when value > 0', () => {
      let sem: Semaphore = { value: 1, waitingCars: 0 };
      const result = wait(sem);
      
      expect(result.success).toBe(true);
      expect(result.semaphore.value).toBe(0);
    });

    test('should block (fail) when semaphore value is 0', () => {
      let sem: Semaphore = { value: 0, waitingCars: 0 };
      const result = wait(sem);
      
      expect(result.success).toBe(false);
      expect(result.semaphore.waitingCars).toBe(1);
    });

    test('should track waiting cars when blocked', () => {
      let sem: Semaphore = { value: 0, waitingCars: 0 };
      
      let result = wait(sem);
      sem = result.semaphore;
      result = wait(sem);
      sem = result.semaphore;
      
      expect(sem.waitingCars).toBe(2);
    });
  });

  /**
   * TC_BS_002: Test semaphore signal operation
   * Objective: Verify signal() increments semaphore and unblocks waiting process
   * Precondition: Semaphore value is 0 (locked)
   * Steps:
   *   1. Call signal() on semaphore
   *   2. Verify semaphore value becomes 1
   *   3. Verify waiting process is unblocked
   * Test Data: Semaphore = 0, waiting cars = 1
   * Expected Result: Semaphore = 1 or waiting car proceeds
   * Post-condition: Bridge unlocked or car proceeds
   */
  describe('TC_BS_002: Signal Operation', () => {
    interface Semaphore {
      value: number;
      waitingCars: number;
    }

    const signal = (sem: Semaphore): Semaphore => {
      if (sem.waitingCars > 0) {
        // Wake up a waiting car instead of incrementing
        return { value: sem.value, waitingCars: sem.waitingCars - 1 };
      }
      // No waiting cars, increment semaphore
      return { value: Math.min(sem.value + 1, 1), waitingCars: 0 }; // Binary: max 1
    };

    test('should increment semaphore when no waiting cars', () => {
      let sem: Semaphore = { value: 0, waitingCars: 0 };
      sem = signal(sem);
      
      expect(sem.value).toBe(1);
    });

    test('should unblock waiting car instead of incrementing', () => {
      let sem: Semaphore = { value: 0, waitingCars: 2 };
      sem = signal(sem);
      
      expect(sem.value).toBe(0); // Value stays 0
      expect(sem.waitingCars).toBe(1); // One car unblocked
    });

    test('should not exceed 1 for binary semaphore', () => {
      let sem: Semaphore = { value: 1, waitingCars: 0 };
      sem = signal(sem);
      
      expect(sem.value).toBe(1); // Stays at 1
    });
  });

  /**
   * TC_BS_003: Test bridge access control
   * Objective: Verify only one car can be on bridge at a time
   * Precondition: Bridge is empty
   * Steps:
   *   1. First car requests access (wait)
   *   2. First car enters bridge
   *   3. Second car requests access
   *   4. Verify second car is blocked
   * Test Data: Car 1 and Car 2 from opposite sides
   * Expected Result: Only one car on bridge
   * Post-condition: Second car waits
   */
  describe('TC_BS_003: Bridge Access Control', () => {
    interface Car {
      id: string;
      direction: 'left' | 'right';
      isOnBridge: boolean;
      isWaiting: boolean;
    }

    interface BridgeState {
      semaphore: number;
      bridgeCar: Car | null;
      waitingCars: Car[];
    }

    const requestBridgeAccess = (state: BridgeState, car: Car): BridgeState => {
      if (state.semaphore > 0 && !state.bridgeCar) {
        return {
          semaphore: 0,
          bridgeCar: { ...car, isOnBridge: true, isWaiting: false },
          waitingCars: state.waitingCars
        };
      }
      return {
        ...state,
        waitingCars: [...state.waitingCars, { ...car, isWaiting: true }]
      };
    };

    test('should allow first car on bridge', () => {
      let state: BridgeState = { semaphore: 1, bridgeCar: null, waitingCars: [] };
      const car: Car = { id: 'car1', direction: 'left', isOnBridge: false, isWaiting: false };
      
      state = requestBridgeAccess(state, car);
      
      expect(state.bridgeCar?.id).toBe('car1');
      expect(state.semaphore).toBe(0);
    });

    test('should block second car when bridge occupied', () => {
      let state: BridgeState = { 
        semaphore: 0, 
        bridgeCar: { id: 'car1', direction: 'left', isOnBridge: true, isWaiting: false },
        waitingCars: [] 
      };
      const car2: Car = { id: 'car2', direction: 'right', isOnBridge: false, isWaiting: false };
      
      state = requestBridgeAccess(state, car2);
      
      expect(state.bridgeCar?.id).toBe('car1');
      expect(state.waitingCars.length).toBe(1);
      expect(state.waitingCars[0].isWaiting).toBe(true);
    });
  });

  /**
   * TC_BS_004: Test crash detection
   * Objective: Verify crash is detected when two cars on bridge
   * Precondition: One car is on bridge
   * Steps:
   *   1. Car 1 is on bridge
   *   2. Car 2 enters without waiting
   *   3. Detect collision
   *   4. Increment crash counter
   * Test Data: Two cars on bridge simultaneously
   * Expected Result: Crash detected and counted
   * Post-condition: Crash counter incremented
   */
  describe('TC_BS_004: Crash Detection', () => {
    interface GameState {
      carsOnBridge: number;
      crashes: number;
      score: number;
    }

    const checkCrash = (state: GameState): GameState => {
      if (state.carsOnBridge > 1) {
        return {
          ...state,
          crashes: state.crashes + 1,
          score: Math.max(0, state.score - 50)
        };
      }
      return state;
    };

    test('should detect crash when multiple cars on bridge', () => {
      let state: GameState = { carsOnBridge: 2, crashes: 0, score: 100 };
      state = checkCrash(state);
      
      expect(state.crashes).toBe(1);
    });

    test('should not report crash with one car', () => {
      let state: GameState = { carsOnBridge: 1, crashes: 0, score: 100 };
      state = checkCrash(state);
      
      expect(state.crashes).toBe(0);
    });

    test('should penalize score on crash', () => {
      let state: GameState = { carsOnBridge: 2, crashes: 0, score: 100 };
      state = checkCrash(state);
      
      expect(state.score).toBe(50);
    });
  });

  /**
   * TC_BS_005: Test score calculation for successful passes
   * Objective: Verify score increases when cars pass safely
   * Precondition: Game in playing phase
   * Steps:
   *   1. Car enters bridge with wait()
   *   2. Car exits bridge with signal()
   *   3. Verify score increase
   * Test Data: Successful pass = +100 points
   * Expected Result: Score incremented correctly
   * Post-condition: Score and pass count updated
   */
  describe('TC_BS_005: Score Calculation', () => {
    const PASS_POINTS = 100;
    const CRASH_PENALTY = 50;

    interface GameState {
      score: number;
      carsPassed: number;
      crashes: number;
    }

    const handleSuccessfulPass = (state: GameState): GameState => ({
      score: state.score + PASS_POINTS,
      carsPassed: state.carsPassed + 1,
      crashes: state.crashes
    });

    const handleCrash = (state: GameState): GameState => ({
      score: Math.max(0, state.score - CRASH_PENALTY),
      carsPassed: state.carsPassed,
      crashes: state.crashes + 1
    });

    test('should increase score on successful pass', () => {
      let state: GameState = { score: 0, carsPassed: 0, crashes: 0 };
      state = handleSuccessfulPass(state);
      
      expect(state.score).toBe(100);
      expect(state.carsPassed).toBe(1);
    });

    test('should decrease score on crash', () => {
      let state: GameState = { score: 100, carsPassed: 0, crashes: 0 };
      state = handleCrash(state);
      
      expect(state.score).toBe(50);
      expect(state.crashes).toBe(1);
    });

    test('should track cumulative score', () => {
      let state: GameState = { score: 0, carsPassed: 0, crashes: 0 };
      
      state = handleSuccessfulPass(state); // 100
      state = handleSuccessfulPass(state); // 200
      state = handleCrash(state);          // 150
      state = handleSuccessfulPass(state); // 250
      
      expect(state.score).toBe(250);
      expect(state.carsPassed).toBe(3);
      expect(state.crashes).toBe(1);
    });
  });

  /**
   * TC_BS_006: Test game completion condition
   * Objective: Verify game completes after target cars passed
   * Precondition: Game in playing phase
   * Steps:
   *   1. Pass cars until target reached
   *   2. Check completion condition
   *   3. Transition to completed phase
   * Test Data: Target = 10 cars
   * Expected Result: Game completes after 10 cars
   * Post-condition: Results screen displayed
   */
  describe('TC_BS_006: Game Completion', () => {
    const TARGET_SCORE = 10;

    type GamePhase = 'intro' | 'playing' | 'completed';

    interface GameState {
      phase: GamePhase;
      carsPassed: number;
      targetScore: number;
    }

    const checkCompletion = (state: GameState): GameState => {
      if (state.carsPassed >= state.targetScore) {
        return { ...state, phase: 'completed' };
      }
      return state;
    };

    test('should remain in playing phase until target reached', () => {
      let state: GameState = { phase: 'playing', carsPassed: 5, targetScore: TARGET_SCORE };
      state = checkCompletion(state);
      
      expect(state.phase).toBe('playing');
    });

    test('should complete game when target reached', () => {
      let state: GameState = { phase: 'playing', carsPassed: 10, targetScore: TARGET_SCORE };
      state = checkCompletion(state);
      
      expect(state.phase).toBe('completed');
    });
  });

  /**
   * TC_BS_007: Test button state based on semaphore
   * Objective: Verify wait/signal buttons reflect semaphore state
   * Precondition: Semaphore initialized
   * Steps:
   *   1. Check button state with semaphore = 1
   *   2. Check button state with semaphore = 0
   * Test Data: Semaphore values 0 and 1
   * Expected Result: Buttons enabled/disabled correctly
   * Post-condition: UI reflects semaphore state
   */
  describe('TC_BS_007: Button State Management', () => {
    interface ButtonState {
      waitEnabled: boolean;
      signalEnabled: boolean;
    }

    const getButtonState = (semaphore: number, carOnBridge: boolean): ButtonState => ({
      waitEnabled: semaphore > 0 && !carOnBridge,
      signalEnabled: semaphore === 0 || carOnBridge
    });

    test('should enable wait when semaphore is 1', () => {
      const state = getButtonState(1, false);
      expect(state.waitEnabled).toBe(true);
    });

    test('should disable wait when semaphore is 0', () => {
      const state = getButtonState(0, false);
      expect(state.waitEnabled).toBe(false);
    });

    test('should enable signal when car is on bridge', () => {
      const state = getButtonState(0, true);
      expect(state.signalEnabled).toBe(true);
    });

    test('should enable signal when semaphore is 0', () => {
      const state = getButtonState(0, false);
      expect(state.signalEnabled).toBe(true);
    });
  });
});
