"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cpu, HardDrive, Zap, Play, Users, Trophy, Target, ChevronRight, Gamepad2, Monitor, Code } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function RetroFuturisticLMS() {
  const [isVisible, setIsVisible] = useState(false)
  const [typedText, setTypedText] = useState("")
  const fullText = "Master Operating Systems Through Gaming"

  useEffect(() => {
    setIsVisible(true)
    let i = 0
    const typeTimer = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1))
        i++
      } else {
        clearInterval(typeTimer)
      }
    }, 100)

    return () => clearInterval(typeTimer)
  }, [])

  const modules = [
    {
      title: "Scheduling Algorithms",
      icon: <Cpu className="w-8 h-8" />,
      description: "Master CPU scheduling through interactive simulations",
      concepts: ["FCFS", "SJF", "Round Robin", "Priority Scheduling"],
      color: "from-cyan-500 to-blue-600",
      glowColor: "shadow-cyan-500/50",
    },
    {
      title: "Memory Management",
      icon: <HardDrive className="w-8 h-8" />,
      description: "Explore memory allocation and virtual memory systems",
      concepts: ["Paging", "Segmentation", "Virtual Memory", "Cache Management"],
      color: "from-purple-500 to-pink-600",
      glowColor: "shadow-purple-500/50",
    },
    {
      title: "Process Synchronization",
      icon: <Zap className="w-8 h-8" />,
      description: "Learn synchronization through interactive scenarios",
      concepts: ["Semaphores", "Mutexes", "Deadlock Prevention", "Race Conditions"],
      color: "from-green-500 to-emerald-600",
      glowColor: "shadow-green-500/50",
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="floating-particles"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-cyan-500/30 bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <Image
                  src="/OSXplorer.png"
                  alt="OSXplorer Logo"
                  width={120}
                  height={60}
                  priority
                  className="object-contain h-auto w-auto hover:scale-110 transition-transform duration-200 cursor-pointer hover:drop-shadow-[0_0_16px_#00fff7]"
                />
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/login" passHref legacyBehavior>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                >
                  <a>Login</a>
                </Button>
              </Link>
              <Link href="/signup" passHref legacyBehavior>
                <Button
                  asChild
                  size="sm"
                  className="neon-button bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500"
                >
                  <a>Sign Up</a>
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-4xl mx-auto">
          <div
            className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <Badge className="mb-6 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/50 text-cyan-300">
              🎮 Next-Gen Learning Platform
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="block bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {typedText}
                <span className="animate-pulse">|</span>
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Dive into the world of Operating Systems through immersive 2D games. Learn complex concepts while having
              fun in our retro-futuristic gaming environment.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="neon-button-primary group">
                <Play className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                Start Learning
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
              >
                <Monitor className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Game Modules
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Three core modules designed to make Operating Systems concepts engaging and interactive
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {modules.map((module, index) => (
              <Card
                key={index}
                className={`module-card bg-gray-900/50 border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 group cursor-pointer backdrop-blur-sm hover:shadow-2xl ${module.glowColor}`}
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    {module.icon}
                  </div>
                  <CardTitle className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {module.title}
                  </CardTitle>
                  <CardDescription className="text-gray-400">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-cyan-400 mb-2">Key Concepts:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {module.concepts.map((concept, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs border-gray-600 text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
                        >
                          {concept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full mt-6 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-cyan-600 hover:to-purple-600 transition-all duration-300">
                    <Code className="w-4 h-4 mr-2" />
                    Start Module
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 px-4 bg-gradient-to-r from-gray-900/50 to-black/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent">
              Why Choose OS GameLab?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Interactive Gaming</h3>
              <p className="text-gray-400">
                Learn through engaging 2D games that make complex OS concepts fun and memorable
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Achievement System</h3>
              <p className="text-gray-400">Unlock achievements and track your progress as you master each concept</p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Adaptive Learning</h3>
              <p className="text-gray-400">Personalized learning paths that adapt to your pace and understanding</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Meet the Dev Team
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              The masterminds behind OS GameLab - passionate developers and gamers creating the future of education
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Team Member 1 */}
            <Card className="team-card bg-gray-900/50 border-gray-700/50 hover:border-orange-500/50 transition-all duration-300 group cursor-pointer backdrop-blur-sm hover:shadow-2xl hover:shadow-orange-500/20">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Code className="w-10 h-10 relative z-10" />
                </div>
                <CardTitle className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                  Abdullah Daoud
                </CardTitle>
                <Badge className="bg-orange-500/20 border-orange-500/50 text-orange-300 mt-2">Frontend Developer</Badge>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400 mb-4">
                  Master of pixels and animations. Abdullah crafts the stunning retro-futuristic UI that makes learning feel
                  like gaming.
                </p>
                <div className="flex justify-center space-x-2">
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    React
                  </Badge>
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    CSS
                  </Badge>
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    UI/UX
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Team Member 2 */}
            <Card className="team-card bg-gray-900/50 border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group cursor-pointer backdrop-blur-sm hover:shadow-2xl hover:shadow-blue-500/20">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Monitor className="w-10 h-10 relative z-10" />
                </div>
                <CardTitle className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  Usman Ali
                </CardTitle>
                <Badge className="bg-blue-500/20 border-blue-500/50 text-blue-300 mt-2">Backend Developer</Badge>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400 mb-4">
                  The architect behind the scenes. Usman builds robust systems that power our interactive learning
                  experiences.
                </p>
                <div className="flex justify-center space-x-2">
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    Node.js
                  </Badge>
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    APIs
                  </Badge>
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    Database
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Team Member 3 */}
            <Card className="team-card bg-gray-900/50 border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer backdrop-blur-sm hover:shadow-2xl hover:shadow-purple-500/20">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Gamepad2 className="w-10 h-10 relative z-10" />
                </div>
                <CardTitle className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                  Faizan Rasheed
                </CardTitle>
                <Badge className="bg-purple-500/20 border-purple-500/50 text-purple-300 mt-2">Game Designer</Badge>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400 mb-4">
                  The creative genius who transforms complex OS concepts into engaging 2D gaming experiences that
                  students love.
                </p>
                <div className="flex justify-center space-x-2">
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    Game Design
                  </Badge>
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    2D Art
                  </Badge>
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    UX
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="bg-gradient-to-r from-gray-900/80 to-black/80 rounded-2xl p-8 md:p-12 border border-cyan-500/30 backdrop-blur-sm">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Ready to Level Up Your OS Knowledge?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of students who are mastering Operating Systems through our gamified learning platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="neon-button-primary group">
                <Users className="w-5 h-5 mr-2" />
                Join the Game
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 bg-transparent"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
