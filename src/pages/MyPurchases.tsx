import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Receipt, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { SEO } from "@/components/SEO";
import { getStoredUser } from "@/lib/yatris-api";
import { getMyInvoices, formatInvoiceMoney, type Invoice } from "@/lib/invoices-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ListPager } from "@/components/ui/list-pager";

const PAGE_SIZE = 10;
import { toast } from "sonner";
import { format } from "date-fns";

export default function MyPurchases() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("newest");
    const [page, setPage] = useState(1);

    useEffect(() => { setPage(1); }, [search, sort]);

    useEffect(() => {
        const stored = getStoredUser();
        if (stored) setUser(stored);
        else setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!user) { setIsLoading(false); return; }
        (async () => {
            setIsLoading(true);
            try {
                setInvoices(await getMyInvoices());
            } catch (e) {
                console.error(e);
                toast.error("We could not load your receipts just now. Please try again.");
            } finally {
                setIsLoading(false);
            }
        })();
    }, [user]);

    const itemsSummary = (inv: Invoice) => {
        if (inv.items.length === 0) return inv.kindLabel;
        const first = inv.items[0].name;
        const more = inv.items.length - 1;
        return more > 0 ? `${first} and ${more} more` : first;
    };

    const query = search.trim().toLowerCase();
    const matched = query
        ? invoices.filter((inv) =>
            (inv.kindLabel || "").toLowerCase().includes(query) ||
            (inv.number || "").toLowerCase().includes(query) ||
            inv.items.some((it) => (it.name || "").toLowerCase().includes(query))
        )
        : invoices;
    const time = (inv: Invoice) => (inv.createdAt ? new Date(inv.createdAt).getTime() : 0);
    const filteredInvoices = [...matched].sort((a, b) => {
        if (sort === "oldest") return time(a) - time(b);
        if (sort === "amount-desc") return b.amount - a.amount;
        if (sort === "amount-asc") return a.amount - b.amount;
        return time(b) - time(a); // newest
    });
    const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pagedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <SEO title="My Receipts | Yatri Cloud" description="View and download receipts for your purchases" />
            <Navbar />

            <main className="pt-24 pb-12">
                <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                    <Button
                        variant="ghost"
                        className="gap-2 mb-6 pl-0 hover:pl-2 transition-all"
                        onClick={() => navigate("/manage-certifications")}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Button>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">My Receipts</h1>
                        <p className="text-muted-foreground text-lg">
                            Every purchase you have made, in one place. Open any receipt to view or download it.
                        </p>
                    </motion.div>

                    {!isLoading && invoices.length > 0 && (
                        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative w-full max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search receipts by item or number"
                                    aria-label="Search receipts"
                                    className="h-10 pl-9"
                                />
                            </div>
                            <Select value={sort} onValueChange={setSort}>
                                <SelectTrigger className="h-10 w-full sm:w-[180px]" aria-label="Sort receipts">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest first</SelectItem>
                                    <SelectItem value="oldest">Oldest first</SelectItem>
                                    <SelectItem value="amount-desc">Amount: high to low</SelectItem>
                                    <SelectItem value="amount-asc">Amount: low to high</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-16 border rounded-xl bg-muted/10">
                            <Receipt className="w-14 h-14 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold mb-2">No receipts yet</h3>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                When you buy a course, join a paid event, or pick up something from the store, your receipt will show up here.
                            </p>
                            <Button onClick={() => navigate("/examdumps")}>Browse practice exams</Button>
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No receipts match your search.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pagedInvoices.map((inv, index) => (
                                <motion.button
                                    key={inv.number || index}
                                    type="button"
                                    onClick={() => navigate(`/receipt/${inv.number}`)}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                                    className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted min-h-[44px]"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate font-semibold">{itemsSummary(inv)}</span>
                                            <Badge variant="outline" className="border-primary/30 text-primary">
                                                {inv.kindLabel}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {inv.createdAt ? format(new Date(inv.createdAt), "PPP") : ""} · Receipt {inv.number}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <div className="font-bold">{formatInvoiceMoney(inv.amount, inv.currency)}</div>
                                        <div className="text-xs font-medium text-primary">View receipt</div>
                                    </div>
                                </motion.button>
                            ))}
                            <ListPager page={currentPage} pageCount={pageCount} onPageChange={setPage} />
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
