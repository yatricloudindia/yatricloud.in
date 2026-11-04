import { motion, useReducedMotion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CartSheet } from "./CartSheet";

// Site-wide floating cart pill. Appears the moment the cart has items so a
// buyer can open the full checkout sheet from ANY page (homepage sections,
// exam dumps, …), not only the store. Presentation over existing cart state;
// App.tsx gates the mount (only when items exist, hidden where the store's
// own cart UI already lives) and lazy-loads this chunk.
const FloatingCart = () => {
  const { totalItems, totalPrice } = useCart();
  const { formatInr } = useCurrency();
  const reduce = useReducedMotion();

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <CartSheet
        openOnBuy
        trigger={
          <motion.button
            // Remount on count change so the pill pops again as feedback
            key={totalItems}
            initial={reduce ? false : { scale: 0.5, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            whileHover={reduce ? undefined : { scale: 1.04 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            aria-label={`Open cart and check out, ${totalItems} ${
              totalItems === 1 ? "item" : "items"
            } in cart`}
            className="flex min-h-[44px] items-center gap-3 rounded-full bg-primary py-2 pl-2.5 pr-6 text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-background px-1 text-[10px] font-bold text-primary">
                {totalItems}
              </span>
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[11px] font-medium opacity-90">
                {totalItems} {totalItems === 1 ? "item" : "items"} in cart
              </span>
              <span className="text-sm font-bold tabular-nums">
                Checkout · {formatInr(totalPrice)}
              </span>
            </span>
          </motion.button>
        }
      />
    </div>
  );
};

export default FloatingCart;
