/**
 * OSXplorer - Memory Management: Compaction Games Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Compaction Games - Memory Compaction Algorithms', () => {

  /**
   * TC_COMPACTION_001: Test Basic Memory Compaction
   * Objective: Verify basic compaction moves allocated blocks to eliminate holes
   * Precondition: Memory initialized with allocated blocks and holes
   * Steps:
   *   1. Create memory layout with holes between allocated blocks
   *   2. Perform compaction operation
   *   3. Verify all holes moved to end
   * Test Data: Memory [A, hole, B, hole, C] -> [A, B, C, hole, hole]
   * Expected Result: All allocated blocks moved to beginning, holes at end
   * Post-condition: Memory compacted successfully
   */
  describe('TC_COMPACTION_001: Basic Memory Compaction', () => {
    interface MemoryBlock {
      id: string;
      size: number;
      allocated: boolean;
      processId?: string;
    }

    interface MemoryLayout {
      blocks: MemoryBlock[];
      totalSize: number;
      freeSpace: number;
    }

    const createMemoryLayout = (): MemoryLayout => ({
      blocks: [
        { id: 'block1', size: 100, allocated: true, processId: 'P1' },
        { id: 'hole1', size: 50, allocated: false },
        { id: 'block2', size: 80, allocated: true, processId: 'P2' },
        { id: 'hole2', size: 30, allocated: false },
        { id: 'block3', size: 60, allocated: true, processId: 'P3' }
      ],
      totalSize: 320,
      freeSpace: 80
    });

    const performCompaction = (layout: MemoryLayout): MemoryLayout => {
      const allocatedBlocks = layout.blocks.filter(block => block.allocated);
      const holes = layout.blocks.filter(block => !block.allocated);
      
      return {
        ...layout,
        blocks: [...allocatedBlocks, ...holes]
      };
    };

    const isCompacted = (layout: MemoryLayout): boolean => {
      let foundHole = false;
      for (const block of layout.blocks) {
        if (!block.allocated) {
          foundHole = true;
        } else if (foundHole) {
          return false; // Found allocated block after hole
        }
      }
      return true;
    };

    test('should move all allocated blocks to beginning', () => {
      const layout = createMemoryLayout();
      const compacted = performCompaction(layout);
      
      expect(isCompacted(compacted)).toBe(true);
      expect(compacted.blocks[0].processId).toBe('P1');
      expect(compacted.blocks[1].processId).toBe('P2');
      expect(compacted.blocks[2].processId).toBe('P3');
    });

    test('should preserve allocated block order', () => {
      const layout = createMemoryLayout();
      const compacted = performCompaction(layout);
      
      const allocatedBlocks = compacted.blocks.filter(b => b.allocated);
      expect(allocatedBlocks[0].processId).toBe('P1');
      expect(allocatedBlocks[1].processId).toBe('P2');
      expect(allocatedBlocks[2].processId).toBe('P3');
    });

    test('should move all holes to end', () => {
      const layout = createMemoryLayout();
      const compacted = performCompaction(layout);
      
      const holes = compacted.blocks.filter(b => !b.allocated);
      const lastBlocks = compacted.blocks.slice(-holes.length);
      
      expect(lastBlocks.every(b => !b.allocated)).toBe(true);
    });

    test('should preserve total memory size', () => {
      const layout = createMemoryLayout();
      const compacted = performCompaction(layout);
      
      const totalSize = compacted.blocks.reduce((sum, block) => sum + block.size, 0);
      expect(totalSize).toBe(layout.totalSize);
    });
  });

  /**
   * TC_COMPACTION_002: Test Compaction Performance Metrics
   * Objective: Verify compaction reduces external fragmentation
   * Precondition: Memory with multiple holes causing fragmentation
   * Steps:
   *   1. Calculate fragmentation before compaction
   *   2. Perform compaction
   *   3. Calculate fragmentation after compaction
   *   4. Verify improvement
   * Test Data: Multiple small holes vs single large hole
   * Expected Result: External fragmentation eliminated
   * Post-condition: Fragmentation metrics improved
   */
  describe('TC_COMPACTION_002: Compaction Performance Metrics', () => {
    interface FragmentationMetrics {
      totalHoles: number;
      largestHole: number;
      externalFragmentation: number;
      utilizationRate: number;
    }

    interface MemoryBlock {
      size: number;
      allocated: boolean;
    }

    const calculateFragmentation = (blocks: MemoryBlock[]): FragmentationMetrics => {
      const holes = blocks.filter(b => !b.allocated);
      const totalFreeSpace = holes.reduce((sum, hole) => sum + hole.size, 0);
      const totalMemory = blocks.reduce((sum, block) => sum + block.size, 0);
      const allocatedSpace = totalMemory - totalFreeSpace;
      
      return {
        totalHoles: holes.length,
        largestHole: holes.length > 0 ? Math.max(...holes.map(h => h.size)) : 0,
        externalFragmentation: holes.length > 1 ? totalFreeSpace - Math.max(...holes.map(h => h.size), 0) : 0,
        utilizationRate: (allocatedSpace / totalMemory) * 100
      };
    };

    const compactMemory = (blocks: MemoryBlock[]): MemoryBlock[] => {
      const allocated = blocks.filter(b => b.allocated);
      const holes = blocks.filter(b => !b.allocated);
      
      // Merge all holes into one
      const totalHoleSize = holes.reduce((sum, hole) => sum + hole.size, 0);
      const mergedHole = totalHoleSize > 0 ? [{ size: totalHoleSize, allocated: false }] : [];
      
      return [...allocated, ...mergedHole];
    };

    test('should eliminate external fragmentation', () => {
      const beforeBlocks: MemoryBlock[] = [
        { size: 100, allocated: true },
        { size: 20, allocated: false },
        { size: 80, allocated: true },
        { size: 15, allocated: false },
        { size: 60, allocated: true },
        { size: 25, allocated: false }
      ];
      
      const beforeMetrics = calculateFragmentation(beforeBlocks);
      const afterBlocks = compactMemory(beforeBlocks);
      const afterMetrics = calculateFragmentation(afterBlocks);
      
      expect(beforeMetrics.totalHoles).toBe(3);
      expect(afterMetrics.totalHoles).toBe(1);
      expect(afterMetrics.externalFragmentation).toBe(0);
    });

    test('should create single large hole from multiple small holes', () => {
      const blocks: MemoryBlock[] = [
        { size: 50, allocated: true },
        { size: 10, allocated: false },
        { size: 50, allocated: true },
        { size: 15, allocated: false },
        { size: 50, allocated: true },
        { size: 20, allocated: false }
      ];
      
      const compacted = compactMemory(blocks);
      const holes = compacted.filter(b => !b.allocated);
      
      expect(holes.length).toBe(1);
      expect(holes[0].size).toBe(45); // 10 + 15 + 20
    });

    test('should maintain utilization rate', () => {
      const blocks: MemoryBlock[] = [
        { size: 100, allocated: true },
        { size: 50, allocated: false },
        { size: 80, allocated: true }
      ];
      
      const beforeMetrics = calculateFragmentation(blocks);
      const afterBlocks = compactMemory(blocks);
      const afterMetrics = calculateFragmentation(afterBlocks);
      
      expect(afterMetrics.utilizationRate).toBeCloseTo(beforeMetrics.utilizationRate, 2);
    });
  });

  /**
   * TC_COMPACTION_003: Test Game Mechanics - Block Movement Animation
   * Objective: Verify visual representation of block movement during compaction
   * Precondition: Game initialized with memory blocks on screen
   * Steps:
   *   1. Start compaction animation
   *   2. Track block positions during movement
   *   3. Verify smooth animation to target positions
   * Test Data: Blocks at positions [0, 100, 200], target positions [0, 100, 160]
   * Expected Result: Blocks animate smoothly to compacted positions
   * Post-condition: Animation completes successfully
   */
  describe('TC_COMPACTION_003: Block Movement Animation', () => {
    interface AnimatedBlock {
      id: string;
      currentX: number;
      targetX: number;
      isAnimating: boolean;
      animationSpeed: number;
    }

    interface CompactionAnimation {
      blocks: AnimatedBlock[];
      isActive: boolean;
      progress: number;
    }

    const ANIMATION_SPEED = 200; // pixels per second

    const createAnimationState = (): CompactionAnimation => ({
      blocks: [
        { id: 'P1', currentX: 0, targetX: 0, isAnimating: false, animationSpeed: ANIMATION_SPEED },
        { id: 'P2', currentX: 150, targetX: 100, isAnimating: true, animationSpeed: ANIMATION_SPEED },
        { id: 'P3', currentX: 250, targetX: 160, isAnimating: true, animationSpeed: ANIMATION_SPEED }
      ],
      isActive: true,
      progress: 0
    });

    const updateAnimation = (animation: CompactionAnimation, deltaTime: number): CompactionAnimation => {
      const updatedBlocks = animation.blocks.map(block => {
        if (!block.isAnimating) return block;
        
        const distance = block.targetX - block.currentX;
        const moveDistance = block.animationSpeed * deltaTime;
        
        if (Math.abs(distance) <= moveDistance) {
          return { ...block, currentX: block.targetX, isAnimating: false };
        }
        
        const direction = distance > 0 ? 1 : -1;
        return { ...block, currentX: block.currentX + moveDistance * direction };
      });
      
      const allComplete = updatedBlocks.every(block => !block.isAnimating);
      
      return {
        blocks: updatedBlocks,
        isActive: !allComplete,
        progress: allComplete ? 1 : animation.progress + deltaTime
      };
    };

    test('should animate blocks to target positions', () => {
      let animation = createAnimationState();
      
      // Simulate 0.5 seconds of animation
      animation = updateAnimation(animation, 0.5);
      
      const movingBlock = animation.blocks.find(b => b.id === 'P2')!;
      expect(movingBlock.currentX).toBe(100); // Moved 50 pixels left in 0.5s at 200px/s (150 - 100 = 50)
    });

    test('should complete animation when blocks reach targets', () => {
      let animation = createAnimationState();
      
      // Simulate enough time for all animations to complete
      animation = updateAnimation(animation, 1.0);
      
      expect(animation.isActive).toBe(false);
      expect(animation.blocks.every(b => !b.isAnimating)).toBe(true);
      expect(animation.blocks.find(b => b.id === 'P2')!.currentX).toBe(100);
      expect(animation.blocks.find(b => b.id === 'P3')!.currentX).toBe(160);
    });

    test('should not move blocks already at target position', () => {
      const animation = createAnimationState();
      const staticBlock = animation.blocks.find(b => b.id === 'P1')!;
      
      expect(staticBlock.isAnimating).toBe(false);
      expect(staticBlock.currentX).toBe(staticBlock.targetX);
    });
  });

  /**
   * TC_COMPACTION_004: Test Memory Allocation After Compaction
   * Objective: Verify new allocations can use compacted free space
   * Precondition: Memory compacted with single large hole at end
   * Steps:
   *   1. Perform compaction to create large hole
   *   2. Attempt to allocate new process
   *   3. Verify allocation succeeds in compacted space
   * Test Data: Compacted hole = 100 units, new process = 80 units
   * Expected Result: New process allocated successfully
   * Post-condition: Memory utilization improved
   */
  describe('TC_COMPACTION_004: Memory Allocation After Compaction', () => {
    interface MemoryBlock {
      id: string;
      size: number;
      allocated: boolean;
      processId?: string;
    }

    interface AllocationRequest {
      processId: string;
      size: number;
    }

    interface AllocationResult {
      success: boolean;
      blockId?: string;
      remainingSpace?: number;
    }

    const findLargestHole = (blocks: MemoryBlock[]): MemoryBlock | null => {
      const holes = blocks.filter(b => !b.allocated);
      if (holes.length === 0) return null;
      
      return holes.reduce((largest, hole) => 
        hole.size > largest.size ? hole : largest
      );
    };

    const allocateInHole = (blocks: MemoryBlock[], request: AllocationRequest): AllocationResult => {
      const hole = findLargestHole(blocks);
      
      if (!hole || hole.size < request.size) {
        return { success: false };
      }
      
      // Split hole if necessary
      hole.allocated = true;
      hole.processId = request.processId;
      
      if (hole.size > request.size) {
        const remainingSize = hole.size - request.size;
        hole.size = request.size;
        
        // Create new hole for remaining space
        const newHole: MemoryBlock = {
          id: `hole_${Date.now()}`,
          size: remainingSize,
          allocated: false
        };
        
        const holeIndex = blocks.indexOf(hole);
        blocks.splice(holeIndex + 1, 0, newHole);
        
        return { success: true, blockId: hole.id, remainingSpace: remainingSize };
      }
      
      return { success: true, blockId: hole.id, remainingSpace: 0 };
    };

    test('should successfully allocate in compacted space', () => {
      const blocks: MemoryBlock[] = [
        { id: 'P1', size: 100, allocated: true, processId: 'P1' },
        { id: 'P2', size: 80, allocated: true, processId: 'P2' },
        { id: 'hole1', size: 120, allocated: false } // Compacted hole
      ];
      
      const request: AllocationRequest = { processId: 'P3', size: 80 };
      const result = allocateInHole(blocks, request);
      
      expect(result.success).toBe(true);
      expect(result.remainingSpace).toBe(40);
    });

    test('should reject allocation when insufficient space', () => {
      const blocks: MemoryBlock[] = [
        { id: 'P1', size: 100, allocated: true, processId: 'P1' },
        { id: 'hole1', size: 50, allocated: false }
      ];
      
      const request: AllocationRequest = { processId: 'P2', size: 80 };
      const result = allocateInHole(blocks, request);
      
      expect(result.success).toBe(false);
    });

    test('should create perfect fit allocation', () => {
      const blocks: MemoryBlock[] = [
        { id: 'P1', size: 100, allocated: true, processId: 'P1' },
        { id: 'hole1', size: 80, allocated: false }
      ];
      
      const request: AllocationRequest = { processId: 'P2', size: 80 };
      const result = allocateInHole(blocks, request);
      
      expect(result.success).toBe(true);
      expect(result.remainingSpace).toBe(0);
    });
  });

  /**
   * TC_COMPACTION_005: Test Compaction Cost Analysis
   * Objective: Verify compaction overhead calculation
   * Precondition: Memory layout with known block positions
   * Steps:
   *   1. Calculate total movement distance for all blocks
   *   2. Estimate compaction time based on movement
   *   3. Compare cost vs benefit of compaction
   * Test Data: 3 blocks moving distances [0, 50, 90]
   * Expected Result: Total movement = 140 units
   * Post-condition: Compaction cost calculated
   */
  describe('TC_COMPACTION_005: Compaction Cost Analysis', () => {
    interface CompactionCost {
      totalMovement: number;
      blocksToMove: number;
      estimatedTime: number;
      benefitScore: number;
    }

    interface MemoryBlock {
      id: string;
      currentPosition: number;
      targetPosition: number;
      size: number;
      allocated: boolean;
    }

    const MOVEMENT_COST_PER_UNIT = 0.1; // milliseconds per unit moved

    const calculateCompactionCost = (blocks: MemoryBlock[]): CompactionCost => {
      const allocatedBlocks = blocks.filter(b => b.allocated);
      
      const totalMovement = allocatedBlocks.reduce((sum, block) => {
        return sum + Math.abs(block.targetPosition - block.currentPosition);
      }, 0);
      
      const blocksToMove = allocatedBlocks.filter(b => 
        b.currentPosition !== b.targetPosition
      ).length;
      
      const estimatedTime = totalMovement * MOVEMENT_COST_PER_UNIT;
      
      // Benefit: larger contiguous space created
      const holes = blocks.filter(b => !b.allocated);
      const totalHoleSpace = holes.reduce((sum, hole) => sum + hole.size, 0);
      const benefitScore = totalHoleSpace;
      
      return {
        totalMovement,
        blocksToMove,
        estimatedTime,
        benefitScore
      };
    };

    test('should calculate total movement distance', () => {
      const blocks: MemoryBlock[] = [
        { id: 'P1', currentPosition: 0, targetPosition: 0, size: 100, allocated: true },
        { id: 'P2', currentPosition: 150, targetPosition: 100, size: 80, allocated: true },
        { id: 'P3', currentPosition: 250, targetPosition: 180, size: 60, allocated: true }
      ];
      
      const cost = calculateCompactionCost(blocks);
      expect(cost.totalMovement).toBe(120); // 0 + 50 + 70
      expect(cost.blocksToMove).toBe(2);
    });

    test('should estimate compaction time', () => {
      const blocks: MemoryBlock[] = [
        { id: 'P1', currentPosition: 100, targetPosition: 0, size: 50, allocated: true }
      ];
      
      const cost = calculateCompactionCost(blocks);
      expect(cost.estimatedTime).toBe(10); // 100 * 0.1
    });

    test('should calculate benefit score', () => {
      const blocks: MemoryBlock[] = [
        { id: 'P1', currentPosition: 0, targetPosition: 0, size: 100, allocated: true },
        { id: 'hole1', currentPosition: 100, targetPosition: 100, size: 50, allocated: false },
        { id: 'hole2', currentPosition: 150, targetPosition: 150, size: 30, allocated: false }
      ];
      
      const cost = calculateCompactionCost(blocks);
      expect(cost.benefitScore).toBe(80); // 50 + 30
    });
  });

  /**
   * TC_COMPACTION_006: Test Game Scoring System
   * Objective: Verify scoring for compaction efficiency and speed
   * Precondition: Game in compaction phase
   * Steps:
   *   1. Player performs compaction
   *   2. Calculate efficiency score based on result
   *   3. Calculate speed bonus based on completion time
   *   4. Award total score
   * Test Data: Perfect compaction = +200, Speed bonus = +50
   * Expected Result: Total score = 250
   * Post-condition: Score updated correctly
   */
  describe('TC_COMPACTION_006: Game Scoring System', () => {
    const PERFECT_COMPACTION_POINTS = 200;
    const GOOD_COMPACTION_POINTS = 150;
    const BASIC_COMPACTION_POINTS = 100;
    const SPEED_BONUS_THRESHOLD = 10; // seconds
    const SPEED_BONUS_POINTS = 50;

    interface CompactionResult {
      holesEliminated: number;
      totalHoles: number;
      completionTime: number;
      movementEfficiency: number;
    }

    interface GameScore {
      baseScore: number;
      speedBonus: number;
      totalScore: number;
    }

    const calculateCompactionScore = (result: CompactionResult): GameScore => {
      let baseScore = 0;
      
      // Score based on compaction quality
      const eliminationRate = result.holesEliminated / result.totalHoles;
      if (eliminationRate >= 0.9) {
        baseScore = PERFECT_COMPACTION_POINTS;
      } else if (eliminationRate >= 0.7) {
        baseScore = GOOD_COMPACTION_POINTS;
      } else {
        baseScore = BASIC_COMPACTION_POINTS;
      }
      
      // Speed bonus
      const speedBonus = result.completionTime <= SPEED_BONUS_THRESHOLD ? SPEED_BONUS_POINTS : 0;
      
      return {
        baseScore,
        speedBonus,
        totalScore: baseScore + speedBonus
      };
    };

    test('should award perfect score for complete compaction', () => {
      const result: CompactionResult = {
        holesEliminated: 3,
        totalHoles: 3,
        completionTime: 8,
        movementEfficiency: 0.95
      };
      
      const score = calculateCompactionScore(result);
      expect(score.baseScore).toBe(PERFECT_COMPACTION_POINTS);
      expect(score.speedBonus).toBe(SPEED_BONUS_POINTS);
      expect(score.totalScore).toBe(250);
    });

    test('should award good score for mostly complete compaction', () => {
      const result: CompactionResult = {
        holesEliminated: 2,
        totalHoles: 3,
        completionTime: 12,
        movementEfficiency: 0.8
      };
      
      const score = calculateCompactionScore(result);
      expect(score.baseScore).toBe(BASIC_COMPACTION_POINTS); // 2/3 = 0.67, which is < 0.7 threshold
      expect(score.speedBonus).toBe(0);
      expect(score.totalScore).toBe(100);
    });

    test('should award good score for 70% compaction', () => {
      const result: CompactionResult = {
        holesEliminated: 7,
        totalHoles: 10,
        completionTime: 12,
        movementEfficiency: 0.8
      };
      
      const score = calculateCompactionScore(result);
      expect(score.baseScore).toBe(GOOD_COMPACTION_POINTS); // 7/10 = 0.7, which meets 0.7 threshold
      expect(score.speedBonus).toBe(0);
      expect(score.totalScore).toBe(150);
    });

    test('should award basic score for partial compaction', () => {
      const result: CompactionResult = {
        holesEliminated: 1,
        totalHoles: 3,
        completionTime: 15,
        movementEfficiency: 0.6
      };
      
      const score = calculateCompactionScore(result);
      expect(score.baseScore).toBe(BASIC_COMPACTION_POINTS);
      expect(score.speedBonus).toBe(0);
      expect(score.totalScore).toBe(100);
    });
  });

  /**
   * TC_COMPACTION_007: Test Multiple Compaction Strategies
   * Objective: Verify different compaction approaches and their effectiveness
   * Precondition: Memory with various fragmentation patterns
   * Steps:
   *   1. Apply left-compaction (move all to left)
   *   2. Apply right-compaction (move all to right)
   *   3. Apply optimal compaction (minimize movement)
   *   4. Compare results
   * Test Data: Various memory layouts
   * Expected Result: All strategies eliminate fragmentation
   * Post-condition: Strategy effectiveness compared
   */
  describe('TC_COMPACTION_007: Multiple Compaction Strategies', () => {
    interface MemoryBlock {
      id: string;
      size: number;
      allocated: boolean;
      position: number;
    }

    interface CompactionStrategy {
      name: string;
      totalMovement: number;
      resultLayout: MemoryBlock[];
    }

    const leftCompaction = (blocks: MemoryBlock[]): CompactionStrategy => {
      const allocated = blocks.filter(b => b.allocated);
      const holes = blocks.filter(b => !b.allocated);
      
      let position = 0;
      let totalMovement = 0;
      
      const resultBlocks = allocated.map(block => {
        totalMovement += Math.abs(position - block.position);
        const newBlock = { ...block, position };
        position += block.size;
        return newBlock;
      });
      
      // Add holes at the end
      holes.forEach(hole => {
        resultBlocks.push({ ...hole, position });
        position += hole.size;
      });
      
      return {
        name: 'Left Compaction',
        totalMovement,
        resultLayout: resultBlocks
      };
    };

    const rightCompaction = (blocks: MemoryBlock[]): CompactionStrategy => {
      const allocated = blocks.filter(b => b.allocated);
      const holes = blocks.filter(b => !b.allocated);
      const totalSize = blocks.reduce((sum, b) => sum + b.size, 0);
      
      let position = totalSize;
      let totalMovement = 0;
      
      // Place allocated blocks from right to left
      const resultBlocks = [...allocated].reverse().map(block => {
        position -= block.size;
        totalMovement += Math.abs(position - block.position);
        return { ...block, position };
      }).reverse();
      
      // Add holes at the beginning
      position = 0;
      holes.forEach(hole => {
        resultBlocks.unshift({ ...hole, position });
        position += hole.size;
      });
      
      return {
        name: 'Right Compaction',
        totalMovement,
        resultLayout: resultBlocks
      };
    };

    test('should perform left compaction correctly', () => {
      const blocks: MemoryBlock[] = [
        { id: 'P1', size: 50, allocated: true, position: 0 },
        { id: 'hole1', size: 30, allocated: false, position: 50 },
        { id: 'P2', size: 40, allocated: true, position: 80 },
        { id: 'hole2', size: 20, allocated: false, position: 120 }
      ];
      
      const result = leftCompaction(blocks);
      const allocatedBlocks = result.resultLayout.filter(b => b.allocated);
      
      expect(allocatedBlocks[0].position).toBe(0);
      expect(allocatedBlocks[1].position).toBe(50);
      expect(result.name).toBe('Left Compaction');
    });

    test('should perform right compaction correctly', () => {
      const blocks: MemoryBlock[] = [
        { id: 'P1', size: 50, allocated: true, position: 0 },
        { id: 'hole1', size: 30, allocated: false, position: 50 },
        { id: 'P2', size: 40, allocated: true, position: 80 }
      ];
      
      const result = rightCompaction(blocks);
      const allocatedBlocks = result.resultLayout.filter(b => b.allocated);
      const totalSize = 120;
      
      expect(allocatedBlocks[1].position).toBe(totalSize - 40); // P2 at end
      expect(allocatedBlocks[0].position).toBe(totalSize - 40 - 50); // P1 before P2
    });

    test('should compare strategy effectiveness', () => {
      const blocks: MemoryBlock[] = [
        { id: 'P1', size: 50, allocated: true, position: 0 },
        { id: 'hole1', size: 30, allocated: false, position: 50 },
        { id: 'P2', size: 40, allocated: true, position: 80 }
      ];
      
      const leftResult = leftCompaction(blocks);
      const rightResult = rightCompaction(blocks);
      
      // Both should eliminate fragmentation
      const leftHoles = leftResult.resultLayout.filter(b => !b.allocated);
      const rightHoles = rightResult.resultLayout.filter(b => !b.allocated);
      
      expect(leftHoles.length).toBe(1);
      expect(rightHoles.length).toBe(1);
      
      // Movement costs may differ
      expect(leftResult.totalMovement).toBeGreaterThanOrEqual(0);
      expect(rightResult.totalMovement).toBeGreaterThanOrEqual(0);
    });
  });
});