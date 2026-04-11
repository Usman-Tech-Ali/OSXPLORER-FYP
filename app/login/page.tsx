"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { OSGameLabLogo } from "@/components/ui/os-gamelab-logo"
import { Gamepad2, Eye, EyeOff, ArrowLeft, Mail, Lock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { signIn } = await import("next-auth/react")
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        // Update login streak
        try {
          await fetch("/api/user/streak", {
            method: "POST",
          })
        } catch (streakError) {
          console.error("Failed to update streak:", streakError)
        }
        
        window.location.href = "/dashboard"
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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
            <Link href="/" className="flex items-center">
                <Image
                  src="/OSXplorer.png"
                  alt="OSXplorer Logo"
                  width={120}
                  height={60}
                  priority
                  className="object-contain h-auto w-auto hover:scale-110 transition-transform duration-200 cursor-pointer hover:drop-shadow-[0_0_16px_#00fff7]"
                />
              </Link>
            <div className="text-sm text-gray-400">
              Don't have an account?{" "}
              <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Sign up
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md bg-gray-900/50 border-gray-700/50 backdrop-blur-sm signup-card">
          <CardHeader className="text-center space-y-4">
            <div>
              <OSGameLabLogo className="w-16 h-16 rounded-full mx-auto"></OSGameLabLogo>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Welcome Back, Gamer
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                Sign in to continue your Operating Systems learning journey
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={checked => setRememberMe(checked === true)}
                    className="border-gray-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-300 cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <Link href="/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full neon-button-primary group text-lg py-6" 
                size="lg"
                disabled={loading}
              >
                <Gamepad2 className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                {loading ? "Signing in..." : "Enter the Game"}
              </Button>
            </form>

            {/* Signup Link */}
            <div className="text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                Sign up here
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
