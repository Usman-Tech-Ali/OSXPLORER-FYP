/**
 * Utility function to submit game scores to the backend
 * This will save the score and check for achievements
 */
export async function submitScore(data: {
  gameId: string;
  moduleId: string;
  levelId: string;
  score: number;
  timeSpent: number;
  accuracy?: number;
  wrongAttempts?: number;
  metadata?: Record<string, any>;
}): Promise<{
  success: boolean;
  xpGained?: number;
  newLevel?: number;
  achievementsUnlocked?: string[];
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to submit score',
      };
    }

    const result = await response.json();
    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    console.error('Error submitting score:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

