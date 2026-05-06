/**
 * OSXplorer - CPU Scheduling: FCFS (First Come First Serve) Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

// FCFS Game Logic Test Suite
describe('FCFS Game - First Come First Serve Algorithm', () => {
  
  /**
   * TC_FCFS_001: Test FCFS queue ordering
   * Objective: Verify that orders are processed in arrival order (FIFO)
   * Precondition: Game is initialized with multiple orders
   * Steps: 
   *   1. Create orders with different arrival times
   *   2. Add to ready queue
   *   3. Verify queue order
   * Test Data: Orders arriving at t=0, t=2, t=4
   * Expected Result: Orders processed in order of arrival
   * Post-condition: Queue maintains FIFO order
   */
  describe('TC_FCFS_001: FIFO Queue Ordering', () => {
    interface FoodOrder {
      id: string;
      orderNumber: number;
      customerName: string;
      arrivalTime: number;
      burstTime: number;
      isCompleted: boolean;
    }

    const createOrder = (id: string, orderNumber: number, arrivalTime: number, burstTime: number): FoodOrder => ({
      id,
      orderNumber,
      customerName: `Customer_${orderNumber}`,
      arrivalTime,
      burstTime,
      isCompleted: false
    });

    test('should maintain FIFO order when adding orders to queue', () => {
      const orders: FoodOrder[] = [];
      
      // Step 1: Create orders with different arrival times
      orders.push(createOrder('order1', 1, 0, 4));
      orders.push(createOrder('order2', 2, 2, 6));
      orders.push(createOrder('order3', 3, 4, 3));
      
      // Step 2: Sort by arrival time (FCFS)
      const readyQueue = [...orders].sort((a, b) => a.arrivalTime - b.arrivalTime);
      
      // Step 3: Verify order
      expect(readyQueue[0].orderNumber).toBe(1);
      expect(readyQueue[1].orderNumber).toBe(2);
      expect(readyQueue[2].orderNumber).toBe(3);
    });

    test('should process first arrived order first', () => {
      const order1 = createOrder('order1', 1, 0, 4);
      const order2 = createOrder('order2', 2, 2, 6);
      
      const queue = [order1, order2];
      const nextToProcess = queue.shift();
      
      expect(nextToProcess?.orderNumber).toBe(1);
      expect(queue.length).toBe(1);
    });
  });

  /**
   * TC_FCFS_002: Test waiting time calculation
   * Objective: Verify correct waiting time calculation
   * Precondition: Orders have completion times calculated
   * Steps:
   *   1. Process orders in FCFS order
   *   2. Calculate waiting time for each order
   *   3. Verify waiting time formula
   * Test Data: Order1 (arrival=0, burst=4), Order2 (arrival=2, burst=6)
   * Expected Result: Waiting time = Completion time - Arrival time - Burst time
   * Post-condition: Correct waiting times displayed
   */
  describe('TC_FCFS_002: Waiting Time Calculation', () => {
    interface ProcessedOrder {
      arrivalTime: number;
      burstTime: number;
      startTime: number;
      completionTime: number;
      waitingTime: number;
      turnaroundTime: number;
    }

    const calculateWaitingTime = (completionTime: number, arrivalTime: number, burstTime: number): number => {
      return completionTime - arrivalTime - burstTime;
    };

    const calculateTurnaroundTime = (completionTime: number, arrivalTime: number): number => {
      return completionTime - arrivalTime;
    };

    test('should calculate correct waiting time for first order', () => {
      // First order starts immediately (no waiting)
      const order: ProcessedOrder = {
        arrivalTime: 0,
        burstTime: 4,
        startTime: 0,
        completionTime: 4,
        waitingTime: 0,
        turnaroundTime: 4
      };
      
      const calculatedWaitingTime = calculateWaitingTime(order.completionTime, order.arrivalTime, order.burstTime);
      expect(calculatedWaitingTime).toBe(0);
    });

    test('should calculate correct waiting time for subsequent orders', () => {
      // Second order has to wait for first order
      const firstOrderCompletionTime = 4;
      const secondOrder = {
        arrivalTime: 2,
        burstTime: 6,
        startTime: firstOrderCompletionTime,
        completionTime: firstOrderCompletionTime + 6
      };
      
      const waitingTime = calculateWaitingTime(secondOrder.completionTime, secondOrder.arrivalTime, secondOrder.burstTime);
      // Waiting time = 10 - 2 - 6 = 2
      expect(waitingTime).toBe(2);
    });

    test('should calculate correct turnaround time', () => {
      const order = {
        arrivalTime: 2,
        completionTime: 10
      };
      
      const turnaroundTime = calculateTurnaroundTime(order.completionTime, order.arrivalTime);
      expect(turnaroundTime).toBe(8);
    });
  });

  /**
   * TC_FCFS_003: Test score calculation
   * Objective: Verify correct score calculation based on performance
   * Precondition: Game completed with various attempts
   * Steps:
   *   1. Complete game with correct attempts
   *   2. Add wrong attempts
   *   3. Calculate final score
   * Test Data: Base score = 100, wrong attempt penalty = 20
   * Expected Result: Score = Base - (wrongAttempts * penalty)
   * Post-condition: Score displayed correctly
   */
  describe('TC_FCFS_003: Score Calculation', () => {
    const BASE_SCORE = 100;
    const WRONG_ATTEMPT_PENALTY = 20;

    const calculateScore = (correctAttempts: number, wrongAttempts: number): number => {
      const baseScore = correctAttempts * BASE_SCORE;
      const penalty = wrongAttempts * WRONG_ATTEMPT_PENALTY;
      return Math.max(0, baseScore - penalty);
    };

    test('should calculate full score with no wrong attempts', () => {
      const score = calculateScore(5, 0);
      expect(score).toBe(500);
    });

    test('should deduct penalty for wrong attempts', () => {
      const score = calculateScore(5, 2);
      expect(score).toBe(500 - 40);
    });

    test('should not go below zero', () => {
      const score = calculateScore(1, 10);
      expect(score).toBe(0);
    });
  });

  /**
   * TC_FCFS_004: Test game phase transitions
   * Objective: Verify correct game phase flow
   * Precondition: Game starts in 'intro' phase
   * Steps:
   *   1. Start game
   *   2. Complete arrival phase
   *   3. Complete cooking phase
   *   4. Complete serving phase
   *   5. View results
   * Test Data: Phase sequence: intro -> arrival -> cooking -> serving -> results
   * Expected Result: Phases transition correctly
   * Post-condition: Game ends in results phase
   */
  describe('TC_FCFS_004: Game Phase Transitions', () => {
    type GamePhase = 'intro' | 'arrival' | 'cooking' | 'serving' | 'results';
    
    const phases: GamePhase[] = ['intro', 'arrival', 'cooking', 'serving', 'results'];
    
    const getNextPhase = (currentPhase: GamePhase): GamePhase | null => {
      const currentIndex = phases.indexOf(currentPhase);
      if (currentIndex === -1 || currentIndex === phases.length - 1) return null;
      return phases[currentIndex + 1];
    };

    test('should start in intro phase', () => {
      const initialPhase: GamePhase = 'intro';
      expect(initialPhase).toBe('intro');
    });

    test('should transition from intro to arrival', () => {
      const nextPhase = getNextPhase('intro');
      expect(nextPhase).toBe('arrival');
    });

    test('should transition through all phases correctly', () => {
      expect(getNextPhase('intro')).toBe('arrival');
      expect(getNextPhase('arrival')).toBe('cooking');
      expect(getNextPhase('cooking')).toBe('serving');
      expect(getNextPhase('serving')).toBe('results');
      expect(getNextPhase('results')).toBeNull();
    });
  });

  /**
   * TC_FCFS_005: Test order completion tracking
   * Objective: Verify correct order completion tracking
   * Precondition: Orders in ready queue
   * Steps:
   *   1. Start cooking order
   *   2. Complete order
   *   3. Update completion status
   * Test Data: Order with isCompleted flag
   * Expected Result: isCompleted = true after completion
   * Post-condition: Order moved to completed list
   */
  describe('TC_FCFS_005: Order Completion Tracking', () => {
    interface Order {
      id: string;
      isCompleted: boolean;
      isDelivered: boolean;
      isCooking: boolean;
    }

    test('should mark order as completed after cooking', () => {
      const order: Order = {
        id: 'order1',
        isCompleted: false,
        isDelivered: false,
        isCooking: false
      };

      // Start cooking
      order.isCooking = true;
      expect(order.isCooking).toBe(true);

      // Complete cooking
      order.isCooking = false;
      order.isCompleted = true;
      expect(order.isCompleted).toBe(true);
      expect(order.isCooking).toBe(false);
    });

    test('should mark order as delivered after serving', () => {
      const order: Order = {
        id: 'order1',
        isCompleted: true,
        isDelivered: false,
        isCooking: false
      };

      order.isDelivered = true;
      expect(order.isDelivered).toBe(true);
    });

    test('should track multiple orders completion', () => {
      const orders: Order[] = [
        { id: 'order1', isCompleted: false, isDelivered: false, isCooking: false },
        { id: 'order2', isCompleted: false, isDelivered: false, isCooking: false },
        { id: 'order3', isCompleted: false, isDelivered: false, isCooking: false }
      ];

      // Complete all orders
      orders.forEach(order => order.isCompleted = true);
      
      const allCompleted = orders.every(order => order.isCompleted);
      expect(allCompleted).toBe(true);
    });
  });
});
