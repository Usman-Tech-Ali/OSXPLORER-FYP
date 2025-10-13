"use client"

import { OSGameLabLogo } from "@/components/ui/os-gamelab-logo"

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
      <div className="absolute inset-0 floating-particles"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <OSGameLabLogo size="sm" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Profile & Settings
              </h1>
              <p className="text-gray-400 text-sm">Loading...</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Tab Navigation Skeleton */}
          <div className="grid grid-cols-4 gap-2 bg-gray-900/50 border border-gray-700/50 rounded-lg p-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-800/50 rounded animate-pulse"></div>
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-6">
                <div className="flex items-center space-x-6 mb-6">
                  <div className="w-24 h-24 bg-gray-800/50 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-gray-800/50 rounded animate-pulse w-48"></div>
                    <div className="h-4 bg-gray-800/50 rounded animate-pulse w-32"></div>
                    <div className="h-4 bg-gray-800/50 rounded animate-pulse w-40"></div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-800/50 rounded animate-pulse w-24"></div>
                    <div className="h-10 bg-gray-800/50 rounded animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-800/50 rounded animate-pulse w-20"></div>
                    <div className="h-10 bg-gray-800/50 rounded animate-pulse"></div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="h-4 bg-gray-800/50 rounded animate-pulse w-16"></div>
                  <div className="h-10 bg-gray-800/50 rounded animate-pulse"></div>
                </div>

                <div className="space-y-2">
                  <div className="h-4 bg-gray-800/50 rounded animate-pulse w-8"></div>
                  <div className="h-24 bg-gray-800/50 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-6">
                <div className="h-6 bg-gray-800/50 rounded animate-pulse w-24 mb-4"></div>
                <div className="text-center mb-4">
                  <div className="h-8 bg-gray-800/50 rounded animate-pulse w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-800/50 rounded animate-pulse w-20 mx-auto mb-2"></div>
                  <div className="h-2 bg-gray-800/50 rounded animate-pulse mb-1"></div>
                  <div className="h-3 bg-gray-800/50 rounded animate-pulse w-24 mx-auto"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-3 bg-gray-800/30 rounded-lg">
                      <div className="h-6 bg-gray-700/50 rounded animate-pulse w-8 mx-auto mb-1"></div>
                      <div className="h-3 bg-gray-700/50 rounded animate-pulse w-12 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-6">
                <div className="h-6 bg-gray-800/50 rounded animate-pulse w-32 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-2 bg-gray-800/30 rounded-lg">
                      <div className="w-6 h-6 bg-gray-700/50 rounded animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-700/50 rounded animate-pulse w-20 mb-1"></div>
                        <div className="h-3 bg-gray-700/50 rounded animate-pulse w-24"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
