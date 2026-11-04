import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { listPublishedTrainings } from "@/lib/training-api";
import { getAllEvents } from "@/lib/events-store";
import { fetchStoreProducts } from "@/lib/store-products";
import { FEATURE_FLAGS } from "@/config/features";

/**
 * Site-wide global search command palette (Cmd/Ctrl+K or Cmd/Ctrl+F).
 * Performs direct search across store products and active catalog items.
 */
interface SearchEntry {
    group: string;
    label: string;
    hint?: string;
    to: string;
}

// Loaded once per session, shared across palette opens.
let cachedEntries: SearchEntry[] | null = null;

async function loadEntries(): Promise<SearchEntry[]> {
    if (cachedEntries) return cachedEntries;
    const [trainings, events, products] = await Promise.all([
        FEATURE_FLAGS.trainings ? listPublishedTrainings().catch(() => []) : Promise.resolve([]),
        FEATURE_FLAGS.events ? getAllEvents().catch(() => []) : Promise.resolve([]),
        fetchStoreProducts().catch(() => []),
    ]);

    const entries: SearchEntry[] = [
        ...(FEATURE_FLAGS.trainings
            ? trainings
                .filter((t) => t.visibility !== "private")
                .map((t) => ({
                    group: "Trainings",
                    label: t.courseName,
                    hint: t.price,
                    to: `/training/${t.slug || t.id}`,
                }))
            : []),
        ...(FEATURE_FLAGS.events
            ? events
                .filter((e) => e.visibility !== "private" && e.status !== "draft")
                .map((e) => ({
                    group: "Events",
                    label: e.name,
                    hint: e.location?.type === "online" ? "Online" : e.location?.city || "",
                    to: `/events/${e.slug || e.id}`,
                }))
            : []),
    ];
    cachedEntries = entries;
    return entries;
}

const GROUP_ORDER = [
    "Store",
    ...(FEATURE_FLAGS.trainings ? ["Trainings"] : []),
    ...(FEATURE_FLAGS.events ? ["Events"] : []),
];

export function GlobalSearch({ isLightText }: { isLightText?: boolean } = {}) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [entries, setEntries] = useState<SearchEntry[]>([]);
    const [loaded, setLoaded] = useState(false);

    // Cmd+K / Ctrl+K and Cmd+F / Ctrl+F opens the global search palette from anywhere.
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if ((key === "k" || key === "f") && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Load the search index the first time the palette opens.
    useEffect(() => {
        if (!open || loaded) return;
        loadEntries().then((all) => {
            setEntries(all);
            setLoaded(true);
        });
    }, [open, loaded]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setSearchQuery("");
        }
    };

    const go = useCallback((to: string) => {
        setOpen(false);
        setSearchQuery("");
        navigate(to);
    }, [navigate]);

    return (
        <>
            {/* Icon-only trigger so the header nav keeps its full width */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="Search (⌘K or ⌘F)"
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isLightText
                        ? "border border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                        : "border border-border bg-card text-muted-foreground hover:border-brand-200 hover:bg-brand-50 hover:text-primary"
                }`}
            >
                <Search className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Search (⌘K or ⌘F)</span>
            </button>

            <CommandDialog open={open} onOpenChange={handleOpenChange}>
                <CommandInput
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    placeholder="Search certifications, trainings, vouchers… (⌘K or ⌘F)"
                />
                <CommandList>
                    {searchQuery.trim().length > 0 && (
                        <>
                            <CommandEmpty>No results found. Try searching by provider (AWS, Azure, GCP) or exam title.</CommandEmpty>
                            {GROUP_ORDER.map((group) => {
                                const items = entries.filter((e) => e.group === group);
                                if (items.length === 0) return null;
                                return (
                                    <div key={group}>
                                        <CommandGroup heading={group}>
                                            {items.map((entry, i) => (
                                                <CommandItem
                                                    key={`${group}-${entry.label}-${i}`}
                                                    value={`${entry.label} ${entry.hint || ""} ${group}`}
                                                    onSelect={() => go(entry.to)}
                                                    className="group/item flex items-center justify-between"
                                                >
                                                    <span className="truncate font-medium">{entry.label}</span>
                                                    {entry.hint && (
                                                        <span className="ml-auto pl-3 text-xs text-muted-foreground group-data-[selected=true]/item:text-accent-foreground/85 transition-colors shrink-0">
                                                            {entry.hint}
                                                        </span>
                                                    )}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                        <CommandSeparator />
                                    </div>
                                );
                            })}
                        </>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}

