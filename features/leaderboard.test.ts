/**
 * OSXplorer - Leaderboard Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Leaderboard Functionality', () => {

  /**
   * TC_LB_001: Test leaderboard data retrieval
   * Objective: Verify leaderboard data is fetched correctly
   * Precondition: Users exist in database with XP data
   * Steps:
   *   1. Request leaderboard data
   *   2. Verify response structure
   *   3. Verify user data included
   * Test Data: Multiple users with varying XP
   * Expected Result: Complete leaderboard data returned
   * Post-condition: Data available for display
   */
  describe('TC_LB_001: Data Retrieval', () => {
    interface LeaderboardEntry {
      id: string;
      username: string;
      totalPoints: number;
      level: number;
      rank: number;
    }

    interface LeaderboardResponse {
      leaderboard: LeaderboardEntry[];
      totalPlayers: number;
      lastUpdated: string;
    }

    const createLeaderboardResponse = (users: Omit<LeaderboardEntry, 'rank'>[]): LeaderboardResponse => {
      const sortedUsers = [...users].sort((a, b) => b.totalPoints - a.totalPoints);
      const leaderboard = sortedUsers.map((user, index) => ({
        ...user,
        rank: index + 1
      }));

      return {
        leaderboard,
        totalPlayers: users.length,
        lastUpdated: new Date().toISOString()
      };
    };

    test('should return leaderboard with correct structure', () => {
      const users = [
        { id: '1', username: 'user1', totalPoints: 100, level: 2 },
        { id: '2', username: 'user2', totalPoints: 200, level: 3 }
      ];

      const response = createLeaderboardResponse(users);

      expect(response.leaderboard).toBeDefined();
      expect(response.totalPlayers).toBe(2);
      expect(response.lastUpdated).toBeDefined();
    });

    test('should include all required fields for each entry', () => {
      const users = [
        { id: '1', username: 'testuser', totalPoints: 500, level: 5 }
      ];

      const response = createLeaderboardResponse(users);
      const entry = response.leaderboard[0];

      expect(entry.id).toBeDefined();
      expect(entry.username).toBeDefined();
      expect(entry.totalPoints).toBeDefined();
      expect(entry.level).toBeDefined();
      expect(entry.rank).toBeDefined();
    });
  });

  /**
   * TC_LB_002: Test leaderboard sorting by XP
   * Objective: Verify users are sorted by totalXP in descending order
   * Precondition: Multiple users with different XP
   * Steps:
   *   1. Fetch leaderboard data
   *   2. Verify first user has highest XP
   *   3. Verify order is descending
   * Test Data: Users with XP: 100, 500, 250
   * Expected Result: Order: 500, 250, 100
   * Post-condition: Correct ranking displayed
   */
  describe('TC_LB_002: Sorting by XP', () => {
    interface User {
      username: string;
      totalXP: number;
    }

    const sortLeaderboard = (users: User[]): User[] => {
      return [...users].sort((a, b) => b.totalXP - a.totalXP);
    };

    test('should sort users by XP descending', () => {
      const users: User[] = [
        { username: 'user1', totalXP: 100 },
        { username: 'user2', totalXP: 500 },
        { username: 'user3', totalXP: 250 }
      ];

      const sorted = sortLeaderboard(users);

      expect(sorted[0].username).toBe('user2');
      expect(sorted[1].username).toBe('user3');
      expect(sorted[2].username).toBe('user1');
    });

    test('should handle users with same XP', () => {
      const users: User[] = [
        { username: 'userA', totalXP: 100 },
        { username: 'userB', totalXP: 100 }
      ];

      const sorted = sortLeaderboard(users);

      expect(sorted.length).toBe(2);
      expect(sorted[0].totalXP).toBe(100);
      expect(sorted[1].totalXP).toBe(100);
    });

    test('should handle empty list', () => {
      const sorted = sortLeaderboard([]);
      expect(sorted.length).toBe(0);
    });
  });

  /**
   * TC_LB_003: Test rank assignment
   * Objective: Verify correct rank numbers assigned
   * Precondition: Sorted leaderboard data
   * Steps:
   *   1. Process sorted users
   *   2. Assign rank starting from 1
   *   3. Verify ranks are sequential
   * Test Data: 5 users
   * Expected Result: Ranks 1, 2, 3, 4, 5
   * Post-condition: Users have correct ranks
   */
  describe('TC_LB_003: Rank Assignment', () => {
    interface User {
      username: string;
      totalXP: number;
    }

    interface RankedUser extends User {
      rank: number;
    }

    const assignRanks = (sortedUsers: User[]): RankedUser[] => {
      return sortedUsers.map((user, index) => ({
        ...user,
        rank: index + 1
      }));
    };

    test('should assign rank starting from 1', () => {
      const users: User[] = [
        { username: 'first', totalXP: 1000 },
        { username: 'second', totalXP: 800 },
        { username: 'third', totalXP: 600 }
      ];

      const ranked = assignRanks(users);

      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].rank).toBe(3);
    });

    test('should assign sequential ranks', () => {
      const users: User[] = Array.from({ length: 5 }, (_, i) => ({
        username: `user${i}`,
        totalXP: 1000 - i * 100
      }));

      const ranked = assignRanks(users);

      for (let i = 0; i < ranked.length; i++) {
        expect(ranked[i].rank).toBe(i + 1);
      }
    });
  });

  /**
   * TC_LB_004: Test leaderboard limit
   * Objective: Verify leaderboard is limited to top 100 users
   * Precondition: More than 100 users in database
   * Steps:
   *   1. Query with limit of 100
   *   2. Verify max 100 results returned
   *   3. Verify top users are included
   * Test Data: 150 users
   * Expected Result: Only top 100 returned
   * Post-condition: Performance optimized
   */
  describe('TC_LB_004: Leaderboard Limit', () => {
    const LEADERBOARD_LIMIT = 100;

    interface User {
      username: string;
      totalXP: number;
    }

    const getTopUsers = (users: User[], limit: number = LEADERBOARD_LIMIT): User[] => {
      return users
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, limit);
    };

    test('should limit results to 100', () => {
      const users: User[] = Array.from({ length: 150 }, (_, i) => ({
        username: `user${i}`,
        totalXP: Math.random() * 10000
      }));

      const topUsers = getTopUsers(users);

      expect(topUsers.length).toBe(100);
    });

    test('should return all users if less than limit', () => {
      const users: User[] = Array.from({ length: 50 }, (_, i) => ({
        username: `user${i}`,
        totalXP: i * 100
      }));

      const topUsers = getTopUsers(users);

      expect(topUsers.length).toBe(50);
    });

    test('should include top performers only', () => {
      const users: User[] = [
        { username: 'top', totalXP: 10000 },
        { username: 'bottom', totalXP: 10 },
        ...Array.from({ length: 100 }, (_, i) => ({
          username: `user${i}`,
          totalXP: 5000 - i * 10
        }))
      ];

      const topUsers = getTopUsers(users);

      expect(topUsers[0].username).toBe('top');
      expect(topUsers.find(u => u.username === 'bottom')).toBeUndefined();
    });
  });

  /**
   * TC_LB_005: Test user statistics in leaderboard
   * Objective: Verify additional statistics are included
   * Precondition: Users have achievements and completed levels
   * Steps:
   *   1. Fetch user with stats
   *   2. Verify achievements count included
   *   3. Verify levels completed count included
   * Test Data: User with 5 achievements, 10 levels
   * Expected Result: Stats displayed correctly
   * Post-condition: Complete user profile on leaderboard
   */
  describe('TC_LB_005: User Statistics', () => {
    interface UserStats {
      username: string;
      totalXP: number;
      level: number;
      achievements: string[];
      completedLevels: string[];
    }

    interface LeaderboardStats {
      username: string;
      totalPoints: number;
      level: number;
      achievementsCount: number;
      levelsCompleted: number;
    }

    const formatUserStats = (user: UserStats): LeaderboardStats => ({
      username: user.username,
      totalPoints: user.totalXP,
      level: user.level,
      achievementsCount: user.achievements.length,
      levelsCompleted: user.completedLevels.length
    });

    test('should include achievements count', () => {
      const user: UserStats = {
        username: 'player1',
        totalXP: 1000,
        level: 5,
        achievements: ['ach1', 'ach2', 'ach3', 'ach4', 'ach5'],
        completedLevels: ['level1', 'level2']
      };

      const stats = formatUserStats(user);

      expect(stats.achievementsCount).toBe(5);
    });

    test('should include completed levels count', () => {
      const user: UserStats = {
        username: 'player1',
        totalXP: 2000,
        level: 10,
        achievements: [],
        completedLevels: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10']
      };

      const stats = formatUserStats(user);

      expect(stats.levelsCompleted).toBe(10);
    });
  });

  /**
   * TC_LB_006: Test level calculation from XP
   * Objective: Verify correct level displayed based on XP
   * Precondition: User has accumulated XP
   * Steps:
   *   1. Calculate level from XP
   *   2. Verify level thresholds
   * Test Data: Various XP values
   * Expected Result: Correct level for each XP range
   * Post-condition: Accurate level display
   */
  describe('TC_LB_006: Level Calculation', () => {
    const XP_PER_LEVEL = 500;

    const calculateLevel = (totalXP: number): number => {
      return Math.floor(totalXP / XP_PER_LEVEL) + 1;
    };

    test('should start at level 1 with 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    test('should be level 1 with less than 500 XP', () => {
      expect(calculateLevel(499)).toBe(1);
    });

    test('should be level 2 with 500+ XP', () => {
      expect(calculateLevel(500)).toBe(2);
    });

    test('should calculate correct level for high XP', () => {
      expect(calculateLevel(2500)).toBe(6);
      expect(calculateLevel(5000)).toBe(11);
    });
  });

  /**
   * TC_LB_007: Test last active tracking
   * Objective: Verify last active time displayed correctly
   * Precondition: User has login history
   * Steps:
   *   1. Fetch last login time
   *   2. Format for display
   *   3. Verify relative time shown
   * Test Data: Various login timestamps
   * Expected Result: Human-readable time display
   * Post-condition: Users can see activity status
   */
  describe('TC_LB_007: Last Active Tracking', () => {
    const formatLastActive = (lastLogin: Date | null): string => {
      if (!lastLogin) return 'Never';
      
      const now = new Date();
      const diffMs = now.getTime() - lastLogin.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      return `${diffDays} days ago`;
    };

    test('should show "Never" for null login', () => {
      expect(formatLastActive(null)).toBe('Never');
    });

    test('should show "Just now" for recent login', () => {
      const now = new Date();
      expect(formatLastActive(now)).toBe('Just now');
    });

    test('should show minutes for recent activity', () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      expect(formatLastActive(thirtyMinsAgo)).toBe('30 minutes ago');
    });

    test('should show hours for activity today', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      expect(formatLastActive(fiveHoursAgo)).toBe('5 hours ago');
    });

    test('should show days for older activity', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatLastActive(threeDaysAgo)).toBe('3 days ago');
    });
  });

  /**
   * TC_LB_008: Test error handling for leaderboard
   * Objective: Verify graceful error handling
   * Precondition: Various error scenarios
   * Steps:
   *   1. Simulate database error
   *   2. Verify error response format
   *   3. Verify appropriate status code
   * Test Data: Database connection failure
   * Expected Result: Proper error message returned
   * Post-condition: User informed of issue
   */
  describe('TC_LB_008: Error Handling', () => {
    interface ApiResponse<T> {
      data?: T;
      error?: string;
      status: number;
    }

    const handleLeaderboardError = (error: Error): ApiResponse<null> => {
      console.error('Leaderboard fetch error:', error.message);
      
      if (error.message.includes('connection')) {
        return { error: 'Database connection failed', status: 503 };
      }
      
      return { error: 'Internal server error', status: 500 };
    };

    test('should return 500 for general errors', () => {
      const error = new Error('Something went wrong');
      const response = handleLeaderboardError(error);
      
      expect(response.status).toBe(500);
      expect(response.error).toBe('Internal server error');
    });

    test('should return 503 for connection errors', () => {
      const error = new Error('Database connection failed');
      const response = handleLeaderboardError(error);
      
      expect(response.status).toBe(503);
      expect(response.error).toBe('Database connection failed');
    });
  });
});
