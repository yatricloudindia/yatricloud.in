import { createContext, useContext, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * Single fixed theme for everyone (light).
 * The dark theme and the light/dark toggle were intentionally removed, the
 * site now ships ONE professional white / black / blue design, with contrast
 * created by per-section background bands (white, black, blue, light-blue)
 * rather than a theme switch. `useTheme` is kept as a stable, no-op-compatible
 * API so existing consumers (e.g. CommunitySection) keep working unchanged.
 */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    if (typeof window !== "undefined") {
      // Clear any previously persisted preference so returning users get light.
      localStorage.removeItem("theme");
    }
  }, []);

  const value: ThemeContextType = {
    theme: "light",
    toggleTheme: () => {},
    setTheme: () => {},
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
