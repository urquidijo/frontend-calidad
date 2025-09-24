import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../lib/api';
import type { LoginResponse, User } from '../../src/lib/types';

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync('token');
    const userJson = await SecureStore.getItemAsync('user');
    set({
      token: token || null,
      user: userJson ? JSON.parse(userJson) : null,
      isLoading: false,
    });
  },

  login: async (email, password) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    await SecureStore.setItemAsync('token', data.access_token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.user));
    set({ token: data.access_token, user: data.user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    set({ token: null, user: null });
  },
}));
