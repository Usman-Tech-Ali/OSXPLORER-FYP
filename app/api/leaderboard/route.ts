import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

// Badge thresholds
const getBadges = (achievementCount: number) => {
  const badges = [];
  if (achievementCount >= 50) badges.push('platinum');
  if (achievementCount >= 30) badges.push('gold');
  if (achievementCount >= 15) badges.push('silver');
  if (achievementCount >= 5) badges.push('bronze');
  return badges;
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Get all users sorted by totalXP
    const users = await User.find()
      .select('username email totalXP level completedLevels achievements createdAt lastLogin')
      .sort({ totalXP: -1 })
      .limit(100);

    // Format the leaderboard data
    const leaderboard = users.map((user, index) => ({
      id: user._id.toString(),
      username: user.username,
      displayName: user.username,
      totalPoints: user.totalXP,
      level: user.level,
      achievements: user.achievements.length,
      badges: getBadges(user.achievements.length),
      levelsCompleted: user.completedLevels.length,
      lastActive: user.lastLogin || user.createdAt,
      rank: index + 1,
    }));

    return NextResponse.json({
      leaderboard,
      totalPlayers: users.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
