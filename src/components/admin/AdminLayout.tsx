import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, ChevronRight, LayoutDashboard, ExternalLink } from "lucide-react";
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/permissions-context";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface AdminLayoutProps {
    children: ReactNode;
    onLogout: () => void;
}

const COLLAPSE_KEY = "admin_sidebar_collapsed";

const AdminLayout = ({ children, onLogout }: AdminLayoutProps) => {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState<boolean>(
        () => typeof window !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1"
    );

    // Grouped menu items, shared with the auto generated Admin Sitemap.
    // Filtered by the signed-in admin's page permissions (full-access roles see all).
    const { canAccess } = usePermissions();
    const menuGroups = ADMIN_NAV_GROUPS
        .map((g) => ({ ...g, items: g.items.filter((i) => canAccess(i.path)) }))
        .filter((g) => g.items.length > 0);

    // Only ONE item should light up. A plain prefix match makes a parent path
    // (e.g. /admin/training) stay active on a sibling child route
    // (/admin/training/create), so both highlighted. Instead, pick the single
    // most specific (longest) item path that matches the current URL, and mark
    // only that one active.
    const activeItemPath = (() => {
        const paths = menuGroups.flatMap((g) => g.items.map((i) => i.path));
        const matches = paths.filter(
            (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
        );
        if (matches.length === 0) return null;
        return matches.reduce((a, b) => (b.length > a.length ? b : a));
    })();

    const isPathActive = (path: string) => path === activeItemPath;

    // Determine current active group to open it by default
    const currentActiveGroup = menuGroups.find(group =>
        group.items.some(item => isPathActive(item.path))
    )?.id;

    const [openGroups, setOpenGroups] = useState<string[]>(
        currentActiveGroup ? [currentActiveGroup] : []
    );

    // Close the mobile drawer whenever the route changes
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Keep the active group open as the route changes
    useEffect(() => {
        if (currentActiveGroup) {
            setOpenGroups(prev => (prev.includes(currentActiveGroup) ? prev : [...prev, currentActiveGroup]));
        }
    }, [currentActiveGroup]);

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev;
            if (typeof window !== "undefined") localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
            return next;
        });
    };

    // Expanding from the icon rail: open the sidebar and reveal the chosen group.
    const expandToGroup = (groupId: string) => {
        setCollapsed(false);
        if (typeof window !== "undefined") localStorage.setItem(COLLAPSE_KEY, "0");
        setOpenGroups(prev => (prev.includes(groupId) ? prev : [...prev, groupId]));
    };

    const isDashboard = location.pathname === "/admin" || location.pathname === "/admin/events";

    // Route-aware page label for the header breadcrumb (presentational only).
    const currentItem = menuGroups.flatMap(g => g.items).find(i => isPathActive(i.path));
    const pageTitle = isDashboard ? "Dashboard" : (currentItem?.name ?? "Admin");

    /* ── Collapsed icon rail (desktop only) ── */
    const IconRail = (
        <>
            <div className="h-16 flex items-center justify-center border-b border-border">
                <Link to="/" title="Yatri Cloud" className="hover:opacity-80 transition-opacity">
                    <img src="/logo-64.png" alt="Yatri Cloud" width={32} height={32} className="w-8 h-8" />
                </Link>
            </div>

            <nav className="flex-1 p-3 overflow-y-auto scrollbar-hide flex flex-col items-center gap-2">
                <Link
                    to="/admin"
                    title="Dashboard"
                    aria-label="Dashboard"
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isDashboard
                        ? "bg-primary text-primary-foreground shadow-inset-btn"
                        : "text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                        }`}
                >
                    <LayoutDashboard className="w-5 h-5" />
                </Link>

                <div className="my-1 h-px w-8 bg-border" />

                {menuGroups.map((group) => {
                    const GroupIcon = group.icon;
                    const isGroupActive = group.items.some(item => isPathActive(item.path));
                    return (
                        <button
                            key={group.id}
                            onClick={() => expandToGroup(group.id)}
                            title={group.label}
                            aria-label={`${group.label}: expand menu`}
                            className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isGroupActive
                                ? "bg-primary text-white"
                                : "text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                                }`}
                        >
                            <GroupIcon className="w-5 h-5" />
                        </button>
                    );
                })}
            </nav>

            <div className="p-3 border-t border-border flex flex-col items-center gap-2">
                <button
                    onClick={onLogout}
                    title="Sign out"
                    aria-label="Sign out"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </>
    );

    /* ── Full expanded sidebar ── */
    const FullNav = (
        <>
            {/* Logo/Home + collapse toggle */}
            <div className="pl-6 pr-3 h-16 flex items-center justify-between border-b border-border">
                <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                    <img src="/logo-64.png" alt="Yatri Cloud" width={32} height={32} className="w-8 h-8" />
                    <span className="font-display text-lg font-bold tracking-tight">Yatri <span className="gradient-text">Admin</span></span>
                </Link>
                {/* Close button (mobile only) */}
                <button
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                    className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Overview</p>
                <Link
                    to="/admin"
                    className={`flex items-center gap-3 min-h-[44px] px-4 py-2.5 mb-3 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isDashboard
                        ? "bg-primary text-primary-foreground font-medium shadow-inset-btn"
                        : "text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                        }`}
                >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                </Link>

                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Manage</p>
                <Accordion type="multiple" value={openGroups} onValueChange={setOpenGroups} className="w-full space-y-1">
                    {menuGroups.map((group) => {
                        const GroupIcon = group.icon;
                        const isGroupActive = group.items.some(item => isPathActive(item.path));

                        return (
                            <AccordionItem key={group.id} value={group.id} className="border-none">
                                <AccordionTrigger className={`min-h-[44px] px-4 py-2.5 rounded-xl hover:no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isGroupActive ? "bg-primary text-primary-foreground font-medium shadow-inset-btn hover:bg-primary/90" : "text-muted-foreground hover:bg-primary hover:text-primary-foreground"}`}>
                                    <div className="flex items-center gap-3">
                                        <GroupIcon className="w-5 h-5" />
                                        <span className="text-sm">{group.label}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-2 pt-1 pl-6">
                                    <div className="space-y-1 border-l border-border ml-2.5 pl-4 px-2">
                                        {group.items.map((item) => {
                                            const ItemIcon = item.icon;
                                            const active = isPathActive(item.path);

                                            return (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    className={`flex items-center min-h-[40px] px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active
                                                        ? "bg-primary text-primary-foreground font-medium shadow-inset-btn"
                                                        : "text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                                                        }`}
                                                >
                                                    <span>{item.name}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-border">
                <Button
                    onClick={onLogout}
                    variant="outline"
                    className="w-full min-h-[44px] flex items-center gap-2 text-destructive hover:bg-destructive/10 border-destructive/20 rounded-xl"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </Button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <div className="noise-overlay" />

            {/* Mobile overlay scrim */}
            <div
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
                className={`fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
            />

            {/* Sidebar, collapsible rail on desktop, smooth off-canvas slider on mobile */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-card border-r border-border flex flex-col shadow-elevated transition-[transform,width] duration-300 ease-out lg:static lg:z-20 lg:shadow-none lg:translate-x-0 ${collapsed ? "lg:w-[76px]" : "lg:w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                {/* On mobile always show the full nav; on desktop swap to the rail when collapsed */}
                <div className="flex flex-col h-full lg:hidden">{FullNav}</div>
                <div className="hidden lg:flex lg:flex-col lg:h-full">{collapsed ? IconRail : FullNav}</div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Fixed Header, solid so it reads as a distinct layer above the content */}
                <header className="h-16 flex-shrink-0 border-b border-border bg-background shadow-sm flex items-center justify-between gap-3 px-4 md:px-6 z-10 sticky top-0">
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Hamburger, opens the slider on mobile */}
                        <button
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open menu"
                            aria-expanded={mobileOpen}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        {/* Collapse toggle, desktop */}
                        <button
                            onClick={toggleCollapsed}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                        </button>

                        <div className="mx-1 hidden lg:block h-6 w-px bg-border" />

                        {/* Route-aware breadcrumb, "you are here" for daily tasks */}
                        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
                            <span className="hidden sm:block text-sm text-muted-foreground">Admin</span>
                            <ChevronRight className="hidden sm:block w-4 h-4 flex-shrink-0 text-muted-foreground/60" />
                            <span className="font-display text-sm md:text-base font-bold tracking-tight truncate">{pageTitle}</span>
                        </nav>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Jump back to the live site */}
                        <Link
                            to="/"
                            target="_blank"
                            className="hidden sm:inline-flex items-center gap-2 min-h-[40px] rounded-xl border border-border bg-card px-3 text-sm font-medium text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            View site
                        </Link>

                        {/* Profile chip */}
                        <Link to="/edit-profile" title="Edit admin profile" className="flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 transition-colors hover:border-primary hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <div className="text-right hidden sm:block leading-tight">
                                <span className="block text-sm font-medium">Admin</span>
                            </div>
                            <div className="w-8 h-8 overflow-hidden rounded-full bg-primary flex items-center justify-center">
                                <img src="/logo-64.png" alt="Yatri Cloud admin profile" width={32} height={32} className="h-full w-full object-cover" />
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-gradient-to-b from-brand-50/70 via-brand-50/40 to-brand-50/20">
                    <div className="px-4 md:px-8 py-6 max-w-screen-2xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
