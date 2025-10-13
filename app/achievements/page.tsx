"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Trophy,
  Star,
  Crown,
  Target,
  Zap,
  Clock,
  Cpu,
  HardDrive,
  Shield,
  Flame,
  Award,
  Search,
  ChevronDown,
  CheckCircle,
  Lock,
  RotateCcw,
  TrendingUp,
} from "lucide-react"
// Achievement types and data structures
type AchievementStatus = "completed" | "in-progress" | "locked"
type AchievementCategory = "performance" | "progress" | "module" | "special" | "badge"

interface Achievement {
  id: string
  title: string
  description: string
  points: number
  status: AchievementStatus
  category: AchievementCategory
  module?: string
  icon: any
  color: string
  progress?: number
  maxProgress?: number
  unlockedAt?: string
  rarity: "common" | "rare" | "epic" | "legendary"
}

interface BadgeData {
  id: string
  title: string
  description: string
  icon: any
  color: string
  requiredAchievements: number
  currentAchievements: number
  isUnlocked: boolean
  rarity: "bronze" | "silver" | "gold" | "platinum"
}

// Mock achievements data
const achievements: Achievement[] = [
  // CPU Scheduling Achievements
  {
    id: "fcfs-master",
    title: "FCFS Master",
    description: "Complete all FCFS levels with 85+ score",
    points: 150,
    status: "completed",
    category: "module",
    module: "CPU Scheduling",
    icon: Cpu,
    color: "text-cyan-400",
    unlockedAt: "2 days ago",
    rarity: "rare",
  },
  {
    id: "scheduler-expert",
    title: "Scheduler Expert",
    description: "Master all CPU scheduling algorithms",
    points: 300,
    status: "in-progress",
    category: "module",
    module: "CPU Scheduling",
    icon: Target,
    color: "text-blue-400",
    progress: 75,
    maxProgress: 100,
    rarity: "epic",
  },
  {
    id: "speed-demon",
    title: "Speed Demon",
    description: "Complete any level in under 30 seconds",
    points: 100,
    status: "completed",
    category: "performance",
    icon: Zap,
    color: "text-yellow-400",
    unlockedAt: "1 week ago",
    rarity: "rare",
  },

  // Memory Management Achievements
  {
    id: "memory-architect",
    title: "Memory Architect",
    description: "Complete all memory allocation algorithms",
    points: 200,
    status: "in-progress",
    category: "module",
    module: "Memory Management",
    icon: HardDrive,
    color: "text-purple-400",
    progress: 40,
    maxProgress: 100,
    rarity: "epic",
  },
  {
    id: "fragmentation-fighter",
    title: "Fragmentation Fighter",
    description: "Achieve 95%+ efficiency in memory allocation",
    points: 125,
    status: "locked",
    category: "performance",
    module: "Memory Management",
    icon: Shield,
    color: "text-green-400",
    rarity: "rare",
  },

  // Process Synchronization Achievements
  {
    id: "deadlock-detective",
    title: "Deadlock Detective",
    description: "Solve all dining philosophers scenarios",
    points: 175,
    status: "locked",
    category: "module",
    module: "Process Synchronization",
    icon: Target,
    color: "text-red-400",
    rarity: "epic",
  },
  {
    id: "sync-master",
    title: "Synchronization Master",
    description: "Complete all synchronization challenges",
    points: 250,
    status: "locked",
    category: "module",
    module: "Process Synchronization",
    icon: Zap,
    color: "text-orange-400",
    rarity: "legendary",
  },

  // Performance Achievements
  {
    id: "perfect-score",
    title: "Perfect Score",
    description: "Score 100/100 on any level",
    points: 200,
    status: "completed",
    category: "performance",
    icon: Star,
    color: "text-yellow-400",
    unlockedAt: "3 days ago",
    rarity: "epic",
  },
  {
    id: "consistency-king",
    title: "Consistency King",
    description: "Score 90+ on 10 consecutive levels",
    points: 300,
    status: "in-progress",
    category: "performance",
    icon: Crown,
    color: "text-purple-400",
    progress: 60,
    maxProgress: 100,
    rarity: "legendary",
  },

  // Progress Achievements
  {
    id: "first-steps",
    title: "First Steps",
    description: "Complete your first level",
    points: 50,
    status: "completed",
    category: "progress",
    icon: Trophy,
    color: "text-green-400",
    unlockedAt: "2 weeks ago",
    rarity: "common",
  },
  {
    id: "level-crusher",
    title: "Level Crusher",
    description: "Complete 25 levels",
    points: 250,
    status: "in-progress",
    category: "progress",
    icon: Target,
    color: "text-cyan-400",
    progress: 80,
    maxProgress: 100,
    rarity: "rare",
  },

  // Special Achievements
  {
    id: "streak-master",
    title: "Streak Master",
    description: "Maintain a 7-day learning streak",
    points: 150,
    status: "completed",
    category: "special",
    icon: Flame,
    color: "text-orange-400",
    unlockedAt: "5 days ago",
    rarity: "rare",
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Complete 5 levels after midnight",
    points: 75,
    status: "in-progress",
    category: "special",
    icon: Clock,
    color: "text-indigo-400",
    progress: 40,
    maxProgress: 100,
    rarity: "common",
  },
]

// Badge data
const badges: BadgeData[] = [
  {
    id: "bronze-collector",
    title: "Bronze Collector",
    description: "Unlock 5 achievements",
    icon: Award,
    color: "text-orange-600",
    requiredAchievements: 5,
    currentAchievements: 6,
    isUnlocked: true,
    rarity: "bronze",
  },
  {
    id: "silver-achiever",
    title: "Silver Achiever",
    description: "Unlock 15 achievements",
    icon: Award,
    color: "text-gray-400",
    requiredAchievements: 15,
    currentAchievements: 6,
    isUnlocked: false,
    rarity: "silver",
  },
  {
    id: "gold-champion",
    title: "Gold Champion",
    description: "Unlock 30 achievements",
    icon: Crown,
    color: "text-yellow-400",
    requiredAchievements: 30,
    currentAchievements: 6,
    isUnlocked: false,
    rarity: "gold",
  },
  {
    id: "platinum-legend",
    title: "Platinum Legend",
    description: "Unlock 50 achievements",
    icon: Crown,
    color: "text-purple-400",
    requiredAchievements: 50,
    currentAchievements: 6,
    isUnlocked: false,
    rarity: "platinum",
  },
]

// User stats
const userStats = {
  totalAchievements: achievements.filter((a) => a.status === "completed").length,
  totalPoints: achievements.filter((a) => a.status === "completed").reduce((sum, a) => sum + a.points, 0),
  completionRate: Math.round((achievements.filter((a) => a.status === "completed").length / achievements.length) * 100),
  rank: "Achievement Hunter",
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const getRarityBorder = () => {
    switch (achievement.rarity) {
      case "common":
        return "border-gray-500/50"
      case "rare":
        return "border-blue-500/50"
      case "epic":
        return "border-purple-500/50"
      case "legendary":
        return "border-yellow-500/50"
      default:
        return "border-gray-500/50"
    }
  }

  const getRarityGlow = () => {
    switch (achievement.rarity) {
      case "common":
        return "hover:shadow-gray-500/20"
      case "rare":
        return "hover:shadow-blue-500/20"
      case "epic":
        return "hover:shadow-purple-500/20"
      case "legendary":
        return "hover:shadow-yellow-500/20"
      default:
        return "hover:shadow-gray-500/20"
    }
  }

  const getStatusIcon = () => {
    switch (achievement.status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "in-progress":
        return <RotateCcw className="w-4 h-4 text-yellow-400" />
      case "locked":
        return <Lock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (achievement.status) {
      case "completed":
        return "bg-green-900/20"
      case "in-progress":
        return "bg-yellow-900/20"
      case "locked":
        return "bg-gray-900/50"
    }
  }

  return (
    <Card
      className={`achievement-card transition-all duration-300 hover:scale-105 ${getRarityBorder()} ${getStatusColor()} ${getRarityGlow()} backdrop-blur-sm`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge
            variant="outline"
            className={`text-xs ${achievement.rarity === "legendary" ? "border-yellow-500/50 text-yellow-300" : achievement.rarity === "epic" ? "border-purple-500/50 text-purple-300" : achievement.rarity === "rare" ? "border-blue-500/50 text-blue-300" : "border-gray-500/50 text-gray-300"}`}
          >
            {achievement.rarity.toUpperCase()}
          </Badge>
          <div className="flex items-center space-x-1">
            {getStatusIcon()}
            <span className="text-xs text-gray-400">{achievement.points} pts</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 mb-3">
          <div className={`p-3 rounded-lg bg-gray-800/50 ${achievement.color}`}>
            <achievement.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-white">{achievement.title}</CardTitle>
            {achievement.module && (
              <Badge className="mt-1 bg-cyan-500/20 border-cyan-500/50 text-cyan-300 text-xs">
                {achievement.module}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-gray-400 text-sm">{achievement.description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {achievement.status === "in-progress" && achievement.progress && achievement.maxProgress && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-cyan-400">{achievement.progress}%</span>
            </div>
            <Progress value={achievement.progress} className="h-2" />
          </div>
        )}
        {achievement.status === "completed" && achievement.unlockedAt && (
          <div className="text-xs text-green-400 flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Unlocked {achievement.unlockedAt}
          </div>
        )}
        {achievement.status === "locked" && (
          <div className="text-xs text-gray-500 flex items-center">
            <Lock className="w-3 h-3 mr-1" />
            Complete prerequisites to unlock
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BadgeCard({ badge }: { badge: BadgeData }) {
  const getBadgeColor = () => {
    switch (badge.rarity) {
      case "bronze":
        return "from-orange-600 to-orange-800"
      case "silver":
        return "from-gray-400 to-gray-600"
      case "gold":
        return "from-yellow-400 to-yellow-600"
      case "platinum":
        return "from-purple-400 to-purple-600"
    }
  }

  const progress = Math.min((badge.currentAchievements / badge.requiredAchievements) * 100, 100)

  return (
    <Card
      className={`badge-card transition-all duration-300 hover:scale-105 ${badge.isUnlocked ? "border-yellow-500/50 bg-yellow-900/10" : "border-gray-600/50 bg-gray-900/50"} backdrop-blur-sm`}
    >
      <CardHeader className="text-center pb-3">
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${getBadgeColor()} flex items-center justify-center ${badge.isUnlocked ? "shadow-lg" : "grayscale opacity-50"}`}
        >
          <badge.icon className="w-8 h-8 text-white" />
        </div>
        <CardTitle className={`text-lg ${badge.isUnlocked ? "text-white" : "text-gray-400"}`}>{badge.title}</CardTitle>
        <p className="text-gray-400 text-sm">{badge.description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className={badge.isUnlocked ? "text-green-400" : "text-cyan-400"}>
              {badge.currentAchievements}/{badge.requiredAchievements}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {badge.isUnlocked ? (
            <div className="text-xs text-green-400 flex items-center justify-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Badge Unlocked!
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center">
              {badge.requiredAchievements - badge.currentAchievements} more achievements needed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AchievementsPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterModule, setFilterModule] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("recent")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const filteredAchievements = achievements.filter((achievement) => {
    const matchesStatus = filterStatus === "all" || achievement.status === filterStatus
    const matchesCategory = filterCategory === "all" || achievement.category === filterCategory
    const matchesModule = filterModule === "all" || achievement.module === filterModule
    const matchesSearch =
      achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      achievement.description.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesCategory && matchesModule && matchesSearch
  })

  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    switch (sortBy) {
      case "points":
        return b.points - a.points
      case "alphabetical":
        return a.title.localeCompare(b.title)
      case "rarity":
        const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 }
        return rarityOrder[b.rarity] - rarityOrder[a.rarity]
      default: // recent
        if (a.status === "completed" && b.status === "completed") {
          return (a.unlockedAt || "").localeCompare(b.unlockedAt || "")
        }
        return a.status === "completed" ? -1 : 1
    }
  })

  const modules = [...new Set(achievements.filter((a) => a.module).map((a) => a.module))]
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Achievement Gallery
          </h1>
          <p className="text-xl text-gray-300 mb-6">Track your progress and unlock rewards</p>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{userStats.totalAchievements}</div>
                <p className="text-gray-400">Achievements Unlocked</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{userStats.totalPoints.toLocaleString()}</div>
                <p className="text-gray-400">Total Points</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{userStats.completionRate}%</div>
                <p className="text-gray-400">Completion Rate</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl md:text-xl font-bold text-white mb-2">{userStats.rank}</div>
                <p className="text-gray-400">Current Rank</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Badges Section */}
        <div
          className={`mb-12 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Collection Badges
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>

        {/* Filters and Search */}
        <div
          className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-6 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search achievements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    title="Filter by Status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300 appearance-none"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="locked">Locked</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <select
                    title="Filter by Category"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300 appearance-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="performance">Performance</option>
                    <option value="progress">Progress</option>
                    <option value="module">Module</option>
                    <option value="special">Special</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Module Filter */}
                <div className="relative">
                  <select
                    title="Filter by Module"
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300 appearance-none"
                  >
                    <option value="all">All Modules</option>
                    {modules.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    title="Sort by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300 appearance-none"
                  >
                    <option value="recent">Recent</option>
                    <option value="points">Points</option>
                    <option value="alphabetical">A-Z</option>
                    <option value="rarity">Rarity</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements Grid */}
        <div
          className={`transition-all duration-1000 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Achievements
            </h2>
            <Badge className="bg-gray-800/50 border-gray-600 text-gray-300 px-3 py-1">
              {sortedAchievements.length} of {achievements.length}
            </Badge>
          </div>

          {sortedAchievements.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400 mb-2">No achievements found</h3>
                <p className="text-gray-500">Try adjusting your filters or search terms</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedAchievements.map((achievement, index) => (
                <div
                  key={achievement.id}
                  className={`transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                  style={{ transitionDelay: `${400 + index * 50}ms` }}
                >
                  <AchievementCard achievement={achievement} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
