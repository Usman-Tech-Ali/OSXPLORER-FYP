"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Crown,
  Star,
  Medal,
  Target,
  TrendingUp,
  Search,
  ChevronDown,
  Users,
  Flame,
  Zap,
  Award,
  ChevronUp,
  ChevronRight,
  Cpu,
  HardDrive,
  Shield,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

// Player data structure
interface Player {
  id: string
  username: string
  displayName: string
  avatar?: string
  totalPoints: number
  achievements: number
  badges: number
  levelsCompleted: number
  currentStreak: number
  lastActive: string
  rank: number
  previousRank?: number
  modules: {
    cpuScheduling: number
    memoryManagement: number
    processSynchronization: number
  }
}

// Mock leaderboard data
const players: Player[] = [
  {
    id: "1",
    username: "codewizard_sarah",
    displayName: "Sarah Rodriguez",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 15420,
    achievements: 28,
    badges: 4,
    levelsCompleted: 45,
    currentStreak: 12,
    lastActive: "2 minutes ago",
    rank: 1,
    previousRank: 2,
    modules: {
      cpuScheduling: 5200,
      memoryManagement: 4800,
      processSynchronization: 5420,
    },
  },
  {
    id: "2",
    username: "algorithm_ace",
    displayName: "Marcus Johnson",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 14890,
    achievements: 26,
    badges: 4,
    levelsCompleted: 42,
    currentStreak: 8,
    lastActive: "5 minutes ago",
    rank: 2,
    previousRank: 1,
    modules: {
      cpuScheduling: 5100,
      memoryManagement: 4590,
      processSynchronization: 5200,
    },
  },
  {
    id: "3",
    username: "sync_master",
    displayName: "Alex Chen",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 12450,
    achievements: 22,
    badges: 3,
    levelsCompleted: 38,
    currentStreak: 15,
    lastActive: "1 hour ago",
    rank: 3,
    previousRank: 3,
    modules: {
      cpuScheduling: 4200,
      memoryManagement: 3850,
      processSynchronization: 4400,
    },
  },
  {
    id: "4",
    username: "memory_ninja",
    displayName: "Emma Wilson",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 11200,
    achievements: 20,
    badges: 3,
    levelsCompleted: 35,
    currentStreak: 6,
    lastActive: "3 hours ago",
    rank: 4,
    previousRank: 5,
    modules: {
      cpuScheduling: 3800,
      memoryManagement: 4100,
      processSynchronization: 3300,
    },
  },
  {
    id: "5",
    username: "scheduler_pro",
    displayName: "David Kim",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 10800,
    achievements: 19,
    badges: 2,
    levelsCompleted: 33,
    currentStreak: 4,
    lastActive: "1 day ago",
    rank: 5,
    previousRank: 4,
    modules: {
      cpuScheduling: 4500,
      memoryManagement: 3200,
      processSynchronization: 3100,
    },
  },
  {
    id: "6",
    username: "os_explorer",
    displayName: "Lisa Zhang",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 9650,
    achievements: 17,
    badges: 2,
    levelsCompleted: 30,
    currentStreak: 2,
    lastActive: "2 days ago",
    rank: 6,
    previousRank: 6,
    modules: {
      cpuScheduling: 3400,
      memoryManagement: 3100,
      processSynchronization: 3150,
    },
  },
  {
    id: "7",
    username: "deadlock_hunter",
    displayName: "Ryan Martinez",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 8900,
    achievements: 16,
    badges: 2,
    levelsCompleted: 28,
    currentStreak: 1,
    lastActive: "3 days ago",
    rank: 7,
    previousRank: 8,
    modules: {
      cpuScheduling: 2800,
      memoryManagement: 2900,
      processSynchronization: 3200,
    },
  },
  {
    id: "8",
    username: "process_guru",
    displayName: "Jennifer Lee",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 8200,
    achievements: 15,
    badges: 1,
    levelsCompleted: 26,
    currentStreak: 0,
    lastActive: "1 week ago",
    rank: 8,
    previousRank: 7,
    modules: {
      cpuScheduling: 3100,
      memoryManagement: 2600,
      processSynchronization: 2500,
    },
  },
]

// Current user data (would be fetched from auth context)
const currentUser: Player = {
  id: "current",
  username: "your_username",
  displayName: "You",
  avatar: "/placeholder.svg?height=40&width=40",
  totalPoints: 7850,
  achievements: 14,
  badges: 1,
  levelsCompleted: 24,
  currentStreak: 3,
  lastActive: "now",
  rank: 12,
  previousRank: 15,
  modules: {
    cpuScheduling: 2900,
    memoryManagement: 2450,
    processSynchronization: 2500,
  },
}

// Leaderboard stats
const leaderboardStats = {
  totalPlayers: 1247,
  activeToday: 89,
  newThisWeek: 23,
  averagePoints: 6420,
}

function PodiumCard({ player, position }: { player: Player; position: number }) {
  const getPodiumColor = () => {
    switch (position) {
      case 1:
        return "from-yellow-400 to-yellow-600"
      case 2:
        return "from-gray-300 to-gray-500"
      case 3:
        return "from-orange-400 to-orange-600"
      default:
        return "from-gray-400 to-gray-600"
    }
  }

  const getPodiumIcon = () => {
    switch (position) {
      case 1:
        return <Crown className="w-8 h-8 text-yellow-400" />
      case 2:
        return <Medal className="w-8 h-8 text-gray-300" />
      case 3:
        return <Award className="w-8 h-8 text-orange-400" />
      default:
        return <Trophy className="w-8 h-8 text-gray-400" />
    }
  }

  const getRankChange = () => {
    if (!player.previousRank) return null
    const change = player.previousRank - player.rank
    if (change > 0) {
      return (
        <div className="flex items-center text-green-400 text-sm">
          <ChevronUp className="w-4 h-4" />
          <span>+{change}</span>
        </div>
      )
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-400 text-sm">
          <ChevronDown className="w-4 h-4" />
          <span>{change}</span>
        </div>
      )
    }
    return <div className="text-gray-400 text-sm">-</div>
  }

  return (
    <Card
      className={`podium-card transition-all duration-500 hover:scale-105 bg-gray-900/50 border-gray-700/50 backdrop-blur-sm ${
        position === 1 ? "border-yellow-500/50 shadow-yellow-500/20" : ""
      }`}
    >
      <CardHeader className="text-center pb-4">
        <div className="relative mb-4">
          <div
            className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-r ${getPodiumColor()} flex items-center justify-center mb-2 shadow-lg`}
          >
            {getPodiumIcon()}
          </div>
          <Badge
            className={`absolute -top-2 -right-2 ${
              position === 1
                ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                : position === 2
                  ? "bg-gray-500/20 border-gray-500/50 text-gray-300"
                  : "bg-orange-500/20 border-orange-500/50 text-orange-300"
            }`}
          >
            #{position}
          </Badge>
        </div>
        <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-cyan-500/50">
          <AvatarImage src={player.avatar || "/placeholder.svg"} alt={player.displayName} />
          <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-lg font-bold">
            {player.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-lg text-white mb-1">{player.displayName}</CardTitle>
        <p className="text-sm text-gray-400">@{player.username}</p>
      </CardHeader>
      <CardContent className="text-center space-y-3">
        <div className="text-3xl font-bold text-white">{player.totalPoints.toLocaleString()}</div>
        <p className="text-sm text-gray-400">Total Points</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-cyan-400 font-bold">{player.achievements}</div>
            <div className="text-gray-500">Achievements</div>
          </div>
          <div>
            <div className="text-purple-400 font-bold">{player.badges}</div>
            <div className="text-gray-500">Badges</div>
          </div>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm text-gray-300">{player.currentStreak} day streak</span>
        </div>
        {getRankChange()}
      </CardContent>
    </Card>
  )
}

function LeaderboardRow({ player, index }: { player: Player; index: number }) {
  const getRankChange = () => {
    if (!player.previousRank) return null
    const change = player.previousRank - player.rank
    if (change > 0) {
      return (
        <div className="flex items-center text-green-400 text-xs">
          <ChevronUp className="w-3 h-3" />
          <span>{change}</span>
        </div>
      )
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-400 text-xs">
          <ChevronDown className="w-3 h-3" />
          <span>{Math.abs(change)}</span>
        </div>
      )
    }
    return <div className="text-gray-500 text-xs">-</div>
  }

  const getRankBadge = () => {
    if (player.rank <= 3) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 text-yellow-300">
          #{player.rank}
        </Badge>
      )
    } else if (player.rank <= 10) {
      return (
        <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-300">
          #{player.rank}
        </Badge>
      )
    } else {
      return <Badge className="bg-gray-500/20 border-gray-500/50 text-gray-300">#{player.rank}</Badge>
    }
  }

  return (
    <div className="leaderboard-row flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300 hover:bg-gray-800/50">
      <div className="flex items-center space-x-4 flex-1">
        <div className="flex items-center space-x-2 min-w-[80px]">
          {getRankBadge()}
          {getRankChange()}
        </div>
        <Avatar className="w-12 h-12 border border-gray-600">
          <AvatarImage src={player.avatar || "/placeholder.svg"} alt={player.displayName} />
          <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 font-bold">
            {player.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{player.displayName}</div>
          <div className="text-sm text-gray-400 truncate">@{player.username}</div>
          <div className="text-xs text-gray-500">{player.lastActive}</div>
        </div>
      </div>
      <div className="flex items-center space-x-6 text-sm">
        <div className="text-center min-w-[80px]">
          <div className="font-bold text-white">{player.totalPoints.toLocaleString()}</div>
          <div className="text-gray-400 text-xs">Points</div>
        </div>
        <div className="text-center min-w-[70px]">
          <div className="font-bold text-cyan-400">{player.achievements}</div>
          <div className="text-gray-400 text-xs">Achievements</div>
        </div>
        <div className="text-center min-w-[60px]">
          <div className="font-bold text-purple-400">{player.badges}</div>
          <div className="text-gray-400 text-xs">Badges</div>
        </div>
        <div className="text-center min-w-[60px]">
          <div className="font-bold text-green-400">{player.levelsCompleted}</div>
          <div className="text-gray-400 text-xs">Levels</div>
        </div>
        <div className="relative flex items-center min-w-[60px]" style={{width: 'auto'}}>
          <Flame className="w-4 h-4 text-orange-500 leading-none align-middle p-0 m-0" />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-bold leading-none align-middle p-0 m-0" style={{marginLeft: 0}}>{player.currentStreak}</span>
        </div>
      </div>
    </div>
  )
}

function CurrentUserCard({ user }: { user: Player }) {
  const nextRankPoints = 8500 // Mock next rank threshold
  const progress = (user.totalPoints / nextRankPoints) * 100

  return (
    <Card className="current-user-card bg-gradient-to-r from-cyan-900 to-purple-900 border-cyan-500/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Target className="w-5 h-5 mr-2 text-cyan-400" />
          Your Position
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16 border-2 border-cyan-500">
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.displayName} />
              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-lg font-bold">
                {user.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-bold text-white">{user.displayName}</div>
              <div className="text-gray-400">@{user.username}</div>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className="bg-cyan-500/20 border-cyan-500/50 text-cyan-300">Rank #{user.rank}</Badge>
                {user.previousRank && user.previousRank > user.rank && (
                  <div className="flex items-center text-green-400 text-sm">
                    <ChevronUp className="w-4 h-4" />
                    <span>+{user.previousRank - user.rank}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{user.totalPoints.toLocaleString()}</div>
            <div className="text-gray-400">Total Points</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{user.achievements}</div>
            <div className="text-gray-400 text-sm">Achievements</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{user.badges}</div>
            <div className="text-gray-400 text-sm">Badges</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{user.levelsCompleted}</div>
            <div className="text-gray-400 text-sm">Levels</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Progress to Rank #{user.rank - 1}</span>
            <span className="text-cyan-400">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-gray-500 text-center">
            {(nextRankPoints - user.totalPoints).toLocaleString()} points needed to rank up
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LeaderboardPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [sortBy, setSortBy] = useState<string>("points")
  const [filterModule, setFilterModule] = useState<string>("all")
  const [timeFilter, setTimeFilter] = useState<string>("all-time")
  const [searchTerm, setSearchTerm] = useState("")
  const [isLiveUpdate, setIsLiveUpdate] = useState(true)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.username.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    switch (sortBy) {
      case "achievements":
        return b.achievements - a.achievements
      case "badges":
        return b.badges - a.badges
      case "levels":
        return b.levelsCompleted - a.levelsCompleted
      case "streak":
        return b.currentStreak - a.currentStreak
      default: // points
        return b.totalPoints - a.totalPoints
    }
  })

  const topThree = sortedPlayers.slice(0, 3)
  const remainingPlayers = sortedPlayers.slice(3)
  const [notifications] = useState(3)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="floating-particles"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Header Section */}
        <div
          className={`mb-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Global Leaderboard
            </h1>
            <div className="flex items-center space-x-4 ml-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-4 h-4 md:w-6 md:h-6 rounded-full ${isLiveUpdate ? "bg-green-400 animate-pulse" : "bg-gray-500"}`}
                />
                <span className="text-base md:text-lg text-gray-400">{isLiveUpdate ? "Live" : "Offline"}</span>
              </div>
              <button
                title="Update Leaderboard"
                onClick={() => setIsLiveUpdate(!isLiveUpdate)}
                className="p-3 md:p-4 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              >
                <RefreshCw className={`w-6 h-6 md:w-8 md:h-8 ${isLiveUpdate ? "text-green-400" : "text-gray-400"}`} />
              </button>
            </div>
          </div>
          <p className="text-xl text-gray-300 mb-6">Compete with learners worldwide</p>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {leaderboardStats.totalPlayers.toLocaleString()}
                </div>
                <p className="text-gray-400">Total Players</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{leaderboardStats.activeToday}</div>
                <p className="text-gray-400">Active Today</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{leaderboardStats.newThisWeek}</div>
                <p className="text-gray-400">New This Week</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {leaderboardStats.averagePoints.toLocaleString()}
                </div>
                <p className="text-gray-400">Avg Points</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Top 3 Podium */}
        <div
          className={`mb-12 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent text-center">
            Hall of Fame
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Second Place */}
            <div className="md:order-1 md:mt-8">
              <PodiumCard player={topThree[1]} position={2} />
            </div>
            {/* First Place */}
            <div className="md:order-2">
              <PodiumCard player={topThree[0]} position={1} />
            </div>
            {/* Third Place */}
            <div className="md:order-3 md:mt-16">
              <PodiumCard player={topThree[2]} position={3} />
            </div>
          </div>
        </div>

        {/* Current User Position */}
        <div
          className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <CurrentUserCard user={currentUser} />
        </div>

        {/* Filters and Search */}
        <div
          className={`mb-8 transition-all duration-1000 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-5 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Sort By */}
                <div className="relative">
                  <select
                    title="Sort By"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300 appearance-none"
                  >
                    <option value="points">Total Points</option>
                    <option value="achievements">Achievements</option>
                    <option value="badges">Badges</option>
                    <option value="levels">Levels Completed</option>
                    <option value="streak">Current Streak</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Module Filter */}
                <div className="relative">
                  <select
                    title="Module Filter"
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300 appearance-none"
                  >
                    <option value="all">All Modules</option>
                    <option value="cpu-scheduling">CPU Scheduling</option>
                    <option value="memory-management">Memory Management</option>
                    <option value="process-sync">Process Sync</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Time Filter */}
                <div className="relative">
                  <select
                    title="Time Filter"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300 appearance-none"
                  >
                    <option value="all-time">All Time</option>
                    <option value="this-month">This Month</option>
                    <option value="this-week">This Week</option>
                    <option value="today">Today</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Leaderboard */}
        <div
          className={`transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Rankings
            </h2>
            <Badge className="bg-gray-800/50 border-gray-600 text-gray-300 px-3 py-1">
              {sortedPlayers.length} players
            </Badge>
          </div>

          <div className="space-y-3">
            {remainingPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`transition-all duration-500 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}
                style={{ transitionDelay: `${500 + index * 50}ms` }}
              >
                <LeaderboardRow player={player} index={index + 3} />
              </div>
            ))}
          </div>

          {sortedPlayers.length === 0 && (
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400 mb-2">No players found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Module Leaderboards Preview */}
        <div
          className={`mt-16 transition-all duration-1000 delay-600 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Module Leaders
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* CPU Scheduling */}
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:border-cyan-500/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Cpu className="w-5 h-5 mr-2 text-cyan-400" />
                  CPU Scheduling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topThree.slice(0, 3).map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between gap-2 md:gap-4">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-cyan-500/20 border-cyan-500/50 text-cyan-300 text-xs">#{index + 1}</Badge>
                        <span className="text-sm text-white truncate">{player.displayName}</span>
                      </div>
                      <span className="text-sm text-cyan-400 font-bold">
                        {player.modules.cpuScheduling.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/leaderboard?module=cpu-scheduling"
                  className="flex items-center justify-center mt-4 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                >
                  View Full Leaderboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </CardContent>
            </Card>

            {/* Memory Management */}
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <HardDrive className="w-5 h-5 mr-2 text-purple-400" />
                  Memory Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topThree.slice(0, 3).map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between gap-2 md:gap-4">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-purple-500/20 border-purple-500/50 text-purple-300 text-xs">
                          #{index + 1}
                        </Badge>
                        <span className="text-sm text-white truncate">{player.displayName}</span>
                      </div>
                      <span className="text-sm text-purple-400 font-bold">
                        {player.modules.memoryManagement.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/leaderboard?module=memory-management"
                  className="flex items-center justify-center mt-4 text-purple-400 hover:text-purple-300 transition-colors text-sm"
                >
                  View Full Leaderboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </CardContent>
            </Card>

            {/* Process Synchronization */}
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:border-red-500/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Shield className="w-5 h-5 mr-2 text-red-400" />
                  Process Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topThree.slice(0, 3).map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between gap-2 md:gap-4">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-red-500/20 border-red-500/50 text-red-300 text-xs">#{index + 1}</Badge>
                        <span className="text-sm text-white truncate">{player.displayName}</span>
                      </div>
                      <span className="text-sm text-red-400 font-bold">
                        {player.modules.processSynchronization.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/leaderboard?module=process-sync"
                  className="flex items-center justify-center mt-4 text-red-400 hover:text-red-300 transition-colors text-sm"
                >
                  View Full Leaderboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
