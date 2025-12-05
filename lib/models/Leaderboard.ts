import mongoose, { Schema, Document } from 'mongoose';

interface LeaderboardEntry {
  userId: mongoose.Types.ObjectId;
  username: string;
  score: number;
  timeSpent: number;
  completedAt: Date;
}

export interface ILeaderboard extends Document {
  gameId: string;
  levelId: string;
  topScores: LeaderboardEntry[];
  lastUpdated: Date;
}

const LeaderboardSchema = new Schema<ILeaderboard>({
  gameId: {
    type: String,
    required: true
  },
  levelId: {
    type: String,
    required: true
  },
  topScores: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    score: Number,
    timeSpent: Number,
    completedAt: Date
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index
LeaderboardSchema.index({ gameId: 1, levelId: 1 }, { unique: true });

export default mongoose.models.Leaderboard || mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);
