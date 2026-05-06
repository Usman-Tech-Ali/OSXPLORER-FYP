import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import LeaderboardPage from '@/app/leaderboard/page'

// Mock next-auth
jest.mock('next-auth/react')

describe('Leaderboard Page', () => {
  const mockPlayers = [
    {
      id: '1',
      username: 'player1',
      displayName: 'Player One',
      totalPoints: 5000,
      level: 50,
      achievements: 55,
      badges: ['platinum', 'gold', 'silver', 'bronze'],
      levelsCompleted: 18,
      lastActive: new Date().toISOString(),
      rank: 1,
    },
    {
      id: '2',
      username: 'player2',
      displayName: 'Player Two',
      totalPoints: 3000,
      level: 30,
      achievements: 35,
      badges: ['gold', 'silver', 'bronze'],
      levelsCompleted: 15,
      lastActive: new Date().toISOString(),
      rank: 2,
    },
    {
      id: '3',
      username: 'player3',
      displayName: 'Player Three',
      totalPoints: 1500,
      level: 15,
      achievements: 20,
      badges: ['silver', 'bronze'],
      levelsCompleted: 10,
      lastActive: new Date().toISOString(),
      rank: 3,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'player2' } },
      status: 'authenticated',
    })

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            leaderboard: mockPlayers,
            totalPlayers: 3,
          }),
      })
    ) as jest.Mock
  })

  it('should render loading state initially', () => {
    render(<LeaderboardPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should fetch and display leaderboard data', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Global Leaderboard')).toBeInTheDocument()
    })

    expect(screen.getByText('Player One')).toBeInTheDocument()
    expect(screen.getByText('Player Two')).toBeInTheDocument()
    expect(screen.getByText('Player Three')).toBeInTheDocument()
  })

  it('should display correct rank badges', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Player One')).toBeInTheDocument()
    })

    // Check for rank indicators (crown for 1st, medals for 2nd and 3rd)
    const rankBadges = screen.getAllByRole('img', { hidden: true })
    expect(rankBadges.length).toBeGreaterThan(0)
  })

  it('should highlight current user', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument()
    })

    const currentUserRow = screen.getByText('You').closest('div')
    expect(currentUserRow).toHaveClass('bg-cyan-500/20')
  })

  it('should display achievement badges', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Player One')).toBeInTheDocument()
    })

    // Player 1 should have all 4 badges
    const player1Row = screen.getByText('Player One').closest('div')
    expect(player1Row).toBeInTheDocument()
  })

  it('should display total players count', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('Total Players')).toBeInTheDocument()
    })
  })

  it('should display top score', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('5,000')).toBeInTheDocument()
      expect(screen.getByText('Top Score')).toBeInTheDocument()
    })
  })

  it('should handle refresh button click', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    expect(global.fetch).toHaveBeenCalledTimes(2) // Initial load + refresh
  })

  it('should display empty state when no players', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            leaderboard: [],
            totalPlayers: 0,
          }),
      })
    ) as jest.Mock

    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('No players yet')).toBeInTheDocument()
      expect(screen.getByText('Be the first to join the leaderboard!')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('API Error'))
    ) as jest.Mock

    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to fetch leaderboard:',
        expect.any(Error)
      )
    })

    consoleError.mockRestore()
  })

  it('should display player stats correctly', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Player One')).toBeInTheDocument()
    })

    // Check for level, completed, and achievements
    expect(screen.getByText('50')).toBeInTheDocument() // Level
    expect(screen.getByText('18')).toBeInTheDocument() // Completed
    expect(screen.getByText('55')).toBeInTheDocument() // Achievements
  })

  it('should format XP with commas', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('5,000')).toBeInTheDocument()
      expect(screen.getByText('3,000')).toBeInTheDocument()
      expect(screen.getByText('1,500')).toBeInTheDocument()
    })
  })
})
