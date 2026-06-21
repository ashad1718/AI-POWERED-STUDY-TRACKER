import axios from 'axios';

// ─── Base Instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL:          import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials:  true,   // sends httpOnly refresh token cookie automatically
  headers: { 'Content-Type': 'application/json' },
});

console.log('[API] Active VITE_API_URL / Axios Base URL:', api.defaults.baseURL);

// ─── Request Interceptor: attach access token ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      console.log(`[AUTH] Token found in localStorage for request: ${config.url}`);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn(`[AUTH] No token found in localStorage for request: ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: auto-refresh on 401 ────────────────────────────────
let refreshPromise = null;

export const refreshAccessToken = async () => {
  if (refreshPromise) {
    console.log('[AUTH] Token refresh already in progress. Reusing existing refresh promise.');
    return refreshPromise;
  }

  console.log('[AUTH] Starting token refresh flow...');
  refreshPromise = (async () => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newToken = data.data.accessToken;
      console.log('[AUTH] Token refreshed successfully. Saving to localStorage.');
      console.log('[AUTH] Refresh Successful');
      localStorage.setItem('accessToken', newToken);
      return newToken;
    } catch (refreshError) {
      console.error('[AUTH] Token refresh failed. Invalid/expired session. Clearing credentials.', refreshError);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth-logout', { detail: { expired: true } }));
      throw refreshError;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and not on the refresh, login, register, or logout endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/logout')
    ) {
      originalRequest._retry = true;
      console.warn(`[AUTH] Token expired (401 Unauthorized) on request: ${originalRequest.url}. Retrying with refreshed token...`);

      try {
        const token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API calls ────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data)   => api.post('/auth/register', data),
  login:    (data)   => api.post('/auth/login',    data),
  logout:   ()       => api.post('/auth/logout'),
  refresh:  ()       => api.post('/auth/refresh'),
  getMe:    ()       => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOtp:      (data) => api.post('/auth/verify-otp', data),
  resendOtp:      (data) => api.post('/auth/resend-otp', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
};

// ─── User API calls ───────────────────────────────────────────────────────────
export const userAPI = {
  getMe:           ()     => api.get('/users/me'),
  updateMe:        (data) => api.patch('/users/me', data),
  updatePassword:  (data) => api.patch('/users/me/password', data),
};

// ─── Session API calls ────────────────────────────────────────────────────────
export const sessionAPI = {
  create:  (data)   => api.post('/sessions', data),
  getAll:  (params) => api.get('/sessions', { params }),
  getOne:  (id)     => api.get(`/sessions/${id}`),
  remove:  (id)     => api.delete(`/sessions/${id}`),
};

// ─── Stats API calls ──────────────────────────────────────────────────────────
export const statsAPI = {
  overview: () => api.get('/stats/overview'),
  weekly:   (week) => api.get('/stats/weekly', { params: week ? { week } : {} }),
  subjects: () => api.get('/stats/subjects'),
  heatmap:  () => api.get('/stats/heatmap'),
};

// ─── AI API calls ─────────────────────────────────────────────────────────────
export const aiAPI = {
  recommendation: () => api.get('/ai/recommendation'),
};

// ─── Achievement API calls ────────────────────────────────────────────────────
export const achievementAPI = {
  getAll: () => api.get('/achievements'),
};

// ─── Subject API calls ────────────────────────────────────────────────────────
export const subjectAPI = {
  getAll: (params) => api.get('/subjects', { params }),
  create: (data)   => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  remove: (id)     => api.delete(`/subjects/${id}`),
};

// ─── Chapter API calls ────────────────────────────────────────────────────────
export const chapterAPI = {
  getAll: (params) => api.get('/chapters', { params }),
  create: (data)   => api.post('/chapters', data),
  update: (id, data) => api.put(`/chapters/${id}`, data),
  remove: (id)     => api.delete(`/chapters/${id}`),
};

// ─── Semester Progress & Setup API calls ─────────────────────────────────────
export const semesterAPI = {
  getProgress: () => api.get('/semester-progress'),
  setupSemester: (data) => api.post('/semester-progress/setup', data),
};

// ─── Planner API calls ───────────────────────────────────────────────────────
export const plannerAPI = {
  getDaily: (initial = false) => api.get('/planner/daily', { params: { initial } }),
  getWeekly: (initial = false) => api.get('/planner/weekly', { params: { initial } }),
};

// ─── Exam API calls ──────────────────────────────────────────────────────────
export const examAPI = {
  getPredictions: () => api.get('/exams/predictions'),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  remove: (id) => api.delete(`/exams/${id}`),
};

export default api;
