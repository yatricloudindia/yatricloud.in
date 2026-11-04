import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Small, self-contained pagination control shared by every browsable list
 * (admin tables, public catalogs, personal dashboards). Renders nothing when
 * there is only a single page. Pure view control, the caller owns the page
 * state and slices its already-filtered/sorted array.
 */
export interface ListPagerProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function ListPager({ page, pageCount, onPageChange, className }: ListPagerProps) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className={cn("mt-8 flex items-center justify-center gap-3", className)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-[40px] gap-1 rounded-xl"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>
      <span className="text-sm font-medium tabular-nums text-muted-foreground" aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-[40px] gap-1 rounded-xl"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
