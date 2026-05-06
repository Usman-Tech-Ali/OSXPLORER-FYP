/**
 * OSXplorer - Process Synchronization: Mutex Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Mutex Game - Mutex Process Synchronization', () => {

  /**
   * TC_MX_001: Test mutex lock operation
   * Objective: Verify mutex correctly locks critical section
   * Precondition: Mutex is unlocked
   * Steps:
   *   1. Attempt to acquire mutex
   *   2. Verify mutex becomes locked
   *   3. Attempt second acquisition
   *   4. Verify second attempt is blocked
   * Test Data: Initial mutex = unlocked
   * Expected Result: Only one car can acquire mutex
   * Post-condition: Critical section protected
   */
  describe('TC_MX_001: Mutex Lock Operation', () => {
    interface Mutex {
      locked: boolean;
      owner: string | null;
    }

    const acquireMutex = (mutex: Mutex, carId: string): { mutex: Mutex; success: boolean } => {
      if (!mutex.locked) {
        return {
          mutex: { locked: true, owner: carId },
          success: true
        };
      }
      return { mutex, success: false };
    };

    test('should lock mutex on first acquisition', () => {
      const mutex: Mutex = { locked: false, owner: null };
      const result = acquireMutex(mutex, 'car1');
      
      expect(result.success).toBe(true);
      expect(result.mutex.locked).toBe(true);
      expect(result.mutex.owner).toBe('car1');
    });

    test('should block second acquisition when locked', () => {
      const mutex: Mutex = { locked: true, owner: 'car1' };
      const result = acquireMutex(mutex, 'car2');
      
      expect(result.success).toBe(false);
      expect(result.mutex.owner).toBe('car1');
    });
  });

  /**
   * TC_MX_002: Test mutex unlock operation
   * Objective: Verify mutex correctly unlocks when owner releases
   * Precondition: Mutex is locked by owner
   * Steps:
   *   1. Owner releases mutex
   *   2. Verify mutex becomes unlocked
   *   3. Verify another car can now acquire
   * Test Data: Mutex locked by car1
   * Expected Result: Mutex unlocked, available for others
   * Post-condition: Critical section available
   */
  describe('TC_MX_002: Mutex Unlock Operation', () => {
    interface Mutex {
      locked: boolean;
      owner: string | null;
    }

    const releaseMutex = (mutex: Mutex, carId: string): Mutex => {
      if (mutex.owner === carId) {
        return { locked: false, owner: null };
      }
      return mutex; // Only owner can release
    };

    test('should unlock when owner releases', () => {
      const mutex: Mutex = { locked: true, owner: 'car1' };
      const released = releaseMutex(mutex, 'car1');
      
      expect(released.locked).toBe(false);
      expect(released.owner).toBeNull();
    });

    test('should not unlock if non-owner attempts release', () => {
      const mutex: Mutex = { locked: true, owner: 'car1' };
      const result = releaseMutex(mutex, 'car2');
      
      expect(result.locked).toBe(true);
      expect(result.owner).toBe('car1');
    });
  });

  /**
   * TC_MX_003: Test critical section boundaries
   * Objective: Verify correct critical section start and end positions
   * Precondition: Game initialized with positions
   * Steps:
   *   1. Check critical section start position
   *   2. Check critical section end position
   *   3. Verify car position relative to boundaries
   * Test Data: Start=0.35, End=0.65 (screen proportions)
   * Expected Result: Boundaries correctly defined
   * Post-condition: Critical section properly bounded
   */
  describe('TC_MX_003: Critical Section Boundaries', () => {
    const CRITICAL_SECTION_START = 0.35;
    const CRITICAL_SECTION_END = 0.65;

    const isInCriticalSection = (positionRatio: number): boolean => {
      return positionRatio >= CRITICAL_SECTION_START && positionRatio <= CRITICAL_SECTION_END;
    };

    test('should detect car inside critical section', () => {
      expect(isInCriticalSection(0.40)).toBe(true);
      expect(isInCriticalSection(0.50)).toBe(true);
      expect(isInCriticalSection(0.60)).toBe(true);
    });

    test('should detect car outside critical section', () => {
      expect(isInCriticalSection(0.20)).toBe(false);
      expect(isInCriticalSection(0.80)).toBe(false);
    });

    test('should detect car at boundaries', () => {
      expect(isInCriticalSection(0.35)).toBe(true);
      expect(isInCriticalSection(0.65)).toBe(true);
    });
  });

  /**
   * TC_MX_004: Test car spawning
   * Objective: Verify cars spawn from both sides correctly
   * Precondition: Game in playing phase
   * Steps:
   *   1. Spawn car from left side
   *   2. Verify left-side position
   *   3. Spawn car from right side
   *   4. Verify right-side position
   * Test Data: Left waiting X=0.15, Right waiting X=0.85
   * Expected Result: Cars spawn at correct positions
   * Post-condition: Cars ready to move
   */
  describe('TC_MX_004: Car Spawning', () => {
    const LEFT_WAITING_X = 0.15;
    const RIGHT_WAITING_X = 0.85;
    const ROAD_Y = 0.55;

    interface Car {
      id: string;
      direction: 'left' | 'right';
      x: number;
      y: number;
    }

    const spawnCar = (id: string, side: 'left' | 'right'): Car => ({
      id,
      direction: side,
      x: side === 'left' ? LEFT_WAITING_X : RIGHT_WAITING_X,
      y: ROAD_Y
    });

    test('should spawn left car at left waiting position', () => {
      const car = spawnCar('car1', 'left');
      
      expect(car.x).toBe(LEFT_WAITING_X);
      expect(car.direction).toBe('left');
    });

    test('should spawn right car at right waiting position', () => {
      const car = spawnCar('car2', 'right');
      
      expect(car.x).toBe(RIGHT_WAITING_X);
      expect(car.direction).toBe('right');
    });

    test('should set correct road Y position', () => {
      const leftCar = spawnCar('car1', 'left');
      const rightCar = spawnCar('car2', 'right');
      
      expect(leftCar.y).toBe(ROAD_Y);
      expect(rightCar.y).toBe(ROAD_Y);
    });
  });

  /**
   * TC_MX_005: Test crash detection
   * Objective: Verify crash detection when mutex violated
   * Precondition: Two cars in critical section
   * Steps:
   *   1. Allow two cars into critical section
   *   2. Detect collision
   *   3. Increment crash counter
   * Test Data: Two cars overlapping in critical section
   * Expected Result: Crash detected and counted
   * Post-condition: Game state updated
   */
  describe('TC_MX_005: Crash Detection', () => {
    interface GameState {
      crashes: number;
      score: number;
      carsInCriticalSection: number;
    }

    const detectCrash = (state: GameState): GameState => {
      if (state.carsInCriticalSection > 1) {
        return {
          crashes: state.crashes + 1,
          score: Math.max(0, state.score - 100),
          carsInCriticalSection: 0 // Reset after crash
        };
      }
      return state;
    };

    test('should detect crash with multiple cars in critical section', () => {
      let state: GameState = { crashes: 0, score: 200, carsInCriticalSection: 2 };
      state = detectCrash(state);
      
      expect(state.crashes).toBe(1);
    });

    test('should not detect crash with single car', () => {
      let state: GameState = { crashes: 0, score: 200, carsInCriticalSection: 1 };
      state = detectCrash(state);
      
      expect(state.crashes).toBe(0);
    });

    test('should apply score penalty on crash', () => {
      let state: GameState = { crashes: 0, score: 200, carsInCriticalSection: 2 };
      state = detectCrash(state);
      
      expect(state.score).toBe(100);
    });
  });

  /**
   * TC_MX_006: Test score calculation
   * Objective: Verify correct score for successful car passes
   * Precondition: Game in playing phase
   * Steps:
   *   1. Car successfully passes through critical section
   *   2. Verify score increase
   *   3. Track cars passed count
   * Test Data: Successful pass = +100 points
   * Expected Result: Score and count updated
   * Post-condition: Progress toward target
   */
  describe('TC_MX_006: Score Calculation', () => {
    const PASS_POINTS = 100;

    interface GameState {
      score: number;
      carsPassed: number;
      targetScore: number;
    }

    const handleCarPassed = (state: GameState): GameState => ({
      score: state.score + PASS_POINTS,
      carsPassed: state.carsPassed + 1,
      targetScore: state.targetScore
    });

    test('should increase score on successful pass', () => {
      let state: GameState = { score: 0, carsPassed: 0, targetScore: 10 };
      state = handleCarPassed(state);
      
      expect(state.score).toBe(100);
      expect(state.carsPassed).toBe(1);
    });

    test('should accumulate score for multiple passes', () => {
      let state: GameState = { score: 0, carsPassed: 0, targetScore: 10 };
      
      state = handleCarPassed(state);
      state = handleCarPassed(state);
      state = handleCarPassed(state);
      
      expect(state.score).toBe(300);
      expect(state.carsPassed).toBe(3);
    });
  });

  /**
   * TC_MX_007: Test waiting state management
   * Objective: Verify cars correctly enter and exit waiting state
   * Precondition: Car approaches critical section
   * Steps:
   *   1. Car reaches waiting position
   *   2. Mutex is locked
   *   3. Car enters waiting state
   *   4. Mutex unlocks
   *   5. Car exits waiting state
   * Test Data: Car waiting for mutex
   * Expected Result: Correct waiting state transitions
   * Post-condition: Car proceeds when mutex available
   */
  describe('TC_MX_007: Waiting State Management', () => {
    interface Car {
      id: string;
      isWaiting: boolean;
      isMoving: boolean;
    }

    interface GameState {
      mutexLocked: boolean;
      waitingCars: Car[];
    }

    const carArrivesAtWaitingPoint = (state: GameState, car: Car): GameState => {
      if (state.mutexLocked) {
        return {
          ...state,
          waitingCars: [...state.waitingCars, { ...car, isWaiting: true, isMoving: false }]
        };
      }
      return state;
    };

    const mutexReleased = (state: GameState): { state: GameState; releasedCar: Car | null } => {
      if (state.waitingCars.length > 0) {
        const [first, ...rest] = state.waitingCars;
        return {
          state: { mutexLocked: true, waitingCars: rest },
          releasedCar: { ...first, isWaiting: false, isMoving: true }
        };
      }
      return { state: { ...state, mutexLocked: false }, releasedCar: null };
    };

    test('should add car to waiting list when mutex locked', () => {
      let state: GameState = { mutexLocked: true, waitingCars: [] };
      const car: Car = { id: 'car1', isWaiting: false, isMoving: true };
      
      state = carArrivesAtWaitingPoint(state, car);
      
      expect(state.waitingCars.length).toBe(1);
      expect(state.waitingCars[0].isWaiting).toBe(true);
    });

    test('should release first waiting car when mutex released', () => {
      let state: GameState = { 
        mutexLocked: true, 
        waitingCars: [
          { id: 'car1', isWaiting: true, isMoving: false },
          { id: 'car2', isWaiting: true, isMoving: false }
        ] 
      };
      
      const result = mutexReleased(state);
      
      expect(result.releasedCar?.id).toBe('car1');
      expect(result.releasedCar?.isWaiting).toBe(false);
      expect(result.state.waitingCars.length).toBe(1);
    });
  });

  /**
   * TC_MX_008: Test game completion
   * Objective: Verify game completes after target cars passed
   * Precondition: Game in playing phase
   * Steps:
   *   1. Pass cars until target reached
   *   2. Check completion condition
   *   3. Transition to completed phase
   * Test Data: Target = 10 cars
   * Expected Result: Game completes after 10 cars
   * Post-condition: Results displayed
   */
  describe('TC_MX_008: Game Completion', () => {
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

    test('should remain playing until target reached', () => {
      let state: GameState = { phase: 'playing', carsPassed: 5, targetScore: TARGET_SCORE };
      state = checkCompletion(state);
      
      expect(state.phase).toBe('playing');
    });

    test('should complete when target reached', () => {
      let state: GameState = { phase: 'playing', carsPassed: 10, targetScore: TARGET_SCORE };
      state = checkCompletion(state);
      
      expect(state.phase).toBe('completed');
    });

    test('should complete when exceeding target', () => {
      let state: GameState = { phase: 'playing', carsPassed: 12, targetScore: TARGET_SCORE };
      state = checkCompletion(state);
      
      expect(state.phase).toBe('completed');
    });
  });

  /**
   * TC_MX_009: Test status display
   * Objective: Verify mutex status correctly displayed
   * Precondition: UI initialized
   * Steps:
   *   1. Check status when unlocked
   *   2. Check status when locked
   * Test Data: Mutex states
   * Expected Result: Correct status text displayed
   * Post-condition: User sees current state
   */
  describe('TC_MX_009: Status Display', () => {
    const getStatusText = (locked: boolean): string => {
      return locked ? 'Critical Section: LOCKED' : 'Critical Section: UNLOCKED';
    };

    const getStatusColor = (locked: boolean): string => {
      return locked ? '#FF4444' : '#00FF00';
    };

    test('should display UNLOCKED when mutex free', () => {
      expect(getStatusText(false)).toBe('Critical Section: UNLOCKED');
      expect(getStatusColor(false)).toBe('#00FF00');
    });

    test('should display LOCKED when mutex acquired', () => {
      expect(getStatusText(true)).toBe('Critical Section: LOCKED');
      expect(getStatusColor(true)).toBe('#FF4444');
    });
  });
});
