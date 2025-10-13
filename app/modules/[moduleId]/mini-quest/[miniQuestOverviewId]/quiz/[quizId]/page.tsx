"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Flag, AlertTriangle, CheckCircle, Target, Timer } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { miniQuestQuizData } from "../../../../../miniQuestQuizData"

// Helper to get quiz data dynamically based on all three params
const getQuizData = (moduleId: string, miniQuestOverviewId: string, quizId: string) => {
  // Try quizId first, then miniQuestOverviewId as fallback, then empty quiz
  return (
    (miniQuestQuizData as any)[moduleId]?.[quizId] ||
    (miniQuestQuizData as any)[moduleId]?.[miniQuestOverviewId] ||
    { title: "Quiz", timeLimit: 900, questions: [] }
  )
}

export default function MiniQuestQuiz() {
  const router = useRouter()
  const params = useParams()
  const moduleId = params.moduleId as string
  const miniQuestOverviewId = params.miniQuestOverviewId as string
  const quizId = params.quizId as string

  // Load quiz data from the new data file using all three params
  const quizData = getQuizData(moduleId, miniQuestOverviewId, quizId)

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({})
  const [timeRemaining, setTimeRemaining] = useState(quizData.timeLimit)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitting) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0) {
      handleSubmitQuiz()
    }
  }, [timeRemaining, isSubmitting])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getTimeColor = () => {
    if (timeRemaining > 300) return "text-green-400" // > 5 minutes
    if (timeRemaining > 120) return "text-yellow-400" // > 2 minutes
    return "text-red-400" // < 2 minutes
  }

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }))
  }

  const handleNextQuestion = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleFlagQuestion = (questionId: number) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  const handleSubmitQuiz = useCallback(() => {
    setIsSubmitting(true)
    // Calculate results
    const results = {
      answers: selectedAnswers,
      timeSpent: quizData.timeLimit - timeRemaining,
      flaggedQuestions: Array.from(flaggedQuestions),
    }
    // Generate a unique resultId for this attempt
    const resultId = Date.now().toString()
    // Store results in sessionStorage for the results page
    sessionStorage.setItem(`quizResults-${resultId}`, JSON.stringify(results))
    // Navigate to new dynamic result page
    setTimeout(() => {
      router.push(`/modules/${moduleId}/mini-quest/${miniQuestOverviewId}/quiz/${quizId}/result/${resultId}`)
    }, 1000)
  }, [selectedAnswers, timeRemaining, flaggedQuestions, moduleId, miniQuestOverviewId, quizId, router, quizData.timeLimit])

  const getAnsweredCount = () => {
    return Object.keys(selectedAnswers).length
  }

  const getProgressPercentage = () => {
    return quizData.questions.length > 0 ? (getAnsweredCount() / quizData.questions.length) * 100 : 0
  }

  const currentQ = quizData.questions[currentQuestion]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="floating-particles"></div>
      </div>

      {/* Lower Header: Progress Bar and Timer Only */}
      <header className="sticky top-0 z-20 border-b border-cyan-500/30 bg-black backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex-1 flex items-center gap-3">
            {/* Logo next to title with navbar styling */}
            <Image
              src="/OSXplorer.png"
              alt="OSXplorer Logo"
              width={40}
              height={40}
              priority
              className="object-contain h-auto w-auto hover:scale-110 transition-transform duration-200 cursor-pointer hover:drop-shadow-[0_0_16px_#00fff7]"
              style={{ minWidth: 40, minHeight: 40 }}
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center">
                {quizData.title}
              </h1>
              <p className="text-gray-400 text-sm">
                Question {currentQuestion + 1} of {quizData.questions.length}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            {/* Progress */}
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-400">
                {getAnsweredCount()}/{quizData.questions.length} answered
              </span>
            </div>
            {/* Timer */}
            <div className={`flex items-center space-x-2 ${getTimeColor()}`}>
              <Timer className="w-4 h-4" />
              <span className="font-mono text-lg font-bold">{formatTime(timeRemaining)}</span>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <Progress value={getProgressPercentage()} className="h-2" />
          <div className="mb-4" /> {/* Add margin below progress bar */}
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Question Navigation Sidebar */}
            <div className="lg:col-span-1">
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm sticky top-8">
                <CardHeader>
                  <CardTitle className="text-cyan-400 text-sm">Question Navigator</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {quizData.questions.map((_: any, index: number) => {
                      const isAnswered = selectedAnswers[index + 1] !== undefined
                      const isFlagged = flaggedQuestions.has(index + 1)
                      const isCurrent = index === currentQuestion

                      return (
                        <button
                          key={index}
                          onClick={() => setCurrentQuestion(index)}
                          className={`
                            w-10 h-10 flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 relative
                            ${
                              isCurrent
                                ? "bg-cyan-500 text-white ring-2 ring-cyan-400"
                                : isAnswered
                                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-600/50"
                            }
                          `}
                        >
                          {index + 1}
                          {isFlagged && <Flag className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-6 space-y-3 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                      <span className="text-gray-400">Current</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500/20 border border-green-500/50 rounded"></div>
                      <span className="text-gray-400">Answered</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-700/50 rounded"></div>
                      <span className="text-gray-400">Not answered</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Question Area */}
            <div className="lg:col-span-3">
              <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                        {currentQ?.difficulty || ""}
                      </Badge>
                      <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                        {currentQ?.concept || ""}
                      </Badge>
                    </div>
                    {currentQ && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFlagQuestion(currentQ.id)}
                        className={`$${
                          flaggedQuestions.has(currentQ.id)
                            ? "text-yellow-400 bg-yellow-500/10"
                            : "text-gray-400 hover:text-yellow-400"
                        }`}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        {flaggedQuestions.has(currentQ.id) ? "Flagged" : "Flag"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Question */}
                  <div className="p-6 bg-gray-800/30 rounded-lg">
                    <h2 className="text-xl font-semibold text-white leading-relaxed">{currentQ?.question || "No question available."}</h2>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-3">
                    {currentQ?.options?.map((option: string, index: number) => {
                      const isSelected = selectedAnswers[currentQ.id] === index

                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(currentQ.id, index)}
                          className={`
                            w-full p-4 text-left rounded-lg border-2 transition-all duration-200
                            ${
                              isSelected
                                ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                                : "border-gray-600 bg-gray-800/30 text-gray-300 hover:border-gray-500 hover:bg-gray-800/50"
                            }
                          `}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`
                              w-6 h-6 rounded-full border-2 flex items-center justify-center
                              ${isSelected ? "border-cyan-500 bg-cyan-500" : "border-gray-500"}
                            `}
                            >
                              {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                            <span className="font-medium">
                              {String.fromCharCode(65 + index)}. {option}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-700/50">
                    <Button
                      variant="outline"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestion === 0}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-4">
                      {currentQuestion === quizData.questions.length - 1 ? (
                        <Button
                          onClick={() => setShowConfirmSubmit(true)}
                          className="neon-button-primary px-8"
                          disabled={getAnsweredCount() === 0}
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Submit Quiz
                        </Button>
                      ) : (
                        <Button onClick={handleNextQuestion} className="neon-button-primary">
                          Next
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-700 max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-400">
                <AlertTriangle className="w-5 h-5" />
                <span>Submit Quiz?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to submit your quiz? You have answered {" "}
                <span className="font-bold text-cyan-400">{getAnsweredCount()}</span> out of {" "}
                <span className="font-bold">{quizData.questions.length}</span> questions.
              </p>

              {getAnsweredCount() < quizData.questions.length && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    You have {quizData.questions.length - getAnsweredCount()} unanswered questions.
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1 border-gray-600"
                >
                  Continue Quiz
                </Button>
                <Button onClick={handleSubmitQuiz} className="flex-1 neon-button-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    "Submit Quiz"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 