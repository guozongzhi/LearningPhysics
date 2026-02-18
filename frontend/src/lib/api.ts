const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * A wrapper for the native fetch function to handle common API request logic.
 * @param endpoint The API endpoint to call (e.g., '/api/v1/quiz/generate').
 * @param options The options for the fetch request (e.g., method, headers, body).
 * @returns The JSON response from the API.
 */
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    if (!response.ok) {
      // Log the error for debugging, but let the caller handle it
      const errorBody = await response.text();
      console.error(`API Error ${response.status}: ${errorBody}`);
      throw new Error(`API request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
}

// --- Specific API functions ---

export const api = {
  generateQuiz: async (topic_ids: number[], count: number) => {
    return apiFetch('/api/v1/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ topic_ids, count, difficulty_preference: 'adaptive' }),
    });
  },

  submitQuiz: async (quizId: string, answers: any) => {
    return apiFetch('/api/v1/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ quiz_id: quizId, answers }),
    });
  },
};
