import axios from 'axios';
import { refreshAccessToken } from './api';

const getGeminiBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/v1', '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api';
  }
  return 'http://localhost:5000/api';
};

// Dedicated Axios instance for the Gemini endpoint.
// Uses root API URL (without /v1) since Gemini route is at /api/ai/analyze
const geminiApi = axios.create({
  baseURL:         getGeminiBaseURL(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
geminiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
geminiApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      console.warn(`[AUTH] Token expired (401 Unauthorized) on Gemini request: ${originalRequest.url}. Retrying with refreshed token...`);

      try {
        const token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return geminiApi(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export const geminiAPI = {
  analyze: () => geminiApi.post('/ai/analyze'),
  chat: (message) => geminiApi.post('/ai/chat', { message }),
};
