import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          // Same signature blue statement card as the Radix toasts.
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:border-white/15 group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-primary group-[.toaster]:via-primary group-[.toaster]:to-brand-600 group-[.toaster]:p-4 group-[.toaster]:text-white group-[.toaster]:shadow-toast-brand",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:tracking-tight group-[.toast]:text-white",
          description: "group-[.toast]:text-sm group-[.toast]:text-white/85",
          actionButton:
            "group-[.toast]:rounded-xl group-[.toast]:bg-white/15 group-[.toast]:font-medium group-[.toast]:text-white group-[.toast]:hover:bg-white/25",
          cancelButton:
            "group-[.toast]:rounded-xl group-[.toast]:bg-white/10 group-[.toast]:font-medium group-[.toast]:text-white/80",
          closeButton:
            "group-[.toast]:border-white/20 group-[.toast]:bg-white/10 group-[.toast]:text-white/80 group-[.toast]:hover:text-white",
          success: "[&_[data-icon]]:text-white",
          error:
            "group-[.toaster]:!from-destructive group-[.toaster]:!via-destructive group-[.toaster]:!to-[hsl(0_72%_42%)] [&_[data-icon]]:text-white",
          warning: "[&_[data-icon]]:text-white",
          info: "[&_[data-icon]]:text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
