import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

export const JWT_STORAGE_KEY = 'nova:jwt';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const client: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(JWT_STORAGE_KEY);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(JWT_STORAGE_KEY);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default client;
