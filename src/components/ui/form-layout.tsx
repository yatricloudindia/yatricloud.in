import * as React from "react";

import { cn } from "@/lib/utils";

/** Grey "(optional)" tag that sits after a label's text. */
export function OptionalTag({ className }: { className?: string }) {
  return <span className={cn("ml-1 font-normal text-muted-foreground", className)}>(optional)</span>;
}

/** Small muted helper line under a field. */
export function Hint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-[13px] text-muted-foreground", className)} {...props} />;
}

/**
 * A group of fields in a long form. Sections after the first get a top hairline.
 * Wrap a run of sections in a parent with `space-y-6`.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-border pt-6 first:border-t-0 first:pt-0", className)}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

/** Class string for a field label used in public forms. */
export const fieldLabel = "mb-1.5 block text-sm font-medium text-foreground";
