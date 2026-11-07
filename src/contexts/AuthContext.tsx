import { useEffect, useState, type ReactNode } from 'react';
import { rbacApi } from '../services/api';

import { AuthContext, type AuthState, type User } from './authState';
export type { AuthState, User } from './authState';

const TOKEN_KEY = 'beilo_auth_token';
const USER_KEY = 'beilo_auth_user';

const getInitialState = (): AuthState => {
  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr) as User;
      return { user, token, isAuthenticated: true, isLoading: false };
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
  return { user: null, token: null, isAuthenticated: false, isLoading: false };
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);

  // Listen for token expiration events from API layer
  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      window.location.href = '/login';
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = async (username: string, password: string, totpCode?: string) => {
    const result = await rbacApi.login(username, password, totpCode);
    if (result.totpRequired) {
      throw new Error('TOTP_REQUIRED');
    }

    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

    setState({
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        fullName: result.user.fullName,
        roles: result.user.roles || [],
        isActive: result.user.isActive,
        isSuperAdmin: result.user.isSuperAdmin,
        totpEnabled: result.user.totpEnabled,
        createdAt: result.user.createdAt,
        lastLoginAt: result.user.lastLoginAt,
      },
      token: result.token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const setAuth = (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  };

  const updateUser = (updates: Partial<User>) => {
    setState(prev => {
      const updated = { ...prev.user, ...updates } as User;
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return { ...prev, user: updated };
    });
  };

  const refreshToken = async () => {
    const { token } = await rbacApi.refreshToken();
    localStorage.setItem(TOKEN_KEY, token);
    setState(prev => ({ ...prev, token }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, setAuth, updateUser, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}
