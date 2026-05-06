import { describe, test, expect } from '@jest/globals';

/**
 * OSXplorer - Streak Tracking System Tests
 * 
 * Test Case Format:
 * | Test Case ID | Objective | Precondition | Steps | Test Data | Expected Result | Post-condition | Actual Result | Pass/Fail |
 */

describe('Streak Tracking System Functionality', () => {

  /**
   * TC_STREAK_001: Consecutive Day Logins
   * Objective: Verify streaks increase on consecutive days
   * Precondition: User logged in yesterday
   * Steps:
   *   1. Log in today
   *   2. Compare with yesterday's local date
   * Test Data: "yesterday", "today" dates
   * Expected Result: Streak increases by 1
   */
  describe('TC_STREAK_001: Consecutive Day Increment', () => {
    const calculateStreak = (lastLogin: Date, today: Date, currentStreak: number): number => {
      // Use UTC dates to avoid local time zone issues when setting hours to 0
      const prevDate = new Date(lastLogin);
      prevDate.setUTCHours(0, 0, 0, 0);
      
      const currDate = new Date(today);
      currDate.setUTCHours(0, 0, 0, 0);
      
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Round instead of ceil to avoid bugs with DST or minor timezone issues

      if (diffDays === 0) return currentStreak; // Same day login
      if (diffDays === 1) return currentStreak + 1; // Consecutive day
      return 1; // Missed a day or more, reset 
    };

    test('should increase streak by 1 for consecutive day', () => {
       const yesterday = new Date('2026-04-16T12:00:00Z');
       const today = new Date('2026-04-17T12:00:00Z');
       expect(calculateStreak(yesterday, today, 5)).toBe(6);
    });

    test('should maintain streak for same day login', () => {
       const morning = new Date('2026-04-17T08:00:00Z');
       const evening = new Date('2026-04-17T20:00:00Z');
       expect(calculateStreak(morning, evening, 5)).toBe(5);
    });

    test('should reset streak to 1 after missing a day', () => {
       const twoDaysAgo = new Date('2026-04-15T12:00:00Z');
       const today = new Date('2026-04-17T12:00:00Z');
       expect(calculateStreak(twoDaysAgo, today, 5)).toBe(1);
    });
  });

  /**
   * TC_STREAK_002: Longest Streak Update
   * Objective: Verify longest streak updates when current streak exceeds it
   */
  describe('TC_STREAK_002: Update Longest Streak Property', () => {
     const calculateLongestStreak = (currentStreak: number, longestStreak: number): number => {
        return currentStreak > longestStreak ? currentStreak : longestStreak;
     };

     test('should update longest streak when current is larger', () => {
        expect(calculateLongestStreak(6, 5)).toBe(6);
     });

     test('should not update longest streak when current is smaller', () => {
        expect(calculateLongestStreak(2, 5)).toBe(5);
     });
  });
});
