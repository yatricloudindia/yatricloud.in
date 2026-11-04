import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { getInvoiceByNumber, formatInvoiceMoney, type Invoice } from "@/lib/invoices-api";
import { format } from "date-fns";

export default function ReceiptView() {
    const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                setInvoice(await getInvoiceByNumber(invoiceNumber || ""));
            } finally {
                setIsLoading(false);
            }
        })();
    }, [invoiceNumber]);

    const dateLabel = invoice?.createdAt ? format(new Date(invoice.createdAt), "PPP") : "";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <SEO title={`Receipt ${invoiceNumber} | Yatri Cloud`} description="Your Yatri Cloud purchase receipt" />
            <div className="print:hidden">
                <Navbar />
            </div>

            <main className="pt-24 pb-12 print:pt-0">
                <div className="container mx-auto px-4 md:px-6 max-w-2xl">
                    <div className="print:hidden">
                        <Button
                            variant="ghost"
                            className="gap-2 mb-6 pl-0 hover:pl-2 transition-all"
                            onClick={() => navigate("/profile/purchases")}
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to My Receipts
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : !invoice ? (
                        <div className="text-center py-16 border rounded-xl bg-muted/10">
                            <h3 className="text-xl font-semibold mb-2">Receipt not found</h3>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                We could not find this receipt on your account. It may belong to a different account, or the link may be incorrect.
                            </p>
                            <Button onClick={() => navigate("/profile/purchases")}>Back to My Receipts</Button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex items-center justify-between print:hidden">
                                <h1 className="text-2xl font-bold">Receipt</h1>
                                <Button onClick={() => window.print()} className="gap-2">
                                    <Download className="w-4 h-4" /> Download
                                </Button>
                            </div>

                            {/* The receipt itself. Kept self contained so it prints cleanly. */}
                            <div className="rounded-xl border border-border bg-card p-6 md:p-8 print:border-0 print:p-0">
                                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
                                    <div>
                                        <div className="text-xl font-bold text-primary">Yatri Cloud</div>
                                        <p className="mt-1 text-sm text-muted-foreground">Master IT Certifications</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-muted-foreground">Receipt number</div>
                                        <div className="font-semibold">{invoice.number}</div>
                                        <div className="mt-1 text-sm text-muted-foreground">{dateLabel}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Billed to</div>
                                        <div className="mt-1 font-semibold">{invoice.buyerName || "Yatri"}</div>
                                        {invoice.buyerEmail && (
                                            <div className="text-sm text-muted-foreground">{invoice.buyerEmail}</div>
                                        )}
                                    </div>
                                    <div className="sm:text-right">
                                        <div className="text-sm font-medium text-muted-foreground">Category</div>
                                        <div className="mt-1 font-semibold">{invoice.kindLabel}</div>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-lg border border-border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/50 text-left">
                                                <th className="px-4 py-3 font-semibold">Item</th>
                                                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(invoice.items.length ? invoice.items : [{ name: invoice.kindLabel }]).map((it, i) => (
                                                <tr key={i} className="border-t border-border">
                                                    <td className="px-4 py-3">{it.name}</td>
                                                    <td className="px-4 py-3 text-right">{it.quantity ?? 1}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
                                    <div className="text-base font-semibold">Total paid</div>
                                    <div className="text-2xl font-bold">
                                        {formatInvoiceMoney(invoice.amount, invoice.currency)}
                                    </div>
                                </div>

                                <p className="mt-6 text-center text-xs text-muted-foreground">
                                    Thank you for learning with Yatri Cloud. This receipt confirms your payment was received.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </main>

            <div className="print:hidden">
                <Footer />
            </div>
        </div>
    );
}
