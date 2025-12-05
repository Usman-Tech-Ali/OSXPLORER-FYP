import mongoose, { Schema, Document } from 'mongoose';

export interface IScore extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  moduleId: string;
  gameId: string;
  levelId: string;
  score: number;
  timeSpent: number; // in seconds
  accuracy: number; // percentage
  wrongAttempts: number;
  completedAt: Date;
  metadata?: {
    [key: string]: any; // Game-specific data
  };
}

const ScoreSchema = new Schema<IScore>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  moduleId: {
    type: String,
    required: true
  },
  gameId: {
    type: String,
    required: true
  },
  levelId: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  timeSpent: {
    type: Number,
    required: true
  },
  accuracy: {
    type: Number,
    default: 100
  },
  wrongAttempts: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Schema.Types.Mixed
  }
});

// Index for faster queries
ScoreSchema.index({ gameId: 1, levelId: 1, score: -1 });
ScoreSchema.index({ userId: 1, completedAt: -1 });

export default mongoose.models.Score || mongoose.model<IScore>('Score', ScoreSchema);
