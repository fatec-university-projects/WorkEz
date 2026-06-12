import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory fallback database for when the native module is null or fails
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      return val;
    } catch (err) {
      console.warn(`[safeStorage] Native AsyncStorage.getItem failed, using memory fallback for key: ${key}. Error:`, err);
      return memoryStorage[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[safeStorage] Native AsyncStorage.setItem failed, using memory fallback for key: ${key}. Error:`, err);
      memoryStorage[key] = value;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn(`[safeStorage] Native AsyncStorage.removeItem failed, using memory fallback for key: ${key}. Error:`, err);
      delete memoryStorage[key];
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    try {
      await (AsyncStorage as any).multiRemove(keys);
    } catch (err) {
      console.warn(`[safeStorage] Native AsyncStorage.multiRemove failed, using memory fallback. Error:`, err);
      keys.forEach(key => delete memoryStorage[key]);
    }
  }
};
