import connectDB from './mongodb';
import User from './models/User';
import Score from './models/Score';

// Achievement definitions matching the achievements page
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  points: number;
  category: 'performance' | 'progress' | 'module' | 'special' | 'badge';
  module?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: {
    type: 'first_level' | 'perfect_score' | 'score_threshold' | 'time_threshold' | 'levels_completed' | 'module_completion' | 'streak' | 'consecutive_scores';
    value: number;
    gameId?: string; // For module-specific achievements
    moduleId?: string; // For module-specific achievements
  };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Progress Achievements
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Complete your first level',
    points: 50,
    category: 'progress',
    rarity: 'common',
    criteria: { type: 'first_level', value: 1 }
  },
  {
    id: 'level-crusher',
    title: 'Level Crusher',
    description: 'Complete 25 levels',
    points: 250,
    category: 'progress',
    rarity: 'rare',
    criteria: { type: 'levels_completed', value: 25 }
  },

  // Performance Achievements
  {
    id: 'perfect-score',
    title: 'Perfect Score',
    description: 'Score 100/100 on any level',
    points: 200,
    category: 'performance',
    rarity: 'epic',
    criteria: { type: 'perfect_score', value: 100 }
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Complete any level in under 30 seconds',
    points: 100,
    category: 'performance',
    rarity: 'rare',
    criteria: { type: 'time_threshold', value: 30 }
  },
  {
    id: 'consistency-king',
    title: 'Consistency King',
    description: 'Score 90+ on 10 consecutive levels',
    points: 300,
    category: 'performance',
    rarity: 'legendary',
    criteria: { type: 'consecutive_scores', value: 10, threshold: 90 }
  },

  // CPU Scheduling Module Achievements
  {
    id: 'fcfs-master',
    title: 'FCFS Master',
    description: 'Complete all FCFS levels with 85+ score',
    points: 150,
    category: 'module',
    module: 'CPU Scheduling',
    rarity: 'rare',
    criteria: { type: 'module_completion', value: 85, gameId: 'fcfs-l1', moduleId: 'cpu-scheduling' }
  },
  {
    id: 'scheduler-expert',
    title: 'Scheduler Expert',
    description: 'Master all CPU scheduling algorithms',
    points: 300,
    category: 'module',
    module: 'CPU Scheduling',
    rarity: 'epic',
    criteria: { type: 'module_completion', value: 0, moduleId: 'cpu-scheduling' }
  },

  // Memory Management Module Achievements
  {
    id: 'memory-architect',
    title: 'Memory Architect',
    description: 'Complete all memory allocation algorithms',
    points: 200,
    category: 'module',
    module: 'Memory Management',
    rarity: 'epic',
    criteria: { type: 'module_completion', value: 0, moduleId: 'memory-management' }
  },
  {
    id: 'fragmentation-fighter',
    title: 'Fragmentation Fighter',
    description: 'Achieve 95%+ efficiency in memory allocation',
    points: 125,
    category: 'performance',
    module: 'Memory Management',
    rarity: 'rare',
    criteria: { type: 'score_threshold', value: 95, moduleId: 'memory-management' }
  },

  // Process Synchronization Module Achievements
  {
    id: 'deadlock-detective',
    title: 'Deadlock Detective',
    description: 'Solve all dining philosophers scenarios',
    points: 175,
    category: 'module',
    module: 'Process Synchronization',
    rarity: 'epic',
    criteria: { type: 'module_completion', value: 0, moduleId: 'process-synchronization' }
  },
  {
    id: 'sync-master',
    title: 'Synchronization Master',
    description: 'Complete all synchronization challenges',
    points: 250,
    category: 'module',
    module: 'Process Synchronization',
    rarity: 'legendary',
    criteria: { type: 'module_completion', value: 0, moduleId: 'process-synchronization' }
  },

  // Special Achievements
  {
    id: 'streak-master',
    title: 'Streak Master',
    description: 'Maintain a 7-day learning streak',
    points: 150,
    category: 'special',
    rarity: 'rare',
    criteria: { type: 'streak', value: 7 }
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Complete 5 levels after midnight',
    points: 75,
    category: 'special',
    rarity: 'common',
    criteria: { type: 'time_threshold', value: 5 } // Special handling for night time
  }
];

/**
 * Check if a user has unlocked a specific achievement
 */
export async function checkAchievement(
  userId: string,
  achievementId: string,
  gameData?: {
    score?: number;
    timeSpent?: number;
    gameId?: string;
    moduleId?: string;
    levelId?: string;
  }
): Promise<boolean> {
  await connectDB();
  
  const user = await User.findById(userId);
  if (!user) return false;

  // Check if already unlocked
  if (user.achievements.includes(achievementId)) {
    return false; // Already unlocked
  }

  const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
  if (!achievement) return false;

  const criteria = achievement.criteria;

  switch (criteria.type) {
    case 'first_level':
      const totalLevels = user.completedLevels.length;
      return totalLevels >= criteria.value;

    case 'perfect_score':
      if (!gameData?.score) return false;
      return gameData.score >= criteria.value;

    case 'time_threshold':
      if (achievementId === 'speed-demon') {
        // Complete in under 30 seconds
        return gameData?.timeSpent ? gameData.timeSpent <= criteria.value : false;
      }
      if (achievementId === 'night-owl') {
        // Check if completed after midnight
        const now = new Date();
        const hour = now.getHours();
        if (hour >= 0 && hour < 6) {
          // Count levels completed at night
          const nightScores = await Score.countDocuments({
            userId,
            completedAt: {
              $gte: new Date(now.setHours(0, 0, 0, 0)),
              $lt: new Date(now.setHours(6, 0, 0, 0))
            }
          });
          return nightScores >= criteria.value;
        }
        return false;
      }
      return false;

    case 'levels_completed':
      return user.completedLevels.length >= criteria.value;

    case 'module_completion':
      if (criteria.moduleId) {
        // Check all games in module completed with required score
        const moduleScores = await Score.find({
          userId,
          moduleId: criteria.moduleId
        });
        
        if (achievementId === 'fcfs-master') {
          // Specific: All FCFS levels with 85+ score
          const fcfsScores = await Score.find({
            userId,
            gameId: 'fcfs-l1',
            score: { $gte: criteria.value }
          });
          const uniqueFCFSLevels = new Set(fcfsScores.map(s => s.levelId));
          // Assuming there are multiple FCFS levels - adjust based on actual game structure
          return uniqueFCFSLevels.size >= 1; // At least one FCFS level with 85+
        }
        
        // General module completion: check if user has scores for all games in module
        const uniqueGames = new Set(moduleScores.map(s => s.gameId));
        // This is a simplified check - you may need to adjust based on actual game structure
        return uniqueGames.size >= 1; // At least one game completed
      }
      return false;

    case 'score_threshold':
      if (criteria.moduleId && gameData?.moduleId === criteria.moduleId) {
        // Check efficiency for memory management
        // This would need game-specific metadata
        return gameData.score >= criteria.value;
      }
      return false;

    case 'consecutive_scores':
      // Get last N scores and check if all are >= threshold
      const threshold = (criteria as any).threshold || 90;
      const recentScores = await Score.find({ userId })
        .sort({ completedAt: -1 })
        .limit(criteria.value)
        .select('score');
      
      if (recentScores.length < criteria.value) return false;
      return recentScores.every(s => s.score >= threshold);

    case 'streak':
      // Check login streak - simplified version
      // You'd need to track daily logins for this
      return false; // Placeholder - implement based on your login tracking

    default:
      return false;
  }
}

/**
 * Check all achievements for a user after a game completion
 */
export async function checkAllAchievements(
  userId: string,
  gameData: {
    score: number;
    timeSpent: number;
    gameId: string;
    moduleId: string;
    levelId: string;
  }
): Promise<string[]> {
  await connectDB();
  
  const newlyUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    const isUnlocked = await checkAchievement(userId, achievement.id, gameData);
    
    if (isUnlocked) {
      // Unlock the achievement
      await User.findByIdAndUpdate(userId, {
        $addToSet: { achievements: achievement.id },
        $inc: { totalXP: achievement.points }
      });
      
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}

/**
 * Get achievement status for a user
 */
export async function getUserAchievementStatus(userId: string): Promise<Map<string, {
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  unlockedAt?: Date;
}>> {
  await connectDB();
  
  const user = await User.findById(userId);
  if (!user) return new Map();

  const statusMap = new Map();
  const scores = await Score.find({ userId }).sort({ completedAt: -1 });

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    const unlocked = user.achievements.includes(achievement.id);
    const criteria = achievement.criteria;
    
    let progress: number | undefined;
    let maxProgress: number | undefined;
    let unlockedAt: Date | undefined;

    if (unlocked) {
      // Find when it was unlocked (simplified - use first score that would unlock it)
      const firstQualifyingScore = scores.find(s => {
        // Simplified check - in real implementation, track unlock date
        return true;
      });
      unlockedAt = firstQualifyingScore?.completedAt;
    } else {
      // Calculate progress
      switch (criteria.type) {
        case 'levels_completed':
          progress = user.completedLevels.length;
          maxProgress = criteria.value;
          break;
        case 'module_completion':
          if (criteria.moduleId) {
            const moduleScores = scores.filter(s => s.moduleId === criteria.moduleId);
            const uniqueGames = new Set(moduleScores.map(s => s.gameId));
            progress = uniqueGames.size;
            // Assuming 3 games per module - adjust based on actual structure
            maxProgress = 3;
          }
          break;
        case 'consecutive_scores':
          // Count consecutive scores >= 90
          let consecutive = 0;
          for (const score of scores.slice(0, criteria.value)) {
            if (score.score >= 90) consecutive++;
            else break;
          }
          progress = consecutive;
          maxProgress = criteria.value;
          break;
      }
    }

    statusMap.set(achievement.id, {
      unlocked,
      progress,
      maxProgress,
      unlockedAt
    });
  }

  return statusMap;
}

