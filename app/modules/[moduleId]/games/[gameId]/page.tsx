"use client"

import { useParams } from "next/navigation"
import dynamic from "next/dynamic"

const FirstFitGame = dynamic(() => import("@/components/games/memory-management/first-fit/FirstFitGame"), { ssr: false })
const BestFitGame = dynamic(() => import("@/components/games/memory-management/best-fit/BestFitGame"), { ssr: false })
const WorstFitGame = dynamic(() => import("@/components/games/memory-management/worst-fit/WorstFitGame"), { ssr: false })
const FirstFCFSGame = dynamic(() => import("@/components/games/cpu-scheduling/fcfs-l1/FirstFCFSGame"), { ssr: false })
const FirstSJFGame = dynamic(() => import("@/components/games/cpu-scheduling/sjf-l1/FirstSJFGame"), { ssr: false })
const FirstSRTFGame = dynamic(() => import("@/components/games/cpu-scheduling/srtf-l1/FirstSRTFGame"), { ssr: false })
const FirstCSGame = dynamic(() => import("@/components/games/process-synchronization/critical-section-l1/FirstCSGame"), { ssr: false })
const MutexGame = dynamic(() => import("@/components/games/process-synchronization/mutex-l1/MutexGame"), { ssr: false })
const BinarySemaphoreGame = dynamic(() => import("@/components/games/process-synchronization/binary-semaphore-l1/BinarySemaphoreGame"), { ssr: false })

export default function GamePage() {
  const params = useParams()
  const { moduleId, gameId } = params

  // Check which game to show
  const isFirstFitBasic = moduleId === "memory-management" && gameId === "first-fit-l1"
  const isBestFitBasic = moduleId === "memory-management" && gameId === "best-fit-l1"
  const isWorstFitBasic = moduleId === "memory-management" && gameId === "worst-fit-l1"
  const isFCFSBasic = moduleId === "cpu-scheduling" && gameId === "fcfs-l1"
  const isSJFBasic = moduleId === "cpu-scheduling" && gameId === "sjf-l1"
  const isSRTFBasic = moduleId === "cpu-scheduling" && gameId === "srtf-l1"
  const isCSBasic = moduleId === "process-synchronization" && gameId === "critical-section-l1"
  const isMutexBasic = moduleId === "process-synchronization" && gameId === "mutex-l1"
  const isBinarySemaphoreBasic = moduleId === "process-synchronization" && gameId === "binary-semaphore-l1"

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {isFirstFitBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFitGame />
        </div>
      ) : isBestFitBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <BestFitGame />
        </div>
      ) : isWorstFitBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <WorstFitGame />
        </div>
      ) : isFCFSBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFCFSGame />
        </div>
      ) : isSJFBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstSJFGame />
        </div>
      ) : isSRTFBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstSRTFGame />
        </div>
      ) : isCSBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstCSGame />
        </div>
      ) : isMutexBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <MutexGame />
        </div>
      ) : isBinarySemaphoreBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <BinarySemaphoreGame />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-xl mb-8">This is a placeholder for the game content.</p>
        </div>
      )}
    </div>
  )
}