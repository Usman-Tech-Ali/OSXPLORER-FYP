"use client"

import { useParams } from "next/navigation"
import dynamic from "next/dynamic"

const FirstFitGame = dynamic(() => import("@/components/games/memory-management/first-fit/FirstFitGame"), { ssr: false })
const FirstFCFSGame = dynamic(() => import("@/components/games/cpu-scheduling/fcfs-l1/FirstFCFSGame"), { ssr: false })
const FirstCSGame = dynamic(() => import("@/components/games/process-synchronization/critical-section-l1/FirstCSGame"), { ssr: false })

export default function GamePage() {
  const params = useParams()
  const { moduleId, gameId } = params

  // Only show the game for first-fit-l1 (Basic Allocation)
  const isFirstFitBasic = moduleId === "memory-management" && gameId === "first-fit-l1"
  const isFCFSBasic = moduleId === "cpu-scheduling" && gameId === "fcfs-l1"
  const isCSBasic = moduleId === "process-synchronization" && gameId === "critical-section-l1"

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {isFirstFitBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFitGame />
        </div>
      ) : isFCFSBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFCFSGame />
        </div>
      ) : isCSBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstCSGame />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-xl mb-8">This is a placeholder for the game content.</p>
        </div>
      )}
    </div>
  )
}