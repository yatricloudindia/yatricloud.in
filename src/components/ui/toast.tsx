import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      // Top center on mobile, top right on desktop, visible without covering nav actions
      "fixed left-1/2 top-0 z-[100] flex max-h-screen w-full max-w-[420px] -translate-x-1/2 flex-col gap-3 p-4 sm:left-auto sm:right-0 sm:translate-x-0",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  // Signature blue statement card: brand gradient, white content, corner
  // spring entrance, one-off light sweep and a lifetime meter (index.css).
  // Destructive keeps its own deep red so danger still reads instantly.
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-4 pr-12 text-white shadow-toast-brand transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out data-[swipe=end]:animate-toast-out",
  {
    variants: {
      variant: {
        default: "border-white/15 bg-gradient-to-br from-primary via-primary to-brand-600",
        success: "success border-white/15 bg-gradient-to-br from-primary via-primary to-brand-600",
        destructive: "destructive border-white/15 bg-gradient-to-br from-destructive to-[hsl(0_72%_42%)] !shadow-toast-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const toastProgressVariants = cva(
  "pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] animate-toast-progress bg-gradient-to-r from-white/50 to-white/90 group-hover:[animation-play-state:paused]",
  {
    variants: {
      variant: {
        default: "",
        success: "",
        destructive: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/* Icon chip inferred from variant, no new required props */
const toastIconChipVariants = cva("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", {
  variants: {
    variant: {
      default: "bg-white/15 text-white",
      success: "bg-white/15 text-white",
      destructive: "bg-white/15 text-white",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const toastIcons = {
  default: CheckCircle2,
  success: CheckCircle2,
  destructive: AlertTriangle,
} as const;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  const Icon = toastIcons[variant ?? "default"];
  return (
    <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
      {/* One-off light sweep across the fresh card */}
      <span
        aria-hidden="true"
        className="animate-toast-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />
      <span aria-hidden="true" className={toastIconChipVariants({ variant })}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      {children}
      {/* Lifetime meter, pauses with Radix's own hover pause */}
      <span aria-hidden="true" className={toastProgressVariants({ variant })} />
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-9 shrink-0 items-center justify-center self-center rounded-xl border border-white/30 bg-white/10 px-3 text-sm font-medium text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      // 44px touch target; always visible on touch, revealed on hover/focus on desktop
      "absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-opacity hover:bg-white/10 hover:text-white focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 group-hover:opacity-100 sm:opacity-0",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-5 tracking-tight text-white", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm leading-5 text-white/85", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
