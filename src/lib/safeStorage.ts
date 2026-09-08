/**
 * Safe Storage utility with in-memory fallback for sandboxed iframes,
 * private browsing mode, or environments where localStorage is restricted.
 */

const memoryStore = new Map<string, string>();

let isLocalStorageAvailable: boolean | null = null;

function checkLocalStorageAvailability(): boolean {
  if (isLocalStorageAvailable !== null) {
    return isLocalStorageAvailable;
  }
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      isLocalStorageAvailable = false;
      return false;
    }
    const testKey = '__oc_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
    return true;
  } catch (e) {
    isLocalStorageAvailable = false;
    return false;
  }
}

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (checkLocalStorageAvailability()) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      // Storage access blocked or denied
    }
    return memoryStore.get(key) ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (checkLocalStorageAvailability()) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      // Storage quota or restriction
    }
    memoryStore.set(key, value);
  },

  removeItem: (key: string): void => {
    try {
      if (checkLocalStorageAvailability()) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      // Ignore
    }
    memoryStore.delete(key);
  },

  clear: (): void => {
    try {
      if (checkLocalStorageAvailability()) {
        window.localStorage.clear();
      }
    } catch (e) {
      // Ignore
    }
    memoryStore.clear();
  },

  getAllKeys: (): string[] => {
    const keys = new Set<string>();
    try {
      if (checkLocalStorageAvailability()) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keys.add(k);
        }
      }
    } catch (e) {
      // Ignore
    }
    for (const k of memoryStore.keys()) {
      keys.add(k);
    }
    return Array.from(keys);
  },

  getJSON: <T>(key: string, fallback: T): T => {
    try {
      const raw = safeStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (e) {
      return fallback;
    }
  },

  setJSON: <T>(key: string, value: T): void => {
    try {
      safeStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Ignore serialization errors
    }
  }
};
