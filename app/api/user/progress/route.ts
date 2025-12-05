import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Score from '@/lib/models/Score';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user data
    const user = await User.findById(session.user.id).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's recent scores
    const recentScores = await Score.find({ userId: session.user.id })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('gameId levelId score timeSpent accuracy completedAt');

    // Get user's best scores by game
    const bestScores = await Score.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: { gameId: '$gameId', levelId: '$levelId' },
          bestScore: { $max: '$score' },
          bestTime: { $min: '$timeSpent' },
          attempts: { $sum: 1 }
        }
      },
      {
        $project: {
          gameId: '$_id.gameId',
          levelId: '$_id.levelId',
          bestScore: 1,
          bestTime: 1,
          attempts: 1,
          _id: 0
        }
      }
    ]);

    // Calculate statistics
    const totalGamesPlayed = await Score.countDocuments({ userId: session.user.id });
    const averageScore = await Score.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);

    return NextResponse.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        totalXP: user.totalXP,
        level: user.level,
        completedLevels: user.completedLevels,
        achievements: user.achievements,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      stats: {
        totalGamesPlayed,
        averageScore: averageScore[0]?.avgScore || 0,
        completedLevelsCount: user.completedLevels.length
      },
      recentScores,
      bestScores
    });
  } catch (error: any) {
    console.error('User progress fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
