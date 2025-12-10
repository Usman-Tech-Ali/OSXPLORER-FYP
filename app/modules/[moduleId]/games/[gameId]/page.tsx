"use client"

import { useParams } from "next/navigation"
import dynamic from "next/dynamic"

const FirstFitGame = dynamic(() => import("@/components/games/memory-management/first-fit/FirstFitGame"), { ssr: false })
const FirstFitGameL2 = dynamic(() => import("@/components/games/memory-management/first-fit-l2/FirstFitGame"), { ssr: false })
const FirstFitGameL3 = dynamic(() => import("@/components/games/memory-management/first-fit-l3/FirstFitGame"), { ssr: false })
const BestFitGame = dynamic(() => import("@/components/games/memory-management/best-fit/BestFitGame"), { ssr: false })
const BestFitGameL2 = dynamic(() => import("@/components/games/memory-management/best-fit-l2/BestFitGame"), { ssr: false })
const BestFitGameL3 = dynamic(() => import("@/components/games/memory-management/best-fit-l3/BestFitGame"), { ssr: false })
const WorstFitGame = dynamic(() => import("@/components/games/memory-management/worst-fit/WorstFitGame"), { ssr: false })
const WorstFitGameL2 = dynamic(() => import("@/components/games/memory-management/worst-fit-l2/WorstFitGame"), { ssr: false })
const WorstFitGameL3 = dynamic(() => import("@/components/games/memory-management/worst-fit-l3/WorstFitGame"), { ssr: false })
const FirstFCFSGame = dynamic(() => import("@/components/games/cpu-scheduling/fcfs-l1/FirstFCFSGame"), { ssr: false })
const FirstFCFSGameL2 = dynamic(() => import("@/components/games/cpu-scheduling/fcfs-l2/FirstFCFSGame"), { ssr: false })
const FirstFCFSGameL3 = dynamic(() => import("@/components/games/cpu-scheduling/fcfs-l3/FirstFCFSGame"), { ssr: false })
const FirstSJFGame = dynamic(() => import("@/components/games/cpu-scheduling/sjf-l1/FirstSJFGame"), { ssr: false })
const FirstSJFGameL2 = dynamic(() => import("@/components/games/cpu-scheduling/sjf-l2/FirstSJFGame"), { ssr: false })
const FirstSJFGameL3 = dynamic(() => import("@/components/games/cpu-scheduling/sjf-l3/FirstSJFGame"), { ssr: false })
const FirstSRTFGame = dynamic(() => import("@/components/games/cpu-scheduling/srtf-l1/FirstSRTFGame"), { ssr: false })
const FirstSRTFGameL2 = dynamic(() => import("@/components/games/cpu-scheduling/srtf-l2/FirstSRTFGame"), { ssr: false })
const FirstSRTFGameL3 = dynamic(() => import("@/components/games/cpu-scheduling/srtf-l3/FirstSRTFGame"), { ssr: false })
const FirstCSGame = dynamic(() => import("@/components/games/process-synchronization/critical-section-l1/FirstCSGame"), { ssr: false })
const MutexGame = dynamic(() => import("@/components/games/process-synchronization/mutex-l1/MutexGame"), { ssr: false })
const BinarySemaphoreGame = dynamic(() => import("@/components/games/process-synchronization/binary-semaphore-l1/BinarySemaphoreGame"), { ssr: false })

export default function GamePage() {
  const params = useParams()
  const { moduleId, gameId } = params

  // Check which game to show
  const isFirstFitBasic = moduleId === "memory-management" && gameId === "first-fit-l1"
  const isFirstFitL2 = moduleId === "memory-management" && gameId === "first-fit-l2"
  const isFirstFitL3 = moduleId === "memory-management" && gameId === "first-fit-l3"
  const isBestFitBasic = moduleId === "memory-management" && gameId === "best-fit-l1"
  const isBestFitL2 = moduleId === "memory-management" && gameId === "best-fit-l2"
  const isBestFitL3 = moduleId === "memory-management" && gameId === "best-fit-l3"
  const isWorstFitBasic = moduleId === "memory-management" && gameId === "worst-fit-l1"
  const isWorstFitL2 = moduleId === "memory-management" && gameId === "worst-fit-l2"
  const isWorstFitL3 = moduleId === "memory-management" && gameId === "worst-fit-l3"
  const isFCFSBasic = moduleId === "cpu-scheduling" && gameId === "fcfs-l1"
  const isFCFSL2 = moduleId === "cpu-scheduling" && gameId === "fcfs-l2"
  const isFCFSL3 = moduleId === "cpu-scheduling" && gameId === "fcfs-l3"
  const isSJFBasic = moduleId === "cpu-scheduling" && gameId === "sjf-l1"
  const isSJFL2 = moduleId === "cpu-scheduling" && gameId === "sjf-l2"
  const isSJFL3 = moduleId === "cpu-scheduling" && gameId === "sjf-l3"
  const isSRTFBasic = moduleId === "cpu-scheduling" && gameId === "srtf-l1"
  const isSRTFL2 = moduleId === "cpu-scheduling" && gameId === "srtf-l2"
  const isSRTFL3 = moduleId === "cpu-scheduling" && gameId === "srtf-l3"
  const isCSBasic = moduleId === "process-synchronization" && gameId === "critical-section-l1"
  const isMutexBasic = moduleId === "process-synchronization" && gameId === "mutex-l1"
  const isBinarySemaphoreBasic = moduleId === "process-synchronization" && gameId === "binary-semaphore-l1"

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {isFirstFitBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFitGame />
        </div>
      ) : isFirstFitL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFitGameL2 />
        </div>
      ) : isFirstFitL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFitGameL3 />
        </div>
      ) : isBestFitBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <BestFitGame />
        </div>
      ) : isBestFitL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <BestFitGameL2 />
        </div>
      ) : isBestFitL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <BestFitGameL3 />
        </div>
      ) : isWorstFitBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <WorstFitGame />
        </div>
      ) : isWorstFitL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <WorstFitGameL2 />
        </div>
      ) : isWorstFitL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <WorstFitGameL3 />
        </div>
      ) : isFCFSBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFCFSGame />
        </div>
      ) : isFCFSL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFCFSGameL2 />
        </div>
      ) : isFCFSL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstFCFSGameL3 />
        </div>
      ) : isSJFBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstSJFGame />
        </div>
      ) : isSJFL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstSJFGameL2 />
        </div>
      ) : isSJFL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstSJFGameL3 />
        </div>
      ) : isSRTFBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstSRTFGame />
        </div>
      ) : isSRTFL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstSRTFGameL2 />
        </div>
      ) : isSRTFL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstSRTFGameL3 />
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