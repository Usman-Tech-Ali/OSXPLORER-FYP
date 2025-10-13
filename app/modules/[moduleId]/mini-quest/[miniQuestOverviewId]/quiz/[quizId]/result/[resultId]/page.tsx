"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Star,
  CheckCircle,
  XCircle,
  RotateCcw,
  ArrowRight,
  Award,
  BookOpen,
  BarChart3,
  PieChart,
} from "lucide-react"
import Link from "next/link"
import { miniQuestQuizData } from "../../../../../../../miniQuestQuizData"

// Helper to get quiz data dynamically
const getQuizData = (moduleId: string, miniQuestOverviewId: string, quizId: string) => {
  return (
    (miniQuestQuizData as any)[moduleId]?.[quizId] ||
    (miniQuestQuizData as any)[moduleId]?.[miniQuestOverviewId] ||
    { title: "Quiz", questions: [] }
  )
}

export default function MiniQuestQuizResult() {
  const router = useRouter()
  const params = useParams()
  const moduleId = params.moduleId as string
  const miniQuestOverviewId = params.miniQuestOverviewId as string
  const quizId = params.quizId as string
  const resultId = params.resultId as string

  // Load quiz data
  const quizData = getQuizData(moduleId, miniQuestOverviewId, quizId)

  // Load results from sessionStorage (or could be from API/db in real app)
  const [results, setResults] = useState<any>(null)
  const [showReview, setShowReview] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState(0)

  useEffect(() => {
    // For demo: use resultId as key in sessionStorage
    const storedResults = sessionStorage.getItem(`quizResults-${resultId}`) || sessionStorage.getItem("quizResults")
    if (storedResults) {
      const parsedResults = JSON.parse(storedResults)
      // Calculate score and analytics
      let correctAnswers = 0
      const questionAnalytics = quizData.questions.map((question: any, index: number) => {
        const userAnswer = parsedResults.answers[question.id]
        const isCorrect = userAnswer === question.correctAnswer
        if (isCorrect) correctAnswers++
        return {
          questionId: question.id,
          userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          difficulty: question.difficulty,
          concept: question.concept,
          timeTaken: Math.floor(Math.random() * 60) + 30, // Mock time per question
        }
      })
      const score = Math.round((correctAnswers / quizData.questions.length) * 100)
      const passed = score >= 70
      setResults({
        ...parsedResults,
        score,
        correctAnswers,
        totalQuestions: quizData.questions.length,
        passed,
        questionAnalytics,
        performance: {
          easy: questionAnalytics.filter((q: any) => q.difficulty === "Easy"),
          medium: questionAnalytics.filter((q: any) => q.difficulty === "Medium"),
          hard: questionAnalytics.filter((q: any) => q.difficulty === "Hard"),
        },
      })
    } else {
      // Redirect if no results found
      router.push(`/modules/${moduleId}/mini-quest/${miniQuestOverviewId}/quiz/${quizId}`)
    }
  }, [moduleId, miniQuestOverviewId, quizId, resultId, quizData, router])

  if (!results) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading results...</p>
        </div>
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400"
    if (score >= 80) return "text-cyan-400"
    if (score >= 70) return "text-yellow-400"
    return "text-red-400"
  }

  const getPerformanceByDifficulty = (difficulty: string) => {
    const questions = results.performance[difficulty.toLowerCase()]
    if (!questions || questions.length === 0) return { correct: 0, total: 0, percentage: 0 }
    const correct = questions.filter((q: any) => q.isCorrect).length
    const total = questions.length
    const percentage = Math.round((correct / total) * 100)
    return { correct, total, percentage }
  }

  const handleRetakeQuiz = () => {
    sessionStorage.removeItem(`quizResults-${resultId}`)
    router.push(`/modules/${moduleId}/mini-quest/${miniQuestOverviewId}/quiz/${quizId}`)
  }

  const handleContinue = () => {
    if (results.passed) {
      router.push("/dashboard")
    } else {
      router.push(`/modules/${moduleId}/mini-quest/${miniQuestOverviewId}`)
    }
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
          {!showReview ? (
            <>
              {/* Results Overview */}
              <div className="text-center mb-12">
                <div className="mb-6">
                  {results.passed ? (
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Trophy className="w-12 h-12 text-green-400" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-12 h-12 text-red-400" />
                    </div>
                  )}
                </div>
                <h1 className="text-5xl font-bold mb-4">
                  <span className={`${getScoreColor(results.score)} score-display`}>{results.score}%</span>
                </h1>
                <p className="text-xl text-gray-300 mb-2">
                  {results.correctAnswers} out of {results.totalQuestions} questions correct
                </p>
                <p className="text-gray-400">
                  {results.passed
                    ? "Congratulations! You have successfully completed this quest."
                    : "Keep studying and try again. You need 70% to pass."}
                </p>
              </div>
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Performance Metrics */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Overall Performance */}
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm performance-metric">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-cyan-400">
                        <BarChart3 className="w-5 h-5" />
                        <span>Performance Overview</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-cyan-400 mb-2">{results.score}%</div>
                          <div className="text-sm text-gray-400">Overall Score</div>
                          <Progress value={results.score} className="mt-2 h-2" />
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-400 mb-2">{results.correctAnswers}</div>
                          <div className="text-sm text-gray-400">Correct Answers</div>
                          <Progress
                            value={(results.correctAnswers / results.totalQuestions) * 100}
                            className="mt-2 h-2"
                          />
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-yellow-400 mb-2">{formatTime(results.timeSpent)}</div>
                          <div className="text-sm text-gray-400">Time Spent</div>
                          <Progress value={(results.timeSpent / quizData.timeLimit) * 100} className="mt-2 h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Difficulty Breakdown */}
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm performance-metric">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-purple-400">
                        <PieChart className="w-5 h-5" />
                        <span>Performance by Difficulty</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {["Easy", "Medium", "Hard"].map((difficulty) => {
                          const perf = getPerformanceByDifficulty(difficulty)
                          if (perf.total === 0) return null
                          const color = difficulty === "Easy" ? "green" : difficulty === "Medium" ? "yellow" : "red"
                          return (
                            <div key={difficulty} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    className={`bg-${color}-500/20 text-${color}-400 border-${color}-500/50 border`}
                                  >
                                    {difficulty}
                                  </Badge>
                                  <span className="text-gray-300">
                                    {perf.correct}/{perf.total}
                                  </span>
                                </div>
                                <span className={`font-bold text-${color}-400`}>{perf.percentage}%</span>
                              </div>
                              <Progress value={perf.percentage} className="h-2" />
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  {/* Question Review */}
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-orange-400">
                        <BookOpen className="w-5 h-5" />
                        <span>Question Review</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {results.questionAnalytics.map((qa: any, index: number) => (
                          <div
                            key={qa.questionId}
                            className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  qa.isCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {qa.isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="font-medium text-white">Question {index + 1}</div>
                                <div className="text-sm text-gray-400">{qa.concept}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                className={`$${
                                  qa.difficulty === "Easy"
                                    ? "bg-green-500/20 text-green-400 border-green-500/50"
                                    : qa.difficulty === "Medium"
                                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                                      : "bg-red-500/20 text-red-400 border-red-500/50"
                                } border`}
                              >
                                {qa.difficulty}
                              </Badge>
                              <span className="text-sm text-gray-400">{qa.timeTaken}s</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={() => setShowReview(true)}
                        variant="outline"
                        className="w-full mt-6 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Review Questions & Answers
                      </Button>
                      <Link href={`/modules/${moduleId}/mini-quest/${miniQuestOverviewId}`} className="w-full" passHref>
                        <Button className="w-full mt-5 neon-button-primary">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Back to Topic
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Rewards */}
                  {results.passed && (
                    <Card className="bg-gradient-to-r from-cyan-700 to-purple-500 border-green-500/30 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-green-400">
                          <Award className="w-5 h-5" />
                          <span>Rewards Earned</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-yellow-400 mb-1">+250</div>
                          <div className="text-sm text-white">XP Points</div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <Star className="w-4 h-4 text-purple-400" />
                            <span className="text-white">Badge</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Trophy className="w-4 h-4 text-orange-400" />
                            <span className="text-white">Achievement</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {/* Next Steps */}
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-cyan-400">Next Steps</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {results.passed ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <div className="flex items-center space-x-2 text-green-400 mb-1">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-semibold">Quest Completed!</span>
                            </div>
                            <p className="text-sm text-gray-300">You can now proceed to the next topic or module.</p>
                          </div>
                          <Button onClick={handleContinue} className="w-full neon-button-primary">
                            Continue Learning
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center space-x-2 text-red-400 mb-1">
                              <XCircle className="w-4 h-4" />
                              <span className="font-semibold">Quest Failed</span>
                            </div>
                            <p className="text-sm text-gray-300">Review the material and try again.</p>
                          </div>
                          <Button onClick={handleRetakeQuiz} className="w-full mt-5 neon-button-primary">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Retake Quest
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {/* Study Recommendations */}
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-purple-400">Study Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        {results.questionAnalytics
                          .filter((qa: any) => !qa.isCorrect)
                          .slice(0, 3)
                          .map((qa: any, index: number) => (
                            <div key={index} className="p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                              <div className="font-medium text-purple-400">{qa.concept}</div>
                              <div className="text-gray-400 text-xs">Review this topic</div>
                            </div>
                          ))}
                        {results.questionAnalytics.filter((qa: any) => !qa.isCorrect).length === 0 && (
                          <div className="text-center text-gray-400 py-4">Great job! No areas need improvement.</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          ) : (
            /* Question Review Mode */
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <Button onClick={() => setShowReview(false)} className="w-auto mt-5 neon-button-primary">
                  <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                  Back to Results
                </Button>
                <div className="text-gray-400">
                  Question {selectedQuestion + 1} of {quizData.questions.length}
                </div>
              </div>
              <div className="grid lg:grid-cols-4 gap-6">
                {/* Question Navigation */}
                <div className="lg:col-span-1">
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-cyan-400 text-sm">Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {quizData.questions.map((_: any, index: number) => {
                          const qa = results.questionAnalytics[index]
                          return (
                            <button
                              key={index}
                              onClick={() => setSelectedQuestion(index)}
                              className={`
                                w-full p-2 rounded text-left text-sm transition-colors
                                ${
                                  index === selectedQuestion
                                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                                    : qa.isCorrect
                                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                      : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                }
                              `}
                            >
                              <div className="flex items-center space-x-2">
                                {qa.isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                <span>Question {index + 1}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* Question Review */}
                <div className="lg:col-span-3">
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge
                            className={`$${
                              quizData.questions[selectedQuestion].difficulty === "Easy"
                                ? "bg-green-500/20 text-green-400 border-green-500/50"
                                : quizData.questions[selectedQuestion].difficulty === "Medium"
                                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                                  : "bg-red-500/20 text-red-400 border-red-500/50"
                            } border`}
                          >
                            {quizData.questions[selectedQuestion].difficulty}
                          </Badge>
                          <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                            {quizData.questions[selectedQuestion].concept}
                          </Badge>
                        </div>
                        <div
                          className={`flex items-center space-x-2 ${
                            results.questionAnalytics[selectedQuestion].isCorrect ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {results.questionAnalytics[selectedQuestion].isCorrect ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                          <span className="font-semibold">
                            {results.questionAnalytics[selectedQuestion].isCorrect ? "Correct" : "Incorrect"}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Question */}
                      <div className="p-4 bg-gray-800/30 rounded-lg">
                        <h3 className="text-lg font-semibold text-white leading-relaxed">
                          {quizData.questions[selectedQuestion].question}
                        </h3>
                      </div>
                      {/* Answer Options */}
                      <div className="space-y-3">
                        {quizData.questions[selectedQuestion].options.map((option: string, index: number) => {
                          const isUserAnswer = results.questionAnalytics[selectedQuestion].userAnswer === index
                          const isCorrectAnswer = quizData.questions[selectedQuestion].correctAnswer === index
                          let className = "w-full p-4 text-left rounded-lg border-2 "
                          if (isCorrectAnswer) {
                            className += "border-green-500 bg-green-500/10 text-green-400"
                          } else if (isUserAnswer && !isCorrectAnswer) {
                            className += "border-red-500 bg-red-500/10 text-red-400"
                          } else {
                            className += "border-gray-600 bg-gray-800/30 text-gray-300"
                          }
                          return (
                            <div key={index} className={className}>
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                    isCorrectAnswer
                                      ? "border-green-500 bg-green-500"
                                      : isUserAnswer && !isCorrectAnswer
                                        ? "border-red-500 bg-red-500"
                                        : "border-gray-500"
                                  }`}
                                >
                                  {isCorrectAnswer && <CheckCircle className="w-4 h-4 text-white" />}
                                  {isUserAnswer && !isCorrectAnswer && <XCircle className="w-4 h-4 text-white" />}
                                </div>
                                <span className="font-medium">
                                  {String.fromCharCode(65 + index)}. {option}
                                </span>
                                {isUserAnswer && (
                                  <Badge variant="outline" className="ml-auto text-xs text-white">
                                    Your Answer
                                  </Badge>
                                )}
                                {isCorrectAnswer && (
                                  <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                                    Correct
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {/* Explanation */}
                      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <h4 className="font-semibold text-blue-400 mb-2 flex items-center space-x-2">
                          <BookOpen className="w-4 h-4" />
                          <span>Explanation</span>
                        </h4>
                        <p className="text-gray-300 leading-relaxed">
                          {quizData.questions[selectedQuestion].explanation}
                        </p>
                      </div>
                      {/* Navigation */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedQuestion(Math.max(0, selectedQuestion - 1))}
                          disabled={selectedQuestion === 0}
                          className="border-gray-600"
                        >
                          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setSelectedQuestion(Math.min(quizData.questions.length - 1, selectedQuestion + 1))
                          }
                          disabled={selectedQuestion === quizData.questions.length - 1}
                          className="border-gray-600"
                        >
                          Next
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 