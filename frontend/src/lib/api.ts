import { useAuthStore } from '@/store/auth-store';

const getApiBaseUrl = () => {
  // If the environment variable is injected during build, always prioritize it.
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    // dynamically match the API to the current domain but point to port 8000 as fallback
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
  }
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

interface CustomRequestInit extends RequestInit {
  isFormData?: boolean;
}

/**
 * A wrapper for the native fetch function to handle common API request logic.
 * @param endpoint The API endpoint to call (e.g., '/api/v1/quiz/generate').
 * @param options The options for the fetch request (e.g., method, headers, body, isFormData).
 * @returns The JSON response from the API.
 */
async function apiFetch(endpoint: string, options: CustomRequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get auth token from the unified store
  const token = useAuthStore.getState().token;

  const headers: any = {
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  if (!options.isFormData) {
    headers['Content-Type'] = 'application/json';
  } else {
    // If it's formData, ensure we don't accidentally send application/json
    delete headers['Content-Type'];
  }

  const defaultOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, defaultOptions);
    if (!response.ok) {
      // Log the error for debugging, but let the caller handle it
      const errorBody = await response.text();
      console.error(`API Error ${response.status}: ${errorBody}`);

      // If the error is 401 Unauthorized, clear the entire auth state
      if (response.status === 401) {
        useAuthStore.getState().clearAuth();
      }

      throw new Error(`API request failed with status ${response.status}`);
    }
    // Handle 204 No Content (e.g. DELETE responses)
    if (response.status === 204) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
}

/**
 * A wrapper for apiFetch that handles NDJSON streaming responses.
 */
async function apiFetchStream(endpoint: string, options: RequestInit = {}, onProgress?: (data: any) => void) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = useAuthStore.getState().token;

  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, defaultOptions);
    if (!response.ok) {
      if (response.status === 401) useAuthStore.getState().clearAuth();
      throw new Error(`API stream request failed with status ${response.status}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.result) {
            finalResult = parsed.result;
          } else if (onProgress) {
            onProgress(parsed);
          }
        } catch (e) {
          console.error("Failed parsing NDJSON line:", line, e);
        }
      }
    }
    return finalResult;
  } catch (error) {
    console.error('API Stream Error:', error);
    throw error;
  }
}

// --- Authentication API functions ---
export const authApi = {
  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.access_token) {
        useAuthStore.getState().setAuth(
          data.access_token,
          username,
          data.is_admin || false
        );
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (email: string, username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Registration failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.access_token) {
        useAuthStore.getState().setAuth(
          data.access_token,
          username,
          false // New users are students by default
        );
      }
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  logout: () => {
    useAuthStore.getState().clearAuth();
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    return apiFetch('/api/v1/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  },
};

// --- Admin API ---
export const adminApi = {
  getStudents: () => apiFetch('/api/v1/admin/students'),
  createStudent: (data: { username: string; email: string; password: string }) =>
    apiFetch('/api/v1/admin/students', { method: 'POST', body: JSON.stringify(data) }),
  deleteStudent: (id: string) =>
    apiFetch(`/api/v1/admin/students/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string, newPassword: string) =>
    apiFetch(`/api/v1/admin/students/${id}/reset-password`, {
      method: 'PUT', body: JSON.stringify({ new_password: newPassword }),
    }),
  setTokenLimit: (id: string, limit: number) =>
    apiFetch(`/api/v1/admin/students/${id}/token-limit`, {
      method: 'PUT', body: JSON.stringify({ token_limit: limit }),
    }),
  getTokensSummary: () =>
    apiFetch('/api/v1/admin/students/tokens/summary'),
  clearAllTokens: () =>
    apiFetch('/api/v1/admin/students/tokens/clear', { method: 'POST' }),
  updateGlobalTokenLimit: (limit: number) =>
    apiFetch('/api/v1/admin/students/tokens/global-limit', { method: 'PUT', body: JSON.stringify({ global_limit: limit }) }),
  averageDistributeTokens: () =>
    apiFetch('/api/v1/admin/students/tokens/average-distribute', { method: 'POST' }),

  getQuestions: () => apiFetch('/api/v1/admin/questions'),
  createQuestion: (data: any) =>
    apiFetch('/api/v1/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id: string, data: any) =>
    apiFetch(`/api/v1/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id: string) =>
    apiFetch(`/api/v1/admin/questions/${id}`, { method: 'DELETE' }),
  clearQuestionHistory: () =>
    apiFetch('/api/v1/admin/questions/clear-history', { method: 'POST' }),
  importQuestions: (mode: 'extend' | 'overwrite', file: File) => {
    const formData = new FormData();
    formData.append('mode', mode);
    formData.append('file', file);
    return apiFetch('/api/v1/admin/questions/import', { method: 'POST', body: formData, isFormData: true });
  },
  exportQuestions: () => {
    return `${API_BASE_URL}/api/v1/admin/questions/export`;
  },

  createTopic: (data: { name: string; code: string; level: number; description?: string }) =>
    apiFetch('/api/v1/admin/topics', { method: 'POST', body: JSON.stringify(data) }),

  exportRecords: () => {
    return `${API_BASE_URL}/api/v1/admin/records/export`;
  },
  getLlmConfig: () => apiFetch('/api/v1/admin/config/llm', { method: 'GET' }),
  updateLlmConfig: (data: any) =>
    apiFetch('/api/v1/admin/config/llm', { method: 'PUT', body: JSON.stringify(data) }),
  testLlmConfig: () => apiFetch('/api/v1/admin/config/llm/test', { method: 'GET' }),
};

// --- Specific API functions ---
export const api = {
  getTopics: async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/topics`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch topics: ${response.status}`);
    }
    return response.json();
  },

  generateQuiz: async (topic_ids: number[], count: number) => {
    return apiFetch('/api/v1/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ topic_ids, count, difficulty_preference: 'adaptive' }),
    });
  },

  submitQuiz: async (quizId: string, answers: any, onProgress?: (data: any) => void) => {
    return apiFetchStream('/api/v1/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ quiz_id: quizId, answers }),
    }, onProgress);
  },

  getLastQuizRecord: async () => {
    return apiFetch('/api/v1/quiz/last', {
      method: 'GET',
    });
  },
};