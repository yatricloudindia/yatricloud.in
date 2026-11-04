import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, Search, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminListResources, deleteResource, type Resource } from "@/lib/resources-api";
import { toast } from "sonner";

const AdminResources = () => {
  const navigate = useNavigate();
  const { showConfirm: confirm } = useConfirm();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [providerFilter, setProviderFilter] = useState("All");
  const [freeFilter, setFreeFilter] = useState<"all" | "free" | "paid">("all");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      setResources(await adminListResources());
    } catch {
      toast.error("Failed to load resources");
    } finally {
      setIsLoading(false);
    }
  };

  const providers = ["All", ...Array.from(new Set(resources.map((r) => r.provider).filter(Boolean))).sort()];

  const filtered = resources.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    if (providerFilter !== "All" && r.provider !== providerFilter) return false;
    if (freeFilter === "free" && !r.isFree) return false;
    if (freeFilter === "paid" && r.isFree) return false;
    if (q && !r.name.toLowerCase().includes(q) && !r.provider.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) return false;
    return true;
  });

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirm({ title: "Delete Resource?", description: `Are you sure you want to delete "${name}"? This cannot be undone.` }))) return;
    try {
      await deleteResource(id);
      toast.success("Resource deleted");
      load();
    } catch {
      toast.error("Failed to delete resource");
    }
  };

  return (
    <div className="px-4 md:px-8 py-8 md:py-10">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-brand-700 bg-gradient-to-br from-brand-700 via-primary to-brand-600 p-6 text-white shadow-lg md:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1.5">
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">Manage resources</h1>
              <p className="text-sm text-white/80">
                {resources.length} resource{resources.length !== 1 ? "s" : ""}, free and paid learning materials.
              </p>
            </motion.div>
            <Button
              onClick={() => navigate("/admin/resources/add")}
              className="w-fit min-h-[44px] rounded-xl bg-white text-primary hover:bg-white/90 font-semibold shadow-md focus-visible:ring-2 focus-visible:ring-white"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Resource
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, provider or category…"
              className="pl-10 min-h-[44px] rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[150px] min-h-[44px] rounded-xl">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            {(["all", "free", "paid"] as const).map((v) => (
              <Button
                key={v}
                variant={freeFilter === v ? "default" : "outline"}
                onClick={() => setFreeFilter(v)}
                className="min-h-[44px] rounded-xl capitalize"
                size="sm"
              >
                {v === "all" ? "All" : v === "free" ? "Free" : "Paid"}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading resources…</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((r) => (
              <Card key={r.id} className="overflow-hidden border border-border rounded-2xl bg-card hover:border-brand-200 hover:shadow-card transition">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      {r.imageUrl ? (
                        <img src={r.imageUrl} alt={r.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40 text-2xl">📄</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold truncate">{r.name}</h3>
                        {r.provider && (
                          <Badge className="rounded-full bg-primary text-white text-xs font-medium border-transparent hover:bg-primary/10">
                            {r.provider}
                          </Badge>
                        )}
                        {r.isFree ? (
                          <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs border-transparent">Free</Badge>
                        ) : (
                          <Badge className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs border-transparent">₹{r.priceInr}</Badge>
                        )}
                        {!r.isPublished && (
                          <Badge variant="outline" className="rounded-full text-xs">Draft</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {r.category && <span>{r.category}</span>}
                        <span className="capitalize">{r.resourceType}</span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="rounded-xl hover:bg-brand-50 hover:text-primary"
                        aria-label={`Edit ${r.name}`}
                        onClick={() => navigate(`/admin/resources/edit/${r.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        aria-label={`Delete ${r.name}`}
                        onClick={() => handleDelete(r.id, r.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-16 border border-border rounded-2xl bg-card">
                <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center mb-4">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight">No resources yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {searchTerm ? "No resources match your search." : "Add your first resource to get started."}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => navigate("/admin/resources/add")}
                    className="mt-5 min-h-[44px] rounded-xl bg-primary text-primary-foreground shadow-inset-btn hover:bg-brand-600"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Resource
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminResources;
