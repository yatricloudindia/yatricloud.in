import { useState, useEffect, useMemo } from "react";
import {
  Loader2, ArrowRight, Search, ChevronRight, Building2,
  Sparkles, Compass, Users, Calendar
} from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/sections/Footer";
import { SEO } from "@/components/SEO";
import PageHero from "@/components/PageHero";
import { ExamDumpCard } from "@/components/exam-dumps/ExamDumpCard";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { CartSheet } from "@/components/store/CartSheet";
import { MobileCartBar } from "@/components/store/MobileCartBar";
import {
  fetchExamDumps,
  ExamDump,
  getProviderMeta,
  normalizeProviderSlug,
  KNOWN_EXAM_PROVIDERS,
} from "@/lib/exam-dumps";
import { listResources, type Resource } from "@/lib/resources-api";
import { CENTRAL_PROVIDERS_LIST } from "@/lib/central-providers";
import { useSiteContent, getSiteStats, statValue, FALLBACK_STATS } from "@/lib/site-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ListPager } from "@/components/ui/list-pager";
import { useSearchTracker } from "@/hooks/usePageTracker";

const PAGE_SIZE = 9;

const ExamDumps = () => {
  const navigate = useNavigate();
  const { provider: urlProvider } = useParams<{ provider?: string }>();
  const trackSearch = useSearchTracker("ExamDump");

  const [dumps, setDumps] = useState<ExamDump[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const siteStats = useSiteContent(getSiteStats, FALLBACK_STATS);
  const learners = statValue(siteStats, "learners", "50K+");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);

  // Normalize provider slug from URL
  const activeProviderSlug = urlProvider ? normalizeProviderSlug(urlProvider) : "all";
  const isProviderSpecific = activeProviderSlug !== "all" && Boolean(urlProvider);
  const activeProviderMeta = isProviderSpecific ? getProviderMeta(activeProviderSlug) : null;

  useEffect(() => {
    setPage(1);
  }, [activeProviderSlug, search, sort]);

  useEffect(() => {
    const loadDumps = async () => {
      try {
        setIsLoading(true);
        const [fetchedDumps, fetchedResources] = await Promise.all([
          fetchExamDumps(),
          listResources().catch(() => []),
        ]);
        setDumps(fetchedDumps);
        setAllResources(fetchedResources);
      } catch (error) {
        console.error("Error loading exam dumps:", error);
        setDumps([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadDumps();
  }, []);

  // Compute all available providers present in current dumps + centralized recognized providers
  const providerTabs = useMemo(() => {
    const countsBySlug = new Map<string, number>();
    for (const d of dumps) {
      const slug = normalizeProviderSlug(d.provider) || "other";
      countsBySlug.set(slug, (countsBySlug.get(slug) || 0) + 1);
    }

    // Include all central standard providers
    const prominentSlugs = CENTRAL_PROVIDERS_LIST.map((p) => p.slug);
    const allSlugs = Array.from(new Set([...prominentSlugs, ...Array.from(countsBySlug.keys())]));

    const result: Array<{ slug: string; name: string; count: number; logoUrl?: string; badge?: string }> = [
      { slug: "all", name: "All", count: dumps.length },
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
  }, [dumps]);

  // Filter and sort dumps
  const filteredDumps = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = dumps.filter((d) => {
      if (isProviderSpecific) {
        const dSlug = normalizeProviderSlug(d.provider);
        if (dSlug !== activeProviderSlug) return false;
      }

      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.provider.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q)
      );
    });

    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "name") sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [isProviderSpecific, activeProviderSlug, search, sort, dumps]);

  const relatedResources = useMemo(() => {
    if (isProviderSpecific) {
      const match = allResources.filter(
        (r) => normalizeProviderSlug(r.provider) === activeProviderSlug
      );
      if (match.length > 0) return match;
    }
    return allResources.slice(0, 4);
  }, [allResources, isProviderSpecific, activeProviderSlug]);

  const pageCount = Math.max(1, Math.ceil(filteredDumps.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedDumps = filteredDumps.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // SEO Configurations
  const pageTitle = isProviderSpecific && activeProviderMeta
    ? `${activeProviderMeta.name} Practice Exams · Verified Practice Questions | Yatri Cloud`
    : "Verified Practice Exams · AWS, Azure, GCP | Yatri Cloud";

  const pageDescription = isProviderSpecific && activeProviderMeta
    ? activeProviderMeta.description
    : "Real, verified practice exams and questions for AWS, Azure, GCP, and Kubernetes certifications. Practice with the same style of questions and pass on your first attempt.";

  const canonicalUrl = isProviderSpecific && activeProviderMeta
    ? `https://www.yatricloud.com/examdumps/${activeProviderMeta.slug}`
    : "https://www.yatricloud.com/examdumps";

  return (
    <>
      <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
        <SEO
          title={pageTitle}
          description={pageDescription}
          canonical={canonicalUrl}
          breadcrumbs={[
            { name: "Home", url: "/" },
            { name: "Practice Exams", url: "/examdumps" },
            ...(isProviderSpecific && activeProviderMeta
              ? [{ name: activeProviderMeta.name, url: `/examdumps/${activeProviderMeta.slug}` }]
              : []),
          ]}
          faqs={[
            {
              question: `What are ${isProviderSpecific && activeProviderMeta ? activeProviderMeta.name : "Cloud"} Practice Exams?`,
              answer: "Verified exam practice questions curated by certified architects with real exam scenarios, verified answer keys, and technical explanations."
            },
            {
              question: "How frequently are the exam questions updated?",
              answer: "Our question bank is reviewed weekly to align with the latest vendor syllabus updates."
            }
          ]}
          jsonLd={
            dumps.length > 0
              ? {
                  "@context": "https://schema.org",
                  "@type": "ItemList",
                  name: isProviderSpecific && activeProviderMeta ? `${activeProviderMeta.name} Practice Exams` : "Verified Cloud Certification Practice Exams",
                  itemListElement: filteredDumps.slice(0, 20).map((d, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    name: d.title,
                    url: canonicalUrl,
                  })),
                }
              : undefined
          }
        />
        <div className="noise-overlay" />
        <Navbar />

        {/* ── Breadcrumb Bar (if on provider page) ── */}
        {isProviderSpecific && activeProviderMeta && (
          <div className="border-b border-border/60 bg-muted/20 pt-[4.75rem] md:pt-[5.75rem] pb-3">
            <div className="container mx-auto max-w-7xl px-4 md:px-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              <Link to="/examdumps" className="hover:text-primary transition-colors">Practice Exams</Link>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              <span className="text-foreground font-semibold">{activeProviderMeta.name}</span>
            </div>
          </div>
        )}

        {/* ── Hero Section ── */}
        <section className={`${isProviderSpecific ? "pt-6 md:pt-8" : "pt-28 md:pt-32"} pb-8 md:pb-10`}>
          <div className="container mx-auto max-w-7xl px-4 md:px-6 relative z-10">
            {isProviderSpecific && activeProviderMeta ? (
              <PageHero
                title={`${activeProviderMeta.name} Practice Exams`}
                description={activeProviderMeta.description}
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
                title="Pass on your first attempt"
                description="Verified practice materials for AWS, Azure, GCP & top cloud exams."
              >
                {/* How it works, clean 3-step pill timeline */}
                <ol className="flex flex-col items-start gap-3 text-xs sm:flex-row sm:items-center sm:gap-2 md:text-sm">
                  {[
                    "Pick your exam",
                    "Pay securely",
                    "Instant delivery",
                  ].map((step, i) => (
                    <li key={step} className="flex items-center">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full band-blue text-[11px] font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium text-primary">{step}</span>
                      </span>
                      {i < 2 && (
                        <span
                          aria-hidden="true"
                          className="mx-2 hidden h-px w-8 bg-white/40 sm:block"
                        />
                      )}
                    </li>
                  ))}
                </ol>
              </PageHero>
            )}
          </div>
        </section>

        {/* ── Sticky Provider Tabs & Filters Bar ── */}
        <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-xl border-b border-border/60 shadow-xs">
          {/* Provider Quick Jump Bar */}
          <div className="border-b border-border/40">
            <div className="container mx-auto px-4 md:px-6 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {providerTabs.map((tab) => {
                const isActive = tab.slug === "all" ? !isProviderSpecific : activeProviderSlug === tab.slug;
                const linkHref = tab.slug === "all" ? "/examdumps" : `/examdumps/${tab.slug}`;
                return (
                  <Button
                    key={tab.slug}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    asChild
                    className={`rounded-full text-xs min-h-[36px] whitespace-nowrap transition-all ${
                      isActive ? "shadow-inset-btn font-semibold" : "hover:bg-muted"
                    }`}
                  >
                    <Link to={linkHref} className="flex items-center">
                      {tab.logoUrl && (
                        <img src={tab.logoUrl} alt="" className="mr-2 h-4 w-4 shrink-0 object-contain" />
                      )}
                      <span>{tab.name}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Search, Sort and Cart */}
          <div className="container mx-auto px-4 md:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    trackSearch(e.target.value);
                  }}
                  placeholder={
                    isProviderSpecific && activeProviderMeta
                      ? `Search ${activeProviderMeta.shortName} dumps by exam code or name...`
                      : "Search dumps by exam, code or provider..."
                  }
                  aria-label="Search exam dumps"
                  className="h-10 rounded-full pl-9 bg-card/60"
                />
              </div>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-10 w-[170px] rounded-full hidden sm:flex" aria-label="Sort exam dumps">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{filteredDumps.length}</span> {filteredDumps.length === 1 ? "dump" : "dumps"} available
              </div>
              <CartSheet openOnBuy />
            </div>
          </div>
        </section>

        {/* ── Grid Section ── */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            {isLoading ? (
              <div className="text-center py-24">
                <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-semibold">Loading practice dumps…</h3>
              </div>
            ) : filteredDumps.length === 0 ? (
              <div className="text-center py-20 max-w-md mx-auto">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-primary">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="font-display text-2xl font-bold">
                  {isProviderSpecific && activeProviderMeta
                    ? `No ${activeProviderMeta.name} dumps yet`
                    : "No dumps found"}
                </h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {search
                    ? `No exam dumps match "${search}". Try a different keyword or view all providers.`
                    : `We are currently validating fresh question sets for this certification track. Tell us which exam you need and we will prioritize it.`}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {isProviderSpecific && (
                    <Button variant="outline" asChild className="rounded-xl min-h-[44px]">
                      <Link to="/examdumps">View All Providers</Link>
                    </Button>
                  )}
                  <Button onClick={() => navigate("/requestvoucher")} className="rounded-xl shadow-inset-btn min-h-[44px]">
                    Request a Dump <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pagedDumps.map((dump) => (
                    <ExamDumpCard key={dump.id} dump={dump} />
                  ))}
                </div>
                {pageCount > 1 && (
                  <div className="mt-12">
                    <ListPager page={currentPage} pageCount={pageCount} onPageChange={setPage} />
                  </div>
                )}
              </>
            )}

            {/* Cross-Link Recommendation Rail: Related Study Resources & Cheat Sheets */}
            {relatedResources.length > 0 && (
              <section className="mt-16 pt-12 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                      {isProviderSpecific && activeProviderMeta
                        ? `Official ${activeProviderMeta.name} Study Resources`
                        : "Popular Certification Study Materials"}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Review key concepts, architectural diagrams, and exam objectives before testing.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="rounded-xl shrink-0 gap-1.5 text-xs h-9">
                    <Link to={isProviderSpecific ? `/resources/${activeProviderSlug}` : "/resources"}>
                      <span>View all {isProviderSpecific && activeProviderMeta ? activeProviderMeta.name : ""} resources</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  {relatedResources.slice(0, 4).map((res) => (
                    <ResourceCard
                      key={res.id}
                      resource={res}
                      onAccess={(r) => {
                        const slug = normalizeProviderSlug(r.provider);
                        navigate(slug ? `/resources/${slug}?accessResource=${r.id}` : `/resources?accessResource=${r.id}`);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Next Steps on Your Certification Journey Banner */}
            <section className="mt-12 rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs overflow-hidden relative">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <Badge variant="secondary" className="text-xs font-medium px-2.5 py-0.5">Career Growth</Badge>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Level up with structured learning paths</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Follow multi-tier cloud certification tracks, join hands-on cohorts, and prepare for high-paying roles.
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
                    <Link to="/training" className="gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      <span>Live Cohorts</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </section>

        <Footer />
        <MobileCartBar />
      </div>
    </>
  );
};

export default ExamDumps;
