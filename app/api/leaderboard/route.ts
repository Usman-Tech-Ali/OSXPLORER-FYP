import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

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
