import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth';
import type {
  AuthContextType,
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  Setup2FAResponse,
} from '../types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = authService.getToken();
      const savedUser = authService.getUser();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
        
        try {
          // Verify token is still valid by fetching profile
          const currentUser = await authService.getProfile();
          setUser(currentUser);
          authService.setUser(currentUser);
        } catch (error) {
          // Token is invalid, clear auth
          authService.removeToken();
          setToken(null);
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await authService.login(credentials);
    
    if (response.access_token && response.user) {
      setToken(response.access_token);
      setUser(response.user);
      authService.setToken(response.access_token);
      authService.setUser(response.user);
    }
    
    return response;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    authService.removeToken();
  };

  const register = async (userData: RegisterRequest): Promise<User> => {
    const user = await authService.register(userData);
    return user;
  };

  const setup2FA = async (): Promise<Setup2FAResponse> => {
    const response = await authService.setup2FA();
    return response;
  };

  const verify2FA = async (token: string): Promise<boolean> => {
    const response = await authService.verify2FA({ token });
    
    if (response.success && user) {
      // Update user's 2FA status
      const updatedUser = { ...user, twoFactorEnabled: true };
      setUser(updatedUser);
      authService.setUser(updatedUser);
    }
    
    return response.success;
  };

  const disable2FA = async (): Promise<void> => {
    const response = await authService.disable2FA();

    if (response.success && user) {
      // Update user's 2FA status
      const updatedUser = { ...user, twoFactorEnabled: false };
      setUser(updatedUser);
      authService.setUser(updatedUser);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await authService.changePassword(currentPassword, newPassword);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    register,
    setup2FA,
    verify2FA,
    disable2FA,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};