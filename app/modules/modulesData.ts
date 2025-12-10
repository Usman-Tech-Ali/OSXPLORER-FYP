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
          { id: "fcfs-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 50 },
          { id: "fcfs-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 75 },
          { id: "fcfs-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 100 },
        ],
      },
      {
        id: "sjf",
        title: "SJF",
        subtitle: "Shortest Job First Non-Preemptive",
        levels: [
          { id: "sjf-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 60 },
          { id: "sjf-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 80 },
          { id: "sjf-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 120 },
        ],
      },
      {
        id: "srtf",
        title: "SRTF",
        subtitle: "Shortest Remaining Time First Preemptive",
        levels: [
          { id: "srtf-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 70 },
          { id: "srtf-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 90 },
          { id: "srtf-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 110 },
        ],
      },
      {
        id: "priority",
        title: "Priority",
        subtitle: "Priority Scheduling",
        levels: [
          { id: "priority-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 85 },
          { id: "priority-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 105 },
          { id: "priority-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 130 },
        ],
      },
      {
        id: "round-robin",
        title: "Round Robin",
        subtitle: "Round Robin Scheduling",
        levels: [
          { id: "rr-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 65 },
          { id: "rr-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 85 },
          { id: "rr-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 115 },
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
          { id: "first-fit-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 60, visualType: "blocks" },
          { id: "first-fit-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 80, visualType: "blocks" },
          { id: "first-fit-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 100, visualType: "blocks" },
        ],
      },
      {
        id: "best-fit",
        title: "Best Fit",
        subtitle: "Find smallest suitable hole",
        levels: [
          { id: "best-fit-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 65, visualType: "blocks" },
          { id: "best-fit-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 85, visualType: "blocks" },
          { id: "best-fit-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 105, visualType: "blocks" },
        ],
      },
      {
        id: "worst-fit",
        title: "Worst Fit",
        subtitle: "Use largest available hole",
        levels: [
          { id: "worst-fit-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 70, visualType: "blocks" },
          { id: "worst-fit-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 90, visualType: "blocks" },
          { id: "worst-fit-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 110, visualType: "blocks" },
        ],
      },
      {
        id: "paging",
        title: "Paging",
        subtitle: "Fixed-size memory blocks",
        levels: [
          { id: "paging-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 75, visualType: "pages" },
          { id: "paging-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 95, visualType: "pages" },
          { id: "paging-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 110, visualType: "pages" },
        ],
      },
      {
        id: "segmentation",
        title: "Segmentation",
        subtitle: "Variable-size memory segments",
        levels: [
          { id: "segmentation-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 80, visualType: "segments" },
          { id: "segmentation-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 100, visualType: "segments" },
          { id: "segmentation-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 120, visualType: "segments" },
        ],
      },
      {
        id: "fragmentation",
        title: "Fragmentation & Compaction",
        subtitle: "Memory optimization techniques",
        levels: [
          { id: "fragmentation-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 105, visualType: "blocks" },
          { id: "fragmentation-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 130, visualType: "blocks" },
          { id: "fragmentation-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 150, visualType: "blocks" },
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
          { id: "critical-section-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 70, visualType: "critical" },
          { id: "critical-section-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 90, visualType: "critical" },
          { id: "critical-section-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 110, visualType: "critical" },
        ],
      },
      {
        id: "mutex",
        title: "Mutex",
        subtitle: "Mutual exclusion locks",
        levels: [
          { id: "mutex-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 75, visualType: "mutex" },
          { id: "mutex-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 95, visualType: "mutex" },
          { id: "mutex-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 115, visualType: "mutex" },
        ],
      },
      {
        id: "binary-semaphore",
        title: "Binary Semaphore",
        subtitle: "Binary signaling mechanisms",
        levels: [
          { id: "binary-semaphore-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 80, visualType: "semaphore" },
          { id: "binary-semaphore-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 100, visualType: "semaphore" },
          { id: "binary-semaphore-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 120, visualType: "semaphore" },
        ],
      },
      {
        id: "counting-semaphore",
        title: "Counting Semaphore",
        subtitle: "Resource counting mechanisms",
        levels: [
          { id: "counting-semaphore-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 85, visualType: "semaphore" },
          { id: "counting-semaphore-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 110, visualType: "semaphore" },
          { id: "counting-semaphore-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 135, visualType: "semaphore" },
        ],
      },
      {
        id: "producer-consumer",
        title: "Producer-Consumer",
        subtitle: "Buffer management problems",
        levels: [
          { id: "producer-consumer-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 90, visualType: "producer" },
          { id: "producer-consumer-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 115, visualType: "producer" },
          { id: "producer-consumer-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 125, visualType: "producer" },
        ],
      },
      {
        id: "dining-philosophers",
        title: "Dining Philosophers",
        subtitle: "Classic deadlock scenarios",
        levels: [
          { id: "dining-philosophers-l1", title: "Level 1", description: "Easy", difficulty: "Easy", status: "available", xpReward: 120, visualType: "dining" },
          { id: "dining-philosophers-l2", title: "Level 2", description: "Medium", difficulty: "Medium", status: "available", xpReward: 150, visualType: "dining" },
          { id: "dining-philosophers-l3", title: "Level 3", description: "Hard", difficulty: "Hard", status: "available", xpReward: 180, visualType: "dining" },
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