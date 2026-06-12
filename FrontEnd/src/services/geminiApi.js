import axios from 'axios';

// Dedicated Axios instance for the Gemini endpoint.
// Uses root API URL (without /v1) since Gemini route is at /api/ai/analyze
const geminiApi = axios.create({
  baseURL:         import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/v1', '')  // strip /v1 → http://localhost:5000/api
    : 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
geminiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const geminiAPI = {
  analyze: () => geminiApi.post('/ai/analyze'),
};
