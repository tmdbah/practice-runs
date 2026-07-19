import "@testing-library/jest-dom";

// Node.js 22+ ships an experimental localStorage that shadows jsdom's.
// Provide a simple Map-backed mock so identity hook tests work correctly.
const store = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
  key: (index) => Array.from(store.keys())[index] ?? null,
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});
