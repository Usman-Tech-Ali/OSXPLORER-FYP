"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Clock,
  Target,
  Trophy,
  Zap,
  BookOpen,
  ArrowRight,
  Star,
  Shield,
  Gamepad2,
} from "lucide-react"
import Link from "next/link"
import { miniQuestData } from "../../../miniQuestData"

export default function MiniQuestOverview() {
  const router = useRouter()
  const params = useParams()
  const moduleId = params.moduleId as string
  const miniQuestOverviewId = params.miniQuestOverviewId as string

  // Load the data dynamically from the data file
  const questData = (miniQuestData as any)[moduleId]?.[miniQuestOverviewId]

  const [isLoading, setIsLoading] = useState(false)
  const [userProgress, setUserProgress] = useState({
    completedPrerequisites: 85,
    currentStreak: 7,
    bestScore: 0,
  })

  const handleStartQuest = () => {
    setIsLoading(true)
    setTimeout(() => {
      router.push(`/modules/${moduleId}/mini-quest/${miniQuestOverviewId}/quiz/${miniQuestOverviewId}`)
    }, 1500)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-500/20 text-green-400 border-green-500/50"
      case "Intermediate":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
      case "Advanced":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50"
      case "Expert":
        return "bg-red-500/20 text-red-400 border-red-500/50"
      default:
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
    }
  }

  if (!questData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-2xl">
        Mini-Quest not found
      </div>
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

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Quest Title Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 mb-4">
              <Gamepad2 className="w-8 h-8 text-cyan-400" />
              <Badge className={`${getDifficultyColor(questData.difficulty)} border`}>
                {questData.difficulty}
              </Badge>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              {questData.title}
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">{questData.description}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Quest Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quest Overview Card */}
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-cyan-400">
                    <Target className="w-5 h-5" />
                    <span>Quest Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <span className="text-gray-300">Questions</span>
                        <span className="font-bold text-cyan-400">{questData.totalQuestions}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <span className="text-gray-300">Time Limit</span>
                        <span className="font-bold text-yellow-400">{questData.estimatedTime} min</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <span className="text-gray-300">Passing Score</span>
                        <span className="font-bold text-green-400">{questData.passingScore}%</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-500/20">
                        <h4 className="font-semibold text-cyan-400 mb-2">Rewards</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-300">{questData.rewards.xp} XP</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-300">{questData.rewards.badges.length} Badges</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Trophy className="w-4 h-4 text-orange-400" />
                            <span className="text-gray-300">{questData.rewards.achievements.length} Achievements</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Concepts Covered */}
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-purple-400">
                    <BookOpen className="w-5 h-5" />
                    <span>Concepts Covered</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {questData.concepts.map((concept: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"></div>
                        <span className="text-gray-300">{concept}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quest Tips */}
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-400">
                    <Zap className="w-5 h-5" />
                    <span>Success Tips</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {questData.tips.map((tip: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg"
                      >
                        <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-green-400 text-xs font-bold">{index + 1}</span>
                        </div>
                        <span className="text-gray-300">{tip}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Prerequisites */}
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-orange-400">Prerequisites</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {questData.prerequisites.map((prereq: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-sm text-gray-300">{prereq}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Completion</span>
                      <span className="text-sm font-semibold text-green-400">
                        {userProgress.completedPrerequisites}%
                      </span>
                    </div>
                    <Progress value={userProgress.completedPrerequisites} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Previous Attempts */}
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Your Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-1">{userProgress.bestScore}%</div>
                    <div className="text-sm text-gray-400">Best Score</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-yellow-400">{userProgress.currentStreak}</div>
                      <div className="text-xs text-gray-400">Day Streak</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-400">0</div>
                      <div className="text-xs text-gray-400">Attempts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Start Quest Button */}
              <Card className="bg-gradient-to-r from-cyan-900 to-purple-900 border-cyan-500/30 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <Clock className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
                    <h3 className="font-bold text-lg text-white mb-1">Ready to Begin?</h3>
                    <p className="text-sm text-gray-400">Complete this quest to unlock the next module</p>
                  </div>
                  <Link href={`/modules/${moduleId}/mini-quest/${miniQuestOverviewId}/quiz/${miniQuestOverviewId}`} passHref>
                    <Button
                      onClick={handleStartQuest}
                      disabled={isLoading || userProgress.completedPrerequisites < 80}
                      className="w-full neon-button-primary text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Initializing Quest...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>Start Quest</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                  </Link>
                  {userProgress.completedPrerequisites < 80 && (
                    <p className="text-xs text-red-400 mt-2">Complete prerequisites to unlock this quest</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 