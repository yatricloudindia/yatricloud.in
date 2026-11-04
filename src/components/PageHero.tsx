import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BLUE_PANEL } from "@/components/home/blue-panel";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PageHeroProps {
  /** Page title, rendered as the page's h1. */
  title: ReactNode;
  /** One or two lines under the title. */
  description?: ReactNode;
  /** Buttons/links: right side on md+, stacked under the text on mobile. */
  actions?: ReactNode;
  /** Extra content inside the panel below the text (search bar, pills, filters). */
  children?: ReactNode;
  className?: string;
}

/**
 * Solid blue page header (yatri-school page panel). Left-aligned, sets no
 * width or margin: the caller puts it inside the same container as the
 * content below so the panel's edges line up with it.
 */
export default function PageHero({ title, description, actions, children, className }: PageHeroProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className={cn("band-blue relative overflow-hidden rounded-3xl px-6 py-8 text-white sm:px-10 sm:py-10", className)}
      style={{ backgroundImage: BLUE_PANEL }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border-[28px] border-white/10"
      />
      <div className="relative">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-white md:text-5xl">
              {title}
            </h1>
            {description ? (
              <div className="mt-3 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">{description}</div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
        {children ? <div className="mt-6 sm:mt-8">{children}</div> : null}
      </div>
    </motion.div>
  );
}
