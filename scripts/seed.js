/**
 * Standalone script to seed the database
 * Run with: node scripts/seed.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'osxplorer_db';

// Sample data
const usernames = [
  'GameMaster', 'CodeNinja', 'OSExplorer', 'TechWizard', 'ByteWarrior',
  'DataDragon', 'AlgoKnight', 'PixelPro', 'ScriptSage', 'DevDynamo',
  'LogicLegend', 'BinaryBoss', 'CyberChamp', 'QuantumQuest', 'SystemStar'
];

const gameIds = [
  'fcfs-l1', 'fcfs-l2', 'sjf-l1', 'priority-l1', 
  'first-fit-l1', 'best-fit-l1', 'worst-fit-l1',
  'critical-section-l1', 'deadlock-l1'
];

const gameNames = [
  'FCFS Scheduling Level 1', 'FCFS Scheduling Level 2', 
  'SJF Scheduling Level 1', 'Priority Scheduling Level 1',
  'First Fit Memory', 'Best Fit Memory', 'Worst Fit Memory',
  'Critical Section', 'Deadlock Prevention'
];

const moduleIds = ['cpu-scheduling', 'memory-management', 'process-synchronization'];

const achievements = [
  {
    achievementId: 'first_game',
    name: 'First Steps',
    description: 'Complete your first game',
    icon: '🎮',
    category: 'beginner',
    points: 10,
    criteria: { type: 'games_completed', value: 1 }
  },
  {
    achievementId: 'score_100',
    name: 'Century',
    description: 'Reach 100 total score',
    icon: '💯',
    category: 'score',
    points: 20,
    criteria: { type: 'score_reached', value: 100 }
  },
  {
    achievementId: 'games_10',
    name: 'Dedicated Player',
    description: 'Complete 10 games',
    icon: '⭐',
    category: 'progress',
    points: 30,
    criteria: { type: 'games_completed', value: 10 }
  },
  {
    achievementId: 'perfect_score',
    name: 'Perfectionist',
    description: 'Get a perfect score in any game',
    icon: '🏆',
    category: 'expert',
    points: 50,
    criteria: { type: 'perfect_score', value: 100 }
  },
  {
    achievementId: 'score_500',
    name: 'High Achiever',
    description: 'Reach 500 total score',
    icon: '🌟',
    category: 'score',
    points: 50,
    criteria: { type: 'score_reached', value: 500 }
  },
  {
    achievementId: 'games_25',
    name: 'Game Master',
    description: 'Complete 25 games',
    icon: '👑',
    category: 'progress',
    points: 75,
    criteria: { type: 'games_completed', value: 25 }
  }
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedDatabase() {
  const client = new MongoClient(uri);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('game_sessions').deleteMany({});
    await db.collection('achievements').deleteMany({});
    await db.collection('user_achievements').deleteMany({});

    // Insert achievements
    console.log('🏆 Inserting achievements...');
    await db.collection('achievements').insertMany(achievements);

    // Generate users
    console.log('👥 Generating users...');
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const users = [];

    for (let i = 0; i < 15; i++) {
      const username = usernames[i % usernames.length] + (i >= usernames.length ? i : '');
      const createdAt = randomDate(oneMonthAgo, now);
      
      users.push({
        username,
        email: `${username.toLowerCase()}@example.com`,
        password: 'hashedpassword123',
        createdAt,
        updatedAt: createdAt,
        stats: {
          totalScore: 0,
          gamesPlayed: 0,
          gamesCompleted: 0,
          averageScore: 0,
          achievements: [],
          moduleProgress: []
        }
      });
    }

    const insertedUsers = await db.collection('users').insertMany(users);
    console.log(`✅ Created ${users.length} users`);

    // Generate game sessions
    console.log('🎮 Generating game sessions...');
    const sessions = [];
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < users.length; i++) {
      const userId = insertedUsers.insertedIds[i];
      const numSessions = randomInt(5, 15);

      for (let j = 0; j < numSessions; j++) {
        const gameIndex = randomInt(0, gameIds.length - 1);
        const score = randomInt(50, 100);
        const timeSpent = randomInt(60, 300);
        const completed = Math.random() > 0.1;
        const startedAt = randomDate(oneWeekAgo, now);

        sessions.push({
          userId,
          username: users[i].username,
          gameId: gameIds[gameIndex],
          gameName: gameNames[gameIndex],
          moduleId: moduleIds[randomInt(0, moduleIds.length - 1)],
          levelId: `level-${randomInt(1, 3)}`,
          score: completed ? score : 0,
          timeSpent,
          completed,
          startedAt,
          completedAt: completed ? new Date(startedAt.getTime() + timeSpent * 1000) : undefined,
          gameData: {
            attempts: randomInt(1, 5),
            hintsUsed: randomInt(0, 3)
          }
        });
      }
    }

    await db.collection('game_sessions').insertMany(sessions);
    console.log(`✅ Created ${sessions.length} game sessions`);

    // Update user stats
    console.log('📊 Calculating user statistics...');
    for (let i = 0; i < users.length; i++) {
      const userId = insertedUsers.insertedIds[i];
      const userSessions = sessions.filter(s => s.userId.equals(userId));
      const completedSessions = userSessions.filter(s => s.completed);
      
      const totalScore = completedSessions.reduce((sum, s) => sum + s.score, 0);
      const gamesPlayed = userSessions.length;
      const gamesCompleted = completedSessions.length;
      const averageScore = gamesCompleted > 0 ? Math.round(totalScore / gamesCompleted) : 0;

      await db.collection('users').updateOne(
        { _id: userId },
        {
          $set: {
            stats: {
              totalScore,
              gamesPlayed,
              gamesCompleted,
              averageScore,
              achievements: [],
              moduleProgress: []
            },
            updatedAt: new Date()
          }
        }
      );
    }

    // Assign achievements
    console.log('🌟 Assigning achievements...');
    const userAchievements = [];
    const updatedUsers = await db.collection('users').find({}).toArray();

    for (const user of updatedUsers) {
      for (const achievement of achievements) {
        let earned = false;

        switch (achievement.criteria.type) {
          case 'games_completed':
            earned = user.stats.gamesCompleted >= achievement.criteria.value;
            break;
          case 'score_reached':
            earned = user.stats.totalScore >= achievement.criteria.value;
            break;
          case 'perfect_score':
            earned = user.stats.averageScore === 100;
            break;
        }

        if (earned) {
          userAchievements.push({
            userId: user._id,
            achievementId: achievement.achievementId,
            unlockedAt: randomDate(user.createdAt, now)
          });
          
          await db.collection('users').updateOne(
            { _id: user._id },
            { $push: { 'stats.achievements': achievement.achievementId } }
          );
        }
      }
    }

    if (userAchievements.length > 0) {
      await db.collection('user_achievements').insertMany(userAchievements);
    }
    console.log(`✅ Assigned ${userAchievements.length} achievements`);

    // Final stats
    const stats = {
      users: await db.collection('users').countDocuments(),
      gameSessions: await db.collection('game_sessions').countDocuments(),
      achievements: await db.collection('achievements').countDocuments(),
      userAchievements: await db.collection('user_achievements').countDocuments()
    };

    console.log('\n🎉 Database seeding completed!');
    console.log('📈 Final Statistics:');
    console.log(`   - Users: ${stats.users}`);
    console.log(`   - Game Sessions: ${stats.gameSessions}`);
    console.log(`   - Achievements: ${stats.achievements}`);
    console.log(`   - Unlocked Achievements: ${stats.userAchievements}`);
    console.log('\n✨ You can now view your data in MongoDB Atlas or MongoDB Compass');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();
