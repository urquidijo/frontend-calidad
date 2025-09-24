import axios, { AxiosHeaders } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = Constants.expoConfig?.extra?.API_URL as string;
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Helper para leer token
async function getToken() {
  try {
    return await SecureStore.getItemAsync('token');
  } catch {
    return null;
  }
}

// Interceptor: agrega Authorization si hay token
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    if (config.headers) {
      // Si headers ya existen, usamos AxiosHeaders para setear
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
    } else {
      // Si headers no existen, los creamos usando AxiosHeaders
      config.headers = new AxiosHeaders({ Authorization: `Bearer ${token}` });
    }
  }
  return config;
});
