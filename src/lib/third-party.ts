/**
 * On-demand third-party loaders.
 *
 * Nothing here loads at page load, every external script/stylesheet is
 * injected the first time a user action actually needs it. This keeps
 * Calendly/Razorpay(→Stripe) JS, CSS and their cookies off the critical
 * path entirely (PageSpeed: render-blocking, third-party cookies, TBT).
 */

const scriptPromises = new Map<string, Promise<void>>();

/** Inject a script once; resolves when it has loaded. */
export function loadScript(src: string): Promise<void> {
  const existing = scriptPromises.get(src);
  if (existing) return existing;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromises.delete(src); // allow a retry on the next call
      reject(new Error(`Failed to load ${src}`));
    };
    document.body.appendChild(el);
  });
  scriptPromises.set(src, p);
  return p;
}

const loadedStylesheets = new Set<string>();

/** Inject a stylesheet once (fire-and-forget). */
export function loadStylesheet(href: string): void {
  if (loadedStylesheets.has(href)) return;
  loadedStylesheets.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/* ------------------------------- Razorpay ------------------------------- */

/** Load Razorpay checkout.js on demand. Resolves true when window.Razorpay exists. */
export async function loadRazorpay(): Promise<boolean> {
  if ((window as any).Razorpay) return true;
  try {
    await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  } catch {
    return false;
  }
  return Boolean((window as any).Razorpay);
}



/* --------------------------- Google Identity ---------------------------- */

/** Load the Google Identity Services client on demand (sign-in pages only). */
export async function loadGoogleIdentity(): Promise<boolean> {
  if ((window as any).google?.accounts?.id) return true;
  try {
    await loadScript("https://accounts.google.com/gsi/client");
  } catch {
    return false;
  }
  return Boolean((window as any).google?.accounts?.id);
}
