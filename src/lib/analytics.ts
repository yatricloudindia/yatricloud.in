import { supabase } from "./supabase";

export type EventCategory =
  | "Resource"
  | "ExamDump"
  | "Event"
  | "Training"
  | "Mentorship"
  | "Store"
  | "Blog"
  | "Job"
  | "Certification"
  | "Community"
  | "Support"
  | "Tool"
  | "System"
  | "Homepage"
  | "Page";

export type EventName =
  | "download"
  | "view"
  | "click"
  | "enroll"
  | "purchase"
  | "visit"
  | "search"
  | "apply"
  | "signup"
  | "login";

export interface AnalyticsEvent {
  event_name: EventName;
  category: EventCategory;
  target_id?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an event to the analytics table.
 * Works for both authenticated and anonymous users.
 * Uses fast getSession() to never block user action or hang on network latency.
 */
export async function trackEvent(
  eventName: EventName,
  category: EventCategory,
  targetId?: string,
  metadata?: Record<string, any>
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    const { error } = await supabase.from("analytics_events").insert({
      event_name: eventName,
      category,
      target_id: targetId || null,
      user_id: userId,
      metadata: {
        ...metadata,
        url: typeof window !== "undefined" ? window.location.pathname : undefined,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
    });

    if (error && !error.message?.includes("row-level security") && !error.message?.includes("violates")) {
      console.warn("[Analytics] Insert event warning:", error.message);
    }
  } catch (error: any) {
    if (!error?.message?.includes("row-level security")) {
      console.warn("[Analytics] Tracking failed:", error);
    }
  }
}

/**
 * Track a page view. Call this from the usePageTracker hook.
 */
export function trackPageView(pathname: string, title?: string) {
  // Derive a human-readable page category from the path
  const category = pathToCategory(pathname);
  const pageTitle = title || (typeof document !== "undefined" ? document.title : undefined);
  const pageUrl = typeof window !== "undefined" ? window.location.href : undefined;
  const referrer = typeof document !== "undefined" ? document.referrer : undefined;

  trackEvent("visit", category, undefined, {
    page: pathname,
    title: pageTitle,
    referrer,
  });

  // Google Analytics 4 (SPA virtual page view tracking per Google recommendations)
  if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
    (window as any).gtag("event", "page_view", {
      page_title: pageTitle,
      page_location: pageUrl,
      page_path: pathname + (window.location.search || ""),
      send_to: "G-6VPRYNK2TW",
    });
  }

  // Google Tag Manager dataLayer virtual page view
  if (typeof window !== "undefined" && Array.isArray((window as any).dataLayer)) {
    (window as any).dataLayer.push({
      event: "virtual_page_view",
      page_title: pageTitle,
      page_location: pageUrl,
      page_path: pathname + (window.location.search || ""),
    });
  }
}

export function isAutomatedOrNoiseQuery(query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  if (q.length < 2 || q.length > 80) return true;

  // Filter automated test queries, throwaway strings, random tokens, and timestamps
  if (
    q.includes("e2e") ||
    q.includes("throwaway") ||
    q.includes("voucher 178") ||
    q.includes("test-") ||
    q.includes("temp_") ||
    q.includes("cypress") ||
    q.includes("playwright") ||
    q.includes("puppeteer") ||
    q.includes("selenium") ||
    /^[0-9a-f-]{16,}$/i.test(q) ||
    /^\d{10,}/.test(q) ||
    /\b\d{10,}\b/.test(q)
  ) {
    return true;
  }

  return false;
}

/**
 * Track a search query, call this when a user submits a search.
 */
export function trackSearch(query: string, category: EventCategory = "System", resultCount?: number) {
  if (!query?.trim() || isAutomatedOrNoiseQuery(query)) return;
  trackEvent("search", category, undefined, {
    query: query.trim().toLowerCase(),
    result_count: resultCount,
  });
}

function pathToCategory(path: string): EventCategory {
  if (path === "/" || path === "") return "Homepage";
  if (path.startsWith("/examdumps") || path.startsWith("/exam-dumps")) return "ExamDump";
  if (path.startsWith("/yatristore") || path.startsWith("/store") || path.startsWith("/yatri-store") || path.startsWith("/mypurchases")) return "Store";
  if (path.startsWith("/resources") || path.startsWith("/myresources")) return "Resource";
  if (path.startsWith("/events") || path.startsWith("/upcoming-event") || path.startsWith("/myevents")) return "Event";
  if (path.startsWith("/training") || path.startsWith("/mytrainings") || path.startsWith("/udemy") || path.startsWith("/student")) return "Training";
  if (path.startsWith("/mentorship") || path.startsWith("/become-mentor") || path.startsWith("/mentor")) return "Mentorship";
  if (path.startsWith("/blog")) return "Blog";
  if (path.startsWith("/jobs") || path.startsWith("/job")) return "Job";
  if (path.startsWith("/certification") || path.startsWith("/certified") || path.startsWith("/achievements") || path.startsWith("/paths") || path.startsWith("/certificate")) return "Certification";
  if (path.startsWith("/community") || path.startsWith("/reviews") || path.startsWith("/feedback")) return "Community";
  if (path.startsWith("/support") || path.startsWith("/contact-us")) return "Support";
  if (path.startsWith("/resume-maker") || path.startsWith("/requestvoucher")) return "Tool";
  return "Page";
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin retrieval queries
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalEvents: number;
  totalDownloads: number;
  totalViews: number;
  totalSearches: number;
  totalEnrollments: number;
  totalPurchases: number;
  uniqueVisitors: number;
  eventsByDate: { date: string; downloads: number; views: number; other: number }[];
  topResources: { target_id: string; count: number; name?: string }[];
  topPages: { page: string; count: number }[];
  topSearches: { query: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
}

export async function getAnalyticsSummary(days: number = 30): Promise<AnalyticsSummary | null> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    // Fetch all events in the time range in one query (up to 5000 events)
    const { data: events, error } = await supabase
      .from("analytics_events")
      .select("event_name, category, target_id, metadata, created_at, user_id")
      .gte("created_at", sinceStr)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error) throw error;
    if (!events) return null;

    // ── Aggregate metrics ─────────────────────────────────────────────────
    let totalDownloads = 0;
    let totalViews = 0;
    let totalSearches = 0;
    let totalEnrollments = 0;
    let totalPurchases = 0;
    const uniqueUserIds = new Set<string>();
    const uniqueVisitorIds = new Set<string>();
    const dateMap: Record<string, { date: string; downloads: number; views: number; other: number }> = {};
    const resourceCounts: Record<string, number> = {};
    const pageCounts: Record<string, number> = {};
    const searchCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    // Pre-fill date map so chart is continuous
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      dateMap[ds] = { date: ds, downloads: 0, views: 0, other: 0 };
    }

    const metadataNameMap: Record<string, string> = {};

    for (const ev of events) {
      if (ev.user_id) uniqueUserIds.add(ev.user_id);
      const visitorId = ev.user_id || ev.metadata?.session_id || ev.metadata?.user_agent || ev.metadata?.ip;
      if (visitorId) uniqueVisitorIds.add(visitorId);

      const ds = ev.created_at.split("T")[0];

      // Save any names present in event metadata as instant cache
      if (ev.target_id) {
        const metaName = ev.metadata?.name || ev.metadata?.title || ev.metadata?.resource_name || ev.metadata?.exam_title;
        if (metaName && typeof metaName === "string") {
          metadataNameMap[ev.target_id] = metaName;
        }
      }

      // Event type aggregation
      if (ev.event_name === "download") {
        totalDownloads++;
        if (dateMap[ds]) dateMap[ds].downloads++;
        const target = ev.target_id || ev.metadata?.name || ev.metadata?.title;
        if (target) {
          resourceCounts[target] = (resourceCounts[target] || 0) + 1;
          if (ev.metadata?.name && !metadataNameMap[target]) {
            metadataNameMap[target] = ev.metadata.name;
          } else if (ev.metadata?.title && !metadataNameMap[target]) {
            metadataNameMap[target] = ev.metadata.title;
          }
        }
      } else if (ev.event_name === "visit") {
        totalViews++;
        if (dateMap[ds]) dateMap[ds].views++;
        const page = ev.metadata?.page || "unknown";
        pageCounts[page] = (pageCounts[page] || 0) + 1;
      } else if (ev.event_name === "search") {
        const q = ev.metadata?.query ? String(ev.metadata.query).trim().toLowerCase() : "";
        if (q && !isAutomatedOrNoiseQuery(q)) {
          totalSearches++;
          searchCounts[q] = (searchCounts[q] || 0) + 1;
        }
      } else if (ev.event_name === "enroll") {
        totalEnrollments++;
        if (dateMap[ds]) dateMap[ds].other++;
      } else if (ev.event_name === "purchase") {
        totalPurchases++;
        if (dateMap[ds]) dateMap[ds].other++;
      } else {
        if (dateMap[ds]) dateMap[ds].other++;
      }

      // Category breakdown
      if (ev.category) categoryCounts[ev.category] = (categoryCounts[ev.category] || 0) + 1;
    }

    // ── Top resources (with names resolved) ───────────────────────────────
    const topResourceEntries = Object.entries(resourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => ({
        target_id: id,
        count,
        name: metadataNameMap[id] || id
      }));

    if (topResourceEntries.length > 0) {
      const ids = topResourceEntries.map((r) => r.target_id);
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuidIds = ids.filter((id) => uuidPattern.test(id));

      if (uuidIds.length > 0) {
        // 1. Fetch from `resources` table (column name is `name`)
        try {
          const { data: resourceRows } = await supabase
            .from("resources")
            .select("id, name")
            .in("id", uuidIds);

          if (resourceRows && resourceRows.length > 0) {
            resourceRows.forEach((r: any) => {
              if (r.name) metadataNameMap[r.id] = r.name;
            });
          }
        } catch (err) {
          console.warn("[Analytics] Could not query resources table:", err);
        }

        // 2. Fetch from `exam_dumps` table (column name is `title`)
        try {
          const { data: dumpRows } = await supabase
            .from("exam_dumps")
            .select("id, title")
            .in("id", uuidIds);

          if (dumpRows && dumpRows.length > 0) {
            dumpRows.forEach((d: any) => {
              if (d.title) metadataNameMap[d.id] = d.title;
            });
          }
        } catch (err) {
          console.warn("[Analytics] Could not query exam_dumps table:", err);
        }
      }

      // Apply resolved names
      topResourceEntries.forEach((r) => {
        if (metadataNameMap[r.target_id]) {
          r.name = metadataNameMap[r.target_id];
        } else if (r.target_id === "redis") {
          r.name = "Redis Certified Developer";
        }
      });
    }

    // ── Top pages ─────────────────────────────────────────────────────────
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));

    // ── Top searches ──────────────────────────────────────────────────────
    const topSearches = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // ── Category breakdown ────────────────────────────────────────────────
    const categoryBreakdown = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    return {
      totalEvents: events.length,
      totalDownloads,
      totalViews,
      totalSearches,
      totalEnrollments,
      totalPurchases,
      uniqueVisitors: uniqueVisitorIds.size || uniqueUserIds.size,
      eventsByDate: Object.values(dateMap),
      topResources: topResourceEntries,
      topPages,
      topSearches,
      categoryBreakdown,
    };
  } catch (error) {
    console.error("Failed to load analytics summary:", error);
    return null;
  }
}
