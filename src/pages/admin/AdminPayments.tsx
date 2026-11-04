import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Search, Receipt, IndianRupee, Globe, Layers, Download, Lock } from "lucide-react";
import { usePermissions } from "@/lib/permissions-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsCard } from "@/components/admin/StatsCard";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfDay, endOfDay } from "date-fns";
import { getAllInvoices, formatInvoiceMoney, type Invoice } from "@/lib/invoices-api";




const KIND_ORDER = ["store", "event", "training", "mentorship", "other"] as const;
const KIND_LABEL: Record<string, string> = {
    store: "Store",
    event: "Events",
    training: "Training",
    mentorship: "Mentorship",
    other: "Other",
};

type RangeKey = "all" | "this_month" | "last_month" | "last_30" | "last_7" | "custom";
const RANGE_LABEL: Record<RangeKey, string> = {
    all: "All time",
    this_month: "This month",
    last_month: "Last month",
    last_30: "Last 30 days",
    last_7: "Last 7 days",
    custom: "Custom range",
};

/** Resolve a preset (or custom inputs) to a [start, end] window, or null for all time. */
function resolveRange(key: RangeKey, from: string, to: string): { start: Date; end: Date } | null {
    const now = new Date();
    switch (key) {
        case "this_month":
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case "last_month": {
            const lm = subMonths(now, 1);
            return { start: startOfMonth(lm), end: endOfMonth(lm) };
        }
        case "last_30":
            return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
        case "last_7":
            return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
        case "custom": {
            if (!from && !to) return null;
            // yyyy-MM-dd inputs: parse as local dates (a bare date string parses as UTC).
            const start = from ? startOfDay(new Date(`${from}T00:00:00`)) : new Date(0);
            const end = to ? endOfDay(new Date(`${to}T00:00:00`)) : endOfDay(now);
            return { start, end };
        }
        default:
            return null;
    }
}

export default function AdminPayments() {
    const navigate = useNavigate();
    const { role: userRole, loading: permissionsLoading } = usePermissions();
    const isSuper = userRole === "super_admin";

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [rangeKey, setRangeKey] = useState<RangeKey>("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    useEffect(() => {
        if (!isSuper) return;
        (async () => {
            setIsLoading(true);
            try {
                const internal = await getAllInvoices();
                setInvoices(internal);
            } catch (e) {
                console.error(e);
                toast.error("We could not load payments just now. Please try again.");
            } finally {
                setIsLoading(false);
            }
        })();
    }, [isSuper]);

    // Everything on the page is scoped to the chosen date window first, so the
    // stats, breakdowns, table and export always describe the same period.
    const dateFiltered = useMemo(() => {
        const range = resolveRange(rangeKey, customFrom, customTo);
        if (!range) return invoices;
        return invoices.filter((i) => {
            if (!i.createdAt) return false;
            const t = new Date(i.createdAt).getTime();
            return t >= range.start.getTime() && t <= range.end.getTime();
        });
    }, [invoices, rangeKey, customFrom, customTo]);

    // Revenue grouped by currency (amounts across currencies are never summed together).
    const revenueByCurrency = useMemo(() => {
        const map: Record<string, number> = {};
        for (const inv of dateFiltered) map[inv.currency] = (map[inv.currency] || 0) + inv.amount;
        return map;
    }, [dateFiltered]);

    const inrRevenue = revenueByCurrency.INR || 0;
    const otherCurrencyCount = useMemo(
        () => dateFiltered.filter((i) => i.currency !== "INR").length,
        [dateFiltered],
    );

    const byKind = useMemo(() => {
        const map: Record<string, number> = {};
        for (const inv of dateFiltered) map[inv.kind] = (map[inv.kind] || 0) + 1;
        return map;
    }, [dateFiltered]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return dateFiltered;
        return dateFiltered.filter(
            (i) =>
                i.buyerName.toLowerCase().includes(q) ||
                i.buyerEmail.toLowerCase().includes(q) ||
                i.number.toLowerCase().includes(q) ||
                i.kindLabel.toLowerCase().includes(q) ||
                i.items.some((it) => it.name.toLowerCase().includes(q)),
        );
    }, [dateFiltered, search]);

    const itemsSummary = (inv: Invoice) => {
        if (inv.items.length === 0) return inv.kindLabel;
        const first = inv.items[0].name;
        const more = inv.items.length - 1;
        return more > 0 ? `${first} and ${more} more` : first;
    };

    // Export the receipts currently in view (date range + search) as CSV.
    const exportCsv = () => {
        const esc = (v: string | number) => {
            let s = String(v ?? "");
            // Neutralise spreadsheet formula prefixes in text cells (buyer names etc.).
            if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
            // Quote when the value contains a comma, quote or newline; double inner quotes.
            return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const header = ["Date", "Receipt number", "Buyer name", "Buyer email", "Category", "Items", "Amount", "Currency"];
        const rows = filtered.map((inv) => [
            inv.createdAt ? format(new Date(inv.createdAt), "yyyy-MM-dd") : "",
            inv.number,
            inv.buyerName,
            inv.buyerEmail,
            inv.kindLabel,
            inv.items.map((it) => (it.quantity && it.quantity > 1 ? `${it.name} x${it.quantity}` : it.name)).join("; "),
            inv.amount,
            inv.currency,
        ]);
        // Prepend a BOM so Excel reads UTF-8 currency symbols correctly.
        const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yatri-cloud-receipts-${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const otherCurrencies = Object.entries(revenueByCurrency).filter(([c]) => c !== "INR");

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
                    Financial records, payment transactions, and revenue reports are strictly confidential and restricted to Super Administrators.
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
                    <h1 className="font-display text-3xl font-black tracking-tight">Payments and revenue</h1>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
                            <SelectTrigger className="h-10 w-[170px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
                                    <SelectItem key={k} value={k}>{RANGE_LABEL[k]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {rangeKey === "custom" && (
                            <>
                                <Input
                                    type="date"
                                    value={customFrom}
                                    max={customTo || undefined}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                    className="h-10 w-[150px]"
                                    aria-label="From date"
                                />
                                <span className="text-sm text-muted-foreground">to</span>
                                <Input
                                    type="date"
                                    value={customTo}
                                    min={customFrom || undefined}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                    className="h-10 w-[150px]"
                                    aria-label="To date"
                                />
                            </>
                        )}
                    </div>
                    {!isLoading && (
                        <p className="text-xs text-muted-foreground">
                            {dateFiltered.length} {dateFiltered.length === 1 ? "receipt" : "receipts"}
                            {rangeKey !== "all" ? ` in ${RANGE_LABEL[rangeKey].toLowerCase()}` : ""}
                        </p>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <StatsCard title="Total receipts" value={dateFiltered.length} icon={Receipt} color="bg-primary text-white" />
                        <StatsCard title="Revenue in INR" value={formatInvoiceMoney(inrRevenue, "INR")} icon={IndianRupee} color="bg-emerald-500 text-white border-0" />
                        <StatsCard title="Paid in other currencies" value={otherCurrencyCount} icon={Globe} color="bg-blue-500 text-white border-0" />
                        <StatsCard title="Categories" value={Object.keys(byKind).length} icon={Layers} color="bg-amber-500 text-white border-0" />
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Revenue by category</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {KIND_ORDER.filter((k) => byKind[k]).map((k) => (
                                    <div key={k} className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{KIND_LABEL[k]}</span>
                                        <span className="text-muted-foreground">{byKind[k]} {byKind[k] === 1 ? "receipt" : "receipts"}</span>
                                    </div>
                                ))}
                                {dateFiltered.length === 0 && <p className="text-sm text-muted-foreground">No receipts in this period.</p>}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Revenue by currency</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">Indian Rupee</span>
                                    <span className="font-semibold">{formatInvoiceMoney(inrRevenue, "INR")}</span>
                                </div>
                                {otherCurrencies.map(([code, amt]) => (
                                    <div key={code} className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{code}</span>
                                        <span className="font-semibold">{formatInvoiceMoney(amt, code)}</span>
                                    </div>
                                ))}
                                {otherCurrencies.length === 0 && (
                                    <p className="text-sm text-muted-foreground">All payments so far are in Indian Rupees.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <CardTitle className="text-base">All receipts</CardTitle>
                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search buyer, item or receipt number"
                                        className="pl-9"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={exportCsv}
                                    disabled={filtered.length === 0}
                                    title={search ? "Export the receipts matching your search" : "Export all receipts"}
                                >
                                    <Download className="h-4 w-4" /> Export CSV
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filtered.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    {dateFiltered.length === 0
                                        ? (invoices.length === 0 ? "No receipts have been generated yet." : "No receipts in this period.")
                                        : "No receipts match your search."}
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Receipt</TableHead>
                                                <TableHead>Buyer</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Item</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filtered.map((inv, i) => (
                                                <TableRow
                                                    key={inv.number || i}
                                                    className="cursor-pointer"
                                                    onClick={() => inv.number && navigate(`/receipt/${inv.number}`)}
                                                >
                                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                                        {inv.createdAt ? format(new Date(inv.createdAt), "dd MMM yyyy") : ""}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap font-mono text-xs">{inv.number}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{inv.buyerName || "Yatri"}</div>
                                                        <div className="text-xs text-muted-foreground">{inv.buyerEmail}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="border-primary/30 text-primary">
                                                            {inv.kindLabel}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-[220px] truncate">{itemsSummary(inv)}</TableCell>
                                                    <TableCell className="whitespace-nowrap text-right font-semibold">
                                                        {formatInvoiceMoney(inv.amount, inv.currency)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
