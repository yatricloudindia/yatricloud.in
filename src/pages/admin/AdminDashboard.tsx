import { Component, useState, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Suspense } from "react";
import { ShieldX, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import AdminLogin from "./AdminLogin";
import AdminLayout from "@/components/admin/AdminLayout";
import { useTheme } from "@/components/ThemeProvider";
import { fetchMyProfile, signOut } from "@/lib/auth";
import { PermissionsProvider, usePermissions } from "@/lib/permissions-context";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin portal caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-6 py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
              Unable to display this admin page
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred while rendering this section."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Blocks a permitted route from rendering when the user lacks access to it. */
const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { loading, canAccess } = usePermissions();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading…
      </div>
    );
  }
  // The dashboard landing is always allowed; every other page checks permissions.
  if (pathname === "/admin" || canAccess(pathname)) return <>{children}</>;
  return <NoAccess />;
};

const NoAccess = () => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center px-6">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive text-white">
      <ShieldX className="h-7 w-7" />
    </div>
    <h2 className="font-display text-xl font-bold tracking-tight">No access</h2>
    <p className="max-w-sm text-sm text-muted-foreground">
      Your role doesn't include permission to open this page. Ask a Super Admin to grant it.
    </p>
  </div>
);

const AdminDashboard = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
    // The local token only unlocks the shell. The live Supabase session must
    // ALSO belong to an admin, otherwise every database call runs as whoever
    // signed in last in this browser and writes fail on row level security.
    const [sessionChecked, setSessionChecked] = useState(false);
    const { setTheme } = useTheme();
    const hasSetInitialTheme = useRef(false);

    // Set dark theme once on initial admin load
    useEffect(() => {
        if (token && !hasSetInitialTheme.current) {
            setTheme("dark");
            hasSetInitialTheme.current = true;
        }
    }, [token, setTheme]);

    // Verify the live session really is an admin whenever the shell unlocks.
    useEffect(() => {
        let cancelled = false;
        if (!token) { setSessionChecked(false); return; }
        (async () => {
            const profile = await fetchMyProfile();
            if (cancelled) return;
            if (!profile || profile.role !== "admin") {
                // A non admin session (for example a test account used on the
                // public site) took over this browser. Force a fresh admin login.
                await signOut();
                localStorage.removeItem('admin_token');
                setToken(null);
            }
            setSessionChecked(true);
        })();
        return () => { cancelled = true; };
    }, [token]);

    const handleLogin = (newToken: string) => {
        localStorage.setItem('admin_token', newToken);
        setToken(newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        setToken(null);
    };

    if (!token) {
        return <AdminLogin onLogin={handleLogin} />;
    }

    if (!sessionChecked) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Checking your admin session</p>
                </div>
            </div>
        );
    }

    return (
        <PermissionsProvider>
            <AdminLayout onLogout={handleLogout}>
                {/* Local boundary so lazy admin pages swap INSIDE the layout —
                    without it the app-level Suspense unmounts the whole shell and
                    the sidebar loses its scroll position on every navigation. */}
                <Suspense
                    fallback={
                        <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading…
                        </div>
                    }
                >
                    <AdminErrorBoundary>
                        <RouteGuard>
                            <Outlet />
                        </RouteGuard>
                    </AdminErrorBoundary>
                </Suspense>
            </AdminLayout>
        </PermissionsProvider>
    );
};

export default AdminDashboard;
