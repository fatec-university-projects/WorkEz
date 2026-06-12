import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if running in browser environment
const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return window.localStorage.getItem(key);
      } catch (err) {
        return memoryStorage[key] || null;
      }
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Native module is null')) {
        console.warn(`[safeStorage] Native AsyncStorage.getItem failed for key: ${key}. Error:`, err);
      }
      return memoryStorage[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (err) {
        memoryStorage[key] = value;
        return;
      }
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Native module is null')) {
        console.warn(`[safeStorage] Native AsyncStorage.setItem failed for key: ${key}. Error:`, err);
      }
      memoryStorage[key] = value;
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (err) {
        delete memoryStorage[key];
        return;
      }
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Native module is null')) {
        console.warn(`[safeStorage] Native AsyncStorage.removeItem failed for key: ${key}. Error:`, err);
      }
      delete memoryStorage[key];
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    if (isWeb) {
      try {
        keys.forEach(key => window.localStorage.removeItem(key));
        return;
      } catch (err) {
        keys.forEach(key => delete memoryStorage[key]);
        return;
      }
    }
    try {
      await (AsyncStorage as any).multiRemove(keys);
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Native module is null')) {
        console.warn(`[safeStorage] Native AsyncStorage.multiRemove failed. Error:`, err);
      }
      keys.forEach(key => delete memoryStorage[key]);
    }
  }
};
