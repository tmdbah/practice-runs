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

const SEEN_VALUE = "seen";

function storageKey(slug: string): string {
  return `practice-runs:tour:${slug}`;
}

function readStorage(slug: string): boolean {
  try {
    return localStorage.getItem(storageKey(slug)) === SEEN_VALUE;
  } catch {
    return false;
  }
}

export function useTourSeen(slug: string): {
  hasSeenTour: boolean;
  markTourSeen: () => void;
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
  const getServerSnapshot = useCallback(() => false, []);

  // useSyncExternalStore: server snapshot = false (isLoaded=false),
  // client snapshot = localStorage value (isLoaded=true)
  const hasSeenTour = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Same dual-snapshot trick as `useIdentity`'s `isLoaded`, needed to dodge
  // a hydration mismatch: `typeof window !== "undefined"` is true even
  // during the hydration-matching first render.
  const isLoaded = useSyncExternalStore(
    subscribeNoop,
    getIsLoadedClientSnapshot,
    getIsLoadedServerSnapshot,
  );

  function markTourSeen(): void {
    try {
      localStorage.setItem(storageKey(slug), SEEN_VALUE);
    } catch {
      // localStorage unavailable — the tour simply reappears next visit.
    }
    window.dispatchEvent(new StorageEvent("storage", { key: storageKey(slug) }));
  }

  return { hasSeenTour, markTourSeen, isLoaded };
}
