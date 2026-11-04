import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    color: string;
    subtitle?: string;
}

export const StatsCard = ({ title, value, icon: Icon, color, subtitle }: StatsCardProps) => {
    // One brand accent (blue on white) for every stat, matching the table
    // headers. `color` stays in the props so existing callers keep compiling,
    // but it no longer drives the ink: callers passed "text-white", which
    // rendered white-on-white inside the blue page banners.
    void color;
    const textClass = "text-primary";
    const barClass = "bg-primary";

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-card-foreground transition-all duration-200 hover:border-brand-200 hover:shadow-card"
        >
            {/* Large, faint editorial watermark instead of a boxed icon tile */}
            <Icon
                aria-hidden="true"
                strokeWidth={1.5}
                className={`pointer-events-none absolute -right-5 -top-5 h-28 w-28 opacity-[0.06] transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.12] ${textClass}`}
            />

            <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
                <p className="mt-3 font-display text-4xl font-black tracking-tight tabular-nums text-primary">{value}</p>
                {subtitle && (
                    <p className="mt-1 text-xs text-muted-foreground font-medium">{subtitle}</p>
                )}
                <span className={`mt-4 block h-1 w-12 rounded-full ${barClass}`} />
            </div>
        </motion.div>
    );
};
