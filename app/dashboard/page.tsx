"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { OSGameLabLogo } from "@/components/ui/os-gamelab-logo"
import {
  Cpu,
  HardDrive,
  Zap,
  Trophy,
  Target,
  Clock,
  Crown,
  Users,
} from "lucide-react"
import Link from "next/link"

// Mock user data
const userData = {
  name: "Abdullah Daoud",
  username: "alexchen",
  avatar: "/placeholder.svg?height=40&width=40",
  level: 5,
  currentXP: 2450,
  nextLevelXP: 3000,
  totalXP: 12450,
  levelsCompleted: 12,
  totalLevels: 18,
  badgesEarned: 3,
}

const modules = [
  {
    id: 1,
    title: "CPU Scheduling",
    icon: <Cpu className="w-8 h-8" />,
    completion: 75,
    color: "from-cyan-500 to-blue-600",
    glowColor: "shadow-cyan-500/50",
  },
  {
    id: 2,
    title: "Memory Management",
    icon: <HardDrive className="w-8 h-8" />,
    completion: 45,
    color: "from-purple-500 to-pink-600",
    glowColor: "shadow-purple-500/50",
  },
  {
    id: 3,
    title: "Process Synchronization",
    icon: <Zap className="w-8 h-8" />,
    completion: 20,
    color: "from-green-500 to-emerald-600",
    glowColor: "shadow-green-500/50",
  },
]

const recentActivity = [
  { action: "Completed SJF Level 2", xp: 80, time: "2 hours ago" },
  { action: "Unlocked Memory Badge", xp: 150, time: "1 day ago" },
  { action: "Finished Round Robin Challenge", xp: 120, time: "2 days ago" },
]

const leaderboard = [
  { name: "Sarah Kim", avatar: "/placeholder.svg?height=32&width=32", xp: 15420, rank: 1 },
  { name: "Marcus Johnson", avatar: "/placeholder.svg?height=32&width=32", xp: 14890, rank: 2 },
  { name: "Alex Chen", avatar: "/placeholder.svg?height=32&width=32", xp: 12450, rank: 3 },
]

function CircularProgress({
  value,
  size = 80,
  strokeWidth = 8,
}: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${(value / 100) * circumference} ${circumference}`

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          className="text-cyan-400 transition-all duration-500 ease-out"
          style={{
            strokeLinecap: "round",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{value}%</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const xpProgress = (userData.currentXP / userData.nextLevelXP) * 100

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="floating-particles"></div>
      </div>

      {/* Main Content with Sidebar Layout */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 px-2 sm:px-0">
          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-8">
            {/* Welcome Banner */}
            <Card className="bg-gradient-to-r from-gray-900/80 to-black/80 border-cyan-500/30 backdrop-blur-sm welcome-banner">
              <CardContent className="p-8 bg-gradient-to-r from-cyan-999 to-black">
                <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  Welcome back, {userData.name}! <OSGameLabLogo className="inline-block align-middle ml-2" />
                </h1>
                <p className="text-lg text-gray-300">Ready to level up your Operating Systems knowledge?</p>
              </CardContent>
            </Card>

            {/* XP Progress Section */}
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm xp-progress-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Experience Progress</h2>
                    <p className="text-gray-400">Keep learning to reach the next level!</p>
                  </div>
                  <Badge className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-4 py-2 text-lg font-bold">
                    Level {userData.level}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{userData.currentXP.toLocaleString()} XP</span>
                    <span>{userData.nextLevelXP.toLocaleString()} XP</span>
                  </div>
                  <Progress value={xpProgress} className="h-4 bg-gray-800" />
                  <p className="text-sm text-gray-400 text-center">
                    {(userData.nextLevelXP - userData.currentXP).toLocaleString()} XP to next level
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Your Modules Grid */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Your Modules</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {modules.map((module) => {
                  const href =
                    module.title === "CPU Scheduling"
                      ? "/modules/cpu-scheduling"
                      : module.title === "Memory Management"
                      ? "/modules/memory-management"
                      : module.title === "Process Synchronization"
                      ? "/modules/process-synchronization"
                      : "/modules"
                  return (
                    <Link href={href} passHref legacyBehavior key={module.id}>
                      <a className={`block group focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-xl`} tabIndex={0}>
                        <Card
                          className={`module-card bg-gray-900/50 border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 group cursor-pointer backdrop-blur-sm hover:shadow-2xl ${module.glowColor}`}
                        >
                          <CardHeader className="text-center pb-4">
                            <div
                              className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                            >
                              {module.icon}
                            </div>
                            <CardTitle className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                              {module.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-center space-y-6">
                            <CircularProgress value={module.completion} />
                            <Button className="w-full neon-button-primary group">Continue</Button>
                          </CardContent>
                        </Card>
                      </a>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Quick Stats</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card hover:border-yellow-500/50 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">{userData.totalXP.toLocaleString()}</div>
                    <p className="text-gray-400">Total XP Earned</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card hover:border-green-500/50 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {userData.levelsCompleted} / {userData.totalLevels}
                    </div>
                    <p className="text-gray-400">Levels Completed</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm stats-card hover:border-purple-500/50 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                        <Crown className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">{userData.badgesEarned}</div>
                    <p className="text-gray-400">Badges Earned</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Activity */}
            <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm activity-card">
              <CardHeader>
                <CardTitle className="flex items-center text-white text-xl">
                  <Clock className="w-6 h-6 mr-3 text-cyan-400" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-gray-400">Your latest achievements and progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors duration-200 activity-item"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">{activity.action}</p>
                        <p className="text-sm text-gray-400">{activity.time}</p>
                      </div>
                      <Badge className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/50 text-cyan-300 px-3 py-1">
                        +{activity.xp} XP
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-8">
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm leaderboard-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                    Leaderboard Preview
                  </CardTitle>
                  <CardDescription className="text-gray-400">Top performers this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {leaderboard.map((user, index) => (
                      <div key={index} className="flex items-center space-x-3 leaderboard-item">
                        <div className="flex-shrink-0">
                          <Badge
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black"
                                : index === 1
                                  ? "bg-gradient-to-r from-gray-300 to-gray-500 text-black"
                                  : "bg-gradient-to-r from-orange-400 to-orange-600 text-black"
                            }`}
                          >
                            {user.rank}
                          </Badge>
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-sm">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.xp.toLocaleString()} XP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-6 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}
