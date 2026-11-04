import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import {
  Loader2, Share2, Check, Copy, ChevronRight, Building2, Search,
  ArrowRight, Compass, Users, Calendar, BookOpen
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { SEO } from "@/components/SEO";
import PageHero from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ExamDumpCard } from "@/components/exam-dumps/ExamDumpCard";
import { LoginModal } from "@/components/LoginModal";
import {
  listResources,
  unlockResource,
  listMyResources,
  type Resource,
} from "@/lib/resources-api";
import { getStoredUser, isAuthenticated } from "@/lib/yatris-api";
import { trackEvent } from "@/lib/analytics";
import { ListPager } from "@/components/ui/list-pager";
import { useSearchTracker } from "@/hooks/usePageTracker";
import { normalizeProviderSlug, getProviderMeta, fetchExamDumps, ExamDump } from "@/lib/exam-dumps";
import { CENTRAL_PROVIDERS_LIST } from "@/lib/central-providers";

const PAGE_SIZE = 12;

export default function Resources() {
  const navigate = useNavigate();
  const { provider: urlProvider } = useParams<{ provider?: string }>();
  const trackSearch = useSearchTracker("Resource");
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [allExamDumps, setAllExamDumps] = useState<ExamDump[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(getStoredUser());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingResource, setPendingResource] = useState<Resource | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const handledPendingRef = useRef(false);

  // Active provider slug from URL param or query param
  const activeProviderSlug = useMemo(() => {
    const raw = urlProvider || searchParams.get("provider");
    return raw ? normalizeProviderSlug(raw) : "all";
  }, [urlProvider, searchParams]);

  const isProviderSpecific = activeProviderSlug !== "all";
  const activeProviderMeta = isProviderSpecific ? getProviderMeta(activeProviderSlug) : null;

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [freeFilter, setFreeFilter] = useState<"all" | "free" | "paid">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeProviderSlug, search, categoryFilter, freeFilter]);

  // Keep user in sync if changed in another tab or component
  useEffect(() => {
    const checkUser = () => {
      if (isAuthenticated()) {
        setUser(getStoredUser());
      } else {
        setUser(null);
      }
    };
    const interval = setInterval(checkUser, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [allRes, mine, allDumps] = await Promise.all([
          listResources(),
          user ? listMyResources() : Promise.resolve([]),
          fetchExamDumps().catch(() => []),
        ]);
        setResources(allRes);
        setUnlockedIds(new Set(mine.map((m) => m.resourceId)));
        setAllExamDumps(allDumps);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load resources");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleAccess = async (resource: Resource) => {
    // Track download intent immediately on click
    trackEvent("download", "Resource", resource.id, {
      name: resource.name,
      title: resource.name,
      provider: resource.provider,
      category: resource.category,
      is_free: resource.isFree,
    });

    // If already unlocked, open directly
    if (unlockedIds.has(resource.id)) {
      const mine = await listMyResources().catch(() => []);
      const found = mine.find((m) => m.resourceId === resource.id);
      if (found?.accessUrl) {
        window.open(found.accessUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    if (!user) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pending_access_resource_id", resource.id);
      }
      setPendingResource(resource);
      setShowLoginModal(true);
      return;
    }

    if (!resource.isFree) {
      toast.info("Paid resources, payment integration coming soon. Contact us to get access.");
      return;
    }

    setUnlockingId(resource.id);
    try {
      const accessUrl = await unlockResource(
        { id: resource.id, name: resource.name, description: resource.description, provider: resource.provider },
        user.email,
        user.fullName || "Yatri",
      );
      setUnlockedIds((prev) => new Set([...prev, resource.id]));
      toast.success("Access granted! Opening material…");
      window.open(accessUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to access resource");
    } finally {
      setUnlockingId(null);
    }
  };

  // Auto-access resource if redirected from login with pending access param
  useEffect(() => {
    const pendingId = searchParams.get("accessResource") || (typeof window !== "undefined" ? sessionStorage.getItem("pending_access_resource_id") : null);
    if (pendingId && user && !isLoading && resources.length > 0 && !handledPendingRef.current) {
      const target = resources.find((r) => r.id === pendingId);
      if (target) {
        handledPendingRef.current = true;
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("pending_access_resource_id");
        }
        if (searchParams.has("accessResource")) {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("accessResource");
          setSearchParams(newParams, { replace: true });
        }
        handleAccess(target);
      }
    }
  }, [user, isLoading, resources, searchParams]);

  // Provider tabs computation with counts
  const providerTabs = useMemo(() => {
    const countsBySlug = new Map<string, number>();
    for (const r of resources) {
      const slug = normalizeProviderSlug(r.provider) || "other";
      countsBySlug.set(slug, (countsBySlug.get(slug) || 0) + 1);
    }

    const prominentSlugs = CENTRAL_PROVIDERS_LIST.map((p) => p.slug);
    const allSlugs = Array.from(new Set([...prominentSlugs, ...Array.from(countsBySlug.keys())]));

    const result: Array<{ slug: string; name: string; count: number; logoUrl?: string; badge?: string }> = [
      { slug: "all", name: "All Certifications", count: resources.length },
    ];

    for (const slug of allSlugs) {
      const count = countsBySlug.get(slug) || 0;
      const meta = getProviderMeta(slug);
      result.push({
        slug,
        name: meta.shortName || meta.name,
        count,
        logoUrl: meta.logoUrl,
        badge: meta.badge,
      });
    }

    return result;
  }, [resources]);

  const categories = useMemo(() => {
    const set = new Set(resources.map((r) => r.category).filter(Boolean));
    return Array.from(set).sort();
  }, [resources]);

  const handleProviderChange = (slugOrName: string) => {
    const targetSlug = slugOrName === "all" ? "all" : normalizeProviderSlug(slugOrName);
    if (targetSlug === "all") {
      navigate("/resources");
    } else {
      navigate(`/resources/${targetSlug}`);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Shareable link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return resources.filter((r) => {
      if (isProviderSpecific && normalizeProviderSlug(r.provider) !== activeProviderSlug) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (freeFilter === "free" && !r.isFree) return false;
      if (freeFilter === "paid" && r.isFree) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q) && !r.provider.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [resources, search, isProviderSpecific, activeProviderSlug, categoryFilter, freeFilter]);

  const relatedDumps = useMemo(() => {
    if (isProviderSpecific) {
      const match = allExamDumps.filter(
        (d) => normalizeProviderSlug(d.provider) === activeProviderSlug
      );
      if (match.length > 0) return match;
    }
    return allExamDumps.slice(0, 3);
  }, [allExamDumps, isProviderSpecific, activeProviderSlug]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageTitle = isProviderSpecific && activeProviderMeta
    ? `${activeProviderMeta.name} Certification Resources & Study Guides | Yatri Cloud`
    : "Resources | Yatri Cloud";

  const pageDescription = isProviderSpecific && activeProviderMeta
    ? `Free and premium ${activeProviderMeta.name} study guides, cheat sheets, practice questions, and exam preparation resources curated for tech professionals.`
    : "Free and premium exam guides, practice tests, cheat sheets and more curated for cloud and tech certification learners.";

  const canonicalUrl = isProviderSpecific && activeProviderMeta
    ? `https://www.yatricloud.com/resources/${activeProviderMeta.slug}`
    : "https://www.yatricloud.com/resources";

  const handleLoginSuccess = async (loggedInUser: any) => {
    setUser(loggedInUser);
    setShowLoginModal(false);
    toast.success(`Welcome, ${loggedInUser.fullName || "Yatri"}!`);

    try {
      const mine = await listMyResources();
      setUnlockedIds(new Set(mine.map((m) => m.resourceId)));

      if (pendingResource) {
        trackEvent("download", "Resource", pendingResource.id, {
          name: pendingResource.name,
          title: pendingResource.name,
          provider: pendingResource.provider,
          category: pendingResource.category,
        });

        const found = mine.find((m) => m.resourceId === pendingResource.id);
        if (found?.accessUrl) {
          window.open(found.accessUrl, "_blank", "noopener,noreferrer");
        } else if (pendingResource.isFree) {
          setUnlockingId(pendingResource.id);
          const accessUrl = await unlockResource(
            { id: pendingResource.id, name: pendingResource.name, description: pendingResource.description, provider: pendingResource.provider },
            loggedInUser.email,
            loggedInUser.fullName || "Yatri",
          );
          setUnlockedIds((prev) => new Set([...prev, pendingResource.id]));
          toast.success("Access granted! Opening material…");
          window.open(accessUrl, "_blank", "noopener,noreferrer");
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to access resource");
    } finally {
      setUnlockingId(null);
      setPendingResource(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonical={canonicalUrl}
      />
      <Navbar />

      <main className="pt-16 md:pt-20 pb-12">
        {/* Breadcrumbs for provider-specific URLs */}
        {isProviderSpecific && activeProviderMeta && (
          <div className="border-b border-border/40 bg-muted/20">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                <Link to="/resources" className="hover:text-foreground transition-colors">Resources</Link>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                <span className="text-foreground font-semibold">{activeProviderMeta.name}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="h-7 text-xs px-2 rounded-lg gap-1.5 hover:bg-card border border-border/60"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? "Copied!" : "Share Link"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Hero */}
        <section className={`bg-background ${isProviderSpecific && activeProviderMeta ? "pt-6 md:pt-8" : "pt-12"} pb-8 md:pb-10`}>
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
            {isProviderSpecific && activeProviderMeta ? (
              <PageHero
                title={`${activeProviderMeta.name} Study Resources`}
                description={activeProviderMeta.description || `Verified study materials, guides, and cheat sheets for ${activeProviderMeta.name} certifications.`}
                actions={
                  activeProviderMeta.logoUrl ? (
                    <div className="inline-flex items-center justify-center rounded-2xl bg-white p-3 sm:p-4">
                      <img
                        src={activeProviderMeta.logoUrl}
                        alt={activeProviderMeta.name}
                        className="h-10 w-10 object-contain sm:h-12 sm:w-12"
                      />
                    </div>
                  ) : undefined
                }
              />
            ) : (
              <PageHero
                title="Certification Study Guides & Practice Resources"
                description="Free and premium exam guides, cheat sheets, and practice materials for cloud certifications."
              />
            )}
          </div>
        </section>

        {/* Sticky Provider Quick Jump Bar */}
        <section className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b border-border shadow-xs">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {providerTabs.map((tab) => {
              const isActive = tab.slug === "all" ? !isProviderSpecific : activeProviderSlug === tab.slug;
              const linkHref = tab.slug === "all" ? "/resources" : `/resources/${tab.slug}`;
              return (
                <Button
                  key={tab.slug}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  asChild
                  className={`rounded-full text-xs min-h-[34px] whitespace-nowrap transition-all ${
                    isActive ? "shadow-inset-btn font-semibold" : "hover:bg-muted"
                  }`}
                >
                  <Link to={linkHref} className="flex items-center gap-1.5">
                    {tab.logoUrl && (
                      <img src={tab.logoUrl} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
                    )}
                    <span>{tab.name}</span>
                    {tab.count > 0 && (
                      <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </Link>
                </Button>
              );
            })}
          </div>
        </section>

        {/* Filters + Grid */}
        <section className="container mx-auto max-w-7xl px-4 sm:px-6 py-6">
          {/* Filter bar */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search resources…"
                className="pl-9 min-h-[38px] h-9.5 rounded-lg text-xs sm:text-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  trackSearch(e.target.value);
                }}
              />
            </div>

            {/* Certification Provider Dropdown */}
            <Select value={activeProviderSlug} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-full sm:w-[190px] min-h-[38px] h-9.5 rounded-lg text-xs sm:text-sm">
                <SelectValue placeholder="All Certifications" />
              </SelectTrigger>
              <SelectContent>
                {providerTabs.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Resource Type */}
            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[160px] min-h-[38px] h-9.5 rounded-lg text-xs sm:text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Free / Paid */}
            <div className="flex gap-1.5">
              {(["all", "free", "paid"] as const).map((v) => (
                <Button
                  key={v}
                  variant={freeFilter === v ? "default" : "outline"}
                  onClick={() => setFreeFilter(v)}
                  className="min-h-[38px] h-9.5 rounded-lg capitalize text-xs px-3"
                  size="sm"
                >
                  {v === "all" ? "All" : v === "free" ? "Free" : "Paid"}
                </Button>
              ))}
            </div>

            {/* Share / Copy Filter URL */}
            {isProviderSpecific && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="min-h-[38px] h-9.5 rounded-lg text-xs px-3 gap-1.5"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>{copiedLink ? "Copied" : "Share URL"}</span>
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-primary mb-3" />
              <p className="text-xs text-muted-foreground">Loading resources…</p>
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-border rounded-xl bg-card text-center px-4">
              <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h2 className="font-display text-base font-semibold tracking-tight">
                {isProviderSpecific && activeProviderMeta
                  ? `No ${activeProviderMeta.name} resources found yet`
                  : "No resources found"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {search || categoryFilter !== "all" || freeFilter !== "all"
                  ? "Try adjusting your filters or search keywords."
                  : isProviderSpecific
                  ? `New ${activeProviderMeta?.name} study materials are currently being prepared and curated. Check back soon!`
                  : "Resources are being added, check back soon!"}
              </p>
              {isProviderSpecific && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/resources")}
                  className="mt-4 rounded-lg text-xs"
                >
                  View All Resources
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {paged.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    isUnlocked={unlockedIds.has(r.id)}
                    onAccess={handleAccess}
                    isLoading={unlockingId === r.id}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8">
                  <ListPager page={page} pageCount={totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}

          {/* Cross-Link Recommendation Rail: Related Exam Practice Dumps */}
          {relatedDumps.length > 0 && (
            <section className="mt-14 pt-10 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {isProviderSpecific && activeProviderMeta
                      ? `Verified ${activeProviderMeta.name} Practice Exam Dumps`
                      : "Popular Certification Practice Dumps"}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Test yourself with real question sets, verified answers, and detailed explanations.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="rounded-xl shrink-0 gap-1.5 text-xs h-9">
                  <Link to={isProviderSpecific ? `/examdumps/${activeProviderSlug}` : "/examdumps"}>
                    <span>View all {isProviderSpecific && activeProviderMeta ? activeProviderMeta.name : ""} dumps</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {relatedDumps.slice(0, 3).map((dump) => (
                  <ExamDumpCard key={dump.id} dump={dump} />
                ))}
              </div>
            </section>
          )}

          {/* Next Steps on Your Certification Journey Banner */}
          <section className="mt-12 rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs overflow-hidden relative">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <Badge variant="secondary" className="text-xs font-medium px-2.5 py-0.5">Next Steps</Badge>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Need a structured path to get certified?</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Follow curated certification roadmaps, join live masterclasses, and connect with certified peers in the Yatri community.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild className="rounded-xl shadow-xs text-xs sm:text-sm h-10">
                  <Link to="/paths" className="gap-1.5">
                    <Compass className="h-4 w-4" />
                    <span>Explore Career Paths</span>
                  </Link>
                </Button>
                <Button variant="outline" asChild className="rounded-xl text-xs sm:text-sm h-10">
                  <Link to="/community" className="gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>Join Community</span>
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="rounded-xl text-xs sm:text-sm h-10">
                  <Link to="/events" className="gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Live Events</span>
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </section>
      </main>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingResource(null);
        }}
        onSuccess={handleLoginSuccess}
      />

      <Footer />
    </div>
  );
}
