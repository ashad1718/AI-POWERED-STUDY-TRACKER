/**
 * Extract a user-facing message from an axios/API error.
 */
export const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;

  const data = error.response?.data;

  if (data?.error?.message) return data.error.message;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.error === 'string') return data.error;

  if (Array.isArray(data?.errors)) {
    return data.errors.map((e) => e.msg || e.message).filter(Boolean).join(' ');
  }

  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    return isLocal
      ? 'Cannot reach the server. Make sure the backend is running on http://localhost:5000.'
      : 'Cannot reach the server. Please check your internet connection or try again later.';
  }

  if (error.message && !error.message.startsWith('Request failed')) {
    return error.message;
  }

  return fallback;
};
