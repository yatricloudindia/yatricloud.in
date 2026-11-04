import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CartSheet } from "./CartSheet";

export const MobileCartBar = () => {
  const { totalItems, totalPrice } = useCart();
  const { formatInr } = useCurrency();

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl shadow-lg"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Cart Info */}
          <CartSheet
            trigger={
              <Button
                variant="default"
                className="relative flex-1 h-12 justify-start gap-3 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ShoppingCart className="h-5 w-5" />
                <div className="flex flex-col items-start flex-1">
                  <span className="text-xs font-medium">
                    {totalItems > 0 ? `${totalItems} item${totalItems > 1 ? 's' : ''}` : 'Cart'}
                  </span>
                  {totalItems > 0 && (
                    <span className="text-sm font-bold">
                      {formatInr(totalPrice)}
                    </span>
                  )}
                </div>
                {totalItems > 0 && (
                  <Badge className="ml-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-2 border-primary/40 shadow-lg font-bold min-w-[24px] text-center hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-primary/60 hover:shadow-xl transition-all ring-2 ring-primary/10">
                    {totalItems}
                  </Badge>
                )}
              </Button>
            }
          />
        </div>
      </div>
    </motion.div>
  );
};
