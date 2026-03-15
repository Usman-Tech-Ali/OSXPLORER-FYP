/**
 * OSXplorer - CPU Scheduling: SRTF (Shortest Remaining Time First) Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('SRTF Game - Shortest Remaining Time First Algorithm', () => {

  /**
   * TC_SRTF_001: Test preemptive scheduling
   * Objective: Verify that a new job with shorter remaining time preempts current job
   * Precondition: A job is currently being processed
   * Steps:
   *   1. Start processing a job with remaining time 5
   *   2. New job arrives with remaining time 2
   *   3. Verify preemption occurs
   * Test Data: Current job RT=5, New job RT=2
   * Expected Result: New job preempts current job
   * Post-condition: Shorter job is now processing
   */
  describe('TC_SRTF_001: Preemptive Scheduling', () => {
    interface Patient {
      id: string;
      name: string;
      originalBurstTime: number;
      remainingTime: number;
      isTreating: boolean;
    }

    const shouldPreempt = (currentPatient: Patient | null, newPatient: Patient): boolean => {
      if (!currentPatient) return true;
      return newPatient.remainingTime < currentPatient.remainingTime;
    };

    test('should preempt when new job has shorter remaining time', () => {
      const currentPatient: Patient = {
        id: 'p1',
        name: 'Patient 1',
        originalBurstTime: 6,
        remainingTime: 5,
        isTreating: true
      };

      const newPatient: Patient = {
        id: 'p2',
        name: 'Patient 2',
        originalBurstTime: 2,
        remainingTime: 2,
        isTreating: false
      };

      expect(shouldPreempt(currentPatient, newPatient)).toBe(true);
    });

    test('should not preempt when current job has shorter remaining time', () => {
      const currentPatient: Patient = {
        id: 'p1',
        name: 'Patient 1',
        originalBurstTime: 3,
        remainingTime: 2,
        isTreating: true
      };

      const newPatient: Patient = {
        id: 'p2',
        name: 'Patient 2',
        originalBurstTime: 5,
        remainingTime: 5,
        isTreating: false
      };

      expect(shouldPreempt(currentPatient, newPatient)).toBe(false);
    });

    test('should start processing when no current job', () => {
      const newPatient: Patient = {
        id: 'p1',
        name: 'Patient 1',
        originalBurstTime: 4,
        remainingTime: 4,
        isTreating: false
      };

      expect(shouldPreempt(null, newPatient)).toBe(true);
    });
  });

  /**
   * TC_SRTF_002: Test remaining time decrement
   * Objective: Verify remaining time decreases correctly during processing
   * Precondition: Patient is being treated
   * Steps:
   *   1. Start treatment
   *   2. Simulate time passage
   *   3. Verify remaining time decreases
   * Test Data: Initial RT=5, After 1 unit: RT=4
   * Expected Result: Remaining time decrements by 1 per time unit
   * Post-condition: Remaining time updated correctly
   */
  describe('TC_SRTF_002: Remaining Time Decrement', () => {
    interface Patient {
      remainingTime: number;
      isCompleted: boolean;
    }

    const processOneTimeUnit = (patient: Patient): Patient => {
      const newRemainingTime = patient.remainingTime - 1;
      return {
        remainingTime: newRemainingTime,
        isCompleted: newRemainingTime <= 0
      };
    };

    test('should decrement remaining time by 1 per time unit', () => {
      let patient: Patient = { remainingTime: 5, isCompleted: false };
      
      patient = processOneTimeUnit(patient);
      expect(patient.remainingTime).toBe(4);
      
      patient = processOneTimeUnit(patient);
      expect(patient.remainingTime).toBe(3);
    });

    test('should mark as completed when remaining time reaches 0', () => {
      let patient: Patient = { remainingTime: 1, isCompleted: false };
      
      patient = processOneTimeUnit(patient);
      expect(patient.remainingTime).toBe(0);
      expect(patient.isCompleted).toBe(true);
    });
  });

  /**
   * TC_SRTF_003: Test ready queue management with preemption
   * Objective: Verify preempted jobs return to ready queue
   * Precondition: Job is preempted by shorter job
   * Steps:
   *   1. Process job A (RT=5)
   *   2. New job B arrives (RT=2)
   *   3. Preempt job A
   *   4. Add job A back to ready queue
   * Test Data: Job A with RT=5, Job B with RT=2
   * Expected Result: Job A added back to ready queue
   * Post-condition: Ready queue contains preempted job
   */
  describe('TC_SRTF_003: Ready Queue Management', () => {
    interface Patient {
      id: string;
      remainingTime: number;
      isTreating: boolean;
    }

    test('should add preempted job back to ready queue', () => {
      const readyQueue: Patient[] = [];
      
      // Current patient being treated
      const currentPatient: Patient = {
        id: 'p1',
        remainingTime: 5,
        isTreating: true
      };

      // New patient arrives with shorter remaining time
      const newPatient: Patient = {
        id: 'p2',
        remainingTime: 2,
        isTreating: false
      };

      // Preemption: add current patient back to queue
      if (newPatient.remainingTime < currentPatient.remainingTime) {
        currentPatient.isTreating = false;
        readyQueue.push(currentPatient);
        newPatient.isTreating = true;
      }

      expect(readyQueue.length).toBe(1);
      expect(readyQueue[0].id).toBe('p1');
      expect(newPatient.isTreating).toBe(true);
    });

    test('should select shortest remaining time from ready queue', () => {
      const readyQueue: Patient[] = [
        { id: 'p1', remainingTime: 5, isTreating: false },
        { id: 'p2', remainingTime: 2, isTreating: false },
        { id: 'p3', remainingTime: 3, isTreating: false }
      ];

      const nextPatient = readyQueue.reduce((min, patient) => 
        patient.remainingTime < min.remainingTime ? patient : min
      );

      expect(nextPatient.id).toBe('p2');
      expect(nextPatient.remainingTime).toBe(2);
    });
  });

  /**
   * TC_SRTF_004: Test urgency classification
   * Objective: Verify correct urgency level based on remaining time
   * Precondition: Patients have varying remaining times
   * Steps:
   *   1. Classify patient with high remaining time
   *   2. Classify patient with medium remaining time
   *   3. Classify patient with low remaining time
   * Test Data: RT <=2: critical, RT <=4: urgent, RT >4: stable
   * Expected Result: Correct urgency assigned
   * Post-condition: Visual indicators match urgency
   */
  describe('TC_SRTF_004: Urgency Classification', () => {
    type Urgency = 'critical' | 'urgent' | 'stable';

    const getUrgency = (remainingTime: number): Urgency => {
      if (remainingTime <= 2) return 'critical';
      if (remainingTime <= 4) return 'urgent';
      return 'stable';
    };

    test('should classify as critical when remaining time <= 2', () => {
      expect(getUrgency(1)).toBe('critical');
      expect(getUrgency(2)).toBe('critical');
    });

    test('should classify as urgent when remaining time <= 4', () => {
      expect(getUrgency(3)).toBe('urgent');
      expect(getUrgency(4)).toBe('urgent');
    });

    test('should classify as stable when remaining time > 4', () => {
      expect(getUrgency(5)).toBe('stable');
      expect(getUrgency(10)).toBe('stable');
    });
  });

  /**
   * TC_SRTF_005: Test penalty for delayed preemption
   * Objective: Verify score penalty when user doesn't preempt in time
   * Precondition: Preemption is required but not performed
   * Steps:
   *   1. Identify preemption opportunity
   *   2. User delays action
   *   3. Calculate penalty per second
   * Test Data: Penalty = 2 points per second of delay
   * Expected Result: Score decreases with delay
   * Post-condition: Score reflects penalty
   */
  describe('TC_SRTF_005: Delayed Preemption Penalty', () => {
    const PENALTY_PER_SECOND = 2;

    interface GameState {
      score: number;
      needsPreemption: boolean;
      delayedSeconds: number;
    }

    const calculatePenalty = (delayedSeconds: number): number => {
      return delayedSeconds * PENALTY_PER_SECOND;
    };

    const applyDelayPenalty = (state: GameState): GameState => {
      if (state.needsPreemption) {
        return {
          ...state,
          score: Math.max(0, state.score - calculatePenalty(state.delayedSeconds))
        };
      }
      return state;
    };

    test('should calculate correct penalty for delayed action', () => {
      expect(calculatePenalty(1)).toBe(2);
      expect(calculatePenalty(5)).toBe(10);
    });

    test('should apply penalty when preemption is delayed', () => {
      let state: GameState = {
        score: 100,
        needsPreemption: true,
        delayedSeconds: 3
      };

      state = applyDelayPenalty(state);
      expect(state.score).toBe(94); // 100 - (3 * 2)
    });

    test('should not apply penalty when no preemption needed', () => {
      let state: GameState = {
        score: 100,
        needsPreemption: false,
        delayedSeconds: 3
      };

      state = applyDelayPenalty(state);
      expect(state.score).toBe(100);
    });
  });

  /**
   * TC_SRTF_006: Test patient death tracking
   * Objective: Verify patient death when remaining time becomes critical
   * Precondition: Patient not treated in time
   * Steps:
   *   1. Patient remaining time reaches 0 without treatment
   *   2. Mark patient as died
   *   3. Update death counter
   * Test Data: Patient dies if RT=0 and not completed
   * Expected Result: Death counter increments
   * Post-condition: Patient removed from active queue
   */
  describe('TC_SRTF_006: Patient Death Tracking', () => {
    interface Patient {
      id: string;
      remainingTime: number;
      isCompleted: boolean;
      isDead: boolean;
    }

    interface GameState {
      patientsDied: number;
      score: number;
    }

    const checkPatientDeath = (patient: Patient): boolean => {
      return patient.remainingTime <= 0 && !patient.isCompleted;
    };

    const handlePatientDeath = (state: GameState): GameState => ({
      patientsDied: state.patientsDied + 1,
      score: Math.max(0, state.score - 50) // Heavy penalty for death
    });

    test('should detect patient death when remaining time is 0', () => {
      const patient: Patient = {
        id: 'p1',
        remainingTime: 0,
        isCompleted: false,
        isDead: false
      };

      expect(checkPatientDeath(patient)).toBe(true);
    });

    test('should not mark as dead if treatment completed', () => {
      const patient: Patient = {
        id: 'p1',
        remainingTime: 0,
        isCompleted: true,
        isDead: false
      };

      expect(checkPatientDeath(patient)).toBe(false);
    });

    test('should update death counter and apply penalty', () => {
      let state: GameState = { patientsDied: 0, score: 100 };
      
      state = handlePatientDeath(state);
      
      expect(state.patientsDied).toBe(1);
      expect(state.score).toBe(50);
    });
  });
});
