/**
 * OSXplorer - Process Synchronization: Critical Section Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Critical Section Game - Critical Section Process Synchronization', () => {

  /**
   * TC_CS_001: Test mutual exclusion at ATM
   * Objective: Verify only one person can use ATM at a time
   * Precondition: Queue of people waiting at ATM
   * Steps:
   *   1. First person enters critical section (ATM)
   *   2. Second person attempts to enter
   *   3. Verify second person is blocked
   * Test Data: Person 1 at ATM, Person 2 waiting
   * Expected Result: Only one person at ATM
   * Post-condition: Second person in queue
   */
  describe('TC_CS_001: Mutual Exclusion', () => {
    interface Person {
      id: number;
      isAtAtm: boolean;
      isInQueue: boolean;
      isCompleted: boolean;
    }

    interface ATMState {
      isOccupied: boolean;
      currentPerson: Person | null;
    }

    const tryEnterCriticalSection = (atm: ATMState, person: Person): { atm: ATMState; success: boolean } => {
      if (!atm.isOccupied) {
        return {
          atm: { isOccupied: true, currentPerson: { ...person, isAtAtm: true, isInQueue: false } },
          success: true
        };
      }
      return { atm, success: false };
    };

    test('should allow first person to enter ATM', () => {
      const atm: ATMState = { isOccupied: false, currentPerson: null };
      const person: Person = { id: 1, isAtAtm: false, isInQueue: true, isCompleted: false };
      
      const result = tryEnterCriticalSection(atm, person);
      
      expect(result.success).toBe(true);
      expect(result.atm.isOccupied).toBe(true);
      expect(result.atm.currentPerson?.id).toBe(1);
    });

    test('should block second person when ATM occupied', () => {
      const atm: ATMState = { 
        isOccupied: true, 
        currentPerson: { id: 1, isAtAtm: true, isInQueue: false, isCompleted: false } 
      };
      const person2: Person = { id: 2, isAtAtm: false, isInQueue: true, isCompleted: false };
      
      const result = tryEnterCriticalSection(atm, person2);
      
      expect(result.success).toBe(false);
      expect(result.atm.currentPerson?.id).toBe(1);
    });
  });

  /**
   * TC_CS_002: Test exit from critical section
   * Objective: Verify person correctly exits ATM and next person can enter
   * Precondition: Person is using ATM
   * Steps:
   *   1. Current person finishes using ATM
   *   2. Person exits critical section
   *   3. ATM becomes available
   *   4. Next person in queue can enter
   * Test Data: Person 1 exits, Person 2 enters
   * Expected Result: Smooth transition between users
   * Post-condition: Next person at ATM
   */
  describe('TC_CS_002: Exit Critical Section', () => {
    interface Person {
      id: number;
      isAtAtm: boolean;
      isCompleted: boolean;
    }

    interface ATMState {
      isOccupied: boolean;
      currentPerson: Person | null;
    }

    interface GameState {
      atm: ATMState;
      queue: Person[];
      completed: Person[];
    }

    const exitCriticalSection = (state: GameState): GameState => {
      if (!state.atm.currentPerson) return state;

      const completedPerson = { ...state.atm.currentPerson, isAtAtm: false, isCompleted: true };
      
      return {
        atm: { isOccupied: false, currentPerson: null },
        queue: state.queue,
        completed: [...state.completed, completedPerson]
      };
    };

    test('should release ATM when person exits', () => {
      let state: GameState = {
        atm: { isOccupied: true, currentPerson: { id: 1, isAtAtm: true, isCompleted: false } },
        queue: [],
        completed: []
      };
      
      state = exitCriticalSection(state);
      
      expect(state.atm.isOccupied).toBe(false);
      expect(state.atm.currentPerson).toBeNull();
    });

    test('should mark person as completed', () => {
      let state: GameState = {
        atm: { isOccupied: true, currentPerson: { id: 1, isAtAtm: true, isCompleted: false } },
        queue: [],
        completed: []
      };
      
      state = exitCriticalSection(state);
      
      expect(state.completed.length).toBe(1);
      expect(state.completed[0].isCompleted).toBe(true);
    });
  });

  /**
   * TC_CS_003: Test queue management
   * Objective: Verify queue processes persons in correct order
   * Precondition: Multiple persons in queue
   * Steps:
   *   1. Add persons to queue
   *   2. Process first person at ATM
   *   3. Verify next person advances
   * Test Data: Queue [P1, P2, P3, P4]
   * Expected Result: Processed in order
   * Post-condition: Queue maintains FIFO order
   */
  describe('TC_CS_003: Queue Management', () => {
    interface Person {
      id: number;
      queuePosition: number;
    }

    const addToQueue = (queue: Person[], person: Person): Person[] => {
      return [...queue, { ...person, queuePosition: queue.length }];
    };

    const processNext = (queue: Person[]): { next: Person | null; remaining: Person[] } => {
      if (queue.length === 0) return { next: null, remaining: [] };
      
      const [next, ...remaining] = queue;
      const updatedRemaining = remaining.map((p, i) => ({ ...p, queuePosition: i }));
      
      return { next, remaining: updatedRemaining };
    };

    test('should add persons to queue in order', () => {
      let queue: Person[] = [];
      
      queue = addToQueue(queue, { id: 1, queuePosition: 0 });
      queue = addToQueue(queue, { id: 2, queuePosition: 0 });
      queue = addToQueue(queue, { id: 3, queuePosition: 0 });
      
      expect(queue.length).toBe(3);
      expect(queue[0].queuePosition).toBe(0);
      expect(queue[1].queuePosition).toBe(1);
      expect(queue[2].queuePosition).toBe(2);
    });

    test('should process first person in queue', () => {
      const queue: Person[] = [
        { id: 1, queuePosition: 0 },
        { id: 2, queuePosition: 1 },
        { id: 3, queuePosition: 2 }
      ];
      
      const result = processNext(queue);
      
      expect(result.next?.id).toBe(1);
      expect(result.remaining.length).toBe(2);
    });

    test('should update queue positions after processing', () => {
      const queue: Person[] = [
        { id: 1, queuePosition: 0 },
        { id: 2, queuePosition: 1 },
        { id: 3, queuePosition: 2 }
      ];
      
      const result = processNext(queue);
      
      expect(result.remaining[0].queuePosition).toBe(0);
      expect(result.remaining[1].queuePosition).toBe(1);
    });
  });

  /**
   * TC_CS_004: Test ATM usage time
   * Objective: Verify varying ATM usage times are handled correctly
   * Precondition: Person at ATM with assigned usage time
   * Steps:
   *   1. Start ATM timer for person
   *   2. Track time elapsed
   *   3. Complete when time expires
   * Test Data: Usage times vary from 2000ms to 5000ms
   * Expected Result: Timer completes correctly
   * Post-condition: Person finishes after assigned time
   */
  describe('TC_CS_004: ATM Usage Time', () => {
    interface Person {
      id: number;
      atmUsageTime: number; // in milliseconds
    }

    const generateUsageTime = (): number => {
      // Between 2000ms and 5000ms
      return Math.floor(Math.random() * 3000) + 2000;
    };

    const isUsageComplete = (startTime: number, usageTime: number, currentTime: number): boolean => {
      return (currentTime - startTime) >= usageTime;
    };

    test('should generate valid usage time', () => {
      const usageTime = generateUsageTime();
      
      expect(usageTime).toBeGreaterThanOrEqual(2000);
      expect(usageTime).toBeLessThanOrEqual(5000);
    });

    test('should detect completion after usage time elapsed', () => {
      const startTime = 0;
      const usageTime = 3000;
      
      expect(isUsageComplete(startTime, usageTime, 2000)).toBe(false);
      expect(isUsageComplete(startTime, usageTime, 3000)).toBe(true);
      expect(isUsageComplete(startTime, usageTime, 4000)).toBe(true);
    });
  });

  /**
   * TC_CS_005: Test score calculation
   * Objective: Verify correct score calculation based on performance
   * Precondition: Game in progress
   * Steps:
   *   1. Click correct person (front of queue)
   *   2. Verify score increase
   *   3. Click wrong person
   *   4. Verify penalty
   * Test Data: Correct = +100, Wrong = -20
   * Expected Result: Score reflects actions
   * Post-condition: Final score calculated
   */
  describe('TC_CS_005: Score Calculation', () => {
    const CORRECT_POINTS = 100;
    const WRONG_PENALTY = 20;

    interface GameState {
      score: number;
      wrongAttempts: number;
      completedCount: number;
    }

    const handleCorrectClick = (state: GameState): GameState => ({
      score: state.score + CORRECT_POINTS,
      wrongAttempts: state.wrongAttempts,
      completedCount: state.completedCount + 1
    });

    const handleWrongClick = (state: GameState): GameState => ({
      score: Math.max(0, state.score - WRONG_PENALTY),
      wrongAttempts: state.wrongAttempts + 1,
      completedCount: state.completedCount
    });

    test('should increase score for correct selection', () => {
      let state: GameState = { score: 0, wrongAttempts: 0, completedCount: 0 };
      state = handleCorrectClick(state);
      
      expect(state.score).toBe(100);
      expect(state.completedCount).toBe(1);
    });

    test('should decrease score for wrong selection', () => {
      let state: GameState = { score: 100, wrongAttempts: 0, completedCount: 0 };
      state = handleWrongClick(state);
      
      expect(state.score).toBe(80);
      expect(state.wrongAttempts).toBe(1);
    });

    test('should not go below zero score', () => {
      let state: GameState = { score: 10, wrongAttempts: 0, completedCount: 0 };
      state = handleWrongClick(state);
      
      expect(state.score).toBe(0);
    });
  });

  /**
   * TC_CS_006: Test correct person identification
   * Objective: Verify correct identification of next person to use ATM
   * Precondition: Queue with multiple persons
   * Steps:
   *   1. Identify person at front of queue
   *   2. Check if clicked person is correct
   *   3. Return validation result
   * Test Data: Queue with positions 0, 1, 2, 3
   * Expected Result: Only position 0 is correct
   * Post-condition: Validation accurate
   */
  describe('TC_CS_006: Correct Person Identification', () => {
    interface Person {
      id: number;
      queuePosition: number;
      isInQueue: boolean;
    }

    const isCorrectPerson = (person: Person): boolean => {
      return person.isInQueue && person.queuePosition === 0;
    };

    test('should identify front of queue as correct', () => {
      const person: Person = { id: 1, queuePosition: 0, isInQueue: true };
      expect(isCorrectPerson(person)).toBe(true);
    });

    test('should reject non-front queue positions', () => {
      const person: Person = { id: 2, queuePosition: 1, isInQueue: true };
      expect(isCorrectPerson(person)).toBe(false);
    });

    test('should reject person not in queue', () => {
      const person: Person = { id: 1, queuePosition: 0, isInQueue: false };
      expect(isCorrectPerson(person)).toBe(false);
    });
  });

  /**
   * TC_CS_007: Test game completion
   * Objective: Verify game completes after all persons processed
   * Precondition: Game in playing phase
   * Steps:
   *   1. Process all persons through ATM
   *   2. Check completion condition
   *   3. Transition to completed phase
   * Test Data: Total persons = 4
   * Expected Result: Game completes after 4 persons
   * Post-condition: Results screen displayed
   */
  describe('TC_CS_007: Game Completion', () => {
    const TOTAL_PERSONS = 4;

    type GamePhase = 'intro' | 'playing' | 'completed';

    interface GameState {
      phase: GamePhase;
      completedCount: number;
      totalPersons: number;
    }

    const checkCompletion = (state: GameState): GameState => {
      if (state.completedCount >= state.totalPersons) {
        return { ...state, phase: 'completed' };
      }
      return state;
    };

    test('should remain playing until all persons processed', () => {
      let state: GameState = { phase: 'playing', completedCount: 2, totalPersons: TOTAL_PERSONS };
      state = checkCompletion(state);
      
      expect(state.phase).toBe('playing');
    });

    test('should complete when all persons processed', () => {
      let state: GameState = { phase: 'playing', completedCount: 4, totalPersons: TOTAL_PERSONS };
      state = checkCompletion(state);
      
      expect(state.phase).toBe('completed');
    });
  });

  /**
   * TC_CS_008: Test console log messages
   * Objective: Verify console displays correct synchronization messages
   * Precondition: Console panel visible
   * Steps:
   *   1. Person enters critical section
   *   2. Verify entry message logged
   *   3. Person exits critical section
   *   4. Verify exit message logged
   * Test Data: Entry and exit events
   * Expected Result: Correct messages displayed
   * Post-condition: Console history updated
   */
  describe('TC_CS_008: Console Logging', () => {
    type LogEntry = {
      timestamp: number;
      message: string;
      type: 'entry' | 'exit' | 'error';
    };

    const createEntryLog = (personId: number, time: number): LogEntry => ({
      timestamp: time,
      message: `Person ${personId} entered critical section`,
      type: 'entry'
    });

    const createExitLog = (personId: number, time: number): LogEntry => ({
      timestamp: time,
      message: `Person ${personId} exited critical section`,
      type: 'exit'
    });

    test('should create correct entry log', () => {
      const log = createEntryLog(1, 1000);
      
      expect(log.message).toContain('Person 1');
      expect(log.message).toContain('entered');
      expect(log.type).toBe('entry');
    });

    test('should create correct exit log', () => {
      const log = createExitLog(1, 2000);
      
      expect(log.message).toContain('Person 1');
      expect(log.message).toContain('exited');
      expect(log.type).toBe('exit');
    });

    test('should maintain log history', () => {
      const logs: LogEntry[] = [];
      
      logs.push(createEntryLog(1, 1000));
      logs.push(createExitLog(1, 2000));
      logs.push(createEntryLog(2, 2100));
      
      expect(logs.length).toBe(3);
      expect(logs[0].type).toBe('entry');
      expect(logs[1].type).toBe('exit');
    });
  });
});
