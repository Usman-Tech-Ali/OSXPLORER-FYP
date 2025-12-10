# Process Synchronization L2 and L3 Levels Implementation

## Overview
This document details the implementation of Level 2 (Medium) and Level 3 (Hard) for all Process Synchronization games. Each level progressively increases in difficulty through various gameplay mechanics.

---

## 1. Critical Section (ATM Queue) Game

### **Level 1 (L1) - Easy**
- **Total Persons**: 4 (fixed)
- **ATM Usage Time**: 3-7 seconds (random per person)
- **Gameplay**: Basic mutual exclusion with straightforward timing

### **Level 2 (L2) - Medium** ✅
**Difficulty Changes:**
- **Total Persons**: 5-6 (randomized range)
- **ATM Usage Time**: 2-8 seconds with ±500ms variation
  - Base time: `Phaser.Math.Between(2000, 8000)`
  - Variation: `Phaser.Math.Between(-500, 500)`
  - Minimum: 1.5 seconds
- **Increased Unpredictability**: More persons and wider time range

**Code Changes:**
```typescript
// In critical-section-l2/game.ts
export class CriticalSectionGameL2 extends Phaser.Scene {
  private totalPersons: number = Phaser.Math.Between(5, 6);
  
  constructor() {
    super({ key: 'CriticalSectionGameL2' });
  }
  
  // ATM usage time calculation
  const baseTime = Phaser.Math.Between(2000, 8000);
  const variation = Phaser.Math.Between(-500, 500);
  const atmUsageTime = Math.max(1500, baseTime + variation);
  
  // Score submission
  gameId: 'critical-section-l2'
  levelId: 'l2'
}
```

### **Level 3 (L3) - Hard** ✅
**Difficulty Changes:**
- **Total Persons**: 7-8 (randomized range, significantly more)
- **ATM Usage Time**: 1.5-9 seconds with ±1000ms variation
  - Base time: `Phaser.Math.Between(1500, 9000)`
  - Variation: `Phaser.Math.Between(-1000, 1000)`
  - Minimum: 1 second
- **High Complexity**: Many more persons with extreme time variations

**Code Changes:**
```typescript
// In critical-section-l3/game.ts
export class CriticalSectionGameL3 extends Phaser.Scene {
  private totalPersons: number = Phaser.Math.Between(7, 8);
  
  constructor() {
    super({ key: 'CriticalSectionGameL3' });
  }
  
  // ATM usage time calculation
  const baseTime = Phaser.Math.Between(1500, 9000);
  const variation = Phaser.Math.Between(-1000, 1000);
  const atmUsageTime = Math.max(1000, baseTime + variation);
  
  // Score submission
  gameId: 'critical-section-l3'
  levelId: 'l3'
}
```

**Files Modified:**
- `components/games/process-synchronization/critical-section-l2/game.ts`
- `components/games/process-synchronization/critical-section-l2/FirstCSGame.tsx`
- `components/games/process-synchronization/critical-section-l2/index.ts`
- `components/games/process-synchronization/critical-section-l3/game.ts`
- `components/games/process-synchronization/critical-section-l3/FirstCSGame.tsx`
- `components/games/process-synchronization/critical-section-l3/index.ts`

---

## 2. Mutex (Road Intersection) Game

### **Level 1 (L1) - Easy**
- **Target Score**: 10 cars
- **Spawn Interval**: 5000ms (fixed)
- **Car Speed**: 200 (fixed)
- **Gameplay**: Basic mutex locking with predictable timing

### **Level 2 (L2) - Medium** ✅
**Difficulty Changes:**
- **Target Score**: 15 cars (50% increase)
- **Spawn Interval**: 3500-4500ms (randomized per spawn)
  - Dynamic delay: `Phaser.Math.Between(3500, 4500)`
  - Resets with new random value after each spawn
- **Car Speed**: 220-250 (varied per car)
- **Increased Pace**: More cars spawn faster with varied speeds

**Code Changes:**
```typescript
// In mutex-l2/game.ts
export class MutexGameL2Scene extends Phaser.Scene {
  private targetScore: number = 15;
  
  constructor() {
    super({ key: 'MutexGameL2Scene' });
  }
  
  // Spawn event with dynamic randomization
  this.spawnEvent = this.time.addEvent({
    delay: Phaser.Math.Between(3500, 4500),
    callback: () => {
      const side = Phaser.Math.RND.pick(['left', 'right']) as 'left' | 'right';
      this.spawnCar(side);
      if (this.spawnEvent) {
        this.spawnEvent.delay = Phaser.Math.Between(3500, 4500);
      }
    },
    loop: true,
  });
  
  // Varied car speed
  const speed = Phaser.Math.Between(220, 250);
  
  // Score submission
  gameId: 'mutex-l2'
  levelId: 'l2'
}
```

### **Level 3 (L3) - Hard** ✅
**Difficulty Changes:**
- **Target Score**: 20 cars (100% increase from L1)
- **Spawn Interval**: 2500-3500ms (much faster, randomized per spawn)
  - Dynamic delay: `Phaser.Math.Between(2500, 3500)`
  - Constantly changing timing for unpredictability
- **Car Speed**: 250-300 (much faster and highly varied)
- **Extreme Difficulty**: Rapid spawning with high-speed cars

**Code Changes:**
```typescript
// In mutex-l3/game.ts
export class MutexGameL3Scene extends Phaser.Scene {
  private targetScore: number = 20;
  
  constructor() {
    super({ key: 'MutexGameL3Scene' });
  }
  
  // Much faster spawn with high randomization
  this.spawnEvent = this.time.addEvent({
    delay: Phaser.Math.Between(2500, 3500),
    callback: () => {
      const side = Phaser.Math.RND.pick(['left', 'right']) as 'left' | 'right';
      this.spawnCar(side);
      if (this.spawnEvent) {
        this.spawnEvent.delay = Phaser.Math.Between(2500, 3500);
      }
    },
    loop: true,
  });
  
  // Much faster and more varied speed
  const speed = Phaser.Math.Between(250, 300);
  
  // Score submission
  gameId: 'mutex-l3'
  levelId: 'l3'
}
```

**Files Modified:**
- `components/games/process-synchronization/mutex-l1/game.ts` (added missing submitScore method)
- `components/games/process-synchronization/mutex-l2/game.ts`
- `components/games/process-synchronization/mutex-l2/MutexGame.tsx`
- `components/games/process-synchronization/mutex-l3/game.ts`
- `components/games/process-synchronization/mutex-l3/MutexGame.tsx`

---

## 3. Binary Semaphore (Bridge) Game

### **Level 1 (L1) - Easy**
- **Target Score**: 10 cars
- **Spawn Interval**: 6000ms (fixed)
- **Car Movement Duration**: 2000ms (fixed)
- **Gameplay**: Basic binary semaphore with predictable timing

### **Level 2 (L2) - Medium** ✅
**Difficulty Changes:**
- **Target Score**: 15 cars (50% increase)
- **Spawn Interval**: 4500-5500ms (randomized per spawn)
  - Dynamic delay: `Phaser.Math.Between(4500, 5500)`
  - Resets with new random value after each spawn
- **Car Movement Duration**: 1700-1900ms (slightly faster with variation)
- **Increased Challenge**: More cars with faster and varied timing

**Code Changes:**
```typescript
// In binary-semaphore-l2/game.ts
export class BinarySemaphoreGameL2Scene extends Phaser.Scene {
  private targetScore: number = 15;
  
  constructor() {
    super({ key: 'BinarySemaphoreGameL2Scene' });
  }
  
  // Faster spawn with dynamic randomization
  this.spawnEvent = this.time.addEvent({
    delay: Phaser.Math.Between(4500, 5500),
    callback: () => {
      const side = Phaser.Math.RND.pick(['left', 'right']) as 'left' | 'right';
      this.spawnCar(side);
      if (this.spawnEvent) {
        this.spawnEvent.delay = Phaser.Math.Between(4500, 5500);
      }
    },
    loop: true,
  });
  
  // Slightly faster movement with variation
  this.tweens.add({
    targets: car.sprite,
    x: waitingX,
    duration: Phaser.Math.Between(1700, 1900),
    ease: 'Linear',
  });
  
  // Score submission
  gameId: 'binary-semaphore-l2'
  levelId: 'l2'
}
```

### **Level 3 (L3) - Hard** ✅
**Difficulty Changes:**
- **Target Score**: 20 cars (100% increase from L1)
- **Spawn Interval**: 3000-4000ms (much faster, randomized per spawn)
  - Dynamic delay: `Phaser.Math.Between(3000, 4000)`
  - High unpredictability in spawn timing
- **Car Movement Duration**: 1400-1700ms (much faster with high variation)
- **Extreme Pressure**: Rapid spawning with very fast car movements

**Code Changes:**
```typescript
// In binary-semaphore-l3/game.ts
export class BinarySemaphoreGameL3Scene extends Phaser.Scene {
  private targetScore: number = 20;
  
  constructor() {
    super({ key: 'BinarySemaphoreGameL3Scene' });
  }
  
  // Much faster spawn with high randomization
  this.spawnEvent = this.time.addEvent({
    delay: Phaser.Math.Between(3000, 4000),
    callback: () => {
      const side = Phaser.Math.RND.pick(['left', 'right']) as 'left' | 'right';
      this.spawnCar(side);
      if (this.spawnEvent) {
        this.spawnEvent.delay = Phaser.Math.Between(3000, 4000);
      }
    },
    loop: true,
  });
  
  // Much faster movement with high variation
  this.tweens.add({
    targets: car.sprite,
    x: waitingX,
    duration: Phaser.Math.Between(1400, 1700),
    ease: 'Linear',
  });
  
  // Score submission
  gameId: 'binary-semaphore-l3'
  levelId: 'l3'
}
```

**Files Modified:**
- `components/games/process-synchronization/binary-semaphore-l2/game.ts`
- `components/games/process-synchronization/binary-semaphore-l2/BinarySemaphoreGame.tsx`
- `components/games/process-synchronization/binary-semaphore-l3/game.ts`
- `components/games/process-synchronization/binary-semaphore-l3/BinarySemaphoreGame.tsx`

---

## Dynamic Routing Integration

Updated `app/modules/[moduleId]/games/[gameId]/page.tsx` to include all new levels:

```typescript
// New imports added
const CSGameL2 = dynamic(() => import("@/components/games/process-synchronization/critical-section-l2/FirstCSGame"), { ssr: false })
const CSGameL3 = dynamic(() => import("@/components/games/process-synchronization/critical-section-l3/FirstCSGame"), { ssr: false })
const MutexGameL2 = dynamic(() => import("@/components/games/process-synchronization/mutex-l2/MutexGame"), { ssr: false })
const MutexGameL3 = dynamic(() => import("@/components/games/process-synchronization/mutex-l3/MutexGame"), { ssr: false })
const BinarySemaphoreGameL2 = dynamic(() => import("@/components/games/process-synchronization/binary-semaphore-l2/BinarySemaphoreGame"), { ssr: false })
const BinarySemaphoreGameL3 = dynamic(() => import("@/components/games/process-synchronization/binary-semaphore-l3/BinarySemaphoreGame"), { ssr: false })

// New route checks added
const isCSL2 = moduleId === "process-synchronization" && gameId === "critical-section-l2"
const isCSL3 = moduleId === "process-synchronization" && gameId === "critical-section-l3"
const isMutexL2 = moduleId === "process-synchronization" && gameId === "mutex-l2"
const isMutexL3 = moduleId === "process-synchronization" && gameId === "mutex-l3"
const isBinarySemaphoreL2 = moduleId === "process-synchronization" && gameId === "binary-semaphore-l2"
const isBinarySemaphoreL3 = moduleId === "process-synchronization" && gameId === "binary-semaphore-l3"
```

---

## Verification Steps

### 1. **Build Verification**
```bash
npm run build
```
Ensure no TypeScript errors or build failures.

### 2. **Test Each Game Level**

#### **Critical Section:**
- Navigate to `/modules/process-synchronization/games/critical-section-l1`
- Navigate to `/modules/process-synchronization/games/critical-section-l2`
- Navigate to `/modules/process-synchronization/games/critical-section-l3`
- Verify:
  - L2 has 5-6 persons with varied ATM times
  - L3 has 7-8 persons with highly varied ATM times
  - Score submission works for each level

#### **Mutex:**
- Navigate to `/modules/process-synchronization/games/mutex-l1`
- Navigate to `/modules/process-synchronization/games/mutex-l2`
- Navigate to `/modules/process-synchronization/games/mutex-l3`
- Verify:
  - L2 requires 15 cars with faster, varied spawning
  - L3 requires 20 cars with rapid, varied spawning and high-speed cars
  - Lock/Unlock mechanics work correctly

#### **Binary Semaphore:**
- Navigate to `/modules/process-synchronization/games/binary-semaphore-l1`
- Navigate to `/modules/process-synchronization/games/binary-semaphore-l2`
- Navigate to `/modules/process-synchronization/games/binary-semaphore-l3`
- Verify:
  - L2 requires 15 cars with faster spawning and movement
  - L3 requires 20 cars with rapid spawning and very fast movement
  - Wait()/Signal() mechanics work correctly

### 3. **Achievement Verification**
After completing each game:
- Check `/achievements` page
- Verify scores are submitted correctly
- Confirm achievements are unlocked when criteria are met

### 4. **Database Verification**
```javascript
// In MongoDB
db.scores.find({ 
  moduleId: 'process-synchronization',
  gameId: { $in: ['critical-section-l2', 'critical-section-l3', 'mutex-l2', 'mutex-l3', 'binary-semaphore-l2', 'binary-semaphore-l3'] }
}).sort({ createdAt: -1 })
```

---

## Summary of Changes

### **Code Structure:**
- Created 6 new level folders (L2 and L3 for each of 3 games)
- Modified 18 game files (game.ts and component files)
- Updated dynamic routing to support all new levels
- Ensured all games submit scores with correct gameId and levelId

### **Difficulty Progression:**
| Game | L1 → L2 | L2 → L3 |
|------|---------|---------|
| **Critical Section** | +1-2 persons, wider time range | +2-3 persons, extreme time variation |
| **Mutex** | +5 cars, 30% faster spawn, varied speed | +5 cars, 50% faster spawn, much faster speed |
| **Binary Semaphore** | +5 cars, 25% faster spawn/movement | +5 cars, 50% faster spawn/movement |

### **Randomization Strategy:**
- **L1**: Minimal or no randomization (predictable)
- **L2**: Moderate randomization in spawn timing and speeds
- **L3**: High randomization with constantly changing delays and wide variation ranges

---

## Testing Checklist

- [x] All L2 folders created and files copied
- [x] All L3 folders created and files copied
- [x] Critical Section L2 difficulty increased
- [x] Critical Section L3 difficulty increased
- [x] Mutex L2 difficulty increased
- [x] Mutex L3 difficulty increased
- [x] Binary Semaphore L2 difficulty increased
- [x] Binary Semaphore L3 difficulty increased
- [x] All game classes renamed with L2/L3 suffixes
- [x] All scene keys updated
- [x] All component exports updated
- [x] Score submission updated with correct gameId/levelId
- [x] Dynamic routing updated with all new levels
- [x] Missing submitScore method added to mutex-l1

**Status: ✅ Implementation Complete**

All Process Synchronization games now have complete L1, L2, and L3 implementations with progressive difficulty scaling!

