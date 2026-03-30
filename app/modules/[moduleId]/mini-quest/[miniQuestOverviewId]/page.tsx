"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { miniQuestData } from "@/app/modules/miniQuestData"
import { miniQuestQuizData } from "@/app/modules/miniQuestQuizData"
import {
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Flag,
} from "lucide-react"

export default function MiniQuestPage() {
  const params = useParams()
  const router = useRouter()
  const moduleId = params.moduleId as string
  const miniQuestId = params.miniQuestOverviewId as string

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [score, setScore] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [wrongAnswers, setWrongAnswers] = useState<any[]>([])

  // Get quest and quiz data
  const questData = (miniQuestData as any)[moduleId]?.[miniQuestId]
  const quizData = (miniQuestQuizData as any)[moduleId]?.[miniQuestId]

  useEffect(() => {
    if (quizStarted && timeLeft > 0 && !quizCompleted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && quizStarted && !quizCompleted) {
      handleSubmitQuiz()
    }
  }, [timeLeft, quizStarted, quizCompleted])

  if (!questData || !quizData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Mini-Quest Not Found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  const startQuiz = () => {
    setQuizStarted(true)
    setTimeLeft(quizData.timeLimit)
  }

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    if (!quizCompleted) {
      setSelectedAnswers({ ...selectedAnswers, [questionId]: answerIndex })
    }
  }

  const handleSubmitQuiz = async () => {
    let correctCount = 0
    const wrong: any[] = []
    
    quizData.questions.forEach((q: any) => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correctCount++
      } else {
        wrong.push({
          question: q.question,
          yourAnswer: q.options[selectedAnswers[q.id]],
          correctAnswer: q.options[q.correctAnswer],
          explanation: q.explanation,
        })
      }
    })
    
    const finalScore = Math.round((correctCount / quizData.questions.length) * 100)
    setScore(finalScore)
    setWrongAnswers(wrong)
    setQuizCompleted(true)

    // Save completion to database if passed
    if (finalScore >= questData.passingScore) {
      try {
        await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: `miniquest-${miniQuestId}`,
            moduleId: moduleId,
            levelId: miniQuestId,
            score: finalScore,
            timeSpent: quizData.timeLimit - timeLeft,
            accuracy: finalScore,
            wrongAttempts: wrong.length,
            metadata: {
              totalQuestions: quizData.questions.length,
              correctAnswers: correctCount,
            }
          }),
        })
      } catch (error) {
        console.error('Failed to save mini-quest completion:', error)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Overview screen
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        </div>

        <main className="relative z-10 container mx-auto px-4 py-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-6 border-cyan-500/50 text-cyan-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Module
          </Button>

          <Card className="max-w-3xl mx-auto bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-red-500/20 border-red-500/50 text-red-300">
                  Mini-Quest
                </Badge>
                <Badge className="bg-purple-500/20 border-purple-500/50 text-purple-300">
                  {questData.difficulty}
                </Badge>
              </div>
              <CardTitle className="text-3xl text-white">{questData.title}</CardTitle>
              <p className="text-gray-400 mt-2">{questData.description}</p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    <span className="text-gray-400">Time Limit</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{questData.estimatedTime} min</p>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400">Questions</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{questData.totalQuestions}</p>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-gray-400">Passing Score</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{questData.passingScore}%</p>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-400">XP Reward</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{questData.rewards.xp} XP</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">Key Concepts</h3>
                <div className="flex flex-wrap gap-2">
                  {questData.concepts.map((concept: string, idx: number) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-cyan-500/50 text-cyan-300"
                    >
                      {concept}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">Tips</h3>
                <ul className="space-y-2">
                  {questData.tips.map((tip: string, idx: number) => (
                    <li key={idx} className="text-gray-400 flex items-start">
                      <span className="text-cyan-400 mr-2">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={startQuiz}
                className="w-full neon-button-primary text-lg py-6"
                size="lg"
              >
                <Flag className="w-5 h-5 mr-2" />
                Start Mini-Quest
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Results screen
  if (quizCompleted) {
    const passed = score >= questData.passingScore
    const correctAnswers = Object.keys(selectedAnswers).filter(
      (qId) => selectedAnswers[parseInt(qId)] === quizData.questions.find((q: any) => q.id === parseInt(qId))?.correctAnswer
    ).length

    // Review screen
    if (showReview) {
      return (
        <div className="min-h-screen bg-black text-white">
          <div className="fixed inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          </div>

          <main className="relative z-10 container mx-auto px-4 py-8">
            <Button
              variant="outline"
              onClick={() => setShowReview(false)}
              className="mb-6 border-cyan-500/50 text-cyan-400"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Results
            </Button>

            <Card className="max-w-3xl mx-auto bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Review Wrong Answers</CardTitle>
                <p className="text-gray-400">
                  {wrongAnswers.length} question(s) to review
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {wrongAnswers.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <p className="text-xl text-white">Perfect Score!</p>
                    <p className="text-gray-400">You got all questions correct.</p>
                  </div>
                ) : (
                  wrongAnswers.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-800/50 rounded-lg border border-red-500/30">
                      <div className="mb-3">
                        <Badge className="bg-red-500/20 border-red-500/50 text-red-300 mb-2">
                          Question {idx + 1}
                        </Badge>
                        <p className="text-white font-medium">{item.question}</p>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                          <p className="text-sm text-gray-400 mb-1">Your Answer:</p>
                          <p className="text-red-300">{item.yourAnswer || "Not answered"}</p>
                        </div>

                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                          <p className="text-sm text-gray-400 mb-1">Correct Answer:</p>
                          <p className="text-green-300">{item.correctAnswer}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
                        <p className="text-sm text-gray-400 mb-1">Explanation:</p>
                        <p className="text-cyan-100">{item.explanation}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-black text-white">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        </div>

        <main className="relative z-10 container mx-auto px-4 py-8">
          <Card className="max-w-3xl mx-auto bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-3xl text-white mb-2">
                {passed ? "🎉 Quest Complete!" : "Quest Failed"}
              </CardTitle>
              <p className="text-gray-400">
                {passed
                  ? "Congratulations! You've mastered this topic."
                  : "Keep practicing! You'll get it next time."}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-white mb-2">{score}%</div>
                <p className="text-gray-400">
                  {correctAnswers} out of {quizData.questions.length} correct
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{correctAnswers}</p>
                  <p className="text-sm text-gray-400">Correct</p>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                  <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {quizData.questions.length - correctAnswers}
                  </p>
                  <p className="text-sm text-gray-400">Incorrect</p>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                  <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {passed ? questData.rewards.xp : 0} XP
                  </p>
                  <p className="text-sm text-gray-400">Earned</p>
                </div>
              </div>

              {passed && (
                <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                  <h3 className="text-lg font-bold text-green-400 mb-2">Rewards Unlocked</h3>
                  <ul className="space-y-1">
                    {questData.rewards.badges.map((badge: string, idx: number) => (
                      <li key={idx} className="text-gray-300">
                        🏆 {badge}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {wrongAnswers.length > 0 && (
                <Button
                  onClick={() => setShowReview(true)}
                  variant="outline"
                  className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                >
                  Review Wrong Answers ({wrongAnswers.length})
                </Button>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={() => router.push(`/modules/${moduleId}`)}
                  variant="outline"
                  className="flex-1 border-cyan-500/50 text-cyan-400"
                >
                  Back to Module
                </Button>
                <Button
                  onClick={() => {
                    setQuizStarted(false)
                    setQuizCompleted(false)
                    setSelectedAnswers({})
                    setCurrentQuestion(0)
                    setScore(0)
                    setShowReview(false)
                    setWrongAnswers([])
                  }}
                  className="flex-1 neon-button-primary"
                >
                  {passed ? "Play Again" : "Try Again"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Quiz screen
  const question = quizData.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Timer and Progress */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              <span className="text-xl font-bold text-white">{formatTime(timeLeft)}</span>
            </div>
            <Badge className="bg-purple-500/20 border-purple-500/50 text-purple-300">
              Question {currentQuestion + 1} of {quizData.questions.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="max-w-3xl mx-auto bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-cyan-500/20 border-cyan-500/50 text-cyan-300">
                {question.difficulty}
              </Badge>
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                {question.concept}
              </Badge>
            </div>
            <CardTitle className="text-2xl text-white">{question.question}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {question.options.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(question.id, idx)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswers[question.id] === idx
                    ? "border-cyan-500 bg-cyan-500/20"
                    : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswers[question.id] === idx
                        ? "border-cyan-500 bg-cyan-500"
                        : "border-gray-500"
                    }`}
                  >
                    {selectedAnswers[question.id] === idx && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-white">{option}</span>
                </div>
              </button>
            ))}

            <div className="flex gap-4 mt-6">
              <Button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                variant="outline"
                className="border-gray-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentQuestion < quizData.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="flex-1 neon-button-primary"
                  disabled={selectedAnswers[question.id] === undefined}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitQuiz}
                  className="flex-1 neon-button-primary"
                  disabled={Object.keys(selectedAnswers).length !== quizData.questions.length}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Submit Quiz
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
