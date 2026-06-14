import axios from 'axios';

// ─── Base Instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL:          import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials:  true,   // sends httpOnly refresh token cookie automatically
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: attach access token ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing    = false;
let failedQueue     = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and not on the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue the failed request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed — clear auth and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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

export default api;
