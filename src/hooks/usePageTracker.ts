import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/**
 * Mounted once in App.tsx (inside BrowserRouter).
 * Tracks every user-facing page navigation automatically.
 * Admin routes (/admin/*) are intentionally excluded.
 */
export function usePageTracker() {
  const location = useLocation();

  useEffect(() => {
    // Tag body so Google Auto Ads are strictly scoped to /blog only
    if (location.pathname.startsWith("/blog")) {
      document.body.dataset.isBlog = "true";
    } else {
      delete document.body.dataset.isBlog;
    }

    // Skip all admin pages, we only want user-facing analytics
    if (location.pathname.startsWith("/admin")) return;

    // Small delay so document.title has time to update after navigation
    const timer = setTimeout(() => {
      trackPageView(location.pathname, document.title);
    }, 150);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}

/**
 * Returns a debounced search tracker.
 * Call the returned function in your search onChange handler.
 * Fires after the user stops typing for `delay` ms (default 1500ms).
 *
 * Usage:
 *   const trackSearchInput = useSearchTracker("Resource");
 *   <input onChange={e => { setSearch(e.target.value); trackSearchInput(e.target.value); }} />
 */
export function useSearchTracker(category: string, delay = 1500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim() || query.trim().length < 2) return;
    timerRef.current = setTimeout(async () => {
      // Dynamically import to keep the initial bundle small
      const { trackSearch } = await import("@/lib/analytics");
      trackSearch(query.trim(), category as any);
    }, delay);
  };
}
