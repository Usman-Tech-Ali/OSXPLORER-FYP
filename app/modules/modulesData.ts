export const modulesData = {
  "cpu-scheduling": {
    name: "Scheduler Dash",
    description: "Master CPU Scheduling Algorithms",
    gradient: "from-cyan-400 to-purple-500",
    levelSections: [
      // ... FCFS, SJF, SRTF, Priority, Round Robin sections from cpu-scheduling/page.tsx ...
      {
        id: "fcfs",
        title: "FCFS",
        subtitle: "First Come First Serve",
        levels: [
          { id: "fcfs-l1", title: "Pure FCFS", description: "Basic first-come-first-serve scheduling", difficulty: 2, status: "available", xpReward: 50 },
          { id: "fcfs-l2", title: "Arrival Overlap", description: "Processes arriving at different times", difficulty: 3, status: "completed", xpReward: 75 },
          { id: "fcfs-l3", title: "Large Processes", description: "Many processes with long burst times", difficulty: 4, status: "completed", xpReward: 100 },
        ],
      },
      {
        id: "sjf",
        title: "SJF",
        subtitle: "Shortest Job First Non-Preemptive",
        levels: [
          { id: "sjf-l1", title: "Equal Arrival", description: "All processes arriving together", difficulty: 2, status: "available", xpReward: 60 },
          { id: "sjf-l2", title: "Arrival Spread", description: "Staggered process arrival times", difficulty: 3, status: "locked", xpReward: 80 },
          { id: "sjf-l3", title: "Starvation Traps", description: "Handle processes that never execute", difficulty: 4, status: "locked", xpReward: 120 },
        ],
      },
      {
        id: "srtf",
        title: "SRTF",
        subtitle: "Shortest Remaining Time First Preemptive",
        levels: [
          { id: "srtf-l1", title: "Simple Burst", description: "Basic preemptive scheduling", difficulty: 2, status: "available", xpReward: 70 },
          { id: "srtf-l2", title: "Frequent Interrupts", description: "Handle multiple preemptions", difficulty: 3, status: "locked", xpReward: 90 },
          { id: "srtf-l3", title: "Runtime Arrival", description: "Processes arriving during execution", difficulty: 4, status: "locked", xpReward: 110 },
          { id: "srtf-l4", title: "Large Queues", description: "Manage complex queue management", difficulty: 5, status: "locked", xpReward: 150 },
        ],
      },
      {
        id: "priority",
        title: "Priority",
        subtitle: "Priority Scheduling",
        levels: [
          { id: "priority-l1", title: "Non-Preemptive", description: "Priority without interruption", difficulty: 3, status: "locked", xpReward: 85 },
          { id: "priority-l2", title: "Preemptive", description: "Priority with preemption", difficulty: 4, status: "locked", xpReward: 105 },
          { id: "priority-l3", title: "Broken Averages", description: "Handle low priority starvation", difficulty: 5, status: "locked", xpReward: 130 },
        ],
      },
      {
        id: "round-robin",
        title: "Round Robin",
        subtitle: "Round Robin Scheduling",
        levels: [
          { id: "rr-l1", title: "Big Time Quantum", description: "Large time slice scheduling", difficulty: 2, status: "locked", xpReward: 65 },
          { id: "rr-l2", title: "Small Quantum", description: "Frequent context switching", difficulty: 3, status: "locked", xpReward: 85 },
          { id: "rr-l3", title: "Mixed Quantum", description: "Arrive and quantum tuning", difficulty: 4, status: "locked", xpReward: 115 },
        ],
      },
    ],
    statsData: {
      totalXP: 150,
      levelsCompleted: 4,
      currentStreak: 3,
      nextAchievement: {
        name: "SJF Master",
        progress: 66,
        description: "Complete all SJF levels",
      },
    },
    tips: [
      "FCFS is simple but can cause convoy effect",
      "SJF minimizes average waiting time",
      "SRTF can cause starvation",
      "Round Robin prevents starvation",
    ],
    sidebarType: "scheduler",
  },
  "memory-management": {
    name: "Memory Stackers",
    description: "Master Memory Management Algorithms",
    gradient: "from-purple-400 to-pink-500",
    levelSections: [
      // ... First Fit, Best Fit, Worst Fit, Paging, Segmentation, Fragmentation sections from memory-management/page.tsx ...
      {
        id: "first-fit",
        title: "First Fit",
        subtitle: "First available memory hole",
        levels: [
          { id: "first-fit-l1", title: "Basic Allocation", description: "Simple first-fit memory allocation", difficulty: 2, status: "available", xpReward: 60, visualType: "blocks" },
          { id: "first-fit-l2", title: "High Fragmentation", description: "Handle memory fragmentation issues", difficulty: 3, status: "completed", xpReward: 80, visualType: "blocks" },
        ],
      },
      {
        id: "best-fit",
        title: "Best Fit",
        subtitle: "Find smallest suitable hole",
        levels: [
          { id: "best-fit-l1", title: "Perfect Holes", description: "Find exact-size memory holes", difficulty: 2, status: "available", xpReward: 65, visualType: "blocks" },
          { id: "best-fit-l2", title: "Hole Minimization", description: "Minimize leftover hole sizes", difficulty: 3, status: "locked", xpReward: 85, visualType: "blocks" },
        ],
      },
      {
        id: "worst-fit",
        title: "Worst Fit",
        subtitle: "Use largest available hole",
        levels: [
          { id: "worst-fit-l1", title: "Blast Match", description: "Allocate using largest holes", difficulty: 2, status: "available", xpReward: 70, visualType: "blocks" },
          { id: "worst-fit-l2", title: "Fragmentation Evolution", description: "Observe fragmentation patterns", difficulty: 3, status: "locked", xpReward: 90, visualType: "blocks" },
        ],
      },
      {
        id: "paging",
        title: "Paging",
        subtitle: "Fixed-size memory blocks",
        levels: [
          { id: "paging-l1", title: "Simple Load Pages", description: "Basic page loading mechanism", difficulty: 3, status: "locked", xpReward: 75, visualType: "pages" },
          { id: "paging-l2", title: "Page Faults", description: "Handle page fault scenarios", difficulty: 4, status: "locked", xpReward: 95, visualType: "pages" },
          { id: "paging-l3", title: "Page Table Mapping", description: "Manage page table translations", difficulty: 4, status: "locked", xpReward: 110, visualType: "pages" },
        ],
      },
      {
        id: "segmentation",
        title: "Segmentation",
        subtitle: "Variable-size memory segments",
        levels: [
          { id: "segmentation-l1", title: "Basic Segment Loading", description: "Simple segment allocation", difficulty: 3, status: "locked", xpReward: 80, visualType: "segments" },
          { id: "segmentation-l2", title: "Overlapping & Gaps", description: "Handle segment overlaps and gaps", difficulty: 4, status: "locked", xpReward: 100, visualType: "segments" },
        ],
      },
      {
        id: "fragmentation",
        title: "Fragmentation & Compaction",
        subtitle: "Memory optimization techniques",
        levels: [
          { id: "fragmentation-l1", title: "Fragmentation Metrics", description: "Analyze memory fragmentation", difficulty: 4, status: "locked", xpReward: 105, visualType: "blocks" },
          { id: "fragmentation-l2", title: "Compaction Logic", description: "Implement memory compaction", difficulty: 5, status: "locked", xpReward: 130, visualType: "blocks" },
        ],
      },
    ],
    statsData: {
      totalXP: 140,
      levelsCompleted: 2,
      currentStreak: 5,
      nextAchievement: {
        name: "Memory Master",
        progress: 40,
        description: "Complete all allocation algorithms",
      },
    },
    tips: [
      "First Fit is fastest but causes fragmentation",
      "Best Fit minimizes wasted space",
      "Worst Fit reduces small unusable holes",
      "Paging eliminates external fragmentation",
      "Segmentation supports logical program structure",
    ],
    sidebarType: "memory",
  },
  "process-synchronization": {
    name: "Critical Chase",
    description: "Master Process Synchronization",
    gradient: "from-red-400 to-orange-500",
    levelSections: [
      // ... Critical Section, Mutex, Binary Semaphore, Counting Semaphore, Producer-Consumer, Dining Philosophers sections from process-synchronization/page.tsx ...
      {
        id: "critical-section",
        title: "Critical Section",
        subtitle: "Manage concurrent access to resources",
        levels: [
          { id: "critical-section-l1", title: "Two Threads", description: "Basic critical section with two threads", difficulty: 2, status: "available", xpReward: 70, visualType: "critical" },
          { id: "critical-section-l2", title: "Three Threads Shared Path", description: "Handle three concurrent threads", difficulty: 3, status: "completed", xpReward: 90, visualType: "critical" },
        ],
      },
      {
        id: "mutex",
        title: "Mutex",
        subtitle: "Mutual exclusion locks",
        levels: [
          { id: "mutex-l1", title: "Simple Lock", description: "Basic mutex implementation", difficulty: 2, status: "available", xpReward: 75, visualType: "mutex" },
          { id: "mutex-l2", title: "Multi-threaded Lock", description: "Multiple threads with mutex", difficulty: 3, status: "locked", xpReward: 95, visualType: "mutex" },
        ],
      },
      {
        id: "binary-semaphore",
        title: "Binary Semaphore",
        subtitle: "Binary signaling mechanisms",
        levels: [
          { id: "binary-semaphore-l1", title: "Simple Wait-Signal", description: "Basic binary semaphore operations", difficulty: 2, status: "locked", xpReward: 80, visualType: "semaphore" },
          { id: "binary-semaphore-l2", title: "Pre-loaded Queues", description: "Handle queued semaphore requests", difficulty: 3, status: "locked", xpReward: 100, visualType: "semaphore" },
        ],
      },
      {
        id: "counting-semaphore",
        title: "Counting Semaphore",
        subtitle: "Resource counting mechanisms",
        levels: [
          { id: "counting-semaphore-l1", title: "Parking Lot Scenario", description: "Manage limited parking spaces", difficulty: 3, status: "locked", xpReward: 85, visualType: "semaphore" },
          { id: "counting-semaphore-l2", title: "Resource Topology", description: "Complex resource management", difficulty: 4, status: "locked", xpReward: 110, visualType: "semaphore" },
        ],
      },
      {
        id: "producer-consumer",
        title: "Producer-Consumer",
        subtitle: "Buffer management problems",
        levels: [
          { id: "producer-consumer-l1", title: "One Producer-Consumer", description: "Single producer and consumer", difficulty: 3, status: "locked", xpReward: 90, visualType: "producer" },
          { id: "producer-consumer-l2", title: "Multiple Producers", description: "Handle multiple producer threads", difficulty: 4, status: "locked", xpReward: 115, visualType: "producer" },
          { id: "producer-consumer-l3", title: "Buffer Overflow", description: "Prevent buffer overflow scenarios", difficulty: 4, status: "locked", xpReward: 125, visualType: "producer" },
        ],
      },
      {
        id: "dining-philosophers",
        title: "Dining Philosophers",
        subtitle: "Classic deadlock scenarios",
        levels: [
          { id: "dining-philosophers-l1", title: "Circular Deadlock", description: "Identify and resolve circular deadlock", difficulty: 4, status: "locked", xpReward: 120, visualType: "dining" },
          { id: "dining-philosophers-l2", title: "Philosopher's Duty", description: "Implement deadlock prevention", difficulty: 5, status: "locked", xpReward: 150, visualType: "dining" },
        ],
      },
    ],
    statsData: {
      totalXP: 160,
      currentThreshold: 2,
      nextUnlock: 3,
      nextAchievement: {
        name: "Sync Master",
        progress: 33,
        description: "Master all synchronization primitives",
      },
    },
    tips: [
      "Critical sections must be atomic operations",
      "Deadlocks occur with circular wait conditions",
      "Semaphores control access to shared resources",
      "Always release locks in reverse acquisition order",
      "Starvation can occur with unfair scheduling",
    ],
    sidebarType: "sync",
  },
} as const;