import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { authOptions } from '../../auth/[...nextauth]/route';

// GET user settings
export async function GET(req: NextRequest) {
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

    await connectDB();

    const user = await User.findById(userId).select('settings');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return default settings if none exist
    const defaultSettings = {
      notifications: {
        email: {
          weeklyProgress: true,
          courseReminders: true,
          achievements: false,
          generalUpdates: true,
        },
        inApp: {
          achievements: true,
          leaderboard: true,
          messages: true,
          realTime: true,
        },
        push: {
          enabled: false,
          achievements: false,
          reminders: false,
        },
      },
      privacy: {
        profileVisibility: 'public',
        showActivity: true,
        showProgress: true,
        allowMessages: 'friends',
        showOnlineStatus: true,
        leaderboardParticipation: true,
      },
      security: {
        twoFactorEnabled: false,
        loginNotifications: true,
        sessionTimeout: '30',
      },
      preferences: {
        theme: 'dark',
        language: 'en',
        timezone: 'UTC-8',
        autoSave: true,
        soundEffects: true,
        animations: true,
      },
    };

    return NextResponse.json({
      settings: user.settings || defaultSettings
    });
  } catch (error: any) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update user settings
export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings data required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { settings } },
      { new: true, runValidators: true }
    ).select('settings');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
