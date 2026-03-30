import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  verified?: boolean;
  premium?: boolean;
  totalXP: number;
  level: number;
  completedLevels: string[];
  achievements: string[];
  currentStreak?: number;
  longestStreak?: number;
  settings?: any;
  createdAt: Date;
  lastLogin: Date;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  profilePicture: {
    type: String,
    default: '/placeholder.svg'
  },
  verified: {
    type: Boolean,
    default: false
  },
  premium: {
    type: Boolean,
    default: false
  },
  totalXP: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  completedLevels: [{
    type: String
  }],
  achievements: [{
    type: String
  }],
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  settings: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
