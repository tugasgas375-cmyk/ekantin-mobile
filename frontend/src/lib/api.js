import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';
export const STORAGE_BASE = import.meta.env.VITE_STORAGE_URL || 'http://127.0.0.1:8001/storage';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ekantin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ekantin_token');
      localStorage.removeItem('ekantin_user');
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error, fallback = 'Terjadi kesalahan. Coba lagi.') {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first)) return first[0];
    return first;
  }
  if (error?.message === 'Network Error') return 'Tidak bisa terhubung ke server.';
  return fallback;
}

export function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${STORAGE_BASE}/${path.replace(/^\/+/, '')}`;
}

export default api;
