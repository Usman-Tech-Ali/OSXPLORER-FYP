# OSXplorer - Unit Test Suite Documentation

## Overview

This document provides a comprehensive overview of all unit tests created for the OSXplorer gamified OS learning platform. Tests follow the standard tabular format for test case documentation.

## Test Case Format

Each test case follows this format:
| Field | Description |
|-------|-------------|
| Test Case ID | Unique identifier (e.g., TC_FCFS_001) |
| Objective | What the test verifies |
| Precondition | Required state before test execution |
| Steps | Actions performed during test |
| Test Data | Input data used |
| Expected Result | Expected outcome |
| Post-condition | State after test execution |
| Actual Result | (Filled during execution) |
| Pass/Fail | (Determined during execution) |

---

## Test Suites Summary

### 1. CPU Scheduling Games

#### 1.1 FCFS (First Come First Serve) - `tests/cpu-scheduling/fcfs.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_FCFS_001 | Verify FIFO queue ordering |
| TC_FCFS_002 | Verify waiting time calculation |
| TC_FCFS_003 | Verify score calculation |
| TC_FCFS_004 | Verify game phase transitions |
| TC_FCFS_005 | Verify order completion tracking |

#### 1.2 SJF (Shortest Job First) - `tests/cpu-scheduling/sjf.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_SJF_001 | Verify shortest job first ordering |
| TC_SJF_002 | Verify file size to burst time mapping |
| TC_SJF_003 | Verify average waiting time calculation |
| TC_SJF_004 | Verify tie-breaking for same burst time |
| TC_SJF_005 | Verify score calculation for selections |

#### 1.3 SRTF (Shortest Remaining Time First) - `tests/cpu-scheduling/srtf.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_SRTF_001 | Verify preemptive scheduling |
| TC_SRTF_002 | Verify remaining time decrement |
| TC_SRTF_003 | Verify ready queue management |
| TC_SRTF_004 | Verify urgency classification |
| TC_SRTF_005 | Verify delayed preemption penalty |
| TC_SRTF_006 | Verify patient death tracking |

---

### 2. Memory Management Games

#### 2.1 First-Fit - `tests/memory-management/first-fit.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_FF_001 | Verify first-fit slot selection |
| TC_FF_002 | Verify internal fragmentation calculation |
| TC_FF_003 | Verify vehicle size configurations |
| TC_FF_004 | Verify external fragmentation detection |
| TC_FF_005 | Verify memory efficiency calculation |
| TC_FF_006 | Verify score calculation |

#### 2.2 Best-Fit - `tests/memory-management/best-fit.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_BF_001 | Verify best-fit slot selection |
| TC_BF_002 | Verify fragmentation minimization |
| TC_BF_003 | Verify gift size configurations |
| TC_BF_004 | Verify multiple items in compartment |
| TC_BF_005 | Verify score for selection quality |
| TC_BF_006 | Verify efficiency metrics |

#### 2.3 Worst-Fit - `tests/memory-management/worst-fit.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_WF_001 | Verify worst-fit slot selection |
| TC_WF_002 | Verify fragmentation behavior |
| TC_WF_003 | Verify tool size configurations |
| TC_WF_004 | Verify conveyor belt mechanics |
| TC_WF_005 | Verify missed box penalty |
| TC_WF_006 | Verify score calculation |
| TC_WF_007 | Verify game completion conditions |

---

### 3. Process Synchronization Games

#### 3.1 Binary Semaphore - `tests/process-synchronization/binary-semaphore.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_BS_001 | Verify wait operation |
| TC_BS_002 | Verify signal operation |
| TC_BS_003 | Verify bridge access control |
| TC_BS_004 | Verify crash detection |
| TC_BS_005 | Verify score calculation |
| TC_BS_006 | Verify game completion |
| TC_BS_007 | Verify button state management |

#### 3.2 Critical Section - `tests/process-synchronization/critical-section.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_CS_001 | Verify mutual exclusion at ATM |
| TC_CS_002 | Verify exit from critical section |
| TC_CS_003 | Verify queue management |
| TC_CS_004 | Verify ATM usage time |
| TC_CS_005 | Verify score calculation |
| TC_CS_006 | Verify correct person identification |
| TC_CS_007 | Verify game completion |
| TC_CS_008 | Verify console logging |

#### 3.3 Mutex - `tests/process-synchronization/mutex.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_MX_001 | Verify mutex lock operation |
| TC_MX_002 | Verify mutex unlock operation |
| TC_MX_003 | Verify critical section boundaries |
| TC_MX_004 | Verify car spawning |
| TC_MX_005 | Verify crash detection |
| TC_MX_006 | Verify score calculation |
| TC_MX_007 | Verify waiting state management |
| TC_MX_008 | Verify game completion |
| TC_MX_009 | Verify status display |

---

### 4. Authentication

#### 4.1 Login - `tests/auth/login.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_LOGIN_001 | Verify successful login |
| TC_LOGIN_002 | Verify form validation |
| TC_LOGIN_003 | Verify password visibility toggle |
| TC_LOGIN_004 | Verify remember me functionality |
| TC_LOGIN_005 | Verify error handling |
| TC_LOGIN_006 | Verify loading state |
| TC_LOGIN_007 | Verify authenticated user redirect |

#### 4.2 Signup - `tests/auth/signup.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_SIGNUP_001 | Verify successful registration |
| TC_SIGNUP_002 | Verify required field validation |
| TC_SIGNUP_003 | Verify password length validation |
| TC_SIGNUP_004 | Verify duplicate user prevention |
| TC_SIGNUP_005 | Verify username constraints |
| TC_SIGNUP_006 | Verify email format validation |
| TC_SIGNUP_007 | Verify password hashing |
| TC_SIGNUP_008 | Verify initial user data |

---

### 5. Features

#### 5.1 Leaderboard - `tests/features/leaderboard.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_LB_001 | Verify data retrieval |
| TC_LB_002 | Verify sorting by XP |
| TC_LB_003 | Verify rank assignment |
| TC_LB_004 | Verify leaderboard limit |
| TC_LB_005 | Verify user statistics |
| TC_LB_006 | Verify level calculation |
| TC_LB_007 | Verify last active tracking |
| TC_LB_008 | Verify error handling |

#### 5.2 Achievements - `tests/features/achievements.test.ts`
| Test Case ID | Objective |
|--------------|-----------|
| TC_ACH_001 | Verify achievement unlock logic |
| TC_ACH_002 | Verify achievement categories |
| TC_ACH_003 | Verify progress tracking |
| TC_ACH_004 | Verify rarity levels |
| TC_ACH_005 | Verify points calculation |
| TC_ACH_006 | Verify module-specific achievements |
| TC_ACH_007 | Verify badge system |
| TC_ACH_008 | Verify search and filter |

---

## Running Tests

### Install Dependencies
```bash
pnpm install
```

### Run All Tests
```bash
pnpm test
```

### Run Tests with Watch Mode
```bash
pnpm test:watch
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

### Run Specific Test Suite
```bash
# Run CPU Scheduling tests only
pnpm test tests/cpu-scheduling

# Run Memory Management tests only
pnpm test tests/memory-management

# Run Process Synchronization tests only
pnpm test tests/process-synchronization

# Run Authentication tests only
pnpm test tests/auth

# Run Feature tests only
pnpm test tests/features
```

---

## Test Statistics

| Category | Test Suites | Test Cases |
|----------|-------------|------------|
| CPU Scheduling | 3 | 17 |
| Memory Management | 3 | 19 |
| Process Synchronization | 3 | 24 |
| Authentication | 2 | 15 |
| Features | 2 | 16 |
| **Total** | **13** | **91** |

---

## Test Coverage Goals

- **Line Coverage**: ≥ 80%
- **Branch Coverage**: ≥ 75%
- **Function Coverage**: ≥ 85%

---

## Contributing

When adding new tests:
1. Follow the existing naming convention (TC_MODULE_XXX)
2. Include complete test case documentation
3. Ensure tests are isolated and independent
4. Use meaningful assertions
5. Include both positive and negative test cases
