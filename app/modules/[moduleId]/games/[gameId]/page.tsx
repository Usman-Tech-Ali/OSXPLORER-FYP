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
const HeistGameL1 = dynamic(() => import("@/components/games/memory-management/paging-l1/HeistGame"), { ssr: false })
const HeistGameL2 = dynamic(() => import("@/components/games/memory-management/paging-l2/HeistGame"), { ssr: false })
const HeistGameL3 = dynamic(() => import("@/components/games/memory-management/paging-l3/HeistGame"), { ssr: false })
const SegmentationGameL1 = dynamic(() => import("@/components/games/memory-management/segmentation-l1/SegmentationGame"), {
  ssr: false,
})
const FragmentationGameL1 = dynamic(
  () =>
    import("@/components/games/memory-management/compaction-l1/FragmentationGame").then((m) => m.FragmentationGameL1),
  { ssr: false }
)
const FragmentationGameL2 = dynamic(
  () =>
    import("@/components/games/memory-management/compaction-l2/FragmentationGame").then((m) => m.FragmentationGameL2),
  { ssr: false }
)
const FragmentationGameL3 = dynamic(
  () =>
    import("@/components/games/memory-management/compaction-l3/FragmentationGame").then((m) => m.FragmentationGameL3),
  { ssr: false }
)
const FirstFCFSGame = dynamic(() => import("@/components/games/cpu-scheduling/fcfs-l1/FirstFCFSGame"), { ssr: false })
const FirstFCFSGameL2 = dynamic(() => import("@/components/games/cpu-scheduling/fcfs-l2/FirstFCFSGame"), { ssr: false })
const FirstFCFSGameL3 = dynamic(() => import("@/components/games/cpu-scheduling/fcfs-l3/FirstFCFSGame"), { ssr: false })
const FirstSJFGame = dynamic(() => import("@/components/games/cpu-scheduling/sjf-l1/FirstSJFGame"), { ssr: false })
const FirstSJFGameL2 = dynamic(() => import("@/components/games/cpu-scheduling/sjf-l2/FirstSJFGame"), { ssr: false })
const FirstSJFGameL3 = dynamic(() => import("@/components/games/cpu-scheduling/sjf-l3/FirstSJFGame"), { ssr: false })
const FirstSRTFGame = dynamic(() => import("@/components/games/cpu-scheduling/srtf-l1/FirstSRTFGame"), { ssr: false })
const FirstSRTFGameL2 = dynamic(() => import("@/components/games/cpu-scheduling/srtf-l2/FirstSRTFGame"), { ssr: false })
const FirstSRTFGameL3 = dynamic(() => import("@/components/games/cpu-scheduling/srtf-l3/FirstSRTFGame"), { ssr: false })
const FirstPriorityGame = dynamic(() => import("@/components/games/cpu-scheduling/priority-l1/FirstPriorityGame"), { ssr: false })
const FirstPriorityGameL2 = dynamic(() => import("@/components/games/cpu-scheduling/priority-l2/FirstPriorityGame"), { ssr: false })
const FirstPriorityGameL3 = dynamic(() => import("@/components/games/cpu-scheduling/priority-l3/FirstPriorityGame"), { ssr: false })
const FirstRRGame = dynamic(() => import("@/components/games/cpu-scheduling/rr-l1/FirstRRGame"), { ssr: false })
const FirstRRGameL2 = dynamic(() => import("@/components/games/cpu-scheduling/rr-l2/FirstRRGame"), { ssr: false })
const FirstRRGameL3 = dynamic(() => import("@/components/games/cpu-scheduling/rr-l3/FirstRRGame"), { ssr: false })
const FirstCSGame = dynamic(() => import("@/components/games/process-synchronization/critical-section-l1/FirstCSGame"), { ssr: false })
const CSGameL2 = dynamic(() => import("@/components/games/process-synchronization/critical-section-l2/FirstCSGame"), { ssr: false })
const CSGameL3 = dynamic(() => import("@/components/games/process-synchronization/critical-section-l3/FirstCSGame"), { ssr: false })
const MutexGame = dynamic(() => import("@/components/games/process-synchronization/mutex-l1/MutexGame"), { ssr: false })
const MutexGameL2 = dynamic(() => import("@/components/games/process-synchronization/mutex-l2/MutexGame"), { ssr: false })
const MutexGameL3 = dynamic(() => import("@/components/games/process-synchronization/mutex-l3/MutexGame"), { ssr: false })
const BinarySemaphoreGame = dynamic(() => import("@/components/games/process-synchronization/binary-semaphore-l1/BinarySemaphoreGame"), { ssr: false })
const BinarySemaphoreGameL2 = dynamic(() => import("@/components/games/process-synchronization/binary-semaphore-l2/BinarySemaphoreGame"), { ssr: false })
const BinarySemaphoreGameL3 = dynamic(() => import("@/components/games/process-synchronization/binary-semaphore-l3/BinarySemaphoreGame"), { ssr: false })
const CountingSemaphoreGameL1 = dynamic(() => import("@/components/games/process-synchronization/counting-semaphore-l1/CountingSemaphoreGame"), { ssr: false })
const CountingSemaphoreGameL2 = dynamic(() => import("@/components/games/process-synchronization/counting-semaphore-l2/CountingSemaphoreGame"), { ssr: false })
const CountingSemaphoreGameL3 = dynamic(() => import("@/components/games/process-synchronization/counting-semaphore-l3/CountingSemaphoreGame"), { ssr: false })
const ProducerConsumerGameL1 = dynamic(() => import("@/components/games/process-synchronization/producer-consumer-l1/ProducerConsumerGame"), { ssr: false })
const ProducerConsumerGameL2 = dynamic(() => import("@/components/games/process-synchronization/producer-consumer-l2/ProducerConsumerGame"), { ssr: false })
const ProducerConsumerGameL3 = dynamic(() => import("@/components/games/process-synchronization/producer-consumer-l3/ProducerConsumerGame"), { ssr: false })

export default function GamePage() {
  const params = useParams()
  const { moduleId, gameId } = params

  // Memory Management
  const isFirstFitBasic = moduleId === "memory-management" && gameId === "first-fit-l1"
  const isFirstFitL2 = moduleId === "memory-management" && gameId === "first-fit-l2"
  const isFirstFitL3 = moduleId === "memory-management" && gameId === "first-fit-l3"
  const isBestFitBasic = moduleId === "memory-management" && gameId === "best-fit-l1"
  const isBestFitL2 = moduleId === "memory-management" && gameId === "best-fit-l2"
  const isBestFitL3 = moduleId === "memory-management" && gameId === "best-fit-l3"
  const isWorstFitBasic = moduleId === "memory-management" && gameId === "worst-fit-l1"
  const isWorstFitL2 = moduleId === "memory-management" && gameId === "worst-fit-l2"
  const isWorstFitL3 = moduleId === "memory-management" && gameId === "worst-fit-l3"
  const isPagingL1 = moduleId === "memory-management" && gameId === "paging-l1"
  const isPagingL2 = moduleId === "memory-management" && gameId === "paging-l2"
  const isPagingL3 = moduleId === "memory-management" && gameId === "paging-l3"
  const isSegmentationL1 = moduleId === "memory-management" && gameId === "segmentation-l1"
  const isFragmentationL1 = moduleId === "memory-management" && gameId === "fragmentation-l1"
  const isFragmentationL2 = moduleId === "memory-management" && gameId === "fragmentation-l2"
  const isFragmentationL3 = moduleId === "memory-management" && gameId === "fragmentation-l3"

  // CPU Scheduling
  const isFCFSBasic = moduleId === "cpu-scheduling" && gameId === "fcfs-l1"
  const isFCFSL2 = moduleId === "cpu-scheduling" && gameId === "fcfs-l2"
  const isFCFSL3 = moduleId === "cpu-scheduling" && gameId === "fcfs-l3"
  const isSJFBasic = moduleId === "cpu-scheduling" && gameId === "sjf-l1"
  const isSJFL2 = moduleId === "cpu-scheduling" && gameId === "sjf-l2"
  const isSJFL3 = moduleId === "cpu-scheduling" && gameId === "sjf-l3"
  const isSRTFBasic = moduleId === "cpu-scheduling" && gameId === "srtf-l1"
  const isSRTFL2 = moduleId === "cpu-scheduling" && gameId === "srtf-l2"
  const isSRTFL3 = moduleId === "cpu-scheduling" && gameId === "srtf-l3"
  const isPriorityBasic = moduleId === "cpu-scheduling" && gameId === "priority-l1"
  const isPriorityL2 = moduleId === "cpu-scheduling" && gameId === "priority-l2"
  const isPriorityL3 = moduleId === "cpu-scheduling" && gameId === "priority-l3"
  const isRRBasic = moduleId === "cpu-scheduling" && gameId === "rr-l1"
  const isRRL2 = moduleId === "cpu-scheduling" && gameId === "rr-l2"
  const isRRL3 = moduleId === "cpu-scheduling" && gameId === "rr-l3"

  // Process Synchronization
  const isCSBasic = moduleId === "process-synchronization" && gameId === "critical-section-l1"
  const isCSL2 = moduleId === "process-synchronization" && gameId === "critical-section-l2"
  const isCSL3 = moduleId === "process-synchronization" && gameId === "critical-section-l3"
  const isMutexBasic = moduleId === "process-synchronization" && gameId === "mutex-l1"
  const isMutexL2 = moduleId === "process-synchronization" && gameId === "mutex-l2"
  const isMutexL3 = moduleId === "process-synchronization" && gameId === "mutex-l3"
  const isBinarySemaphoreBasic = moduleId === "process-synchronization" && gameId === "binary-semaphore-l1"
  const isBinarySemaphoreL2 = moduleId === "process-synchronization" && gameId === "binary-semaphore-l2"
  const isBinarySemaphoreL3 = moduleId === "process-synchronization" && gameId === "binary-semaphore-l3"
  const isCountingSemaphoreL1 = moduleId === "process-synchronization" && gameId === "counting-semaphore-l1"
  const isCountingSemaphoreL2 = moduleId === "process-synchronization" && gameId === "counting-semaphore-l2"
  const isCountingSemaphoreL3 = moduleId === "process-synchronization" && gameId === "counting-semaphore-l3"
  const isProducerConsumerL1 = moduleId === "process-synchronization" && gameId === "producer-consumer-l1"
  const isProducerConsumerL2 = moduleId === "process-synchronization" && gameId === "producer-consumer-l2"
  const isProducerConsumerL3 = moduleId === "process-synchronization" && gameId === "producer-consumer-l3"

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
      ) : isPagingL1 ? (
        <div className="w-full h-screen overflow-hidden">
          <HeistGameL1 />
        </div>
      ) : isPagingL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <HeistGameL2 />
        </div>
      ) : isPagingL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <HeistGameL3 />
        </div>
      ) : isSegmentationL1 ? (
        <div className="w-full h-screen overflow-hidden">
          <SegmentationGameL1 />
        </div>
      ) : isFragmentationL1 ? (
        <div className="w-full h-screen overflow-hidden">
          <FragmentationGameL1 />
        </div>
      ) : isFragmentationL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <FragmentationGameL2 />
        </div>
      ) : isFragmentationL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <FragmentationGameL3 />
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
      ) : isPriorityBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstPriorityGame />
        </div>
      ) : isPriorityL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstPriorityGameL2 />
        </div>
      ) : isPriorityL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstPriorityGameL3 />
        </div>
      ) : isRRBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstRRGame />
        </div>
      ) : isRRL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstRRGameL2 />
        </div>
      ) : isRRL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstRRGameL3 />
        </div>
      ) : isCSBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <FirstCSGame />
        </div>
      ) : isCSL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <CSGameL2 />
        </div>
      ) : isCSL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <CSGameL3 />
        </div>
      ) : isMutexBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <MutexGame />
        </div>
      ) : isMutexL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <MutexGameL2 />
        </div>
      ) : isMutexL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <MutexGameL3 />
        </div>
      ) : isBinarySemaphoreBasic ? (
        <div className="w-full h-screen overflow-hidden">
          <BinarySemaphoreGame />
        </div>
      ) : isBinarySemaphoreL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <BinarySemaphoreGameL2 />
        </div>
      ) : isBinarySemaphoreL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <BinarySemaphoreGameL3 />
        </div>
      ) : isCountingSemaphoreL1 ? (
        <div className="w-full h-screen overflow-hidden">
          <CountingSemaphoreGameL1 />
        </div>
      ) : isCountingSemaphoreL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <CountingSemaphoreGameL2 />
        </div>
      ) : isCountingSemaphoreL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <CountingSemaphoreGameL3 />
        </div>
      ) : isProducerConsumerL1 ? (
        <div className="w-full h-screen overflow-hidden">
          <ProducerConsumerGameL1 />
        </div>
      ) : isProducerConsumerL2 ? (
        <div className="w-full h-screen overflow-hidden">
          <ProducerConsumerGameL2 />
        </div>
      ) : isProducerConsumerL3 ? (
        <div className="w-full h-screen overflow-hidden">
          <ProducerConsumerGameL3 />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-xl mb-8">This is a placeholder for the game content.</p>
        </div>
      )}
    </div>
  )
}