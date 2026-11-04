import { motion } from "framer-motion";
import { ShoppingCart, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { EntityReviews } from "@/components/reviews/EntityReviews";
import { ExamDump, getProviderGlowColor, normalizeProviderSlug } from "@/lib/exam-dumps";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ExamDumpCardProps {
  dump: ExamDump;
}

export const ExamDumpCard = ({ dump }: ExamDumpCardProps) => {
  const { addToCart, items } = useCart();
  const { formatInr } = useCurrency();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isInCart = items.some((i) => i.id === dump.id);

  const handleAddToCart = () => {
    // Adapter for cart context which expects StoreProduct
    const cartItem = {
      ...dump,
      discountedPrice: dump.price,
      category: dump.provider as any, // Cast for compatibility
      level: "Associate" as any, // Default for compatibility
      discount: Math.round(((dump.originalPrice - dump.price) / dump.originalPrice) * 100)
    };
    addToCart(cartItem as any);
  };

  // Buy Now means BUY now: add the item, then open the checkout sheet
  // immediately (the page's CartSheet or the floating pill listens; the
  // sessionStorage flag covers a lazily mounted listener).
  const handleBuyNow = () => {
    handleAddToCart();
    try {
      sessionStorage.setItem("yc:open-cart-pending", "1");
    } catch {
      /* private mode */
    }
    window.setTimeout(() => window.dispatchEvent(new Event("yc:open-cart")), 120);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className="group relative h-full flex flex-col rounded-2xl border border-slate-200/80 transition-all duration-300 hover:border-transparent outline-none focus:outline-none">
        {/* Static Soft Glow Layer */}
        <div 
          className="absolute -inset-1 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[24px] blur-xl"
          style={{ backgroundColor: getProviderGlowColor(dump.provider) }}
        />

        {/* Content Wrapper to mask inner shadow and clip corners */}
        <div className="relative z-10 flex flex-col flex-1 rounded-2xl overflow-hidden bg-card h-full">
        {/* Dump Image -- prominently scaled logo banner with clean subtle gradient backdrop */}
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          aria-label={`View details of ${dump.title}`}
          className="relative flex h-44 sm:h-48 md:h-52 w-full items-center justify-center overflow-hidden bg-gradient-to-b from-muted/50 via-muted/20 to-transparent p-4 sm:p-6 border-b border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <motion.img
            src={dump.image}
            alt={dump.title}
            className="h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        </button>

        <CardHeader className="flex-1 px-5 pt-4 pb-2">
          {dump.provider && dump.provider.toUpperCase() !== "OTHER" && (
            <div className="mb-2">
              <Link
                to={`/examdumps/${normalizeProviderSlug(dump.provider)}`}
                className="inline-flex items-center rounded-full border border-border bg-muted/80 px-2.5 py-0.5 text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              >
                {dump.provider}
              </Link>
            </div>
          )}

          <CardTitle className="text-lg font-bold leading-snug group-hover:text-primary transition-colors">
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="w-full rounded text-left line-clamp-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {dump.title}
            </button>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-5 pt-1 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {formatInr(dump.price)}
              </span>
              {dump.originalPrice > dump.price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatInr(dump.originalPrice)}
                </span>
              )}
            </div>

            {dump.originalPrice > dump.price && (
              <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-2xs">
                {Math.round(((dump.originalPrice - dump.price) / dump.originalPrice) * 100)}% OFF
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 p-5 pt-0">
          <div className="flex gap-2 w-full">
            <Button
              onClick={handleAddToCart}
              className="flex-1 font-semibold shadow-inset-btn gap-1.5"
              size="lg"
              variant={isInCart ? "secondary" : "default"}
            >
              {isInCart ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Added ({items.find(i => i.id === dump.id)?.quantity || 1})</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart</span>
                </>
              )}
            </Button>
            <Button
              onClick={handleBuyNow}
              variant="outline"
              size="lg"
              className="px-3.5 text-xs font-semibold shrink-0"
              title="Instant Checkout"
            >
              Buy Now
            </Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" size="sm">
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">{dump.title}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge>{dump.provider}</Badge>
                    <Badge variant="outline">Verified Dumps</Badge>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-border/60 h-48 sm:h-56 flex items-center justify-center bg-muted/30 p-6">
                  <img
                    src={dump.image}
                    alt={dump.title}
                    className="h-32 w-32 sm:h-36 sm:w-36 object-contain drop-shadow-md"
                  />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-foreground">
                    {formatInr(dump.price)}
                  </span>
                  {dump.originalPrice > dump.price && (
                    <span className="text-lg text-muted-foreground line-through">
                      {formatInr(dump.originalPrice)}
                    </span>
                  )}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {dump.description}
                  </p>
                </div>
                <div className="border-t border-border pt-4">
                  <h3 className="font-display font-semibold mb-3">Ratings & reviews</h3>
                  <EntityReviews
                    entityType="exam_dump"
                    entityId={dump.id}
                    entityName={dump.title}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
        </div>
      </Card>
    </motion.div>
  );
};
