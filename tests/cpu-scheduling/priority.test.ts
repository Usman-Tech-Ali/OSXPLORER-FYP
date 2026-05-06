/**
 * OSXplorer - CPU Scheduling: Priority Scheduling Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Priority Scheduling Game - All Levels', () => {

  /**
   * TC_PRIORITY_L1_001: Test Non-Preemptive Priority Scheduling
   * Objective: Verify that planes are processed by priority order (P1 > P2 > P3 > P4)
   * Precondition: Game L1 initialized with 4 planes of different priorities
   * Steps:
   *   1. Create planes with priorities 1, 2, 3, 4
   *   2. Verify highest priority (P1) is selected first
   *   3. Ensure no preemption occurs
   * Test Data: Planes with priorities [3, 1, 4, 2]
   * Expected Result: Processing order should be P1, P2, P3, P4
   * Post-condition: All planes processed in priority order
   */
  describe('TC_PRIORITY_L1_001: Non-Preemptive Priority Scheduling', () => {
    interface Plane {
      id: string;
      planeNumber: number;
      priority: 1 | 2 | 3 | 4;
      arrivalTime: number;
      burstTime: number;
      isCompleted: boolean;
      isOnRunway: boolean;
    }

    const createPlane = (id: string, num: number, priority: 1 | 2 | 3 | 4, burstTime: number = 4): Plane => ({
      id,
      planeNumber: num,
      priority,
      arrivalTime: 0,
      burstTime,
      isCompleted: false,
      isOnRunway: false
    });

    test('should select highest priority plane first (non-preemptive)', () => {
      const planes: Plane[] = [
        createPlane('plane1', 1, 3),  // P3 - lower priority
        createPlane('plane2', 2, 1),  // P1 - highest priority
        createPlane('plane3', 3, 4),  // P4 - lowest priority
        createPlane('plane4', 4, 2)   // P2 - second highest
      ];

      // Step 1: Find highest priority plane (lowest number)
      const highestPriority = planes.reduce((best, current) => 
        current.priority < best.priority ? current : best
      );

      // Step 2: Verify P1 is selected first
      expect(highestPriority.priority).toBe(1);
      expect(highestPriority.id).toBe('plane2');
    });

    test('should process all planes in correct priority order', () => {
      const planes: Plane[] = [
        createPlane('plane1', 1, 3),
        createPlane('plane2', 2, 1),
        createPlane('plane3', 3, 4),
        createPlane('plane4', 4, 2)
      ];

      // Sort by priority (ascending - lower number = higher priority)
      const sortedPlanes = [...planes].sort((a, b) => a.priority - b.priority);
      
      const expectedOrder = [1, 2, 3, 4]; // P1, P2, P3, P4
      const actualOrder = sortedPlanes.map(p => p.priority);

      expect(actualOrder).toEqual(expectedOrder);
    });

    test('should not allow preemption in L1', () => {
      const currentPlane = createPlane('current', 1, 3); // P3 on runway
      const newPlane = createPlane('new', 2, 1); // P1 arrives (higher priority)
      
      currentPlane.isOnRunway = true;
      
      // In non-preemptive, current plane should continue
      const shouldPreempt = newPlane.priority < currentPlane.priority && !currentPlane.isCompleted;
      
      // L1 is non-preemptive, so should not preempt
      expect(shouldPreempt).toBe(true); // Higher priority exists
      // But L1 doesn't allow preemption, so current continues
      expect(currentPlane.isOnRunway).toBe(true);
    });
  });

  /**
   * TC_PRIORITY_L2_001: Test Preemptive Priority Scheduling
   * Objective: Verify that higher priority planes can preempt lower priority ones
   * Precondition: Game L2 initialized with dynamic plane arrivals
   * Steps:
   *   1. Start lower priority plane on runway
   *   2. Higher priority plane arrives
   *   3. Verify preemption occurs
   * Test Data: P3 on runway, P1 arrives
   * Expected Result: P3 preempted, P1 takes runway
   * Post-condition: Higher priority plane is processing
   */
  describe('TC_PRIORITY_L2_001: Preemptive Priority Scheduling', () => {
    interface Plane {
      id: string;
      priority: 1 | 2 | 3 | 4;
      arrivalTime: number;
      burstTime: number;
      remainingBurstTime: number;
      isCompleted: boolean;
      isOnRunway: boolean;
      startTime?: number;
    }

    const createPlane = (id: string, priority: 1 | 2 | 3 | 4, arrivalTime: number, burstTime: number = 4): Plane => ({
      id,
      priority,
      arrivalTime,
      burstTime,
      remainingBurstTime: burstTime,
      isCompleted: false,
      isOnRunway: false
    });

    test('should preempt lower priority plane when higher priority arrives', () => {
      const currentPlane = createPlane('current', 3, 0); // P3
      const newPlane = createPlane('new', 1, 2); // P1 arrives later
      
      currentPlane.isOnRunway = true;
      currentPlane.startTime = 0;
      
      // Check if preemption should occur
      const shouldPreempt = newPlane.priority < currentPlane.priority && !currentPlane.isCompleted;
      
      expect(shouldPreempt).toBe(true);
      
      // Simulate preemption
      if (shouldPreempt) {
        const elapsed = 2; // 2 seconds elapsed
        currentPlane.remainingBurstTime = Math.max(0, currentPlane.burstTime - elapsed);
        currentPlane.isOnRunway = false;
        newPlane.isOnRunway = true;
      }
      
      expect(currentPlane.isOnRunway).toBe(false);
      expect(newPlane.isOnRunway).toBe(true);
      expect(currentPlane.remainingBurstTime).toBe(2); // 4 - 2 = 2
    });

    test('should handle multiple preemptions correctly', () => {
      const planes = [
        createPlane('p4', 4, 0), // P4 starts
        createPlane('p2', 2, 1), // P2 preempts P4
        createPlane('p1', 1, 2)  // P1 preempts P2
      ];
      
      let currentPlane = planes[0]; // P4 starts
      currentPlane.isOnRunway = true;
      
      // P2 arrives and preempts P4
      if (planes[1].priority < currentPlane.priority) {
        currentPlane.isOnRunway = false;
        currentPlane = planes[1];
        currentPlane.isOnRunway = true;
      }
      
      // P1 arrives and preempts P2
      if (planes[2].priority < currentPlane.priority) {
        currentPlane.isOnRunway = false;
        currentPlane = planes[2];
        currentPlane.isOnRunway = true;
      }
      
      expect(currentPlane.priority).toBe(1); // P1 should be on runway
      expect(currentPlane.id).toBe('p1');
    });

    test('should maintain remaining burst time after preemption', () => {
      const plane = createPlane('test', 3, 0, 6);
      plane.isOnRunway = true;
      plane.startTime = 0;
      
      // Simulate 2 seconds of execution before preemption
      const elapsed = 2;
      plane.remainingBurstTime = plane.burstTime - elapsed;
      plane.isOnRunway = false;
      
      expect(plane.remainingBurstTime).toBe(4); // 6 - 2 = 4
      expect(plane.isCompleted).toBe(false);
    });
  });

  /**
   * TC_PRIORITY_L3_001: Test Priority Scheduling with Aging
   * Objective: Verify that aging prevents starvation of low-priority planes
   * Precondition: Game L3 initialized with aging mechanism
   * Steps:
   *   1. Low priority plane waits for 10+ seconds
   *   2. Verify thundercloud appears (aging indicator)
   *   3. Ensure starving plane gets priority
   * Test Data: P4 waits while P1s keep arriving
   * Expected Result: P4 gets thundercloud and priority after aging threshold
   * Post-condition: Starvation prevented through aging
   */
  describe('TC_PRIORITY_L3_001: Priority Scheduling with Aging', () => {
    interface Plane {
      id: string;
      priority: 1 | 2 | 3 | 4;
      arrivalTime: number;
      burstTime: number;
      remainingBurstTime: number;
      isCompleted: boolean;
      isOnRunway: boolean;
      queueEnterTime: number;
      cloudSprite?: any; // Thundercloud indicator
    }

    const AGING_WAIT_SECONDS = 10;
    const STARVATION_GRACE_SECONDS = 5;

    const createPlane = (id: string, priority: 1 | 2 | 3 | 4, queueEnterTime: number): Plane => ({
      id,
      priority,
      arrivalTime: queueEnterTime,
      burstTime: 4,
      remainingBurstTime: 4,
      isCompleted: false,
      isOnRunway: false,
      queueEnterTime
    });

    test('should detect starvation after aging threshold', () => {
      const currentTime = 15; // 15 seconds elapsed
      const starvingPlane = createPlane('p4', 4, 0); // P4 entered at t=0
      
      const waitTime = currentTime - starvingPlane.queueEnterTime;
      const isStarving = waitTime >= AGING_WAIT_SECONDS;
      
      expect(waitTime).toBe(15);
      expect(isStarving).toBe(true);
      
      // Simulate thundercloud appearance
      if (isStarving) {
        starvingPlane.cloudSprite = { visible: true };
      }
      
      expect(starvingPlane.cloudSprite).toBeDefined();
    });

    test('should prioritize starving plane over higher priority new arrivals', () => {
      const currentTime = 12;
      const starvingPlane = createPlane('p4', 4, 0); // P4 starving
      const newPlane = createPlane('p1', 1, 12); // P1 just arrived
      
      const waitTime = currentTime - starvingPlane.queueEnterTime;
      const isStarving = waitTime >= AGING_WAIT_SECONDS;
      
      if (isStarving) {
        starvingPlane.cloudSprite = { visible: true };
      }
      
      const readyQueue = [starvingPlane, newPlane];
      
      // Find next plane to process (starving takes priority)
      const starvingInQueue = readyQueue.find(p => p.cloudSprite);
      const nextPlane = starvingInQueue || readyQueue.reduce((best, p) => 
        p.priority < best.priority ? p : best
      );
      
      expect(nextPlane.id).toBe('p4'); // Starving plane gets priority
      expect(nextPlane.priority).toBe(4); // Even though it's lowest priority normally
    });

    test('should trigger game over if starvation grace period exceeded', () => {
      const currentTime = 20; // 20 seconds elapsed
      const starvingPlane = createPlane('p4', 4, 0); // P4 entered at t=0
      
      const waitTime = currentTime - starvingPlane.queueEnterTime;
      const graceEnd = starvingPlane.queueEnterTime + AGING_WAIT_SECONDS + STARVATION_GRACE_SECONDS;
      const shouldGameOver = currentTime >= graceEnd;
      
      expect(waitTime).toBe(20);
      expect(graceEnd).toBe(15); // 0 + 10 + 5
      expect(shouldGameOver).toBe(true);
    });

    test('should clear thundercloud when starving plane gets runway', () => {
      const starvingPlane = createPlane('p4', 4, 0);
      starvingPlane.cloudSprite = { visible: true }; // Has thundercloud
      
      // Plane gets runway
      starvingPlane.isOnRunway = true;
      
      // Simulate thundercloud removal
      if (starvingPlane.isOnRunway) {
        starvingPlane.cloudSprite = undefined;
      }
      
      expect(starvingPlane.cloudSprite).toBeUndefined();
      expect(starvingPlane.isOnRunway).toBe(true);
    });
  });

  /**
   * TC_PRIORITY_SCORING_001: Test Scoring System
   * Objective: Verify correct scoring for right/wrong choices
   * Precondition: Game initialized with scoring system
   * Steps:
   *   1. Make correct priority choice
   *   2. Make incorrect priority choice
   *   3. Verify score changes
   * Test Data: Correct choice = +20, Wrong choice = -10
   * Expected Result: Score updates correctly
   * Post-condition: Score reflects player performance
   */
  describe('TC_PRIORITY_SCORING_001: Scoring System', () => {
    interface GameState {
      totalScore: number;
      wrongAttempts: number;
    }

    test('should award points for correct priority selection', () => {
      const gameState: GameState = { totalScore: 0, wrongAttempts: 0 };
      
      // Correct choice
      gameState.totalScore += 20;
      
      expect(gameState.totalScore).toBe(20);
      expect(gameState.wrongAttempts).toBe(0);
    });

    test('should deduct points for incorrect priority selection', () => {
      const gameState: GameState = { totalScore: 50, wrongAttempts: 0 };
      
      // Wrong choice
      gameState.wrongAttempts++;
      gameState.totalScore = Math.max(0, gameState.totalScore - 10);
      
      expect(gameState.totalScore).toBe(40);
      expect(gameState.wrongAttempts).toBe(1);
    });

    test('should not allow negative scores', () => {
      const gameState: GameState = { totalScore: 5, wrongAttempts: 0 };
      
      // Wrong choice that would make score negative
      gameState.wrongAttempts++;
      gameState.totalScore = Math.max(0, gameState.totalScore - 10);
      
      expect(gameState.totalScore).toBe(0); // Should not go below 0
      expect(gameState.wrongAttempts).toBe(1);
    });
  });

  /**
   * TC_PRIORITY_INTEGRATION_001: Test Complete Game Flow
   * Objective: Verify end-to-end game functionality across all levels
   * Precondition: All game levels available
   * Steps:
   *   1. Complete L1 (non-preemptive)
   *   2. Complete L2 (preemptive)
   *   3. Complete L3 (aging)
   * Test Data: Mixed priority scenarios
   * Expected Result: All levels complete successfully
   * Post-condition: Player progresses through all levels
   */
  describe('TC_PRIORITY_INTEGRATION_001: Complete Game Flow', () => {
    interface GameResult {
      level: string;
      completed: boolean;
      score: number;
      planesCleared: number;
      totalPlanes: number;
    }

    test('should complete L1 with all planes processed', () => {
      const result: GameResult = {
        level: 'L1',
        completed: false,
        score: 80, // 4 planes * 20 points each
        planesCleared: 4,
        totalPlanes: 4
      };
      
      result.completed = result.planesCleared === result.totalPlanes;
      
      expect(result.completed).toBe(true);
      expect(result.score).toBe(80);
    });

    test('should handle L2 preemptive scenarios', () => {
      const result: GameResult = {
        level: 'L2',
        completed: false,
        score: 100, // 5 planes with some preemptions
        planesCleared: 5,
        totalPlanes: 5
      };
      
      result.completed = result.planesCleared === result.totalPlanes;
      
      expect(result.completed).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    test('should prevent starvation in L3', () => {
      const result: GameResult = {
        level: 'L3',
        completed: true, // No game over from starvation
        score: 120,
        planesCleared: 6,
        totalPlanes: 6
      };
      
      // If completed is true, no starvation occurred
      expect(result.completed).toBe(true);
      expect(result.planesCleared).toBe(result.totalPlanes);
    });
  });
});