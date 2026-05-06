import { GET } from '@/app/api/leaderboard/route'
import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/lib/models/User'

// Mock dependencies
jest.mock('@/lib/mongodb')
jest.mock('@/lib/models/User')

describe('Leaderboard API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/leaderboard', () => {
    it('should return leaderboard data successfully', async () => {
      // Mock database connection
      ;(connectDB as jest.Mock).mockResolvedValue(undefined)

      // Mock user data
      const mockUsers = [
        {
          _id: '1',
          username: 'player1',
          email: 'player1@test.com',
          totalXP: 1000,
          level: 10,
          completedLevels: ['level1', 'level2'],
          achievements: ['ach1', 'ach2', 'ach3', 'ach4', 'ach5', 'ach6'],
          createdAt: new Date(),
          lastLogin: new Date(),
        },
        {
          _id: '2',
          username: 'player2',
          email: 'player2@test.com',
          totalXP: 800,
          level: 8,
          completedLevels: ['level1'],
          achievements: ['ach1', 'ach2'],
          createdAt: new Date(),
          lastLogin: new Date(),
        },
      ]

      // Mock User.find chain
      const mockFind = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      }
      ;(User.find as jest.Mock).mockReturnValue(mockFind)

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/leaderboard')

      // Call the API
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(connectDB).toHaveBeenCalled()
      expect(User.find).toHaveBeenCalled()
      expect(mockFind.select).toHaveBeenCalledWith(
        'username email totalXP level completedLevels achievements createdAt lastLogin'
      )
      expect(mockFind.sort).toHaveBeenCalledWith({ totalXP: -1 })
      expect(mockFind.limit).toHaveBeenCalledWith(100)

      expect(data.leaderboard).toHaveLength(2)
      expect(data.leaderboard[0]).toMatchObject({
        username: 'player1',
        totalPoints: 1000,
        level: 10,
        rank: 1,
      })
      expect(data.leaderboard[0].badges).toContain('bronze')
      expect(data.totalPlayers).toBe(2)
      expect(data.lastUpdated).toBeDefined()
    })

    it('should assign correct badges based on achievement count', async () => {
      ;(connectDB as jest.Mock).mockResolvedValue(undefined)

      const mockUsers = [
        {
          _id: '1',
          username: 'platinum_player',
          totalXP: 5000,
          level: 50,
          completedLevels: [],
          achievements: new Array(55).fill('ach'), // 55 achievements
          createdAt: new Date(),
          lastLogin: new Date(),
        },
        {
          _id: '2',
          username: 'gold_player',
          totalXP: 3000,
          level: 30,
          completedLevels: [],
          achievements: new Array(35).fill('ach'), // 35 achievements
          createdAt: new Date(),
          lastLogin: new Date(),
        },
        {
          _id: '3',
          username: 'silver_player',
          totalXP: 1500,
          level: 15,
          completedLevels: [],
          achievements: new Array(20).fill('ach'), // 20 achievements
          createdAt: new Date(),
          lastLogin: new Date(),
        },
        {
          _id: '4',
          username: 'bronze_player',
          totalXP: 500,
          level: 5,
          completedLevels: [],
          achievements: new Array(8).fill('ach'), // 8 achievements
          createdAt: new Date(),
          lastLogin: new Date(),
        },
      ]

      const mockFind = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      }
      ;(User.find as jest.Mock).mockReturnValue(mockFind)

      const request = new NextRequest('http://localhost:3000/api/leaderboard')
      const response = await GET(request)
      const data = await response.json()

      // Check platinum player badges
      expect(data.leaderboard[0].badges).toEqual(['platinum', 'gold', 'silver', 'bronze'])

      // Check gold player badges
      expect(data.leaderboard[1].badges).toEqual(['gold', 'silver', 'bronze'])

      // Check silver player badges
      expect(data.leaderboard[2].badges).toEqual(['silver', 'bronze'])

      // Check bronze player badges
      expect(data.leaderboard[3].badges).toEqual(['bronze'])
    })

    it('should handle database errors gracefully', async () => {
      ;(connectDB as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/leaderboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should return empty leaderboard when no users exist', async () => {
      ;(connectDB as jest.Mock).mockResolvedValue(undefined)

      const mockFind = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }
      ;(User.find as jest.Mock).mockReturnValue(mockFind)

      const request = new NextRequest('http://localhost:3000/api/leaderboard')
      const response = await GET(request)
      const data = await response.json()

      expect(data.leaderboard).toEqual([])
      expect(data.totalPlayers).toBe(0)
    })

    it('should correctly rank players by totalXP', async () => {
      ;(connectDB as jest.Mock).mockResolvedValue(undefined)

      const mockUsers = [
        { _id: '1', username: 'first', totalXP: 1000, level: 10, completedLevels: [], achievements: [], createdAt: new Date(), lastLogin: new Date() },
        { _id: '2', username: 'second', totalXP: 900, level: 9, completedLevels: [], achievements: [], createdAt: new Date(), lastLogin: new Date() },
        { _id: '3', username: 'third', totalXP: 800, level: 8, completedLevels: [], achievements: [], createdAt: new Date(), lastLogin: new Date() },
      ]

      const mockFind = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      }
      ;(User.find as jest.Mock).mockReturnValue(mockFind)

      const request = new NextRequest('http://localhost:3000/api/leaderboard')
      const response = await GET(request)
      const data = await response.json()

      expect(data.leaderboard[0].rank).toBe(1)
      expect(data.leaderboard[1].rank).toBe(2)
      expect(data.leaderboard[2].rank).toBe(3)
    })
  })
})
