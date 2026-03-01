const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // dynamically match the API to the current domain but point to port 8000
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();
/**
 * Gets the authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}

/**
 * Sets the authentication token in localStorage
 */
function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
  }
}

/**
 * Removes the authentication token from localStorage
 */
function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
}

/**
 * A wrapper for the native fetch function to handle common API request logic.
 * @param endpoint The API endpoint to call (e.g., '/api/v1/quiz/generate').
 * @param options The options for the fetch request (e.g., method, headers, body).
 * @returns The JSON response from the API.
 */
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get auth token if available
  const token = getAuthToken();

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
      // Log the error for debugging, but let the caller handle it
      const errorBody = await response.text();
      console.error(`API Error ${response.status}: ${errorBody}`);

      // If the error is 401 Unauthorized, remove the token
      if (response.status === 401) {
        removeAuthToken();
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

// --- Authentication API functions ---
export const authApi = {
  login: async (username: string, password: string) => {
    console.log(`[DEBUG] 开始登录: 用户名=${username}`);
    console.log(`[DEBUG] API URL: ${API_BASE_URL}/api/v1/auth/login`);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
      console.log(`[DEBUG] 发送登录请求...`);
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        body: formData,
      });

      console.log(`[DEBUG] 响应状态码: ${response.status}`);
      console.log(`[DEBUG] 响应头:`, response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DEBUG] 登录失败: ${response.status} - ${errorText}`);
        throw new Error(`Login failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[DEBUG] 登录成功:`, data);

      if (data.access_token) {
        setAuthToken(data.access_token);
        console.log(`[DEBUG] Token已保存`);
      }
      if (data.is_admin !== undefined) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('isAdmin', JSON.stringify(data.is_admin));
          console.log(`[DEBUG] Admin状态已保存: ${data.is_admin}`);
        }
      }
      return data;
    } catch (error) {
      console.error('[DEBUG] 登录错误:', error);
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
        setAuthToken(data.access_token);
      }
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  logout: () => {
    removeAuthToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAdmin');
    }
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

  getQuestions: () => apiFetch('/api/v1/admin/questions'),
  createQuestion: (data: any) =>
    apiFetch('/api/v1/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id: string, data: any) =>
    apiFetch(`/api/v1/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id: string) =>
    apiFetch(`/api/v1/admin/questions/${id}`, { method: 'DELETE' }),

  createTopic: (data: { name: string; code: string; level: number; description?: string }) =>
    apiFetch('/api/v1/admin/topics', { method: 'POST', body: JSON.stringify(data) }),

  exportRecords: () => {
    return `${API_BASE_URL}/api/v1/admin/records/export`;
  },
  getLlmConfig: () => apiFetch('/api/v1/admin/config/llm', { method: 'GET' }),
  updateLlmConfig: (data: any) =>
    apiFetch('/api/v1/admin/config/llm', { method: 'PUT', body: JSON.stringify(data) }),
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

  submitQuiz: async (quizId: string, answers: any) => {
    return apiFetch('/api/v1/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ quiz_id: quizId, answers }),
    });
  },
};