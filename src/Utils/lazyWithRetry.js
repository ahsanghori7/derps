import { lazy } from "react";

const RELOAD_KEY = "drms:lazy-chunk-reload";
const RELOAD_WINDOW_MS = 15000;

let reloadInFlight = false;

export function isChunkLoadError(error) {
  const message = String(error?.message || error || "");
  const name = String(error?.name || "");
  return (
    name === "ChunkLoadError" ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    /Loading chunk [\d]+ failed/.test(message)
  );
}

export function recoverFromChunkError() {
  if (typeof window === "undefined") return false;
  if (reloadInFlight) return true;

  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    const now = Date.now();
    if (now - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // sessionStorage can be blocked; still attempt a one-time reload
  }

  reloadInFlight = true;
  window.location.reload();
  return true;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * React.lazy caches the first rejected import forever, so a failed route
 * chunk would keep crashing the app. Retry briefly, then reload once to
 * pick up a fresh index.html after a deploy (old hashed files 404).
 */
export function lazyWithRetry(importer, { retries = 2, retryDelay = 400 } = {}) {
  return lazy(async () => {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await importer();
      } catch (error) {
        lastError = error;
        if (!isChunkLoadError(error) || attempt === retries) break;
        await wait(retryDelay * (attempt + 1));
      }
    }

    if (isChunkLoadError(lastError) && recoverFromChunkError()) {
      return new Promise(() => {});
    }

    throw lastError;
  });
}
