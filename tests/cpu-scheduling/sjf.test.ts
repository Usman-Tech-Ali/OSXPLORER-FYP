/**
 * OSXplorer - CPU Scheduling: SJF (Shortest Job First) Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('SJF Game - Shortest Job First Algorithm', () => {

  /**
   * TC_SJF_001: Test SJF queue ordering by burst time
   * Objective: Verify that jobs are processed by shortest burst time first
   * Precondition: Game is initialized with multiple file requests
   * Steps:
   *   1. Create file requests with different burst times
   *   2. Sort ready queue by burst time
   *   3. Verify shortest job is first
   * Test Data: Jobs with burst times 7, 3, 5
   * Expected Result: Queue ordered as [3, 5, 7]
   * Post-condition: Shortest job processed first
   */
  describe('TC_SJF_001: Shortest Job First Ordering', () => {
    interface FileRequest {
      id: string;
      requestNumber: number;
      personName: string;
      arrivalTime: number;
      burstTime: number;
      fileSize: 'small' | 'medium' | 'large';
      isCompleted: boolean;
    }

    const createRequest = (id: string, num: number, arrivalTime: number, burstTime: number, size: 'small' | 'medium' | 'large'): FileRequest => ({
      id,
      requestNumber: num,
      personName: `Person_${num}`,
      arrivalTime,
      burstTime,
      fileSize: size,
      isCompleted: false
    });

    test('should order queue by shortest burst time first', () => {
      const requests: FileRequest[] = [
        createRequest('req1', 1, 0, 7, 'large'),
        createRequest('req2', 2, 0, 3, 'small'),
        createRequest('req3', 3, 0, 5, 'medium')
      ];

      // SJF sorting - shortest burst time first
      const sortedQueue = [...requests].sort((a, b) => a.burstTime - b.burstTime);

      expect(sortedQueue[0].burstTime).toBe(3);
      expect(sortedQueue[1].burstTime).toBe(5);
      expect(sortedQueue[2].burstTime).toBe(7);
    });

    test('should select job with smallest burst time for processing', () => {
      const requests: FileRequest[] = [
        createRequest('req1', 1, 0, 7, 'large'),
        createRequest('req2', 2, 0, 3, 'small'),
        createRequest('req3', 3, 0, 5, 'medium')
      ];

      const shortestJob = requests.reduce((min, req) => 
        req.burstTime < min.burstTime ? req : min
      );

      expect(shortestJob.burstTime).toBe(3);
      expect(shortestJob.fileSize).toBe('small');
    });
  });

  /**
   * TC_SJF_002: Test file size to burst time mapping
   * Objective: Verify correct burst time assignment based on file size
   * Precondition: File size configurations defined
   * Steps:
   *   1. Define file configurations
   *   2. Map file size to burst time
   *   3. Verify correct mapping
   * Test Data: small=3, medium=5, large=7
   * Expected Result: Correct burst time for each file size
   * Post-condition: File requests have correct burst times
   */
  describe('TC_SJF_002: File Size to Burst Time Mapping', () => {
    const FILE_CONFIGS = {
      small: { name: 'Small File', burstTime: 3 },
      medium: { name: 'Medium File', burstTime: 5 },
      large: { name: 'Large File', burstTime: 7 }
    };

    test('should map small file to burst time 3', () => {
      expect(FILE_CONFIGS.small.burstTime).toBe(3);
    });

    test('should map medium file to burst time 5', () => {
      expect(FILE_CONFIGS.medium.burstTime).toBe(5);
    });

    test('should map large file to burst time 7', () => {
      expect(FILE_CONFIGS.large.burstTime).toBe(7);
    });

    test('should correctly assign burst time when creating request', () => {
      const fileSize: 'small' | 'medium' | 'large' = 'medium';
      const burstTime = FILE_CONFIGS[fileSize].burstTime;
      
      expect(burstTime).toBe(5);
    });
  });

  /**
   * TC_SJF_003: Test average waiting time calculation
   * Objective: Verify correct average waiting time calculation for SJF
   * Precondition: All jobs processed with SJF ordering
   * Steps:
   *   1. Process jobs in SJF order
   *   2. Calculate waiting time for each job
   *   3. Calculate average waiting time
   * Test Data: Jobs [3, 5, 7] with arrival time 0
   * Expected Result: Avg WT = (0 + 3 + 8) / 3 = 3.67
   * Post-condition: Average waiting time displayed
   */
  describe('TC_SJF_003: Average Waiting Time Calculation', () => {
    interface ProcessedJob {
      burstTime: number;
      waitingTime: number;
    }

    const calculateSJFWaitingTimes = (burstTimes: number[]): ProcessedJob[] => {
      const sorted = [...burstTimes].sort((a, b) => a - b);
      let currentTime = 0;
      
      return sorted.map(burstTime => {
        const waitingTime = currentTime;
        currentTime += burstTime;
        return { burstTime, waitingTime };
      });
    };

    const calculateAverageWaitingTime = (jobs: ProcessedJob[]): number => {
      const totalWaitingTime = jobs.reduce((sum, job) => sum + job.waitingTime, 0);
      return totalWaitingTime / jobs.length;
    };

    test('should calculate correct waiting times for SJF', () => {
      const burstTimes = [7, 3, 5];
      const processed = calculateSJFWaitingTimes(burstTimes);

      // Sorted order: [3, 5, 7]
      // Waiting times: [0, 3, 8]
      expect(processed[0].waitingTime).toBe(0);
      expect(processed[1].waitingTime).toBe(3);
      expect(processed[2].waitingTime).toBe(8);
    });

    test('should calculate correct average waiting time', () => {
      const burstTimes = [7, 3, 5];
      const processed = calculateSJFWaitingTimes(burstTimes);
      const avgWaitingTime = calculateAverageWaitingTime(processed);

      // (0 + 3 + 8) / 3 = 11/3 ≈ 3.67
      expect(avgWaitingTime).toBeCloseTo(3.67, 1);
    });
  });

  /**
   * TC_SJF_004: Test correct job selection with ties
   * Objective: Verify tie-breaking when jobs have same burst time
   * Precondition: Multiple jobs with same burst time
   * Steps:
   *   1. Create jobs with same burst time but different arrival times
   *   2. Apply SJF with FCFS tie-breaking
   *   3. Verify order
   * Test Data: Jobs with burst=5 arriving at t=0 and t=1
   * Expected Result: Earlier arrival processed first on tie
   * Post-condition: Consistent tie-breaking behavior
   */
  describe('TC_SJF_004: Tie-Breaking for Same Burst Time', () => {
    interface Job {
      id: string;
      arrivalTime: number;
      burstTime: number;
    }

    const sortSJFWithTieBreaking = (jobs: Job[]): Job[] => {
      return [...jobs].sort((a, b) => {
        // First by burst time (SJF)
        if (a.burstTime !== b.burstTime) {
          return a.burstTime - b.burstTime;
        }
        // Tie-breaker: FCFS (earlier arrival first)
        return a.arrivalTime - b.arrivalTime;
      });
    };

    test('should use FCFS as tie-breaker for same burst time', () => {
      const jobs: Job[] = [
        { id: 'job1', arrivalTime: 1, burstTime: 5 },
        { id: 'job2', arrivalTime: 0, burstTime: 5 },
        { id: 'job3', arrivalTime: 2, burstTime: 3 }
      ];

      const sorted = sortSJFWithTieBreaking(jobs);

      // Job3 (burst=3) first, then Job2 (burst=5, arrival=0), then Job1 (burst=5, arrival=1)
      expect(sorted[0].id).toBe('job3');
      expect(sorted[1].id).toBe('job2');
      expect(sorted[2].id).toBe('job1');
    });
  });

  /**
   * TC_SJF_005: Test game score based on correct selections
   * Objective: Verify score increases for correct SJF selections
   * Precondition: Game in processing phase
   * Steps:
   *   1. Select shortest job correctly
   *   2. Verify score increase
   *   3. Select wrong job
   *   4. Verify penalty applied
   * Test Data: Correct selection = +100, Wrong selection = -20
   * Expected Result: Score reflects correct/wrong selections
   * Post-condition: Final score calculated correctly
   */
  describe('TC_SJF_005: Score Calculation for Selections', () => {
    const CORRECT_SELECTION_POINTS = 100;
    const WRONG_SELECTION_PENALTY = 20;

    interface GameState {
      score: number;
      wrongAttempts: number;
    }

    const handleCorrectSelection = (state: GameState): GameState => ({
      ...state,
      score: state.score + CORRECT_SELECTION_POINTS
    });

    const handleWrongSelection = (state: GameState): GameState => ({
      ...state,
      score: Math.max(0, state.score - WRONG_SELECTION_PENALTY),
      wrongAttempts: state.wrongAttempts + 1
    });

    test('should increase score for correct selection', () => {
      let state: GameState = { score: 0, wrongAttempts: 0 };
      state = handleCorrectSelection(state);
      
      expect(state.score).toBe(100);
    });

    test('should decrease score for wrong selection', () => {
      let state: GameState = { score: 100, wrongAttempts: 0 };
      state = handleWrongSelection(state);
      
      expect(state.score).toBe(80);
      expect(state.wrongAttempts).toBe(1);
    });

    test('should not go below zero', () => {
      let state: GameState = { score: 10, wrongAttempts: 0 };
      state = handleWrongSelection(state);
      
      expect(state.score).toBe(0);
    });
  });
});
