import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Search , Trash, MoreHorizontal, Lock } from "lucide-react";
import { usePermissions } from "@/lib/permissions-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { ListPager } from "@/components/ui/list-pager";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";

const PAGE_SIZE = 15;

interface Coupon {
    id: string;
    code: string;
    percent_off: number;
    applies_to: string;
    max_uses: number | null;
    used_count: number;
    expires_at: string | null;
    active: boolean;
    created_at: string;
    entity_type: string | null;
    entity_id: string | null;
    entity_label: string | null;
}

const SCOPE_LABELS: Record<string, string> = { all: "Everything", training: "Trainings", event: "Events", store: "Store" };

/** Which table feeds the "pin to one item" picker for each scope. */
const SCOPE_ITEMS: Record<string, { table: string; nameCol: string; entityType: string }> = {
    event: { table: "events", nameCol: "name", entityType: "event" },
    training: { table: "trainings", nameCol: "course_title", entityType: "training" },
    store: { table: "products", nameCol: "title", entityType: "product" },
};

const EMPTY = { code: "", percent_off: "10", applies_to: "all", max_uses: "", expires_at: "", entity_id: "", entity_label: "" };

export default function AdminCoupons() {
    const { role: userRole, loading: permissionsLoading } = usePermissions();
    const isSuper = userRole === "super_admin";

    const { showConfirm: confirm } = useConfirm();
    const [rows, setRows] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [scopeFilter, setScopeFilter] = useState("all-scopes");
    const [page, setPage] = useState(1);

    useEffect(() => { setPage(1); }, [search, scopeFilter]);

    const load = async () => {
        if (!isSuper) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("coupons")
            .select("*")
            .order("created_at", { ascending: false });
        if (error) toast.error("Could not load coupons: " + error.message);
        else if (Array.isArray(data)) setRows(data as Coupon[]);
        setLoading(false);
    };
    useEffect(() => { if (isSuper) load(); }, [isSuper]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((c) => {
            if (scopeFilter !== "all-scopes" && c.applies_to !== scopeFilter) return false;
            if (!q) return true;
            return c.code.toLowerCase().includes(q);
        });
    }, [rows, search, scopeFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Items for the optional "pin to one item" picker, fetched per scope.
    const [scopeItems, setScopeItems] = useState<{ id: string; label: string }[]>([]);
    useEffect(() => {
        const src = SCOPE_ITEMS[form.applies_to];
        if (!src || !dialogOpen) { setScopeItems([]); return; }
        let alive = true;
        supabase
            .from(src.table)
            .select(`id, ${src.nameCol}`)
            .order(src.nameCol, { ascending: true })
            .then(({ data }) => {
                if (!alive) return;
                setScopeItems(((data || []) as any[]).map((r) => ({ id: r.id, label: r[src.nameCol] || "(untitled)" })));
            });
        return () => { alive = false; };
    }, [form.applies_to, dialogOpen]);

    const openAdd = () => { setEditId(null); setForm({ ...EMPTY }); setDialogOpen(true); };
    const openEdit = (c: Coupon) => {
        setEditId(c.id);
        setForm({
            code: c.code,
            percent_off: String(c.percent_off),
            applies_to: c.applies_to,
            max_uses: c.max_uses ? String(c.max_uses) : "",
            // Local calendar date (saved as local 23:59:59), not the UTC date prefix.
            expires_at: c.expires_at ? format(new Date(c.expires_at), "yyyy-MM-dd") : "",
            entity_id: c.entity_id || "",
            entity_label: c.entity_label || "",
        });
        setDialogOpen(true);
    };

    const save = async () => {
        const code = form.code.trim().toUpperCase().replace(/\s+/g, "");
        const percent = Number(form.percent_off);
        if (!code) { toast.error("Give the coupon a code."); return; }
        if (!percent || percent < 1 || percent > 100) { toast.error("Percent off must be between 1 and 100."); return; }
        setSaving(true);
        const src = SCOPE_ITEMS[form.applies_to];
        const pinned = src && form.entity_id ? form.entity_id : null;
        const payload = {
            code,
            percent_off: percent,
            applies_to: form.applies_to,
            max_uses: form.max_uses.trim() ? Number(form.max_uses) || null : null,
            expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null,
            entity_type: pinned ? src.entityType : null,
            entity_id: pinned,
            entity_label: pinned ? form.entity_label || null : null,
        };
        const { error } = editId
            ? await supabase.from("coupons").update(payload).eq("id", editId)
            : await supabase.from("coupons").insert({ ...payload, active: true });
        setSaving(false);
        if (error) {
            toast.error(error.message.includes("duplicate") ? "That code already exists." : error.message);
            return;
        }
        toast.success(editId ? "Coupon updated." : "Coupon created.");
        setDialogOpen(false);
        load();
    };

    const toggleActive = async (c: Coupon) => {
        const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
        if (error) { toast.error(error.message); return; }
        setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    };

    const remove = async (c: Coupon) => {
        if (!(await confirm({ title: "Delete Coupon?", description: `Delete coupon "${c.code}"? This cannot be undone.` }))) return;
        const { error } = await supabase.from("coupons").delete().eq("id", c.id);
        if (error) { toast.error(error.message); return; }
        setRows((prev) => prev.filter((x) => x.id !== c.id));
        toast.success("Coupon deleted.");
    };

    const usageLabel = (c: Coupon) =>
        c.max_uses ? `${c.used_count} / ${c.max_uses}` : `${c.used_count} used`;

    const isExpired = (c: Coupon) => !!c.expires_at && new Date(c.expires_at) < new Date();

    if (permissionsLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!isSuper) {
        return (
            <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Super Admin Access Required</h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Discount coupons and promotional codes impact platform revenue and are strictly managed by Super Administrators.
                </p>
                <div className="pt-2">
                    <Button asChild variant="outline">
                        <Link to="/admin">Return to Dashboard</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-8 md:py-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-black tracking-tight">Coupons</h1>
                </div>
                <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> New coupon</Button>
            </div>

            <Card>
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">All coupons</CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:w-56">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search codes" className="pl-9 h-9" />
                        </div>
                        <Select value={scopeFilter} onValueChange={setScopeFilter}>
                            <SelectTrigger className="h-9 w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-scopes">All scopes</SelectItem>
                                <SelectItem value="all">Everything</SelectItem>
                                <SelectItem value="training">Trainings</SelectItem>
                                <SelectItem value="event">Events</SelectItem>
                                <SelectItem value="store">Store</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : filtered.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {rows.length === 0 ? "No coupons yet. Create your first discount code." : "No coupons match your search."}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Discount</TableHead>
                                        <TableHead>Applies to</TableHead>
                                        <TableHead>Usage</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paged.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                                            <TableCell>{c.percent_off}% off</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {SCOPE_LABELS[c.applies_to] || c.applies_to}
                                                {c.entity_label && (
                                                    <span className="ml-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                                                        {c.entity_label}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="tabular-nums text-muted-foreground">{usageLabel(c)}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Never"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    isExpired(c) ? "border-border text-muted-foreground"
                                                        : c.active ? "border-success/30 text-success"
                                                        : "border-border text-muted-foreground"
                                                }>
                                                    {isExpired(c) ? "Expired" : c.active ? "Active" : "Paused"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => toggleActive(c)}>{c.active ? "Pause" : "Resume"}</Button>
                                                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => remove(c)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                                                
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <ListPager page={currentPage} pageCount={pageCount} onPageChange={setPage} />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>{editId ? "Edit coupon" : "New coupon"}</DialogTitle>
                        <DialogDescription>Yatris enter this code at checkout to get the discount.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="cp-code">Code</Label>
                            <Input id="cp-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="YATRI10" className="font-mono uppercase" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cp-percent">Percent off</Label>
                                <Input id="cp-percent" type="number" min={1} max={100} value={form.percent_off} onChange={(e) => setForm({ ...form, percent_off: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Applies to</Label>
                                <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v, entity_id: "", entity_label: "" })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Everything</SelectItem>
                                        <SelectItem value="training">Trainings only</SelectItem>
                                        <SelectItem value="event">Events only</SelectItem>
                                        <SelectItem value="store">Store only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {SCOPE_ITEMS[form.applies_to] && (
                            <div className="space-y-1.5">
                                <Label>Limit to one item (optional)</Label>
                                <Select
                                    value={form.entity_id || "any"}
                                    onValueChange={(v) => {
                                        if (v === "any") setForm({ ...form, entity_id: "", entity_label: "" });
                                        else setForm({ ...form, entity_id: v, entity_label: scopeItems.find((i) => i.id === v)?.label || "" });
                                    }}
                                >
                                    <SelectTrigger data-testid="cp-entity"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-64">
                                        <SelectItem value="any">Whole {SCOPE_LABELS[form.applies_to].toLowerCase()} scope</SelectItem>
                                        {scopeItems.map((i) => (
                                            <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Pinned codes only work when that exact item is in the checkout, and the discount applies to it alone.
                                </p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cp-max">Max uses (empty = unlimited)</Label>
                                <Input id="cp-max" type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cp-exp">Expires (empty = never)</Label>
                                <Input id="cp-exp" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={save} disabled={saving} className="gap-2">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
