import { ObjectId } from 'mongodb';

// User Document
export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  stats?: UserStats;
}

// User Statistics
export interface UserStats {
  totalScore: number;
  gamesPlayed: number;
  gamesCompleted: number;
  averageScore: number;
  achievements: string[];
  moduleProgress: ModuleProgress[];
}

// Module Progress
export interface ModuleProgress {
  moduleId: string;
  moduleName: string;
  completedLevels: string[];
  completedGames: string[];
  score: number;
  lastPlayed: Date;
}

// Game Session
export interface GameSession {
  _id?: ObjectId;
  userId: ObjectId;
  username: string;
  gameId: string;
  gameName: string;
  moduleId: string;
  levelId: string;
  score: number;
  timeSpent: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
  gameData?: any; // Flexible field for game-specific data
}

// Achievement
export interface Achievement {
  _id?: ObjectId;
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  criteria: {
    type: 'games_completed' | 'score_reached' | 'time_based' | 'perfect_score' | 'streak';
    value: number;
  };
}

// User Achievement (when a user unlocks an achievement)
export interface UserAchievement {
  _id?: ObjectId;
  userId: ObjectId;
  achievementId: string;
  unlockedAt: Date;
}

// Leaderboard Entry
export interface LeaderboardEntry {
  _id?: ObjectId;
  userId: ObjectId;
  username: string;
  totalScore: number;
  gamesCompleted: number;
  averageScore: number;
  rank?: number;
  updatedAt: Date;
}
