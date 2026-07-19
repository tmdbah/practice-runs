"use client";

import { useCallback, useSyncExternalStore } from "react";

interface StoredIdentity {
  playerId: string;
}

function storageKey(slug: string): string {
  return `practice-runs:identity:${slug}`;
}

function readStorage(slug: string): string | null {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredIdentity;
    return parsed.playerId;
  } catch {
    return null;
  }
}

export function useIdentity(slug: string): {
  playerId: string | null;
  setPlayerId: (id: string) => void;
  isLoaded: boolean;
} {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = (e: StorageEvent): void => {
        if (e.key === storageKey(slug)) onStoreChange();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [slug],
  );

  const getSnapshot = useCallback(() => readStorage(slug), [slug]);
  const getServerSnapshot = useCallback(() => null, []);

  // useSyncExternalStore: server snapshot = null (isLoaded=false),
  // client snapshot = localStorage value (isLoaded=true)
  const playerId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // On the server getServerSnapshot returns null;
  // on the client getSnapshot runs synchronously so we're always "loaded".
  // We detect client-side by checking if window exists (runs after hydration).
  const isLoaded = typeof window !== "undefined";

  function setPlayerId(id: string): void {
    const identity: StoredIdentity = { playerId: id };
    localStorage.setItem(storageKey(slug), JSON.stringify(identity));
    // Trigger re-render by dispatching a storage event (same-tab)
    window.dispatchEvent(
      new StorageEvent("storage", { key: storageKey(slug) }),
    );
  }

  return { playerId, setPlayerId, isLoaded };
}
