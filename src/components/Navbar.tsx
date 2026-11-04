import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAuthenticated, getStoredUser, logout } from "@/lib/yatris-api";
import { useSiteContent, getNavLinks, FALLBACK_NAV_LINKS } from "@/lib/site-content";
import { GlobalSearch } from "@/components/GlobalSearch";
import { supabase } from "@/lib/supabase";
import { getMyPermissions } from "@/lib/admin-users-api";
import { hasAnyAdminAccess } from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FEATURE_FLAGS } from "@/config/features";
import { LoginModal } from "@/components/LoginModal";
import { TopBanner } from "@/components/TopBanner";
import { QUICK_LINKS } from "@/components/home/quick-links";

export const Navbar = ({ heroTheme, forceWhiteBg = false }: { heroTheme?: 'light' | 'dark', forceWhiteBg?: boolean } = {}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMentor, setIsMentor] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(64);

  // When not scrolled and overlaying a hero, use heroTheme to determine text colours.
  // 'light' means the bg is dark  → use white text.
  // 'dark'  means the bg is light → use dark text (default behaviour).
  const isLightText = !forceWhiteBg && !isScrolled && heroTheme === 'light';

  useEffect(() => {
    // Check authentication on mount and when location changes
    const checkAuth = () => {
      if (isAuthenticated()) {
        const storedUser = getStoredUser();
        setUser(storedUser);
      } else {
        setUser(null);
      }
    };

    checkAuth();
    // Check auth when location changes
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, [location]);

  // Check roles (mentor, trainer, team member, admin)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setIsMentor(false);
        setIsTrainer(false);
        setIsTeamMember(false);
        setIsAdmin(false);
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) {
        if (!cancelled) {
          setIsMentor(false);
          setIsTrainer(false);
          setIsTeamMember(false);
          setIsAdmin(false);
        }
        return;
      }
      const email = user.email?.trim().toLowerCase() || "";
      // Mentors and trainers live on yatricloud.com; this site's database has no such tables.
      const [teamRes, adminAccess] = await Promise.all([
        supabase.from("website_team").select("id").or(`user_id.eq.${uid},email.ilike.${email}`).maybeSingle(),
        // Same access source the /admin console uses, so the link only shows when access is granted.
        getMyPermissions().catch(() => null),
      ]);

      if (!cancelled) {
        setIsMentor(false);
        setIsTrainer(false);
        setIsTeamMember(Boolean(teamRes.data));
        setIsAdmin(Boolean(adminAccess?.isActive && hasAnyAdminAccess(adminAccess.role, adminAccess.permissions)));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const updateNavHeight = () => {
      if (navRef.current) {
        setNavHeight(navRef.current.offsetHeight);
      }
    };
    updateNavHeight();
    window.addEventListener("resize", updateNavHeight);
    window.addEventListener("scroll", updateNavHeight);
    return () => {
      window.removeEventListener("resize", updateNavHeight);
      window.removeEventListener("scroll", updateNavHeight);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Nav links come from Supabase `nav_links` (seeded identical to the
   * fallback, so nothing visibly changes). */
  const navLinks = useSiteContent(() => getNavLinks("navbar"), FALLBACK_NAV_LINKS.navbar);

  // Resources site: a fixed nav for this domain's own sections. Any other
  // in-app route is sent to yatricloud.com by App's MainSiteRedirect.
  const visibleNavLinks = useMemo(() => {
    const template = navLinks[0];
    const own = [
      { label: "Resources", href: "/" },
      { label: "Exam Dumps", href: "/examdumps" },
      { label: "My Resources", href: "/my-resources" },
    ];
    return own.map((l, i) => ({ ...(template || {}), id: `resources-${i}`, ...l })) as typeof navLinks;
  }, [navLinks]);

  /* "Explore" menu: same shortcuts the homepage quick-access rail had.
   * Hash links reuse the existing scroll-to-section behaviour, external
   * links open in a new tab, everything else is an in-app route. */
  const openQuickLink = (to: string) => {
    if (to.startsWith("http")) {
      window.open(to, "_blank", "noopener,noreferrer");
      return;
    }
    if (to.startsWith("#")) {
      const isHomePage = location.pathname === "/" || location.pathname === "";
      if (isHomePage) {
        document.querySelector(to)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        navigate("/");
        setTimeout(() => {
          document.querySelector(to)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
      return;
    }
    navigate(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    if (
      location.pathname.startsWith("/profile") ||
      location.pathname.startsWith("/edit-profile") ||
      location.pathname.startsWith("/manage-certifications")
    ) {
      navigate("/");
    }
  };

  return (
    <>
      <motion.nav
        ref={navRef}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled || forceWhiteBg ? "glass-nav shadow-card" : "bg-transparent"
        }`}
      >
        <TopBanner />
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-nowrap items-center justify-between h-16 md:h-20 gap-3 md:gap-6">
            {/* Logo */}
            <a href="/" className="group flex shrink-0 items-center gap-2.5">
              <img
                src="/logo-64.png"
                alt="Yatri Cloud"
                width={32}
                height={32}
                className="h-8 w-8 transition-transform duration-300 ease-out-expo group-hover:scale-110 group-hover:rotate-6"
              />
              <span
                className={`font-display text-xl font-bold tracking-tight transition-colors ${isLightText ? "text-white" : "text-foreground"
                  }`}
              >
                Yatri Cloud
              </span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex min-w-0 flex-1 items-center gap-4 lg:gap-8 overflow-x-auto scrollbar-hide lg:justify-center">
              {visibleNavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    if (link.href.startsWith("#")) {
                      e.preventDefault();
                      const isHomePage = location.pathname === "/" || location.pathname === "";
                      if (isHomePage) {
                        const element = document.querySelector(link.href);
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      } else {
                        navigate("/");
                        setTimeout(() => {
                          const element = document.querySelector(link.href);
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }, 100);
                      }
                    } else {
                      e.preventDefault();
                      navigate(link.href);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className={`group relative shrink-0 whitespace-nowrap py-1 text-sm font-medium transition-colors ${location.pathname === link.href
                    ? isLightText
                      ? "text-white"
                      : "text-primary"
                    : isLightText
                      ? "text-white/80 hover:text-white"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {link.label}
                  <span
                    className={`absolute -bottom-0.5 left-0 h-px rounded-full bg-primary transition-all duration-300 ease-out-expo ${location.pathname === link.href ? "w-full" : "w-0 group-hover:w-full"
                      }`}
                  />
                </a>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`group inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:text-primary ${isLightText
                    ? "text-white/80 hover:text-white"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Explore
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-[min(92vw,420px)] rounded-2xl p-2 shadow-card">
                  <DropdownMenuLabel className="px-2 pb-2 pt-1 text-sm font-semibold text-foreground">
                    Where do you want to go, Yatris?
                  </DropdownMenuLabel>
                  <div className="grid grid-cols-2 gap-1">
                    {QUICK_LINKS.map((q) => (
                      <DropdownMenuItem
                        key={q.label}
                        onSelect={() => openQuickLink(q.to)}
                        className="min-h-[40px] cursor-pointer rounded-xl px-3 text-[14px] font-medium text-foreground focus:bg-primary focus:text-primary-foreground"
                      >
                        {q.label}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right cluster: search + account/CTA + hamburger */}
            <div className="flex shrink-0 items-center gap-2 md:gap-4">
              <GlobalSearch isLightText={isLightText} />

              {/* Desktop Actions */}
              <div className="hidden md:flex shrink-0 items-center gap-4">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={`gap-2 max-w-[220px] rounded-full font-medium shadow-2xs transition-all ${isLightText
                          ? "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-md"
                          : "border-border bg-card text-foreground hover:bg-muted"
                          }`}
                      >
                        <span className="truncate">{user.fullName || user.email}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 max-h-[calc(100vh-5.5rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-xl"
                    >
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard")}
                        className="font-bold text-primary focus:text-primary cursor-pointer"
                      >
                        My Dashboard
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => navigate("/admin")}
                          className="font-medium text-slate-900 cursor-pointer"
                        >
                          Admin Console
                        </DropdownMenuItem>
                      )}
                      {isTeamMember && (
                        <DropdownMenuItem
                          onClick={() => navigate("/team/dashboard")}
                          className="font-medium text-slate-900 cursor-pointer"
                        >
                          Internal Team Portal
                        </DropdownMenuItem>
                      )}
                      {isTrainer && (
                        <DropdownMenuItem
                          onClick={() => navigate("/trainer/dashboard")}
                          className="cursor-pointer font-medium"
                        >
                          Trainer Dashboard
                        </DropdownMenuItem>
                      )}
                      {isMentor && (
                        <DropdownMenuItem
                          onClick={() => navigate("/mentor/dashboard")}
                          className="cursor-pointer font-medium"
                        >
                          Mentor Dashboard
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/edit-profile")}>
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/my-purchases")}>
                        My Receipts & Purchases
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/my-trainings")}>
                        My Trainings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/profile/my-events")}>
                        My Events
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/blog/dashboard")}>
                        My Blogs
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/support")}>
                        Help & Support
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <span>Coming Soon</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-52">
                          <DropdownMenuItem
                            onClick={() => {
                              toast.info("Achievements is coming soon!");
                              navigate("/achievements");
                            }}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <span>Achievements</span>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              toast.info("Manage Certifications is coming soon!");
                              navigate("/manage-certifications");
                            }}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <span>Manage Certifications</span>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              toast.info("My Certificates is coming soon!");
                              navigate("/certificates");
                            }}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <span>My Certificates</span>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              toast.info("User Guide is coming soon!");
                              navigate("/profile/guide");
                            }}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <span>User Guide</span>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              toast.info("User Sitemap is coming soon!");
                              navigate("/profile/sitemap");
                            }}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <span>User Sitemap</span>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(true)}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-inset-btn transition-[background-color,transform] duration-150 hover:bg-brand-600 active:scale-[0.97]"
                  >
                    Sign In
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                className={`md:hidden p-2 transition-colors ${isLightText ? "text-white" : "text-foreground"
                  }`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ paddingTop: navHeight }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl md:hidden overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div className="flex flex-col px-5 py-4 gap-1">
              {/* Main nav links */}
              {visibleNavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    if (link.href.startsWith("#")) {
                      e.preventDefault();
                      const isHomePage = location.pathname === "/" || location.pathname === "";
                      if (isHomePage) {
                        const element = document.querySelector(link.href);
                        if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
                      } else {
                        navigate("/");
                        setTimeout(() => {
                          const element = document.querySelector(link.href);
                          if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 100);
                      }
                    } else {
                      e.preventDefault();
                      navigate(link.href);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-3 py-3.5 rounded-lg text-base font-semibold transition-colors ${
                    location.pathname === link.href
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </a>
              ))}

              <details className="group w-full [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex h-12 cursor-pointer list-none select-none items-center justify-between rounded-lg px-3 text-base font-semibold text-foreground transition-colors hover:bg-muted">
                  <span>Explore</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-1 grid grid-cols-2 gap-1 px-1 pb-1">
                  {QUICK_LINKS.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        openQuickLink(q.to);
                      }}
                      className="min-h-[44px] rounded-lg px-3 py-2 text-left text-[15px] font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </details>

              <div className="my-3 h-px bg-border" />

              {/* Profile / Account section */}
              <div className="flex flex-col gap-0.5">
                {user ? (
                  <>
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      Account
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate("/dashboard");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-base font-bold px-3 h-12 text-primary"
                    >
                      My Dashboard
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          navigate("/admin");
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start text-base font-semibold px-3 h-12 text-foreground"
                      >
                        Admin Console
                      </Button>
                    )}
                    {isTeamMember && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          navigate("/team/dashboard");
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start text-base font-semibold px-3 h-12 text-foreground"
                      >
                        Internal Team Portal
                      </Button>
                    )}
                    {isTrainer && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          navigate("/trainer/dashboard");
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start text-base font-medium px-3 h-12 text-foreground"
                      >
                        Trainer Dashboard
                      </Button>
                    )}
                    {isMentor && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          navigate("/mentor/dashboard");
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start text-base font-medium px-3 h-12 text-foreground"
                      >
                        Mentor Dashboard
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate("/profile/my-events");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-base font-medium px-3 h-12"
                    >
                      My Events
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate("/my-trainings");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-base font-medium px-3 h-12"
                    >
                      My Trainings
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate("/support");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-base font-medium px-3 h-12"
                    >
                      Help & Support
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate("/blog/dashboard");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-base font-medium px-3 h-12"
                    >
                      My Blogs
                    </Button>
                    <details className="w-full group [&_summary::-webkit-details-marker]:hidden">
                      <summary className="w-full flex items-center justify-between px-3 h-12 text-base font-medium cursor-pointer list-none select-none hover:bg-muted/60 rounded-md transition-colors">
                        <span>Coming Soon</span>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="flex flex-col gap-0.5 pl-3 pb-1 border-l-2 border-border/50 ml-3 mt-1">
                        {[
                          { path: "/achievements", label: "Achievements" },
                          { path: "/manage-certifications", label: "Manage Certifications" },
                          { path: "/certificates", label: "My Certificates" },
                          { path: "/profile/guide", label: "User Guide" },
                          { path: "/profile/sitemap", label: "User Sitemap" },
                        ].map((item) => (
                          <Button
                            key={item.path}
                            variant="ghost"
                            onClick={() => {
                              toast.info(`${item.label} is coming soon!`);
                              navigate(item.path);
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full justify-start text-sm font-medium px-3 h-10 flex items-center"
                          >
                            <span className="flex-1 text-left text-muted-foreground">{item.label}</span>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-2">Soon</span>
                          </Button>
                        ))}
                      </div>
                    </details>

                    <div className="my-2 h-px bg-border/60" />
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full justify-start text-base font-medium px-3 h-12 text-red-500 hover:text-red-600 hover:bg-red-50/50"
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowLoginModal(true);
                    }}
                    className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-inset-btn transition-[background-color,transform] duration-150 hover:bg-brand-600 active:scale-[0.97]"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global In-Page Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(loggedInUser) => {
          setShowLoginModal(false);
          setUser(loggedInUser);
        }}
      />
    </>
  );
};

export default Navbar;