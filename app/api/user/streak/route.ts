import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { updateLoginStreak, getUserStreak } from '@/lib/streakTracking';
import { authOptions } from '../../auth/[...nextauth]/route';

// GET user streak data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    const streakData = await getUserStreak(userId);

    return NextResponse.json({
      streak: streakData
    });
  } catch (error: any) {
    console.error('Streak fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST update login streak
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    const streakData = await updateLoginStreak(userId);

    return NextResponse.json({
      message: 'Streak updated successfully',
      streak: streakData
    });
  } catch (error: any) {
    console.error('Streak update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
