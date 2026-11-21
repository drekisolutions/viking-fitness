import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!envUrl || !envAnonKey) {
  console.warn(
    '[Viking Fitness] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Cloud sync and auth will be unavailable.'
  );
}

const supabaseUrl = envUrl ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = envAnonKey ?? 'placeholder-anon-key';

// Safe localStorage access (undefined during SSR/build)
const safeLocalStorage = {
  getItem: (key: string) => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  },
};

// Native storage: lazy-loaded so SecureStore isn't imported during web build
const getNativeStorage = () => {
  if (Platform.OS === 'web') return null;
  const SecureStore = require('expo-secure-store');
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
};

const storage = Platform.OS === 'web' ? safeLocalStorage : (getNativeStorage() ?? safeLocalStorage);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
