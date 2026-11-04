import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, Search, Trash2, Edit, ExternalLink, Filter } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchExamDumps, deleteExamDump, ExamDump, getProviderMeta, normalizeProviderSlug } from "@/lib/exam-dumps";
import { toast } from "sonner";

const AdminExamDumps = () => {
  const navigate = useNavigate();
  const { showConfirm: confirm } = useConfirm();
  const [dumps, setDumps] = useState<ExamDump[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("all");

  useEffect(() => {
    loadDumps();
  }, []);

  const loadDumps = async () => {
    try {
      setIsLoading(true);
      const data = await fetchExamDumps();
      setDumps(data);
    } catch (error) {
      console.error("Error loading dumps:", error);
      toast.error("Failed to load exam dumps");
    } finally {
      setIsLoading(false);
    }
  };

  const providersList = useMemo(() => {
    const map = new Map<string, { label: string; count: number; slug: string }>();
    for (const d of dumps) {
      const pSlug = normalizeProviderSlug(d.provider) || "other";
      const meta = getProviderMeta(d.provider);
      const existing = map.get(pSlug);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(pSlug, { label: meta.shortName || d.provider, count: 1, slug: pSlug });
      }
    }
    return Array.from(map.values());
  }, [dumps]);

  const filteredDumps = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return dumps.filter((dump) => {
      const pSlug = normalizeProviderSlug(dump.provider);
      if (selectedProviderFilter !== "all" && pSlug !== selectedProviderFilter) {
        return false;
      }
      if (!q) return true;
      return (
        dump.title.toLowerCase().includes(q) ||
        dump.provider.toLowerCase().includes(q) ||
        (dump.description || "").toLowerCase().includes(q)
      );
    });
  }, [dumps, searchTerm, selectedProviderFilter]);

  const handleDelete = async (id: string, title: string) => {
    if (
      !(await confirm({
        title: `Delete ${title}?`,
        description: "Are you sure you want to delete this exam dump? This action cannot be undone.",
      }))
    )
      return;

    try {
      await deleteExamDump(id);
      toast.success("Exam dump deleted successfully");
      loadDumps();
    } catch (error) {
      console.error("Error deleting dump:", error);
      toast.error("Failed to delete exam dump");
    }
  };

  return (
    <div className="px-4 md:px-8 py-8 md:py-10">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header band, distinct workspace panel */}
        <div className="relative overflow-hidden rounded-3xl border border-brand-700 bg-gradient-to-br from-brand-700 via-primary to-brand-600 p-6 text-white shadow-lg md:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">Manage exam dumps</h1>
                <Badge variant="outline" className="rounded-full border-white/30 text-white bg-white/10">{dumps.length} total</Badge>
              </div>
              <p className="text-sm text-white/80">
                Verified practice question sets categorized by certification provider.
              </p>
            </motion.div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                asChild
                className="rounded-xl min-h-[44px] border-white/40 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/examdumps" target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" /> View Public Hub
                </Link>
              </Button>
              <Button
                onClick={() => navigate("/admin/exam-dumps/add")}
                className="min-h-[44px] rounded-xl bg-white text-primary hover:bg-white/90 font-semibold shadow-md focus-visible:ring-2 focus-visible:ring-white"
              >
                <Plus className="mr-2 h-4 w-4" /> Add New Dump
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and Provider Pills */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search dumps by title or provider..."
                className="pl-10 min-h-[44px] rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Provider Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              size="sm"
              variant={selectedProviderFilter === "all" ? "default" : "outline"}
              onClick={() => setSelectedProviderFilter("all")}
              className="rounded-full text-xs min-h-[34px]"
            >
              All Providers ({dumps.length})
            </Button>
            {providersList.map((p) => (
              <Button
                key={p.slug}
                size="sm"
                variant={selectedProviderFilter === p.slug ? "default" : "outline"}
                onClick={() => setSelectedProviderFilter(p.slug)}
                className="rounded-full text-xs min-h-[34px] flex items-center gap-1.5"
              >
                <span>{p.label}</span>
                <span className="opacity-70 text-[11px] tabular-nums">({p.count})</span>
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading exam dumps...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDumps.map((dump) => {
              const meta = getProviderMeta(dump.provider);
              return (
                <Card
                  key={dump.id}
                  className="overflow-hidden border border-border rounded-2xl bg-card hover:border-brand-200 hover:shadow-card transition"
                >
                  <CardContent className="p-5 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted/50 border border-border/80 p-1 flex items-center justify-center">
                          {dump.image ? (
                            <img src={dump.image} alt={dump.title} className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground uppercase">{dump.provider.slice(0, 3)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-base text-foreground leading-snug">{dump.title}</h3>
                            <Badge className="rounded-full bg-primary text-white hover:bg-primary/90 text-xs font-semibold border-transparent">
                              {dump.provider}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span>
                              Offer Price: <span className="font-bold tabular-nums text-foreground">₹{dump.price.toLocaleString("en-IN")}</span>
                            </span>
                            {dump.originalPrice > dump.price && (
                              <span className="line-through tabular-nums">
                                ₹{dump.originalPrice.toLocaleString("en-IN")}
                              </span>
                            )}
                            <Link
                              to={`/examdumps/${meta.slug}`}
                              target="_blank"
                              className="text-primary hover:underline flex items-center gap-1 text-xs"
                            >
                              <code>/examdumps/{meta.slug}</code>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl hover:bg-brand-50 hover:text-primary"
                          aria-label={`Edit ${dump.title}`}
                          onClick={() => navigate(`/admin/exam-dumps/edit/${dump.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          aria-label={`Delete ${dump.title}`}
                          onClick={() => handleDelete(dump.id, dump.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredDumps.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-16 border border-border rounded-2xl bg-card">
                <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center mb-4">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight">No exam dumps found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {searchTerm
                    ? "No dumps match your search criteria. Try another keyword or clear the provider filter."
                    : selectedProviderFilter !== "all"
                    ? `No dumps have been added for ${selectedProviderFilter.toUpperCase()} yet.`
                    : "Add your first certification exam dump to get started."}
                </p>
                <div className="mt-5 flex gap-3">
                  {selectedProviderFilter !== "all" && (
                    <Button variant="outline" onClick={() => setSelectedProviderFilter("all")} className="rounded-xl min-h-[44px]">
                      Show All Providers
                    </Button>
                  )}
                  <Button
                    onClick={() => navigate("/admin/exam-dumps/add")}
                    className="min-h-[44px] rounded-xl bg-primary text-primary-foreground shadow-inset-btn hover:bg-brand-600"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add New Dump
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminExamDumps;
