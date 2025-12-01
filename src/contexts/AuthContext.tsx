import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, UserProfile } from '../../services/apiService';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Set token in API service
          (window as any).__authToken = token;

          // Get user profile
          const { user: profile } = await authApi.getProfile();
          setUser({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            emailVerified: profile.emailVerified,
            lastLoginAt: profile.lastLoginAt,
          });
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('authToken');
          delete (window as any).__authToken;
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });

      // Store token
      localStorage.setItem('authToken', response.token);
      (window as any).__authToken = response.token;

      // Set user
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        emailVerified: response.user.emailVerified,
        lastLoginAt: response.user.lastLoginAt,
      });
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await authApi.register({ email, password, name });

      // Store token
      localStorage.setItem('authToken', response.token);
      (window as any).__authToken = response.token;

      // Set user
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        emailVerified: response.user.emailVerified,
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout error:', error);
    } finally {
      // Clear local state regardless of API response
      localStorage.removeItem('authToken');
      delete (window as any).__authToken;
      setUser(null);
    }
  };

  const updateProfile = async (data: { name?: string; email?: string }) => {
    try {
      const response = await authApi.updateProfile(data);

      // Update local user state
      if (response.user) {
        setUser(prev => prev ? {
          ...prev,
          name: response.user.name,
          email: response.user.email,
          emailVerified: response.user.emailVerified,
        } : null);
      }

      // If email changed, update token
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        (window as any).__authToken = response.token;
      }
    } catch (error) {
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    try {
      const { user: profile } = await authApi.getProfile();
      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        emailVerified: profile.emailVerified,
        lastLoginAt: profile.lastLoginAt,
      });
    } catch (error) {
      // If refresh fails, logout
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
