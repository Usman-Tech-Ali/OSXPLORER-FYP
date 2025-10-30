import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// CPU Scheduling Game Interface
interface CPUSchedulingResult {
  totalOrders: number;
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  throughput: number;
  totalTime: number;
  finalScore: number;
  wrongAttempts: number;
  orders: Array<{
    orderNumber: number;
    arrivalTime: number;
    burstTime: number;
    startTime: number;
    completionTime: number;
    waitingTime: number;
    turnaroundTime: number;
  }>;
  conversationHistory?: Array<{ role: 'user' | 'ai', message: string }>;
  userQuestion?: string;
  isInitial?: boolean;
}

// Memory Management Game Interface
interface MemoryManagementResult {
  gameType: 'memory-management-first-fit';
  totalVehicles: number;
  parkedVehicles: number;
  rejectedVehicles: number;
  internalFragmentation: number;
  internalFragmentationPercent: number;
  externalFragmentation: number;
  efficiency: number;
  utilization: number;
  totalSlotSpace: number;
  totalAllocated: number;
  finalScore: number;
  wrongAttempts: number;
  slots: Array<{
    slotNumber: number;
    size: number;
    remainingSpace: number;
    occupied: boolean;
    vehicleCount: number;
    vehicles: Array<{
      type: string;
      size: number;
      name: string;
    }>;
  }>;
  conversationHistory?: Array<{ role: 'user' | 'ai', message: string }>;
  userQuestion?: string;
  isInitial?: boolean;
}

type GameResult = CPUSchedulingResult | MemoryManagementResult;

// Type guard to check if it's CPU scheduling game
function isCPUSchedulingGame(data: GameResult): data is CPUSchedulingResult {
  return 'totalOrders' in data && 'orders' in data;
}

// Type guard to check if it's memory management game
function isMemoryManagementGame(data: GameResult): data is MemoryManagementResult {
  return 'gameType' in data && data.gameType === 'memory-management-first-fit';
}

// CPU Scheduling fallback feedback
function createCPUSchedulingFeedback(gameData: CPUSchedulingResult): string {
  const { avgWaitingTime, wrongAttempts, finalScore, totalOrders } = gameData;
  
  let feedback = "📊 **Performance Summary:**\n\n";
  
  if (finalScore >= 400) {
    feedback += "🌟 **Excellent!** You have a strong understanding of FCFS scheduling.\n\n";
  } else if (finalScore >= 300) {
    feedback += "👍 **Good job!** You understand the basics of FCFS scheduling.\n\n";
  } else {
    feedback += "📚 **Keep practicing!** FCFS scheduling requires careful attention to order.\n\n";
  }
  
  feedback += "**Key Points:**\n";
  feedback += `- You completed ${totalOrders} orders\n`;
  feedback += `- Average waiting time: ${avgWaitingTime.toFixed(2)}s\n`;
  
  if (wrongAttempts > 0) {
    feedback += `\n⚠️ You made ${wrongAttempts} wrong attempt(s). Remember: FCFS means serving orders in the exact sequence they arrive!\n`;
  }
  
  feedback += "\n**FCFS Key Concept:** First Come First Served (FCFS) is a non-preemptive scheduling algorithm where processes are executed in the order they arrive.";
  
  return feedback;
}

// Memory Management fallback feedback
function createMemoryManagementFeedback(gameData: MemoryManagementResult): string {
  const { efficiency, utilization, externalFragmentation, internalFragmentation, finalScore, parkedVehicles, totalVehicles } = gameData;
  
  let feedback = "📊 **Memory Management Performance:**\n\n";
  
  if (finalScore >= 500 && externalFragmentation === 0) {
    feedback += "🌟 **Excellent!** You have a strong understanding of First Fit allocation.\n\n";
  } else if (finalScore >= 400) {
    feedback += "👍 **Good job!** You're managing memory allocation well.\n\n";
  } else {
    feedback += "📚 **Keep practicing!** Memory allocation requires strategic thinking.\n\n";
  }
  
  feedback += "**Key Points:**\n";
  feedback += `- Vehicles Parked: ${parkedVehicles}/${totalVehicles}\n`;
  feedback += `- Efficiency: ${efficiency.toFixed(1)}%\n`;
  feedback += `- Utilization: ${utilization.toFixed(1)}%\n`;
  
  if (externalFragmentation > 0) {
    feedback += `\n⚠️ External Fragmentation: ${externalFragmentation} vehicle(s) rejected. This happens when there's no single contiguous space large enough, even if total free space exists.\n`;
  }
  
  if (internalFragmentation > 0) {
    feedback += `\n💡 Internal Fragmentation: ${internalFragmentation} units wasted (${gameData.internalFragmentationPercent.toFixed(1)}%). This is the unused space within allocated slots.\n`;
  }
  
  feedback += "\n**First Fit Concept:** First Fit allocates memory to the first available block that is large enough. It's fast but can lead to fragmentation over time.";
  
  return feedback;
}

// Simple fallback feedback generator
function createSimpleFeedback(gameData: GameResult): string {
  if (isCPUSchedulingGame(gameData)) {
    return createCPUSchedulingFeedback(gameData);
  } else if (isMemoryManagementGame(gameData)) {
    return createMemoryManagementFeedback(gameData);
  }
  return "Unable to generate feedback for this game type.";
}

export async function POST(req: NextRequest) {
  try {
    const gameData: GameResult = await req.json();

    // Validate game data based on type
    if (!gameData) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          message: "Invalid game data provided",
        },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (isCPUSchedulingGame(gameData)) {
      if (!gameData.orders || gameData.orders.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Invalid CPU scheduling game data",
          },
          { status: 400 }
        );
      }
    } else if (isMemoryManagementGame(gameData)) {
      if (!gameData.slots || gameData.slots.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation error",
            message: "Invalid memory management game data",
          },
          { status: 400 }
        );
      }
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    console.log('Checking Gemini API key:', geminiApiKey ? 'Key found (length: ' + geminiApiKey.length + ')' : 'Key NOT found');
    
    if (!geminiApiKey) {
      console.warn("Gemini API key not configured, using fallback");
      return NextResponse.json({
        success: true,
        data: { feedback: createSimpleFeedback(gameData) },
        message: "Feedback generated successfully (fallback mode)",
      });
    }

    let feedback = "";

    try {
      // Initialize Gemini client
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      
      // Try different model names
      const modelsToTry = [
         "gemini-2.5-flash",
          "gemini-2.5-pro", 
       
      ];

      let modelWorked = false;
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`Trying model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          
          let prompt = '';
          
          // Generate prompt based on game type
          if (isCPUSchedulingGame(gameData)) {
            // CPU Scheduling prompts
            if (gameData.isInitial) {
              prompt = `You are a friendly AI coach for a First Come First Served (FCFS) CPU scheduling game.

**Player's Performance:**
- Total Orders: ${gameData.totalOrders}
- Final Score: ${gameData.finalScore} points
- Wrong Attempts: ${gameData.wrongAttempts}
- Average Waiting Time: ${gameData.avgWaitingTime.toFixed(2)}s
- Average Turnaround Time: ${gameData.avgTurnaroundTime.toFixed(2)}s
- Throughput: ${gameData.throughput.toFixed(2)} processes/second

Provide a warm greeting and a brief 2-3 sentence assessment of their performance. Be encouraging and mention you're here to answer any questions about FCFS scheduling or their results. Keep it conversational and friendly.`;
            } else {
              const conversationContext = gameData.conversationHistory
                ?.map(msg => `${msg.role === 'user' ? 'Student' : 'AI Coach'}: ${msg.message}`)
                .join('\n') || '';
              
              prompt = `You are a friendly AI coach helping a student understand their performance in a FCFS CPU scheduling game.

**Game Performance Data:**
- Total Orders: ${gameData.totalOrders}
- Final Score: ${gameData.finalScore} points
- Wrong Attempts: ${gameData.wrongAttempts}
- Average Waiting Time: ${gameData.avgWaitingTime.toFixed(2)}s
- Average Turnaround Time: ${gameData.avgTurnaroundTime.toFixed(2)}s
- Throughput: ${gameData.throughput.toFixed(2)} processes/second
- Total Time: ${gameData.totalTime.toFixed(2)}s

**Order Details:**
${gameData.orders.map(o => 
  `Order #${o.orderNumber}: Arrival=${o.arrivalTime}s, Burst=${o.burstTime}s, Start=${o.startTime}s, Complete=${o.completionTime}s, Wait=${o.waitingTime}s, Turnaround=${o.turnaroundTime}s`
).join('\n')}

**Previous Conversation:**
${conversationContext}

**Student's Question:** ${gameData.userQuestion}

Provide a helpful, educational response. Be specific and reference their actual performance data when relevant. Keep responses concise (3-5 sentences max). Use emojis sparingly for engagement. If they ask how to improve, give specific actionable advice based on their metrics.`;
            }
          } else if (isMemoryManagementGame(gameData)) {
            // Memory Management prompts
            if (gameData.isInitial) {
              prompt = `You are a friendly AI coach for a First Fit memory allocation game.

**Player's Performance:**
- Total Vehicles: ${gameData.totalVehicles}
- Parked Vehicles: ${gameData.parkedVehicles}
- Rejected Vehicles: ${gameData.rejectedVehicles}
- Final Score: ${gameData.finalScore} points
- Wrong Attempts: ${gameData.wrongAttempts}
- Efficiency: ${gameData.efficiency.toFixed(1)}%
- Utilization: ${gameData.utilization.toFixed(1)}%
- Internal Fragmentation: ${gameData.internalFragmentation} units (${gameData.internalFragmentationPercent.toFixed(1)}%)
- External Fragmentation: ${gameData.externalFragmentation} vehicle(s)

Provide a warm greeting and a brief 2-3 sentence assessment of their memory allocation performance. Be encouraging and mention you're here to answer any questions about First Fit allocation or their results. Keep it conversational and friendly.`;
            } else {
              const conversationContext = gameData.conversationHistory
                ?.map(msg => `${msg.role === 'user' ? 'Student' : 'AI Coach'}: ${msg.message}`)
                .join('\n') || '';
              
              prompt = `You are a friendly AI coach helping a student understand their performance in a First Fit memory allocation game.

**Game Performance Data:**
- Total Vehicles: ${gameData.totalVehicles}
- Parked Vehicles: ${gameData.parkedVehicles}
- Rejected Vehicles: ${gameData.rejectedVehicles}
- Final Score: ${gameData.finalScore} points
- Wrong Attempts: ${gameData.wrongAttempts}
- Total Slot Space: ${gameData.totalSlotSpace} units
- Total Allocated: ${gameData.totalAllocated} units
- Efficiency: ${gameData.efficiency.toFixed(1)}%
- Utilization: ${gameData.utilization.toFixed(1)}%
- Internal Fragmentation: ${gameData.internalFragmentation} units (${gameData.internalFragmentationPercent.toFixed(1)}%)
- External Fragmentation: ${gameData.externalFragmentation} vehicle(s)

**Slot Allocation Details:**
${gameData.slots.map(slot => 
  `Slot ${slot.slotNumber} (${slot.size} units): ${slot.vehicleCount} vehicle(s), ${slot.remainingSpace} units remaining - ${slot.vehicles.map(v => `${v.name} (${v.type}, ${v.size} units)`).join(', ')}`
).join('\n')}

**Previous Conversation:**
${conversationContext}

**Student's Question:** ${gameData.userQuestion}

Provide a helpful, educational response about First Fit allocation. Be specific and reference their actual performance data when relevant. Explain concepts like internal/external fragmentation if asked. Keep responses concise (3-5 sentences max). Use emojis sparingly for engagement. If they ask how to improve, give specific actionable advice based on their metrics.`;
            }
          }
          
          const result = await model.generateContent(prompt);
          feedback = result.response.text().trim();
          
          if (feedback) {
            console.log(`Success with model: ${modelName}`);
            modelWorked = true;
            break;
          }
        } catch (modelError) {
          console.log(`Model ${modelName} failed:`, modelError instanceof Error ? modelError.message : "Unknown error");
          continue;
        }
      }

      if (!modelWorked) {
        console.log("All Gemini models failed, using fallback");
        feedback = createSimpleFeedback(gameData);
      }

    } catch (geminiError) {
      console.error("Gemini API error:", geminiError);
      feedback = createSimpleFeedback(gameData);
    }

    return NextResponse.json({
      success: true,
      data: { feedback },
      message: "AI feedback generated successfully",
    });

  } catch (error) {
    console.error("Error in AI feedback API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal error",
        message: "Failed to generate AI feedback",
      },
      { status: 500 }
    );
  }
}
