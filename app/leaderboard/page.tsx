"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  Crown,
  Medal,
  TrendingUp,
  Users,
  RefreshCw,
} from "lucide-react"

interface Player {
  id: string
  username: string
  displayName: string
  totalPoints: number
  level: number
  achievements: number
  levelsCompleted: number
  lastActive: string
  rank: number
}

export default function LeaderboardPage() {
  const { data: session } = useSession()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [totalPlayers, setTotalPlayers] = useState(0)

  useEffect(() => {
    setMounted(true)
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/leaderboard')
      if (response.ok) {
        const data = await response.json()
        setPlayers(data.leaderboard)
        setTotalPlayers(data.totalPlayers)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />
      case 3:
        return <Medal className="w-6 h-6 text-orange-400" />
      default:
        return <span className="text-gray-400 font-bold">#{rank}</span>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600"
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500"
      case 3:
        return "bg-gradient-to-r from-orange-400 to-orange-600"
      default:
        return "bg-gray-700"
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="floating-particles"></div>
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            🏆 Global Leaderboard
          </h1>
          <p className="text-xl text-gray-300 mb-6">Compete with players worldwide</p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{totalPlayers}</div>
                <p className="text-gray-400">Total Players</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {players[0]?.totalPoints.toLocaleString() || 0}
                </div>
                <p className="text-gray-400">Top Score</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  #{players.findIndex(p => p.username === session?.user?.name) + 1 || '-'}
                </div>
                <p className="text-gray-400">Your Rank</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={fetchLeaderboard}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            {players.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400 mb-2">No players yet</h3>
                <p className="text-gray-500">Be the first to join the leaderboard!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player) => {
                  const isCurrentUser = session?.user?.name === player.username
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                        isCurrentUser
                          ? 'bg-cyan-500/20 border-2 border-cyan-500/50'
                          : 'bg-gray-800/50 hover:bg-gray-800/70'
                      }`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`w-12 h-12 rounded-full ${getRankBadgeColor(player.rank)} flex items-center justify-center`}>
                          {getRankIcon(player.rank)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-bold ${isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>
                              {player.displayName}
                            </h3>
                            {isCurrentUser && (
                              <Badge className="bg-cyan-500/20 border-cyan-500/50 text-cyan-300 text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">@{player.username}</p>
                        </div>

                        <div className="hidden md:flex items-center space-x-6 text-sm">
                          <div className="text-center">
                            <p className="text-gray-400">Level</p>
                            <p className="font-bold text-white">{player.level}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-400">Completed</p>
                            <p className="font-bold text-white">{player.levelsCompleted}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-400">Achievements</p>
                            <p className="font-bold text-white">{player.achievements}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-400">
                            {player.totalPoints.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">XP</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
