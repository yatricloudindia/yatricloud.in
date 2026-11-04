import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getMyPermissions } from "@/lib/admin-users-api";
import { canAccessPath, type AdminRole } from "@/lib/permissions";

interface PermissionsState {
  role: AdminRole | string | null;
  permissions: string[];
  loading: boolean;
  /** Whether the signed-in admin may open `path`. */
  canAccess: (path: string) => boolean;
}

const PermissionsContext = createContext<PermissionsState>({
  role: null,
  permissions: [],
  loading: true,
  canAccess: () => false,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AdminRole | string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await getMyPermissions();
        if (cancelled) return;
        setRole(m.role);
        setPermissions(m.permissions);
      } catch {
        if (!cancelled) { setRole(null); setPermissions([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const canAccess = useCallback(
    (path: string) => canAccessPath(role, permissions, path),
    [role, permissions],
  );

  return (
    <PermissionsContext.Provider value={{ role, permissions, loading, canAccess }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
