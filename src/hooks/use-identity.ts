"use client";

import { useCallback, useSyncExternalStore } from "react";

/** No-op subscription: mount status never changes after the fact, so there's nothing to notify. */
function subscribeNoop(): () => void {
  return () => {};
}
function getIsLoadedClientSnapshot(): boolean {
  return true;
}
function getIsLoadedServerSnapshot(): boolean {
  return false;
}

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

  // `typeof window !== "undefined"` is true on the client's very first render —
  // including the hydration pass React uses to match server output — so it can't
  // signal "mounted" without causing a mismatch. Reusing useSyncExternalStore's
  // dual-snapshot mechanism (same trick as `playerId` above) renders `false` on
  // the hydration pass to match the server, then flips to `true` right after mount.
  const isLoaded = useSyncExternalStore(
    subscribeNoop,
    getIsLoadedClientSnapshot,
    getIsLoadedServerSnapshot,
  );

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
