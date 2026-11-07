import { createContext } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  isActive: boolean;
  isSuperAdmin: boolean;
  totpEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string, totpCode?: string) => Promise<void>;
  setAuth: (token: string, user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
