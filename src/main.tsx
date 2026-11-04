import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Fonts are self-hosted with stable names in /public/fonts and declared in
// index.css so index.html can preload them.
import "./index.css";

// After a deploy, a tab that loaded the previous build may navigate to a
// lazy route whose hashed chunk no longer exists. Vite surfaces that as
// `vite:preloadError`; one reload picks up the new build instead of showing
// a broken page. The session timestamp guards against a reload loop.
window.addEventListener("vite:preloadError", (event) => {
    const KEY = "yc:chunk-reload-at";
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10_000) {
        event.preventDefault();
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
    }
});

// The static hero shell in index.html painted real content before React ran.
// HeroSection reads this flag to skip its entrance animations, re-animating
// content that is already on screen would flash it and re-fire LCP.
const rootEl = document.getElementById("root")!;
if (rootEl.childElementCount > 0) {
    (window as unknown as { __YC_STATIC_SHELL__?: boolean }).__YC_STATIC_SHELL__ = true;
}

// GoogleOAuthProvider is scoped to the two pages that use it (BecomeTrainer,
// TrainerLogin), app-wide it loaded Google's 95 KB gsi/client everywhere.
createRoot(rootEl).render(<App />);
