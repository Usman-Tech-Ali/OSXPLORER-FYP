// Data structure for mini-quest quizzes, organized by moduleId and miniQuestOverviewId
// Each quiz contains a title, timeLimit, and an array of questions
// Each question contains id, question, options, correctAnswer, explanation, difficulty, and concept

export const miniQuestQuizData = {
  "cpu-scheduling": {
    "fcfs": {
      title: "FCFS Mini-Quest Quiz",
      timeLimit: 600, // seconds
      questions: [
        {
          id: 1,
          question: "Which CPU scheduling algorithm is non-preemptive and processes jobs in the order they arrive?",
          options: [
            "Round Robin",
            "First-Come, First-Served (FCFS)",
            "Shortest Job First (SJF)",
            "Priority Scheduling",
          ],
          correctAnswer: 1,
          explanation: "FCFS is a non-preemptive algorithm that processes jobs in the order they arrive in the ready queue.",
          difficulty: "Easy",
          concept: "Basic Scheduling",
        },
        {
          id: 2,
          question: "In FCFS scheduling, what is the main disadvantage?",
          options: [
            "Starvation",
            "Convoy Effect",
            "High Throughput",
            "Low Turnaround Time",
          ],
          correctAnswer: 1,
          explanation: "FCFS can lead to the convoy effect, where short processes wait for one long process to complete.",
          difficulty: "Medium",
          concept: "Scheduling Issues",
        },
      ],
    },
    // Add more mini-quests for cpu-scheduling here
    "sjf": {
      title: "SJF Mini-Quest Quiz",
      timeLimit: 600, // seconds
      questions: [
        {
          id: 1,
          question: "Which CPU scheduling algorithm is non-preemptive and processes jobs based on their CPU burst time?",
          options: [
            "Round Robin",
            "First-Come, First-Served (FCFS)",
            "Shortest Job First (SJF)",
            "Priority Scheduling",
          ],
          correctAnswer: 2,
          explanation: "SJF is a non-preemptive algorithm that processes jobs based on their CPU burst time.",
          difficulty: "Easy",
          concept: "Basic Scheduling",
        },
        {
          id: 2,
          question: "What is the main advantage of the SJF scheduling algorithm?",
          options: [
            "Low Turnaround Time",
            "High Throughput",
            "Fairness",
            "Simplicity",
          ],
          correctAnswer: 1,
          explanation: "SJF minimizes the average turnaround time by processing shorter jobs first.",
          difficulty: "Medium",
          concept: "Scheduling Issues",
        },
      ],
    },
  },
  "memory-management": {
    "first-fit": {
      title: "First-Fit Mini-Quest Quiz",
      timeLimit: 600, // seconds
      questions: [
        {
          id: 1,
          question: "What is the First-Fit memory management algorithm?",
          options: [
            "A memory management algorithm that allocates the smallest available block of memory to a process.",
            "A memory management algorithm that allocates the largest available block of memory to a process.",
            "A memory management algorithm that allocates the memory blocks in a specific order.",
            "A memory management algorithm that allocates memory blocks in a random order.",
          ],
          correctAnswer: 1,
          explanation: "First-Fit is a memory management algorithm that allocates the smallest available block of memory to a process.",
          difficulty: "Easy",
          concept: "Basic Memory Management",
        },
        {
          id: 2,
          question: "What is the main advantage of the First-Fit algorithm?",
          options: [
              "It minimizes fragmentation.",
              "It maximizes memory utilization.",
              "It is easy to implement.",
              "It is the most efficient algorithm.",
          ],
          correctAnswer: 2,
          explanation: "The First-Fit algorithm is easy to implement and generally provides good performance for many workloads.",
          difficulty: "Easy",
          concept: "Memory Management Algorithms",
        },
      ],
    },
  },
  // Add more modules and their mini-quests here
  "process-synchronization": {
    "critical-section": {
      title: "Critical Section Mini-Quest Quiz",
      timeLimit: 600, // seconds
      questions: [
        {
          id: 1,
          question: "What is a critical section in process synchronization?",
          options: [
            "A section of code that is executed by only one process at a time.",
            "A section of code that is executed by multiple processes simultaneously.",
            "A section of code that is executed in parallel by multiple threads.",
            "A section of code that is executed in a random order.",
          ],
          correctAnswer: 1,
          explanation: "A critical section is a section of code that must be executed by only one process at a time.",
          difficulty: "Easy",
          concept: "Process Synchronization",
        },
        {
          id: 2,
          question: "What is the purpose of a mutex in process synchronization?",
          options: [
            "To synchronize access to shared resources.",
            "To allow multiple processes to execute simultaneously.",
            "To increase the speed of process execution.",
            "To manage memory allocation.",
          ],
          correctAnswer: 1,
          explanation: "A mutex (mutual exclusion) is a synchronization primitive that allows only one process to access a shared resource at a time.",
          difficulty: "Easy",
          concept: "Process Synchronization",
        },
      ],
    },
  },

} as const; 