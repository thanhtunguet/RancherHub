import axios from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  Setup2FAResponse,
  Verify2FARequest,
} from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await authApi.post('/login', credentials);
    return response.data;
  },

  async register(userData: RegisterRequest): Promise<User> {
    const response = await authApi.post('/register', userData);
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await authApi.get('/profile');
    return response.data;
  },

  async setup2FA(): Promise<Setup2FAResponse> {
    const response = await authApi.post('/setup-2fa');
    return response.data;
  },

  async verify2FA(data: Verify2FARequest): Promise<{ success: boolean; message: string }> {
    const response = await authApi.post('/verify-2fa', data);
    return response.data;
  },

  async disable2FA(): Promise<{ success: boolean; message: string }> {
    const response = await authApi.delete('/disable-2fa');
    return response.data;
  },

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  removeToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  setUser(user: User): void {
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};