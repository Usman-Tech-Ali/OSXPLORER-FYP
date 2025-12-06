import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Score from '@/lib/models/Score';
import { checkAllAchievements } from '@/lib/achievements';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { gameId, moduleId, levelId, score, timeSpent, accuracy, wrongAttempts, metadata } = body;

    // Validate required fields
    if (!gameId || !moduleId || !levelId || score === undefined || timeSpent === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Save score
    const newScore = new Score({
      userId: user._id,
      username: user.username,
      gameId,
      moduleId,
      levelId,
      score,
      timeSpent,
      accuracy: accuracy || 100,
      wrongAttempts: wrongAttempts || 0,
      metadata: metadata || {},
      completedAt: new Date()
    });

    await newScore.save();

    // Update user's completed levels (if not already added)
    const levelKey = `${moduleId}/${gameId}/${levelId}`;
    if (!user.completedLevels.includes(levelKey)) {
      user.completedLevels.push(levelKey);
    }

    // Update user XP and level
    const xpGained = Math.floor(score * 0.1); // 10% of score as XP
    user.totalXP += xpGained;
    
    // Calculate level (every 1000 XP = 1 level)
    const newLevel = Math.floor(user.totalXP / 1000) + 1;
    if (newLevel > user.level) {
      user.level = newLevel;
    }

    await user.save();

    // Check and unlock achievements
    const newlyUnlocked = await checkAllAchievements(session.user.id, {
      score,
      timeSpent,
      gameId,
      moduleId,
      levelId
    });

    return NextResponse.json({
      success: true,
      score: newScore,
      xpGained,
      newLevel: newLevel > user.level - 1 ? newLevel : null,
      achievementsUnlocked: newlyUnlocked,
      message: newlyUnlocked.length > 0 
        ? `🎉 Unlocked ${newlyUnlocked.length} achievement(s)!` 
        : 'Score saved successfully'
    });

  } catch (error: any) {
    console.error('Score submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

