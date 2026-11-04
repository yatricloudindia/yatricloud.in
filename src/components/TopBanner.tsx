import { Link } from "react-router-dom";
import { ANNOUNCEMENT } from "@/config/announcement";

export function TopBanner() {
  if (!ANNOUNCEMENT.enabled || !ANNOUNCEMENT.message) {
    return null;
  }

  const isInternalLink = ANNOUNCEMENT.linkHref && ANNOUNCEMENT.linkHref.startsWith("/");

  return (
    <div
      role="region"
      aria-label="Maintenance Announcement"
      className="w-full bg-primary text-primary-foreground text-[11px] sm:text-xs font-medium py-1.5 px-3 border-b border-primary-foreground/10 shadow-xs relative z-50 transition-all"
    >
      <div className="container mx-auto flex items-center justify-center gap-1.5 text-center flex-wrap">
        {ANNOUNCEMENT.badge && (
          <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
            {ANNOUNCEMENT.badge}
          </span>
        )}
        <span className="leading-tight">{ANNOUNCEMENT.message}</span>
        {ANNOUNCEMENT.linkHref && ANNOUNCEMENT.linkText && (
          isInternalLink ? (
            <Link
              to={ANNOUNCEMENT.linkHref}
              className="underline font-semibold hover:opacity-90 transition-opacity ml-1 shrink-0"
            >
              {ANNOUNCEMENT.linkText}
            </Link>
          ) : (
            <a
              href={ANNOUNCEMENT.linkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:opacity-90 transition-opacity ml-1 shrink-0"
            >
              {ANNOUNCEMENT.linkText}
            </a>
          )
        )}
      </div>
    </div>
  );
}
