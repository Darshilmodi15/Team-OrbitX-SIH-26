import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: memoryStorage(), configurable: true });

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
