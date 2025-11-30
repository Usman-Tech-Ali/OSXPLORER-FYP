# Worst Fit Memory Management Game

## Game Overview
An interactive game teaching the Worst Fit memory allocation algorithm through a conveyor belt scenario.

## Scenario
You are a worker at a factory. Boxes move on a conveyor belt from left to right, and tools appear above. Your job is to drag each tool into the box with the LARGEST available space.

## Worst Fit Algorithm
**Worst Fit** always allocates memory to the LARGEST available block. This strategy:
- Leaves the maximum possible remaining space
- Reduces the creation of small, unusable fragments
- Can be slower than First Fit (must search all blocks)
- Better for scenarios with varying allocation sizes

## Game Mechanics

### Boxes (Memory Blocks)
- 4 boxes with different capacities: 100, 80, 60, 40 units
- Move continuously on conveyor belt from left to right
- Show remaining capacity

### Tools (Memory Requests)
- 6 tools with sizes: 20, 30, 15, 25, 35, 10 units
- Appear above the conveyor
- Drag and drop into boxes

### Gameplay
1. A box appears on the left and moves right
2. A tool appears above - drag it to a box
3. **Worst Fit Rule**: Must place in the LARGEST box that fits
4. Correct placement: +20 points
5. Wrong placement: -10 points

## Worst Fit vs Other Algorithms

### First Fit
- Uses the FIRST available space
- Fast but creates fragmentation

### Best Fit
- Uses the SMALLEST sufficient space
- Minimizes wasted space but creates tiny fragments

### Worst Fit
- Uses the LARGEST available space
- Leaves bigger remaining spaces
- Reduces small unusable fragments

## Example

**Available Boxes**: 100 (empty), 80 (empty), 60 (empty), 40 (empty)
**Tool Size**: 20 units

**Worst Fit Choice**: Box with 100 units (largest)
- After placement: 80 units remaining
- Leaves large usable space

**Why not others?**
- Box 40: Would leave only 20 units (small fragment)
- Box 60: Would leave only 40 units (medium fragment)
- Box 80: Would leave only 60 units (good, but not largest)
- Box 100: Leaves 80 units (BEST - largest remaining space!)

## Assets
Located in: `/public/games/memory-management/worstfit/`
- `background.png` - Factory background
- `worker.png` - Worker sprite
- `box1.png` to `box4.png` - Different sized boxes
- `tool1.png` to `tool6.png` - Different tools

## Learning Objectives
- Understand Worst Fit allocation strategy
- Learn when Worst Fit is beneficial
- Compare with First Fit and Best Fit
- Recognize fragmentation patterns
- Practice memory management decisions
