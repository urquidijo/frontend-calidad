import axios, { AxiosHeaders } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const expoExtra = Constants.expoConfig?.extra ?? (Constants as any)?.manifest?.extra ?? {};
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (typeof expoExtra?.API_URL === 'string' ? expoExtra.API_URL : undefined);

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

if (!BASE_URL) {
  console.warn('[api] BASE_URL no definido, revisa EXPO_PUBLIC_API_URL o extra.API_URL');
}

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
