"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Bell,
  ChevronDown,
  Trophy,
  User,
  Users,
  LogOut,
  Home,
  Crown
} from "lucide-react"
import React, { useState } from "react"

// Mock user data (replace with real user context in production)
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

export function Navbar() {
  const [notifications] = useState(3)
  const mockNotifications = [
    {
      id: 1,
      icon: <Trophy className="w-4 h-4 text-yellow-400 mr-2" />,
      text: "Achievement unlocked: CPU Master!",
      time: "2h ago",
    },
    {
      id: 2,
      icon: <Users className="w-4 h-4 text-green-400 mr-2" />,
      text: "You moved up to #2 on the leaderboard!",
      time: "5h ago",
    },
    {
      id: 3,
      icon: <Bell className="w-4 h-4 text-cyan-400 mr-2" />,
      text: "Reminder: Complete your daily quest.",
      time: "Today",
    },
  ]
  return (
    <header className="sticky top-0 z-20 border-b border-cyan-500/30 bg-black/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
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
          {/* Right Side - Notifications & User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative hover:bg-gray-800/50">
                  <Bell className="w-5 h-5 text-white" />
                  {notifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 p-0 text-xs flex items-center justify-center">
                      {notifications}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-gray-900 border-cyan-500/30 shadow-xl mt-2">
                <DropdownMenuLabel className="text-cyan-400">Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-cyan-700/30" />
                {mockNotifications.length === 0 ? (
                  <DropdownMenuItem className="text-gray-400">No new notifications</DropdownMenuItem>
                ) : (
                  mockNotifications.map((notif) => (
                    <DropdownMenuItem key={notif.id} className="flex items-start space-x-2 py-3 px-2 hover:bg-cyan-500/10">
                      {notif.icon}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm truncate">{notif.text}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{notif.time}</div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 hover:bg-gray-800/50 px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userData.avatar || "/placeholder.svg"} alt={userData.name} />
                    <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-sm">
                      {userData.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-white">{userData.name}</span>
                  <ChevronDown className="w-4 h-4 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-700">
                <DropdownMenuLabel className="text-gray-300">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem asChild>
                  <Link href="/profile" passHref legacyBehavior>
                    <a className="flex items-center px-2 py-2 rounded-md transition-colors hover:bg-gray-800 hover:text-white">
                      <User className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-white">Profile</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                <Link href="/dashboard" passHref legacyBehavior>
                    <a className="flex items-center px-2 py-2 rounded-md transition-colors hover:bg-gray-800 hover:text-white">
                      <Home className="mr-2 h-4 w-4 text-cyan-400" />
                      <span className="text-white">Dashboard</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild></DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/achievements" passHref legacyBehavior>
                    <a className="flex items-center px-2 py-2 rounded-md transition-colors hover:bg-gray-800 hover:text-white">
                      <Trophy className="mr-2 h-4 w-4 text-yellow-400" />
                      <span className="text-white">Achievements</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/leaderboard" passHref legacyBehavior>
                    <a className="flex items-center px-2 py-2 rounded-md transition-colors hover:bg-gray-800 hover:text-white">
                      <Crown className="mr-2 h-4 w-4 text-green-400" />
                      <span className="text-white">Leaderboard</span>
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="hover:bg-gray-800 text-red-400 hover:text-red-300 px-2 py-2 rounded-md transition-colors">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    </header>
  )
} 