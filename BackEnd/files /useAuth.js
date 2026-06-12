import { useCallback } from 'react';
import { authAPI } from '../services/api';

/**
 * useAuth — wraps auth API calls and handles localStorage token storage.
 * Used by LoginPage, RegisterPage, and App.jsx.
 *
 * @param {Function} setIsLoggedIn
 * @param {Function} setUser
 */
export const useAuth = (setIsLoggedIn, setUser) => {

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { user, accessToken } = data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setIsLoggedIn(true);
    setUser(user);

    return user;
  }, [setIsLoggedIn, setUser]);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    const { user, accessToken } = data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setIsLoggedIn(true);
    setUser(user);

    return user;
  }, [setIsLoggedIn, setUser]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Still clear local state even if server call fails
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setIsLoggedIn(false);
      setUser(null);
    }
  }, [setIsLoggedIn, setUser]);

  return { login, register, logout };
};
