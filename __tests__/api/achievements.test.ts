import { GET } from '@/app/api/achievements/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import connectDB from '@/lib/mongodb'
import User from '@/lib/models/User'
import { getUserAchievementStatus, ACHIEVEMENT_DEFINITIONS } from '@/lib/achievements'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/mongodb')
jest.mock('@/lib/models/User')
jest.mock('@/lib/achievements')

describe('Achievements API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/achievements', () => {
    it('should return 401 if user is not authenticated', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 404 if user is not found', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user123' },
      })
      ;(connectDB as jest.Mock).mockResolvedValue(undefined)
      ;(User.findById as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return achievements with correct status', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        level: 10,
        totalXP: 1000,
        achievements: ['first-steps', 'perfect-score'],
      }

      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user123' },
      })
      ;(connectDB as jest.Mock).mockResolvedValue(undefined)
      ;(User.findById as jest.Mock).mockResolvedValue(mockUser)

      // Mock achievement definitions
      ;(ACHIEVEMENT_DEFINITIONS as any) = [
        {
          id: 'first-steps',
          title: 'First Steps',
          description: 'Complete your first level',
          points: 50,
          category: 'progress',
          rarity: 'common',
        },
        {
          id: 'perfect-score',
          title: 'Perfect Score',
          description: 'Score 100/100 on any level',
          points: 200,
          category: 'performance',
          rarity: 'epic',
        },
        {
          id: 'level-crusher',
          title: 'Level Crusher',
          description: 'Complete 25 levels',
          points: 250,
          category: 'progress',
          rarity: 'rare',
        },
      ]

      const mockStatusMap = new Map([
        ['first-steps', { unlocked: true, unlockedAt: new Date('2024-01-01') }],
        ['perfect-score', { unlocked: true, unlockedAt: new Date('2024-01-02') }],
        ['level-crusher', { unlocked: false, progress: 10, maxProgress: 25 }],
      ])

      ;(getUserAchievementStatus as jest.Mock).mockResolvedValue(mockStatusMap)

      const request = new NextRequest('http://localhost:3000/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.achievements).toHaveLength(3)
      
      // Check completed achievement
      const firstSteps = data.achievements.find((a: any) => a.id === 'first-steps')
      expect(firstSteps.status).toBe('completed')
      expect(firstSteps.unlockedAt).toBeDefined()

      // Check in-progress achievement
      const levelCrusher = data.achievements.find((a: any) => a.id === 'level-crusher')
      expect(levelCrusher.status).toBe('in-progress')
      expect(levelCrusher.progress).toBeDefined()

      // Check stats
      expect(data.stats.totalAchievements).toBe(2)
      expect(data.stats.totalPoints).toBe(250) // 50 + 200
      expect(data.stats.rank).toBe('Achievement Hunter')
    })

    it('should calculate correct rank based on user level', async () => {
      const testCases = [
        { level: 3, expectedRank: 'Beginner' },
        { level: 7, expectedRank: 'Rising Star' },
        { level: 12, expectedRank: 'Achievement Hunter' },
        { level: 17, expectedRank: 'Master' },
        { level: 22, expectedRank: 'Legend' },
      ]

      for (const { level, expectedRank } of testCases) {
        const mockUser = {
          _id: 'user123',
          username: 'testuser',
          level,
          totalXP: level * 100,
          achievements: [],
        }

        ;(getServerSession as jest.Mock).mockResolvedValue({
          user: { id: 'user123' },
        })
        ;(connectDB as jest.Mock).mockResolvedValue(undefined)
        ;(User.findById as jest.Mock).mockResolvedValue(mockUser)
        ;(ACHIEVEMENT_DEFINITIONS as any) = []
        ;(getUserAchievementStatus as jest.Mock).mockResolvedValue(new Map())

        const request = new NextRequest('http://localhost:3000/api/achievements')
        const response = await GET(request)
        const data = await response.json()

        expect(data.stats.rank).toBe(expectedRank)
      }
    })

    it('should handle database errors gracefully', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user123' },
      })
      ;(connectDB as jest.Mock).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/achievements')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
