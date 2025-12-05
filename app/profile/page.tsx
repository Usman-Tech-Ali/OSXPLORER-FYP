"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Navbar } from "@/components/ui/navbar"
import {
  User,
  Bell,
  Shield,
  Camera,
  Edit3,
  Save,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Star,
  Trophy,
  Zap,
  Globe,
  Smartphone,
  Monitor,
  CheckCircle,
  AlertTriangle,
  Key,
  Fingerprint,
} from "lucide-react"

export default function ProfileSettings() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("profile")
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // User data state - will be populated from session
  const [userData, setUserData] = useState({
    displayName: "",
    username: "",
    email: "",
    bio: "Passionate about operating systems and low-level programming.",
    profilePicture: "/placeholder.svg?height=120&width=120",
    verified: true,
    premium: false,
    joinDate: "",
    stats: {
      totalXP: 0,
      level: 1,
      achievements: 0,
      badges: 0,
      streak: 0,
      modulesCompleted: 0,
    },
  })

  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      email: {
        weeklyProgress: true,
        courseReminders: true,
        achievements: false,
        generalUpdates: true,
      },
      inApp: {
        achievements: true,
        leaderboard: true,
        messages: true,
        realTime: true,
      },
      push: {
        enabled: false,
        achievements: false,
        reminders: false,
      },
    },
    privacy: {
      profileVisibility: "public",
      showActivity: true,
      showProgress: true,
      allowMessages: "friends",
      showOnlineStatus: true,
      leaderboardParticipation: true,
    },
    security: {
      twoFactorEnabled: false,
      loginNotifications: true,
      sessionTimeout: "30",
    },
    preferences: {
      theme: "dark",
      language: "en",
      timezone: "UTC-8",
      autoSave: true,
      soundEffects: true,
      animations: true,
    },
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user) {
      // Fetch user progress data
      fetchUserData()
    }
  }, [status, session, router, mounted])

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/user/progress")
      if (response.ok) {
        const data = await response.json()
        setUserData({
          displayName: data.user.username,
          username: data.user.username,
          email: data.user.email,
          bio: "Passionate about operating systems and low-level programming.",
          profilePicture: "/placeholder.svg?height=120&width=120",
          verified: true,
          premium: false,
          joinDate: new Date(data.user.createdAt).toISOString().split('T')[0],
          stats: {
            totalXP: data.user.totalXP,
            level: data.user.level,
            achievements: data.user.achievements.length,
            badges: data.user.achievements.length,
            streak: 0,
            modulesCompleted: data.stats.completedLevelsCount,
          },
        })
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleSaveProfile = () => {
    setIsEditing(false)
    // Here you would typically save to backend
    console.log("Saving profile:", userData)
  }

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value,
      },
    }))
  }

  const handlePasswordChange = () => {
    setShowPasswordDialog(false)
    // Handle password change logic
    console.log("Password changed")
  }

  const handleAccountDeletion = () => {
    setShowDeleteDialog(false)
    // Handle account deletion logic
    console.log("Account deletion requested")
  }

  const handleToggle2FA = () => {
    if (settings.security.twoFactorEnabled) {
      handleSettingChange("security", "twoFactorEnabled", false)
    } else {
      setShow2FADialog(true)
    }
  }

  const handleEnable2FA = () => {
    handleSettingChange("security", "twoFactorEnabled", true)
    setShow2FADialog(false)
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-4 bg-gray-900/50 border border-gray-700/50">
              <TabsTrigger
                value="profile"
                className="flex items-center space-x-2 data-[state=active]:border-cyan-500/50 data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/10 data-[state=active]:hover:bg-cyan-500/10 hover:bg-cyan-500/20 border-b-2 border-transparent text-gray-400"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center space-x-2 data-[state=active]:border-cyan-500/50 data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/10 data-[state=active]:hover:bg-cyan-500/10 hover:bg-cyan-500/20 border-b-2 border-transparent text-gray-400"
              >
                <span className="flex items-center justify-center w-4 h-4"><Bell className="w-4 h-4" /></span>
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="flex items-center space-x-2 data-[state=active]:border-cyan-500/50 data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/10 data-[state=active]:hover:bg-cyan-500/10 hover:bg-cyan-500/20 border-b-2 border-transparent text-gray-400"
              >
                <Shield className="w-4 h-4" />
                <span>Privacy</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex items-center space-x-2 data-[state=active]:border-cyan-500/50 data-[state=active]:text-cyan-400 data-[state=active]:bg-cyan-500/10 data-[state=active]:hover:bg-cyan-500/10 hover:bg-cyan-500/20 border-b-2 border-transparent text-gray-400"
              >
                <Lock className="w-4 h-4" />
                <span>Security</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Profile Overview */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2 text-cyan-400">
                          <User className="w-5 h-5" />
                          <span>Profile Information</span>
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                          className={
                            isEditing
                              ? "border-green-500/50 text-green-400 bg-green-500/20 hover:bg-green-500/10"
                              : "border-green-500/50 text-green-400 bg-green-500/20 hover:bg-green-500/10"
                          }
                        >
                          {isEditing ? (
                            <>
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Profile Picture */} @
                      <div className="flex items-center space-x-6">
                        <div className="relative">
                          <Avatar className="w-24 h-24 border-2 border-cyan-500/50">
                            <AvatarImage
                              src={userData.profilePicture || "/placeholder.svg"}
                              alt={userData.displayName}
                            />
                            <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-2xl">
                              {userData.displayName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          {isEditing && (
                            <Button
                              size="sm"
                              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full neon-button-primary p-0"
                            >
                              <Camera className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h2 className="text-2xl font-bold text-white">{userData.displayName}</h2>
                            {userData.verified && (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {userData.premium && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                                <Star className="w-3 h-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400">@{userData.username}</p>
                          <p className="text-sm text-gray-400">
                            Member since {new Date(userData.joinDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Editable Fields */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="displayName" className="text-gray-400">Display Name</Label>
                          <Input
                            id="displayName"
                            value={userData.displayName}
                            onChange={(e) => setUserData((prev) => ({ ...prev, displayName: e.target.value }))}
                            disabled={!isEditing}
                            className="bg-gray-800/50 border-gray-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username" className="text-gray-400">Username</Label>
                          <Input
                            id="username"
                            value={userData.username}
                            onChange={(e) => setUserData((prev) => ({ ...prev, username: e.target.value }))}
                            disabled={!isEditing}
                            className="bg-gray-800/50 border-gray-600 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-400">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userData.email}
                          onChange={(e) => setUserData((prev) => ({ ...prev, email: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-800/50 border-gray-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-gray-400">Bio</Label>
                        <Textarea
                          id="bio"
                          value={userData.bio}
                          onChange={(e) => setUserData((prev) => ({ ...prev, bio: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-800/50 border-gray-600 min-h-[100px] text-gray-400"
                          placeholder="Tell us about yourself..."
                        />
                      </div>

                      {isEditing && (
                        <div className="flex space-x-3">
                          <Button onClick={handleSaveProfile} className="neon-button-primary">
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditing(false)} className="border-gray-600">
                            Cancel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Stats Sidebar */}
                <div className="space-y-6">
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-purple-400">Your Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-cyan-400 mb-1">Level {userData.stats.level}</div>
                        <div className="text-sm text-gray-400 mb-2">{userData.stats.totalXP.toLocaleString()} XP</div>
                        <Progress value={75} className="h-2" />
                        <div className="text-xs text-gray-400 mt-1">1,550 XP to next level</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <div className="text-xl font-bold text-yellow-400">{userData.stats.achievements}</div>
                          <div className="text-xs text-gray-400">Achievements</div>
                        </div>
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <div className="text-xl font-bold text-purple-400">{userData.stats.badges}</div>
                          <div className="text-xs text-gray-400">Badges</div>
                        </div>
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <div className="text-xl font-bold text-green-400">{userData.stats.streak}</div>
                          <div className="text-xs text-gray-400">Day Streak</div>
                        </div>
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <div className="text-xl font-bold text-cyan-400">{userData.stats.modulesCompleted}</div>
                          <div className="text-xs text-gray-400">Modules</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-orange-400">Recent Achievements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <Trophy className="w-6 h-6 text-yellow-400" />
                        <div>
                          <div className="font-medium text-yellow-400">CPU Master</div>
                          <div className="text-xs text-gray-400">Completed CPU Scheduling</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <Star className="w-6 h-6 text-purple-400" />
                        <div>
                          <div className="font-medium text-purple-400">Perfect Score</div>
                          <div className="text-xs text-gray-400">100% on Memory Quiz</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <Zap className="w-6 h-6 text-green-400" />
                        <div>
                          <div className="font-medium text-green-400">Speed Demon</div>
                          <div className="text-xs text-gray-400">Fast completion time</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-cyan-400">
                      <Mail className="w-5 h-5" />
                      <span>Email Notifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Weekly Progress Report</div>
                        <div className="text-sm text-gray-400">Get a summary of your learning progress</div>
                      </div>
                      <Switch
                        checked={settings.notifications.email.weeklyProgress}
                        onCheckedChange={(checked) =>
                          handleSettingChange("notifications", "email", {
                            ...settings.notifications.email,
                            weeklyProgress: checked,
                          })
                        }
                        className={settings.notifications.email.weeklyProgress ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Course Reminders</div>
                        <div className="text-sm text-gray-400">Reminders about upcoming deadlines</div>
                      </div>
                      <Switch
                        checked={settings.notifications.email.courseReminders}
                        onCheckedChange={(checked) =>
                          handleSettingChange("notifications", "email", {
                            ...settings.notifications.email,
                            courseReminders: checked,
                          })
                        }
                        className={settings.notifications.email.courseReminders ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Achievement Notifications</div>
                        <div className="text-sm text-gray-400">When you earn new badges or achievements</div>
                      </div>
                      <Switch
                        checked={settings.notifications.email.achievements}
                        onCheckedChange={(checked) =>
                          handleSettingChange("notifications", "email", {
                            ...settings.notifications.email,
                            achievements: checked,
                          })
                        }
                        className={settings.notifications.email.achievements ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">General Updates</div>
                        <div className="text-sm text-gray-400">Platform updates and announcements</div>
                      </div>
                      <Switch
                        checked={settings.notifications.email.generalUpdates}
                        onCheckedChange={(checked) =>
                          handleSettingChange("notifications", "email", {
                            ...settings.notifications.email,
                            generalUpdates: checked,
                          })
                        }
                        className={settings.notifications.email.generalUpdates ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-purple-400">
                      <Bell className="w-5 h-5" />
                      <span>In-App Notifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Achievement Alerts</div>
                        <div className="text-sm text-gray-400">Show notifications for new achievements</div>
                      </div>
                      <Switch
                        checked={settings.notifications.inApp.achievements}
                        onCheckedChange={(checked) =>
                          handleSettingChange("notifications", "inApp", {
                            ...settings.notifications.inApp,
                            achievements: checked,
                          })
                        }
                        className={settings.notifications.inApp.achievements ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Leaderboard Updates</div>
                        <div className="text-sm text-gray-400">When your ranking changes</div>
                      </div>
                      <Switch
                        checked={settings.notifications.inApp.leaderboard}
                        onCheckedChange={(checked) =>
                          handleSettingChange("notifications", "inApp", {
                            ...settings.notifications.inApp,
                            leaderboard: checked,
                          })
                        }
                        className={settings.notifications.inApp.leaderboard ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Messages</div>
                        <div className="text-sm text-gray-400">Direct messages from other users</div>
                      </div>
                      <Switch
                        checked={settings.notifications.inApp.messages}
                        onCheckedChange={(checked) =>
                          handleSettingChange("notifications", "inApp", {
                            ...settings.notifications.inApp,
                            messages: checked,
                          })
                        }
                        className={settings.notifications.inApp.messages ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Real-time Notifications</div>
                        <div className="text-sm text-gray-400">Live updates while using the platform</div>
                      </div>
                      <Switch
                        checked={settings.notifications.inApp.realTime}
                        onCheckedChange={(checked) =>
                          handleSettingChange("notifications", "inApp", {
                            ...settings.notifications.inApp,
                            realTime: checked,
                          })
                        }
                        className={settings.notifications.inApp.realTime ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-green-400">
                      <Smartphone className="w-5 h-5" />
                      <span>Push Notifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div>
                        <div className="font-medium text-white">Enable Push Notifications</div>
                        <div className="text-sm text-gray-400">Allow browser notifications from OSLearn+</div>
                      </div>
                      <Switch
                        checked={settings.notifications.push.enabled}
                        onCheckedChange={(checked) =>
                          handleSettingChange("notifications", "push", {
                            ...settings.notifications.push,
                            enabled: checked,
                          })
                        }
                        className={settings.notifications.push.enabled ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>

                    {settings.notifications.push.enabled && (
                      <div className="grid md:grid-cols-2 gap-4 ml-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">Achievement Notifications</div>
                            <div className="text-sm text-gray-400">New badges and achievements</div>
                          </div>
                          <Switch
                            checked={settings.notifications.push.achievements}
                            onCheckedChange={(checked) =>
                              handleSettingChange("notifications", "push", {
                                ...settings.notifications.push,
                                achievements: checked,
                              })
                            }
                            className={settings.notifications.push.achievements ? "bg-cyan-500" : "bg-black"}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">Study Reminders</div>
                            <div className="text-sm text-gray-400">Daily learning reminders</div>
                          </div>
                          <Switch
                            checked={settings.notifications.push.reminders}
                            onCheckedChange={(checked) =>
                              handleSettingChange("notifications", "push", {
                                ...settings.notifications.push,
                                reminders: checked,
                              })
                            }
                            className={settings.notifications.push.reminders ? "bg-cyan-500" : "bg-black"}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-cyan-400">
                      <Eye className="w-5 h-5" />
                      <span>Profile Visibility</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Who can see your profile?</Label>
                      <Select
                        value={settings.privacy.profileVisibility}
                        onValueChange={(value) => handleSettingChange("privacy", "profileVisibility", value)}
                      >
                        <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center space-x-2">
                              <Globe className="w-4 h-4" />
                              <span>Public - Anyone can see</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="friends">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span>Friends Only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center space-x-2">
                              <EyeOff className="w-4 h-4" />
                              <span>Private - Only you</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Show Activity Status</div>
                        <div className="text-sm text-gray-400">Let others see when you're online</div>
                      </div>
                      <Switch
                        checked={settings.privacy.showActivity}
                        onCheckedChange={(checked) => handleSettingChange("privacy", "showActivity", checked)}
                        className={settings.privacy.showActivity ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Show Learning Progress</div>
                        <div className="text-sm text-gray-400">Display your course progress publicly</div>
                      </div>
                      <Switch
                        checked={settings.privacy.showProgress}
                        onCheckedChange={(checked) => handleSettingChange("privacy", "showProgress", checked)}
                        className={settings.privacy.showProgress ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Show Online Status</div>
                        <div className="text-sm text-gray-400">Display when you're currently online</div>
                      </div>
                      <Switch
                        checked={settings.privacy.showOnlineStatus}
                        onCheckedChange={(checked) => handleSettingChange("privacy", "showOnlineStatus", checked)}
                        className={settings.privacy.showOnlineStatus ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-purple-400">
                      <Shield className="w-5 h-5" />
                      <span>Communication & Interaction</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Who can send you messages?</Label>
                      <Select
                        value={settings.privacy.allowMessages}
                        onValueChange={(value) => handleSettingChange("privacy", "allowMessages", value)}
                      >
                        <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
                          <SelectValue placeholder="Select who can message" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="everyone">Everyone</SelectItem>
                          <SelectItem value="friends">Friends Only</SelectItem>
                          <SelectItem value="none">No One</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Leaderboard Participation</div>
                        <div className="text-sm text-gray-400">Appear in public leaderboards</div>
                      </div>
                      <Switch
                        checked={settings.privacy.leaderboardParticipation}
                        onCheckedChange={(checked) =>
                          handleSettingChange("privacy", "leaderboardParticipation", checked)
                        }
                        className={settings.privacy.leaderboardParticipation ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-orange-400">
                      <Download className="w-5 h-5" />
                      <span>Data & Privacy Controls</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export My Data
                      </Button>
                      <Button
                        variant="outline"
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 bg-transparent"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Data Usage
                      </Button>
                    </div>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h4 className="font-semibold text-blue-400 mb-2">Data Privacy Information</h4>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        We respect your privacy and give you full control over your data. You can export all your data,
                        view how it's being used, and delete your account at any time. All data is encrypted and stored
                        securely.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-cyan-400">
                      <Lock className="w-5 h-5" />
                      <span>Password & Authentication</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={() => setShowPasswordDialog(true)}
                      variant="outline"
                      className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>

                    <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div>
                        <div className="font-medium flex items-center space-x-2">
                          <Fingerprint className="w-4 h-4 text-white" />
                          <span className="text-white">Two-Factor Authentication</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {settings.security.twoFactorEnabled
                            ? "Enabled - Your account is protected"
                            : "Add an extra layer of security"}
                        </div>
                      </div>
                      <Switch checked={settings.security.twoFactorEnabled} onCheckedChange={handleToggle2FA} className={settings.security.twoFactorEnabled ? "bg-cyan-500" : "bg-black"} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Login Notifications</div>
                        <div className="text-sm text-gray-400">Get notified of new login attempts</div>
                      </div>
                      <Switch
                        checked={settings.security.loginNotifications}
                        onCheckedChange={(checked) => handleSettingChange("security", "loginNotifications", checked)}
                        className={settings.security.loginNotifications ? "bg-cyan-500" : "bg-black"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Session Timeout</Label>
                      <Select
                        value={settings.security.sessionTimeout}
                        onValueChange={(value) => handleSettingChange("privacy", "sessionTimeout", value)}
                      >
                        <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
                          <SelectValue placeholder="Select timeout" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-purple-400">
                      <Monitor className="w-5 h-5" />
                      <span>Active Sessions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-green-400">Current Session</div>
                            <div className="text-sm text-gray-400">Chrome on Windows • San Francisco, CA</div>
                            <div className="text-xs text-gray-500">Last active: Now</div>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Active</Badge>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">Mobile Session</div>
                            <div className="text-sm text-gray-400">Safari on iPhone • San Francisco, CA</div>
                            <div className="text-xs text-gray-500">Last active: 2 hours ago</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                          >
                            End
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                    >
                      End All Other Sessions
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Danger Zone</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">Delete Account</h4>
                      <p className="text-sm text-gray-300 mb-4">
                        Once you delete your account, there is no going back. Please be certain. All your progress,
                        achievements, and data will be permanently removed.
                      </p>
                      <Button
                        onClick={() => setShowDeleteDialog(true)}
                        variant="outline"
                        className=" border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-white">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  className="bg-gray-800/50 border-gray-600 pr-10 text-white"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4 text-white" /> : <Eye className="h-4 w-4 text-white" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-white">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  className="bg-gray-800/50 border-gray-600 pr-10 text-white"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4 text-white" /> : <Eye className="h-4 w-4 text-white" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="bg-gray-800/50 border-gray-600 pr-10 text-white"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-white" /> : <Eye className="h-4 w-4 text-white" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button onClick={handlePasswordChange} className="neon-button-primary">
              Change Password
            </Button>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-purple-400">Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>Scan this QR code with your authenticator app to set up 2FA.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center">
                <div className="text-black text-center">
                  <div className="text-xs mb-2">QR Code</div>
                  <div className="text-xs">Scan with authenticator app</div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verificationCode" className="text-white">Enter verification code</Label>
              <Input
                id="verificationCode"
                placeholder="000000"
                className="bg-gray-800/50 border-gray-600 text-center text-lg tracking-widest text-white"
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button onClick={handleEnable2FA} className="neon-button-primary">
              Enable 2FA
            </Button>
            <Button variant="outline" onClick={() => setShow2FADialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2 text-red-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-semibold">Warning</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• All your progress and achievements will be lost</li>
                <li>• Your profile and data will be permanently deleted</li>
                <li>• This action cannot be reversed</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmDelete" className="text-white">Type "DELETE" to confirm</Label>
              <Input id="confirmDelete" placeholder="DELETE" className="bg-gray-800/50 border-gray-600 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAccountDeletion} className="bg-red-600 hover:bg-red-700 text-white">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
