"use client"

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { levelResultsData } from "@/app/modules/levelResultsData"
import {
  Trophy,
  Star,
  TrendingUp,
  Clock,
  Cpu,
  RotateCcw,
  ArrowLeft,
  Play,
  Share2,
  Download,
} from "lucide-react"

export default function LevelResultsPage() {
  const params = useParams()
  const router = useRouter()
  const moduleId = params.moduleId as string
  const levelId = params.levelId as string

  // Get results data
  const resultsData = (levelResultsData as any)[moduleId]?.[levelId]

  if (!resultsData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Results Not Found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Clock,
      TrendingUp,
      Cpu,
      RotateCcw,
    }
    return icons[iconName] || Clock
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
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push(`/modules/${moduleId}`)}
          className="mb-6 border-cyan-500/50 text-cyan-400"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Module
        </Button>

        {/* Results Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-gradient-to-r from-gray-900/80 to-black/80 border-cyan-500/30 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <Badge className="mb-2 bg-cyan-500/20 border-cyan-500/50 text-cyan-300">
                    {resultsData.module}
                  </Badge>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {resultsData.title}
                  </h1>
                  <p className="text-xl text-gray-300">{resultsData.performance}</p>
                </div>
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center mb-2">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < resultsData.stars
                            ? "text-yellow-400 fill-current"
                            : "text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Score Display */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-400 mb-2">Score</p>
                  <p className="text-4xl font-bold text-white">
                    {resultsData.score}/{resultsData.maxScore}
                  </p>
                </div>
                <div className="text-center p-6 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-400 mb-2">XP Earned</p>
                  <p className="text-4xl font-bold text-cyan-400">+{resultsData.xpEarned}</p>
                </div>
                <div className="text-center p-6 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-400 mb-2">Progress</p>
                  <div className="flex items-center justify-center space-x-2">
                    <Progress value={resultsData.progressToNext} className="h-2 w-24" />
                    <span className="text-xl font-bold text-white">
                      {resultsData.progressToNext}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {resultsData.metrics.map((metric: any, idx: number) => {
                  const IconComponent = getIconComponent(metric.icon)
                  return (
                    <div
                      key={idx}
                      className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-lg"
                    >
                      <div className={`p-3 rounded-lg bg-gray-700/50 ${metric.color}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-400 text-sm">{metric.label}</p>
                        <p className="text-2xl font-bold text-white">{metric.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300 leading-relaxed">{resultsData.analysis.text}</p>
              <Button
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {resultsData.analysis.comparison}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Unlocked Content */}
        {resultsData.unlocked && (
          <div className="max-w-4xl mx-auto mb-8">
            <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
                  New Content Unlocked!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {resultsData.unlocked.level}
                    </h3>
                    <p className="text-gray-300">{resultsData.unlocked.description}</p>
                  </div>
                  <Button className="neon-button-primary">
                    <Play className="w-4 h-4 mr-2" />
                    Play Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            <Button
              onClick={() => router.push(`/modules/${moduleId}/games/${levelId}`)}
              className="neon-button-primary"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Results
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
