import connectDB from './mongodb';
import User from './models/User';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string;
}

/**
 * Update user's login streak
 */
export async function updateLoginStreak(userId: string): Promise<StreakData> {
  await connectDB();
  
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
  const lastLoginDate = lastLogin 
    ? new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate())
    : null;

  let currentStreak = user.currentStreak || 0;
  let longestStreak = user.longestStreak || 0;

  if (!lastLoginDate) {
    // First login
    currentStreak = 1;
  } else {
    const daysDiff = Math.floor((today.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Same day login - no change
    } else if (daysDiff === 1) {
      // Consecutive day - increment streak
      currentStreak += 1;
    } else {
      // Streak broken - reset to 1
      currentStreak = 1;
    }
  }

  // Update longest streak if current is higher
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // Update user
  user.currentStreak = currentStreak;
  user.longestStreak = longestStreak;
  user.lastLogin = now;
  await user.save();

  return {
    currentStreak,
    longestStreak,
    lastLoginDate: today.toISOString().split('T')[0]
  };
}

/**
 * Get user's streak data
 */
export async function getUserStreak(userId: string): Promise<StreakData> {
  await connectDB();
  
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
  const lastLoginDate = lastLogin 
    ? new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate())
    : null;

  return {
    currentStreak: user.currentStreak || 0,
    longestStreak: user.longestStreak || 0,
    lastLoginDate: lastLoginDate ? lastLoginDate.toISOString().split('T')[0] : ''
  };
}

/**
 * Check if user maintained streak today
 */
export async function checkStreakToday(userId: string): Promise<boolean> {
  await connectDB();
  
  const user = await User.findById(userId);
  if (!user || !user.lastLogin) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastLogin = new Date(user.lastLogin);
  const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());

  return today.getTime() === lastLoginDate.getTime();
}
