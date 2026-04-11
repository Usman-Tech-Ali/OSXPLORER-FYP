"use client"
import { useParams } from "next/navigation"
import { modulesData } from "../modulesData"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Play,
  Lock,
  CheckCircle,
  Clock,
  Star,
  Trophy,
  Target,
  Lightbulb,
  Flame,
  HardDrive,
  Zap,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { miniQuestData } from "../miniQuestData"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

function getSidebar(module: any, realStats: any) {
  if (module.sidebarType === "scheduler") {
    return (
      <>
        {/* Scheduler Stats */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              Scheduler Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Total XP:</span>
              <span className="text-white font-bold">{realStats.totalXP}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Levels Completed:</span>
              <span className="text-white font-bold">{realStats.levelsCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Streak:</span>
              <span className="text-white font-bold flex items-center">
                <Flame className="w-5 h-4 text-orange-500 mr-1" />
                {realStats.currentStreak} days
              </span>
            </div>
          </CardContent>
        </Card>
        {/* Next Achievement */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Target className="w-5 h-5 mr-2 text-green-500" />
              Next Achievement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white font-medium">{realStats.nextAchievement.name}</span>
                <span className="text-sm text-gray-400">{realStats.nextAchievement.progress}%</span>
              </div>
              <Progress value={realStats.nextAchievement.progress} className="h-2" />
              <p className="text-sm text-gray-400">{realStats.nextAchievement.description}</p>
            </div>
          </CardContent>
        </Card>
        {/* Scheduler Tips */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Lightbulb className="w-5 h-5 mr-2 text-cyan-400" />
              Scheduler Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {module.tips.map((tip: string, index: number) => (
                <li key={index} className="text-sm text-gray-400 flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        {/* Current Challenge */}
        <Card className="bg-gradient-to-r from-purple-900 to-pink-900 border-purple-500/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Trophy className="w-5 h-5 mr-2 text-purple-400" />
              Current Challenge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h4 className="text-white font-medium">Weekly Competition</h4>
              <p className="text-sm text-gray-300">Achieve the highest efficiency in Round Robin scheduling</p>
              <div className="text-xs text-gray-400">Ends in 4 days</div>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }
  if (module.sidebarType === "memory") {
    return (
      <>
        {/* Memory Master Stats */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <HardDrive className="w-5 h-5 mr-2 text-purple-500" />
              Memory Master Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Total XP:</span>
              <span className="text-white font-bold">{realStats.totalXP}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Levels Completed:</span>
              <span className="text-white font-bold">{realStats.levelsCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Streak:</span>
              <span className="text-white font-bold flex items-center">
                <Flame className="w-5 h-4 text-orange-500 mr-1" />
                {realStats.currentStreak} days
              </span>
            </div>
          </CardContent>
        </Card>
        {/* Next Achievement */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Target className="w-5 h-5 mr-2 text-green-500" />
              Next Achievement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white font-medium">{realStats.nextAchievement.name}</span>
                <span className="text-sm text-gray-400">{realStats.nextAchievement.progress}%</span>
              </div>
              <Progress value={realStats.nextAchievement.progress} className="h-2" />
              <p className="text-sm text-gray-400">{realStats.nextAchievement.description}</p>
            </div>
          </CardContent>
        </Card>
        {/* Memory Tips */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Lightbulb className="w-5 h-5 mr-2 text-cyan-400" />
              Memory Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {module.tips.map((tip: string, index: number) => (
                <li key={index} className="text-sm text-gray-400 flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        {/* Current Challenge */}
        <Card className="bg-gradient-to-r from-purple-900 to-pink-900 border-purple-500/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Trophy className="w-5 h-5 mr-2 text-purple-400" />
              Current Challenge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h4 className="text-white font-medium">Memory Optimization</h4>
              <p className="text-sm text-gray-300">Achieve minimum fragmentation in allocation algorithms</p>
              <div className="text-xs text-gray-400">Ends in 6 days</div>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }
  if (module.sidebarType === "sync") {
    return (
      <>
        {/* Synchronization Stats */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Zap className="w-5 h-5 mr-2 text-red-500" />
              Synchronization Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Total XP:</span>
              <span className="text-white font-bold">{realStats.totalXP}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Levels Completed:</span>
              <span className="text-white font-bold">{realStats.levelsCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Streak:</span>
              <span className="text-white font-bold flex items-center">
                <Flame className="w-5 h-4 text-orange-500 mr-1" />
                {realStats.currentStreak} days
              </span>
            </div>
          </CardContent>
        </Card>
        {/* Next Achievement */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Target className="w-5 h-5 mr-2 text-green-500" />
              Next Achievement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white font-medium">{realStats.nextAchievement.name}</span>
                <span className="text-sm text-gray-400">{realStats.nextAchievement.progress}%</span>
              </div>
              <Progress value={realStats.nextAchievement.progress} className="h-2" />
              <p className="text-sm text-gray-400">{realStats.nextAchievement.description}</p>
            </div>
          </CardContent>
        </Card>
        {/* Sync Tips */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Lightbulb className="w-5 h-5 mr-2 text-cyan-400" />
              Sync Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {module.tips.map((tip: string, index: number) => (
                <li key={index} className="text-sm text-gray-400 flex items-start">
                  <span className="text-cyan-400 mr-2">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        {/* Active Challenge */}
        <Card className="bg-gradient-to-r from-red-900 to-orange-900 border-red-500/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Trophy className="w-5 h-5 mr-2 text-red-400" />
              Active Challenge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h4 className="text-white font-medium">Race Condition Master</h4>
              <p className="text-sm text-gray-300">Solve critical section problems without deadlocks</p>
              <div className="text-xs text-gray-400">Ends in 3 days</div>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }
  return null
}

function MiniQuestCard({ moduleId, sectionIndex, unlocked, topicId, completed }: { moduleId: string; sectionIndex: number; unlocked: boolean; topicId: string; completed: boolean }) {
  return (
    <div className="md:col-span-2 lg:col-span-3 mb-6">
      <Card className="w-full bg-gradient-to-r from-red-900 to-red-500 border-red-500/50 text-white shadow-lg transition-all duration-300 hover:scale-105">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Mini-Quest
              </CardTitle>
              {completed && (
                <Badge className="bg-green-500 text-white border-green-600">
                  ✓ DONE
                </Badge>
              )}
            </div>
            <CardDescription className="text-gray-200 mt-1 text-xs">
              {completed 
                ? "You've completed this mini-quest! Play again to improve your score."
                : unlocked
                ? "Mini Quiz Unlocked! Test your knowledge with a fun quiz based on the levels you just completed."
                : "Complete all levels in this section to unlock this Mini-Quest, then complete the Mini-Quest to unlock the next topic."}
            </CardDescription>
          </div>
          <div className="mt-4 sm:mt-0">
            {unlocked ? (
              <Button className="neon-button-primary bg-white hover:bg-red-200 font-bold" asChild>
                <Link href={`/modules/${moduleId}/mini-quest/${topicId}`}>
                  <Flame className="w-4 h-4 mr-2 text-white" />
                  {completed ? "Play Again" : "Start Mini-Quest"}
                </Link>
              </Button>
            ) : (
              <Button disabled className="bg-gray-700 text-gray-400 cursor-not-allowed">
                <Lock className="w-4 h-4 mr-2" />
                Locked
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

function LevelCard({ level, sectionId, moduleId }: { level: any; sectionId: string; moduleId: string }) {
  const getStatusIcon = () => {
    switch (level.status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "in-progress":
        return <Clock className="w-4 h-4 text-yellow-400" />
      case "locked":
        return <Lock className="w-4 h-4 text-gray-500" />
      default:
        return <Play className="w-4 h-4 text-cyan-400" />
    }
  }
  const getStatusColor = () => {
    switch (level.status) {
      case "completed":
        return "border-green-500/50 bg-green-900/20"
      case "in-progress":
        return "border-yellow-500/50 bg-yellow-900/20"
      case "locked":
        return "border-gray-600/50 bg-gray-900/50"
      default:
        return "border-cyan-500/50 bg-cyan-900/20"
    }
  }
  const getStatusText = () => {
    switch (level.status) {
      case "completed":
        return "Completed"
      case "in-progress":
        return "In Progress"
      case "locked":
        return "Locked"
      default:
        return "Available"
    }
  }
  const isPlayable = level.status !== "locked"
  const actionLabel = level.status === "completed" ? "Play Again" : "Play"

  // Visualization for memory-management and process-synchronization
  let visualization = null
  if (level.visualType === "blocks") {
    visualization = (
      <div className="flex space-x-1 mb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-6 rounded-sm ${
              level.status === "completed"
                ? "bg-gradient-to-b from-green-400 to-green-600"
                : level.status === "available" || level.status === "in-progress"
                ? "bg-gradient-to-b from-cyan-400 to-cyan-600"
                : "bg-gray-700"
            }`}
          />
        ))}
      </div>
    )
  } else if (level.visualType === "pages") {
    visualization = (
      <div className="flex space-x-1 mb-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-6 rounded-sm ${i < 5 ? "bg-gradient-to-b from-cyan-400 to-cyan-600" : "bg-gray-700"}`}
          />
        ))}
      </div>
    )
  } else if (level.visualType === "segments") {
    visualization = (
      <div className="flex space-x-1 mb-3">
        <div className="w-8 h-6 bg-gradient-to-r from-purple-400 to-purple-600 rounded-sm" />
        <div className="w-12 h-6 bg-gradient-to-r from-pink-400 to-pink-600 rounded-sm" />
        <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-green-600 rounded-sm" />
        <div className="w-4 h-6 bg-gray-700 rounded-sm" />
      </div>
    )
  } else if (level.visualType === "critical") {
    visualization = (
      <div className="flex items-center justify-center mb-3">
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        </div>
      </div>
    )
  } else if (level.visualType === "mutex") {
    visualization = (
      <div className="flex items-center justify-center mb-3">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Lock className="w-4 h-4 text-white" />
        </div>
      </div>
    )
  } else if (level.visualType === "semaphore") {
    visualization = (
      <div className="flex items-center justify-center space-x-1 mb-3">
        <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">S</span>
        </div>
        <div className="flex flex-col space-y-1">
          <div className="w-2 h-1 bg-cyan-400 rounded" />
          <div className="w-2 h-1 bg-cyan-400 rounded" />
          <div className="w-2 h-1 bg-gray-600 rounded" />
        </div>
      </div>
    )
  } else if (level.visualType === "producer") {
    visualization = (
      <div className="flex items-center justify-center space-x-2 mb-3">
        <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded" />
        <div className="flex space-x-1">
          <div className="w-2 h-4 bg-cyan-400 rounded-sm" />
          <div className="w-2 h-4 bg-cyan-400 rounded-sm" />
          <div className="w-2 h-4 bg-gray-600 rounded-sm" />
        </div>
        <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded" />
      </div>
    )
  } else if (level.visualType === "dining") {
    visualization = (
      <div className="flex items-center justify-center mb-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 border-2 border-yellow-400 rounded-full" />
          <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
          <div className="absolute bottom-1 left-2 w-1.5 h-1.5 bg-green-500 rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <Card className={`level-card transition-all duration-300 hover:scale-105 ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs text-white">
            {level.id.toUpperCase()}
          </Badge>
          <div className="flex items-center space-x-1">
            {getStatusIcon()}
            <span className="text-xs text-gray-400">{getStatusText()}</span>
          </div>
        </div>
        {visualization}
        <CardTitle className="text-lg text-white">{level.title}</CardTitle>
        <CardDescription className="text-gray-400 text-sm">{level.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < level.difficulty ? "text-yellow-400 fill-current" : "text-gray-600"}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">+{level.xpReward} XP</span>
        </div>
        <Button
          className={`w-full ${
            isPlayable ? "neon-button-primary" : "bg-gray-700 text-gray-400 cursor-not-allowed hover:bg-gray-700"
          }`}
          disabled={!isPlayable}
          asChild={isPlayable}
        >
          {isPlayable ? (
            <Link href={`/modules/${moduleId}/games/${level.id}`}>
              <Play className="w-4 h-4 mr-2" />
              {actionLabel}
            </Link>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Locked
            </>
          )}
        </Button>
        {level.status === "completed" && (
          <Button
            className="w-full mt-5 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
            variant="outline"
            asChild
          >
            <Link href={`/modules/${moduleId}/level/${level.id}`}>View Results</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function ModulePage() {
  const params = useParams()
  const moduleId = params.moduleId as string
  const module = modulesData[moduleId as keyof typeof modulesData]
  const { data: session } = useSession()
  
  const [userProgress, setUserProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [completedLevels, setCompletedLevels] = useState<string[]>([])
  const [recentScores, setRecentScores] = useState<any[]>([])

  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }
      
      try {
        const response = await fetch('/api/user/progress')
        if (response.ok) {
          const data = await response.json()
          setUserProgress(data)
          setCompletedLevels(data.user.completedLevels || [])
          setRecentScores(data.recentScores || [])
        }
      } catch (error) {
        console.error('Failed to fetch user progress:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProgress()
  }, [session])

  if (!module) {
    return <div className="min-h-screen flex items-center justify-center text-white">Module not found</div>
  }

  // Update level statuses based on user progress
  const getUpdatedModule = () => {
    if (!userProgress) return module
    
    return {
      ...module,
      levelSections: module.levelSections.map((section: any) => ({
        ...section,
        levels: section.levels.map((level: any) => ({
          ...level,
          status: completedLevels.includes(level.id) ? 'completed' : 'available'
        }))
      }))
    }
  }

  const updatedModule = getUpdatedModule() as typeof module

  // Calculate real stats from user progress
  const getRealStats = () => {
    if (!userProgress) return module.statsData
    
    const moduleCompletedLevels = completedLevels.filter((levelId: string) => 
      updatedModule.levelSections.some((section: any) => 
        section.levels.some((level: any) => level.id === levelId)
      )
    )
    
    const totalXPForModule = moduleCompletedLevels.reduce((sum: number, levelId: string) => {
      const level = updatedModule.levelSections
        .flatMap((s: any) => s.levels)
        .find((l: any) => l.id === levelId)
      return sum + (level?.xpReward || 0)
    }, 0)
    
    const totalLevelsInModule = updatedModule.levelSections.reduce(
      (sum: any, section: any) => sum + section.levels.length, 
      0
    )
    
    const progress = totalLevelsInModule > 0 
      ? Math.round((moduleCompletedLevels.length / totalLevelsInModule) * 100)
      : 0

    return {
      ...module.statsData,
      totalXP: totalXPForModule,
      levelsCompleted: moduleCompletedLevels.length,
      currentStreak: userProgress.user.currentStreak || 0,
      nextAchievement: {
        ...module.statsData.nextAchievement,
        progress: progress
      }
    }
  }

  const realStats = getRealStats()

  // Determine unlock state for each section's mini-quest
  const isSectionCompleted = (sectionIdx: number) => {
    const section = updatedModule.levelSections[sectionIdx]
    return section.levels.every((lvl: any) => completedLevels.includes(lvl.id))
  }

  const hasCompletedMiniQuest = (topicId: string) => {
    const questData = (miniQuestData as any)[moduleId]?.[topicId]
    if (!questData) return false

    return recentScores.some((score: any) =>
      score.gameId === `miniquest-${topicId}` && score.score >= questData.passingScore
    )
  }

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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="xl:col-span-3">
            {/* Back Button and Title */}
            <div className="mb-8">
              <h1 className={`text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r ${module.gradient} bg-clip-text text-transparent`}>
                {module.name}
              </h1>
              <p className="text-xl text-gray-300">{module.description}</p>
            </div>
            {/* Level Sections with Mini-Quest Cards */}
            <div className="space-y-12">
              {updatedModule.levelSections.map((section: any, idx: number) => (
                <div key={section.id}>
                  {/* Topic Title and Description */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1">{section.title}</h2>
                    <p className="text-gray-400">{section.subtitle}</p>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.levels.map((level: any) => (
                      <LevelCard key={level.id} level={level} sectionId={section.id} moduleId={moduleId} />
                    ))}
                  </div>
                  {/* Mini-Quest Card after the end of each topic/section if mini-quest exists for this topic in any module */}
                  {(miniQuestData as any)[moduleId] && (miniQuestData as any)[moduleId][section.id] && (
                    <div className="mt-8">
                      <MiniQuestCard 
                        moduleId={moduleId} 
                        sectionIndex={idx} 
                        unlocked={isSectionCompleted(idx)} 
                        topicId={section.id}
                        completed={hasCompletedMiniQuest(section.id)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-8 space-y-6">{getSidebar(module, realStats)}</div>
          </div>
        </div>
      </main>
    </div>
  )
}