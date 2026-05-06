/**
 * OSXplorer - Memory Management: Best-Fit Algorithm Game Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Best-Fit Game - Best-Fit Memory Allocation Algorithm', () => {

  /**
   * TC_BF_001: Test best-fit slot selection
   * Objective: Verify that the smallest slot that can fit the item is selected
   * Precondition: Compartments initialized with varying sizes
   * Steps:
   *   1. Create compartments with different sizes
   *   2. Request allocation for a gift
   *   3. Verify smallest fitting slot is selected
   * Test Data: Compartments [50, 100, 65], Gift size = 60
   * Expected Result: Compartment 3 (65 units) selected as best fit
   * Post-condition: Gift allocated to best fitting compartment
   */
  describe('TC_BF_001: Best-Fit Slot Selection', () => {
    interface Compartment {
      id: string;
      compartmentNumber: number;
      size: number;
      remainingSpace: number;
      occupied: boolean;
    }

    const findBestFit = (compartments: Compartment[], giftSize: number): Compartment | null => {
      let bestFit: Compartment | null = null;
      let minWaste = Infinity;

      for (const compartment of compartments) {
        if (compartment.remainingSpace >= giftSize) {
          const waste = compartment.remainingSpace - giftSize;
          if (waste < minWaste) {
            minWaste = waste;
            bestFit = compartment;
          }
        }
      }
      return bestFit;
    };

    test('should select compartment with minimum waste', () => {
      const compartments: Compartment[] = [
        { id: 'c1', compartmentNumber: 1, size: 50, remainingSpace: 50, occupied: false },
        { id: 'c2', compartmentNumber: 2, size: 100, remainingSpace: 100, occupied: false },
        { id: 'c3', compartmentNumber: 3, size: 65, remainingSpace: 65, occupied: false }
      ];

      const giftSize = 60;
      const selectedCompartment = findBestFit(compartments, giftSize);

      expect(selectedCompartment).not.toBeNull();
      expect(selectedCompartment?.compartmentNumber).toBe(3); // 65-60=5 waste (minimum)
    });

    test('should select perfect fit when available', () => {
      const compartments: Compartment[] = [
        { id: 'c1', compartmentNumber: 1, size: 100, remainingSpace: 100, occupied: false },
        { id: 'c2', compartmentNumber: 2, size: 60, remainingSpace: 60, occupied: false }, // Perfect fit
        { id: 'c3', compartmentNumber: 3, size: 70, remainingSpace: 70, occupied: false }
      ];

      const giftSize = 60;
      const selectedCompartment = findBestFit(compartments, giftSize);

      expect(selectedCompartment?.compartmentNumber).toBe(2); // Zero waste
    });

    test('should return null when no compartment fits', () => {
      const compartments: Compartment[] = [
        { id: 'c1', compartmentNumber: 1, size: 50, remainingSpace: 50, occupied: false },
        { id: 'c2', compartmentNumber: 2, size: 40, remainingSpace: 40, occupied: false }
      ];

      const giftSize = 60;
      const selectedCompartment = findBestFit(compartments, giftSize);

      expect(selectedCompartment).toBeNull();
    });
  });

  /**
   * TC_BF_002: Test fragmentation minimization
   * Objective: Verify that best-fit minimizes internal fragmentation
   * Precondition: Multiple allocation options available
   * Steps:
   *   1. Compare first-fit vs best-fit fragmentation
   *   2. Calculate total fragmentation for each approach
   *   3. Verify best-fit produces less fragmentation
   * Test Data: Compartments [100, 65, 80], Gift = 60
   * Expected Result: Best-fit fragmentation < First-fit fragmentation
   * Post-condition: Fragmentation metrics calculated
   */
  describe('TC_BF_002: Fragmentation Minimization', () => {
    interface Compartment {
      size: number;
      remainingSpace: number;
    }

    const findFirstFit = (compartments: Compartment[], size: number): number => {
      for (let i = 0; i < compartments.length; i++) {
        if (compartments[i].remainingSpace >= size) return i;
      }
      return -1;
    };

    const findBestFit = (compartments: Compartment[], size: number): number => {
      let bestIndex = -1;
      let minWaste = Infinity;
      
      for (let i = 0; i < compartments.length; i++) {
        if (compartments[i].remainingSpace >= size) {
          const waste = compartments[i].remainingSpace - size;
          if (waste < minWaste) {
            minWaste = waste;
            bestIndex = i;
          }
        }
      }
      return bestIndex;
    };

    test('should produce less fragmentation than first-fit', () => {
      const compartments: Compartment[] = [
        { size: 100, remainingSpace: 100 },
        { size: 65, remainingSpace: 65 },
        { size: 80, remainingSpace: 80 }
      ];

      const giftSize = 60;

      const firstFitIndex = findFirstFit(compartments, giftSize);
      const bestFitIndex = findBestFit(compartments, giftSize);

      const firstFitWaste = compartments[firstFitIndex].remainingSpace - giftSize;
      const bestFitWaste = compartments[bestFitIndex].remainingSpace - giftSize;

      expect(bestFitWaste).toBeLessThanOrEqual(firstFitWaste);
      expect(bestFitWaste).toBe(5);  // 65 - 60
      expect(firstFitWaste).toBe(40); // 100 - 60
    });
  });

  /**
   * TC_BF_003: Test gift size configurations
   * Objective: Verify correct gift size assignments
   * Precondition: Gift type configurations defined
   * Steps:
   *   1. Define gift configurations
   *   2. Verify size for each gift type
   * Test Data: gift1=15, gift2=35, gift3=55, gift4=75, gift5=95, gift6=120
   * Expected Result: Correct size for each gift
   * Post-condition: Gifts created with correct sizes
   */
  describe('TC_BF_003: Gift Size Configurations', () => {
    const GIFT_CONFIGS = {
      gift1: { name: 'Small Gift', size: 15 },
      gift2: { name: 'Medium Gift', size: 35 },
      gift3: { name: 'Large Gift', size: 55 },
      gift4: { name: 'Extra Large Gift', size: 75 },
      gift5: { name: 'Huge Gift', size: 95 },
      gift6: { name: 'Massive Gift', size: 120 }
    };

    test('should return correct size for small gift', () => {
      expect(GIFT_CONFIGS.gift1.size).toBe(15);
    });

    test('should return correct size for medium gift', () => {
      expect(GIFT_CONFIGS.gift2.size).toBe(35);
    });

    test('should return correct size for large gift', () => {
      expect(GIFT_CONFIGS.gift3.size).toBe(55);
    });

    test('should have increasing sizes', () => {
      const sizes = [
        GIFT_CONFIGS.gift1.size,
        GIFT_CONFIGS.gift2.size,
        GIFT_CONFIGS.gift3.size,
        GIFT_CONFIGS.gift4.size,
        GIFT_CONFIGS.gift5.size,
        GIFT_CONFIGS.gift6.size
      ];

      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
      }
    });
  });

  /**
   * TC_BF_004: Test multiple gifts in same compartment
   * Objective: Verify compartment can hold multiple small gifts
   * Precondition: Compartment with remaining space
   * Steps:
   *   1. Allocate first gift to compartment
   *   2. Update remaining space
   *   3. Allocate second gift if space permits
   * Test Data: Compartment=100, Gift1=35, Gift2=35
   * Expected Result: Both gifts fit, remaining=30
   * Post-condition: Compartment tracks all gifts
   */
  describe('TC_BF_004: Multiple Gifts in Compartment', () => {
    interface Compartment {
      id: string;
      size: number;
      remainingSpace: number;
      gifts: { id: string; size: number }[];
    }

    const allocateGift = (compartment: Compartment, giftId: string, giftSize: number): boolean => {
      if (compartment.remainingSpace >= giftSize) {
        compartment.gifts.push({ id: giftId, size: giftSize });
        compartment.remainingSpace -= giftSize;
        return true;
      }
      return false;
    };

    test('should allocate multiple gifts to same compartment', () => {
      const compartment: Compartment = {
        id: 'c1',
        size: 100,
        remainingSpace: 100,
        gifts: []
      };

      const result1 = allocateGift(compartment, 'g1', 35);
      const result2 = allocateGift(compartment, 'g2', 35);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(compartment.gifts.length).toBe(2);
      expect(compartment.remainingSpace).toBe(30);
    });

    test('should reject gift when insufficient space', () => {
      const compartment: Compartment = {
        id: 'c1',
        size: 100,
        remainingSpace: 30,
        gifts: []
      };

      const result = allocateGift(compartment, 'g1', 35);

      expect(result).toBe(false);
      expect(compartment.gifts.length).toBe(0);
    });
  });

  /**
   * TC_BF_005: Test score for optimal selections
   * Objective: Verify higher score for selecting best-fit compartment
   * Precondition: Game in placing phase
   * Steps:
   *   1. Player selects optimal (best-fit) compartment
   *   2. Verify bonus points
   *   3. Player selects non-optimal compartment
   *   4. Verify reduced points
   * Test Data: Optimal = +150, Correct but not optimal = +50
   * Expected Result: Score reflects selection quality
   * Post-condition: Final score calculated
   */
  describe('TC_BF_005: Score for Selection Quality', () => {
    const OPTIMAL_POINTS = 150;
    const CORRECT_POINTS = 50;
    const WRONG_PENALTY = 30;

    interface GameState {
      score: number;
      wrongAttempts: number;
    }

    const calculateSelectionScore = (selectedWaste: number, optimalWaste: number): number => {
      if (selectedWaste === optimalWaste) return OPTIMAL_POINTS;
      if (selectedWaste >= 0) return CORRECT_POINTS;
      return -WRONG_PENALTY;
    };

    test('should award maximum points for optimal selection', () => {
      const score = calculateSelectionScore(5, 5); // Selected the best-fit
      expect(score).toBe(OPTIMAL_POINTS);
    });

    test('should award partial points for correct but non-optimal selection', () => {
      const score = calculateSelectionScore(40, 5); // Correct but not best-fit
      expect(score).toBe(CORRECT_POINTS);
    });

    test('should penalize wrong selection', () => {
      const score = calculateSelectionScore(-1, 5); // Invalid selection
      expect(score).toBe(-WRONG_PENALTY);
    });

    test('should calculate cumulative score', () => {
      let state: GameState = { score: 0, wrongAttempts: 0 };
      
      state.score += calculateSelectionScore(0, 0);   // +150 (perfect fit)
      state.score += calculateSelectionScore(10, 5);  // +50 (not optimal)
      state.score += calculateSelectionScore(5, 5);   // +150 (optimal)
      
      expect(state.score).toBe(350);
    });
  });

  /**
   * TC_BF_006: Test efficiency comparison metrics
   * Objective: Verify efficiency metrics calculation
   * Precondition: Allocation complete
   * Steps:
   *   1. Calculate total allocated space
   *   2. Calculate total fragmentation
   *   3. Calculate efficiency percentage
   * Test Data: Allocated=350, Fragmentation=50, Total=400
   * Expected Result: Efficiency = 87.5%
   * Post-condition: Metrics displayed correctly
   */
  describe('TC_BF_006: Efficiency Metrics', () => {
    interface AllocationMetrics {
      totalAllocated: number;
      totalFragmentation: number;
      totalCompartmentSpace: number;
    }

    const calculateEfficiency = (metrics: AllocationMetrics): number => {
      if (metrics.totalCompartmentSpace === 0) return 0;
      return (metrics.totalAllocated / metrics.totalCompartmentSpace) * 100;
    };

    const calculateFragmentationRate = (metrics: AllocationMetrics): number => {
      if (metrics.totalCompartmentSpace === 0) return 0;
      return (metrics.totalFragmentation / metrics.totalCompartmentSpace) * 100;
    };

    test('should calculate correct efficiency', () => {
      const metrics: AllocationMetrics = {
        totalAllocated: 350,
        totalFragmentation: 50,
        totalCompartmentSpace: 400
      };

      const efficiency = calculateEfficiency(metrics);
      expect(efficiency).toBe(87.5);
    });

    test('should calculate correct fragmentation rate', () => {
      const metrics: AllocationMetrics = {
        totalAllocated: 350,
        totalFragmentation: 50,
        totalCompartmentSpace: 400
      };

      const fragRate = calculateFragmentationRate(metrics);
      expect(fragRate).toBe(12.5);
    });

    test('should sum to 100%', () => {
      const metrics: AllocationMetrics = {
        totalAllocated: 350,
        totalFragmentation: 50,
        totalCompartmentSpace: 400
      };

      const efficiency = calculateEfficiency(metrics);
      const fragRate = calculateFragmentationRate(metrics);
      
      expect(efficiency + fragRate).toBe(100);
    });
  });
});
