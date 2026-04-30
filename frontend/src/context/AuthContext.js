import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  fetchMe,
  updateProfile as apiUpdateProfile,
  getToken,
} from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Rehydrate on mount — auto-refreshes token if needed
  useEffect(() => {
    if (!getToken()) { setAuthLoading(false); return; }
    fetchMe()
      .then(setUser)
      .catch(() => { apiLogout(); })
      .finally(() => setAuthLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    await apiLogin(username, password);
    const me = await fetchMe();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (username, password, sleeper_username, extra = {}) => {
    await apiRegister(username, password, sleeper_username, extra);
    await apiLogin(username, password);
    const me = await fetchMe();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const updated = await apiUpdateProfile(data);
      setUser(updated);
      return updated;
    } catch (err) {
      if (err.code === 'session_expired') setUser(null);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
