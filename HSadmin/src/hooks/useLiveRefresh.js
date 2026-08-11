import { useEffect } from "react";

// Keeps polling isolated so this can later be replaced with an SSE/WebSocket subscription.
export function useLiveRefresh(refresh, { interval = 30000, enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(refreshWhenVisible, interval);
    window.addEventListener("himsetu-live-update", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("himsetu-live-update", refreshWhenVisible);
    };
  }, [enabled, interval, refresh]);
}
