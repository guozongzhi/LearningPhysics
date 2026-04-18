import { useAuthStore } from '@/store/auth-store';

const getApiBaseUrl = () => {
  // If the environment variable is injected during build, always prioritize it.
  // Note: For relative paths (starting with /), this will work as expected with Next.js rewrites.
  if (process.env.NEXT_PUBLIC_API_URL !== undefined) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    // relative paths are preferred if rewrites are configured
    return ''; 
  }
  
  // Server-side base URL
  return process.env.NODE_ENV === 'production' 
    ? 'http://backend:8000' 
    : 'http://localhost:8000';
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

  exportRecords: () => `/api/v1/admin/records/export`,
  getLlmConfig: () =>
    apiFetch(`/api/v1/admin/config/llm`),
  updateLlmConfig: (data: any) =>
    apiFetch(`/api/v1/admin/config/llm`, { method: 'POST', body: JSON.stringify(data) }),
  testLlmConfig: () =>
    apiFetch(`/api/v1/admin/config/llm/test`),
  
  // Visit Logs
  getVisits: (skip = 0, limit = 100) => 
    apiFetch(`/api/v1/logs/admin/visits?skip=${skip}&limit=${limit}`),
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

  getDocuments: async () => {
    return apiFetch('/api/v1/documents', {
      method: 'GET',
    });
  },

  getDocument: async (documentId: string) => {
    return apiFetch(`/api/v1/documents/${documentId}`, {
      method: 'GET',
    });
  },

  getDocumentVersions: async (documentId: string) => {
    return apiFetch(`/api/v1/documents/${documentId}/versions`, {
      method: 'GET',
    });
  },

  createDocument: async (data: {
    title: string;
    summary?: string;
    content_markdown: string;
    content_blocks?: unknown;
    whiteboard_data?: unknown;
    visibility: 'private' | 'class' | 'public';
    node_ids: number[];
    collaborator_usernames?: string[];
  }) => {
    return apiFetch('/api/v1/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDocument: async (
    documentId: string,
    data: {
      base_updated_at?: string;
      title?: string;
      summary?: string;
      content_markdown?: string;
      content_blocks?: unknown;
      whiteboard_data?: unknown;
      visibility?: 'private' | 'class' | 'public';
      node_ids?: number[];
    }
  ) => {
    return apiFetch(`/api/v1/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteDocument: async (documentId: string) => {
    return apiFetch(`/api/v1/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  getCollaboratorCandidates: async () => {
    return apiFetch('/api/v1/users/collaborators', {
      method: 'GET',
    });
  },

  addDocumentCollaborator: async (
    documentId: string,
    data: {
      username: string;
      role: 'editor' | 'viewer';
    }
  ) => {
    return apiFetch(`/api/v1/documents/${documentId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDocumentCollaborator: async (
    documentId: string,
    userId: string,
    data: {
      role: 'editor' | 'viewer';
    }
  ) => {
    return apiFetch(`/api/v1/documents/${documentId}/collaborators/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteDocumentCollaborator: async (documentId: string, userId: string) => {
    return apiFetch(`/api/v1/documents/${documentId}/collaborators/${userId}`, {
      method: 'DELETE',
    });
  },

  restoreDocumentVersion: async (documentId: string, versionId: string) => {
    return apiFetch(`/api/v1/documents/${documentId}/versions/${versionId}/restore`, {
      method: 'POST',
    });
  },

  getDocumentActivities: async (documentId: string) => {
    return apiFetch(`/api/v1/documents/${documentId}/activities`);
  },

  getQuestionEmbed: async (questionId: string) => {
    return apiFetch(`/api/v1/questions/${questionId}/embed`);
  },

  getQuestionsByNodes: async (nodeIds: number[]) => {
    return apiFetch(`/api/v1/questions/by-nodes?node_ids=${nodeIds.join(',')}`);
  },

  toggleDocumentTemplate: async (documentId: string) => {
    return apiFetch(`/api/v1/documents/${documentId}/toggle-template`, {
      method: 'POST',
    });
  },

  getDocumentTemplates: async () => {
    return apiFetch('/api/v1/documents/templates/list');
  },
  updateKnowledgeNode: (nodeId: number, data: { name?: string; description?: string }) =>
    apiFetch(`/api/v1/knowledge_nodes/${nodeId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  uploadMedia: async (file: File, onProgress?: (percent: number) => void): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      // 获取认证 Token
      const token = useAuthStore.getState().token;

      xhr.open('POST', `${API_BASE_URL}/api/v1/media/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // 实时进度监听
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error("Failed to parse upload response"));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  },

  recordVisit: (path: string) => {
    return apiFetch('/api/v1/logs/visits/record', {
      method: "POST",
      body: JSON.stringify({ path })
    }).catch(() => {});
  },
};
