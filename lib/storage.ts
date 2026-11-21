import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

// SSR-safe storage adapter for Zustand `persist`.
// Uses AsyncStorage on native and guarded localStorage on web so static SSR
// builds (`expo export --platform web`) never touch undefined globals.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const webStorage: StateStorage = {
  getItem: (name) => {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch {
      // ignore quota errors
    }
  },
  removeItem: (name) => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

function createNativeStorage(): StateStorage {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (!AsyncStorage) return noopStorage;
    return {
      getItem: (name) => AsyncStorage.getItem(name),
      setItem: (name, value) => AsyncStorage.setItem(name, value),
      removeItem: (name) => AsyncStorage.removeItem(name),
    };
  } catch {
    return noopStorage;
  }
}

export const zustandStorage: StateStorage =
  Platform.OS === 'web' ? webStorage : createNativeStorage();
