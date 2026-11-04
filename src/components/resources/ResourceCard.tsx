import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { type Resource, getResourceProviderColor } from "@/lib/resources-api";
import { FALLBACK_PROVIDER_LOGOS } from "@/lib/cert-catalog";

interface ResourceCardProps {
  resource: Resource;
  isUnlocked?: boolean;
  onAccess: (resource: Resource) => void;
  isLoading?: boolean;
}

export function ResourceCard({ resource, isUnlocked, onAccess, isLoading }: ResourceCardProps) {
  const glowColor = getResourceProviderColor(resource.provider);
  const providerKey = resource.provider?.toLowerCase();
  const fallbackLogo = providerKey ? FALLBACK_PROVIDER_LOGOS[providerKey]?.logo : "";
  const displayImage =
    resource.imageUrl && !resource.imageUrl.includes("webassessor") && !resource.imageUrl.includes("REDIS_logo")
      ? resource.imageUrl
      : fallbackLogo || resource.imageUrl;

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-border hover:shadow-card"
      style={{ boxShadow: `0 0 0 0 ${glowColor}` }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 20px ${glowColor}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 0 ${glowColor}`;
      }}
    >
      {/* Thumbnail */}
      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-muted/20 p-3 sm:p-4">
        {displayImage ? (
          <img
            src={displayImage}
            alt={resource.name}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
        <div className="flex flex-col gap-1.5">
          {/* Category badge */}
          {resource.category && (
            <div className="flex items-center">
              <Badge variant="outline" className="rounded-full text-[10px] font-medium px-2 py-0.5">
                {resource.category}
              </Badge>
            </div>
          )}

          {/* Title + Free/Price Badge with dark blue bg */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-sm font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
              {resource.name}
            </h3>
            {resource.isFree ? (
              <Badge className="shrink-0 rounded-full bg-blue-950 text-blue-100 border border-blue-800 text-[10px] font-semibold px-2 py-0.5 shadow-2xs">
                Free
              </Badge>
            ) : (
              <Badge className="shrink-0 rounded-full bg-blue-950 text-blue-100 border border-blue-800 text-[10px] font-semibold px-2 py-0.5 shadow-2xs">
                ₹{resource.priceInr}
              </Badge>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => onAccess(resource)}
          disabled={isLoading}
          className="mt-1 w-full min-h-[36px] h-9 rounded-lg bg-primary text-primary-foreground shadow-inset-btn hover:bg-brand-600 font-semibold text-xs"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 000 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" className="opacity-75" />
              </svg>
              Unlocking…
            </span>
          ) : isUnlocked ? (
            <span>Access Now</span>
          ) : resource.isFree ? (
            <span>Access Now</span>
          ) : (
            <span>Purchase, ₹{resource.priceInr}</span>
          )}
        </Button>
      </div>
    </div>
  );
}
