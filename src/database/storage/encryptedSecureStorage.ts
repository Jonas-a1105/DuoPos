const STORAGE_PREFIX = 'duo_pos_secure_';

function simpleEncode(value: string): string {
  return btoa(encodeURIComponent(value));
}

function simpleDecode(encoded: string): string {
  return decodeURIComponent(atob(encoded));
}

export function setSecureItem(key: string, value: string): void {
  try {
    const encodedKey = STORAGE_PREFIX + key;
    const encodedValue = simpleEncode(value);
    localStorage.setItem(encodedKey, encodedValue);
  } catch (err) {
    console.error('[EncryptedStorage] Error saving item:', err);
  }
}

export function getSecureItem(key: string): string | null {
  try {
    const encodedKey = STORAGE_PREFIX + key;
    const stored = localStorage.getItem(encodedKey);
    if (!stored) return null;
    return simpleDecode(stored);
  } catch (err) {
    console.error('[EncryptedStorage] Error reading item:', err);
    return null;
  }
}

export function removeSecureItem(key: string): void {
  try {
    const encodedKey = STORAGE_PREFIX + key;
    localStorage.removeItem(encodedKey);
  } catch (err) {
    console.error('[EncryptedStorage] Error removing item:', err);
  }
}

export function clearSecureStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error('[EncryptedStorage] Error clearing storage:', err);
  }
}
