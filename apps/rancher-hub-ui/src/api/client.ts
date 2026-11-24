import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

const STORAGE_KEY = "rancherhub_config";
const TOKEN_KEY = "rancherhub_token";

interface AppConfig {
  baseURL: string;
  environment: "development" | "production";
}

const DEFAULT_CONFIG: AppConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || window.location.origin,
  environment: "development",
};

export function getConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    // Ignore error
    console.log("Error fetching config");
  }
  return DEFAULT_CONFIG;
}

export function setConfig(config: Partial<AppConfig>): void {
  const current = getConfig();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...config }));
  // Recreate client on next request
  _clientInstance = null;
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

let _clientInstance: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (_clientInstance) return _clientInstance;

  const config = getConfig();

  _clientInstance = axios.create({
    baseURL: config.baseURL,
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  });

  _clientInstance.interceptors.request.use(
    (req: InternalAxiosRequestConfig) => {
      const token = getToken();
      if (token && req.headers) {
        req.headers.Authorization = `Bearer ${token}`;
      }
      return req;
    },
  );

  _clientInstance.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        clearToken();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
      if (error.response?.status === 429) {
        error.message = 'Too many requests — please wait a moment and try again.';
      }
      return Promise.reject(error);
    },
  );

  return _clientInstance;
}

export function resetClient(): void {
  _clientInstance = null;
}
