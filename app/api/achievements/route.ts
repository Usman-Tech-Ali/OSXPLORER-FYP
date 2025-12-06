import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Score from '@/lib/models/Score';
import { ACHIEVEMENT_DEFINITIONS, getUserAchievementStatus } from '@/lib/achievements';
import { authOptions } from '../auth/[...nextauth]/route';

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

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get achievement status
    const statusMap = await getUserAchievementStatus(session.user.id);
    const scores = await Score.find({ userId: user._id }).sort({ completedAt: -1 });

    // Build achievement list with status
    const achievements = ACHIEVEMENT_DEFINITIONS.map(achievement => {
      const status = statusMap.get(achievement.id) || { unlocked: false };
      
      // Determine status
      let achievementStatus: 'completed' | 'in-progress' | 'locked' = 'locked';
      if (status.unlocked) {
        achievementStatus = 'completed';
      } else if (status.progress !== undefined && status.progress > 0) {
        achievementStatus = 'in-progress';
      }

      // Calculate progress percentage
      let progress: number | undefined;
      let maxProgress: number | undefined;
      if (status.progress !== undefined && status.maxProgress !== undefined) {
        progress = Math.round((status.progress / status.maxProgress) * 100);
        maxProgress = status.maxProgress;
      }

      // Format unlocked date
      let unlockedAt: string | undefined;
      if (status.unlockedAt) {
        const daysAgo = Math.floor((Date.now() - status.unlockedAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo === 0) unlockedAt = 'today';
        else if (daysAgo === 1) unlockedAt = '1 day ago';
        else unlockedAt = `${daysAgo} days ago`;
      }

      return {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        points: achievement.points,
        status: achievementStatus,
        category: achievement.category,
        module: achievement.module,
        rarity: achievement.rarity,
        progress,
        maxProgress,
        unlockedAt
      };
    });

    // Calculate user stats
    const totalAchievements = achievements.filter(a => a.status === 'completed').length;
    const totalPoints = achievements
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + a.points, 0);

    // Calculate completion rate (based on total possible achievements)
    const completionRate = Math.round((totalAchievements / achievements.length) * 100);

    // Determine rank
    let rank = 'Beginner';
    if (user.level >= 20) rank = 'Legend';
    else if (user.level >= 15) rank = 'Master';
    else if (user.level >= 10) rank = 'Achievement Hunter';
    else if (user.level >= 5) rank = 'Rising Star';

    return NextResponse.json({
      achievements,
      stats: {
        totalAchievements,
        totalPoints,
        completionRate,
        rank
      }
    });

  } catch (error: any) {
    console.error('Achievements fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

