import axios from 'axios';
import type { TrustedDevice } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

const trustedDevicesApi = axios.create({
  baseURL: `${API_BASE_URL}/trusted-devices`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
trustedDevicesApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
trustedDevicesApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const trustedDevicesService = {
  /**
   * Get all trusted devices for the current user
   */
  async getTrustedDevices(): Promise<TrustedDevice[]> {
    const response = await trustedDevicesApi.get('/');
    return response.data;
  },

  /**
   * Revoke a specific trusted device
   */
  async revokeDevice(deviceId: string): Promise<void> {
    await trustedDevicesApi.delete(`/${deviceId}`);
  },

  /**
   * Revoke all trusted devices for the current user
   */
  async revokeAllDevices(): Promise<{ success: boolean; count: number }> {
    const response = await trustedDevicesApi.delete('/');
    return response.data;
  },
};
