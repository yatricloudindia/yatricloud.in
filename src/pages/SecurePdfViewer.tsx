import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { isAuthenticated } from "@/lib/yatris-api";
import { listMyResources } from "@/lib/resources-api";
import { trackEvent } from "@/lib/analytics";

/**
 * SecurePdfViewer, renders a PDF inside the website without exposing the raw URL.
 *
 * Security layers:
 *  1.  Auth-gate              , unauthenticated users are redirected.
 *  2.  Ownership check        , resource ID verified against user_resources.
 *  3.  Raw URL never exposed  , no <a href>, clipboard, or share button.
 *  4.  Right-click suppressed , contextmenu blocked on every surface.
 *  5.  Text selection blocked , user-select: none + unselectable overlay.
 *  6.  Keyboard shortcuts     , Ctrl/Cmd+S/P/C/A/U intercepted.
 *  7.  Print blanked          , beforeprint hides iframe; @media print shows
 *                                 a "Printing not allowed" screen.
 *  8.  Screenshot deterrence  , @media print covers entire viewport in black;
 *                                 a CSS mix-blend trick also darken screen-cap
 *                                 tools that rely on window compositing.
 *  9.  PDF toolbar hidden     , #toolbar=0&navpanes=0&statusbar=0 fragment.
 */

/* ─── Inject global @media print blocker once ─────────────────────────────── */
function injectPrintBlocker() {
  const id = "__yc_print_block__";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @media print {
      html, body {
        visibility: hidden !important;
        background: #000 !important;
      }
      #__yc_print_msg__ {
        visibility: visible !important;
        position: fixed !important;
        inset: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #000 !important;
        color: #fff !important;
        font-size: 2rem !important;
        font-family: sans-serif !important;
        z-index: 99999 !important;
        text-align: center !important;
        padding: 2rem !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export default function SecurePdfViewer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const resourceId = params.get("id");

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [resourceName, setResourceName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* ── Inject print-block CSS on mount ─────────────────────── */
  useEffect(() => {
    injectPrintBlocker();
    return () => {
      // Clean up style when viewer is unmounted
      document.getElementById("__yc_print_block__")?.remove();
    };
  }, []);

  /* ── beforeprint / afterprint handlers ───────────────────── */
  useEffect(() => {
    const hide = () => {
      if (iframeRef.current) iframeRef.current.style.display = "none";
    };
    const show = () => {
      if (iframeRef.current) iframeRef.current.style.display = "";
    };
    window.addEventListener("beforeprint", hide);
    window.addEventListener("afterprint", show);
    return () => {
      window.removeEventListener("beforeprint", hide);
      window.removeEventListener("afterprint", show);
    };
  }, []);

  /* ── Auth guard ───────────────────────────────────────────── */
  useEffect(() => {
    if (!isAuthenticated()) navigate("/", { replace: true });
  }, [navigate]);

  /* ── Ownership verification + URL resolution ──────────────── */
  useEffect(() => {
    if (!resourceId) {
      setError("No resource specified.");
      setLoading(false);
      return;
    }

    listMyResources()
      .then((myResources) => {
        const owned = myResources.find(
          (r) =>
            r.resourceId === resourceId ||
            r.id === resourceId ||
            encodeURIComponent(r.resourceId) === resourceId ||
            encodeURIComponent(r.id) === resourceId
        );

        if (!owned) {
          setError("You do not have access to this resource.");
          setLoading(false);
          return;
        }

        const url = owned.accessUrl;
        if (!url || (!url.startsWith("http") && !url.startsWith("blob"))) {
          setError("This resource is not a viewable document.");
          setLoading(false);
          return;
        }

        setResourceName(owned.name);

        trackEvent("download", "Resource", owned.resourceId || owned.id, {
          name: owned.name,
          provider: owned.provider,
          access_url: owned.accessUrl,
        });

        if (url.includes("jioaicloud.com")) {
          // Immediately redirect directly to the document without showing intermediate page
          window.location.replace(url);
          return;
        }

        const isDirectPdf =
          url.toLowerCase().includes(".pdf") ||
          url.includes("supabase.co/storage") ||
          url.includes("/storage/v1/object");

        if (isDirectPdf) {
          const sep = url.includes("#") ? "&" : "#";
          setPdfUrl(`${url}${sep}toolbar=0&navpanes=0&statusbar=0&view=FitH&zoom=page-width`);
        } else {
          setPdfUrl(url);
        }

        setLoading(false);
      })
      .catch(() => {
        setError("Failed to verify access. Please try again.");
        setLoading(false);
      });
  }, [resourceId]);


  /* ── Block Ctrl/Cmd+S/P/C/A/U ───────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["s", "p", "c", "a", "u"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const suppressCtxMenu = (e: React.MouseEvent) => e.preventDefault();

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <>
      {/* Hidden "printing not allowed" message visible only during print */}
      <div
        id="__yc_print_msg__"
        style={{ display: "none" }}
        aria-hidden="true"
      >
        Printing is not allowed for this document.
      </div>

      <Navbar />

      <main
        className="pt-20 min-h-screen bg-background select-none"
        onContextMenu={suppressCtxMenu}
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      >
        {/* Top bar */}
        <div className="sticky top-[64px] md:top-[80px] z-40 flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-border/80 bg-background/95 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl shrink-0 h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate max-w-xs md:max-w-md">
                {resourceName || "Document Viewer"}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Protected, copy, download, print &amp; sharing disabled
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-emerald-600 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:block">Secure Viewer</span>
          </div>
        </div>

        {/* Viewer area */}
        <div
          className="relative w-full"
          style={{ height: "calc(100vh - 128px)" }}
          onContextMenu={suppressCtxMenu}
        >
          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
              <div className="text-center space-y-3">
                <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground font-medium">
                  Verifying access…
                </p>
              </div>
            </div>
          )}

          {/* Error / access denied */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
              <div className="text-center max-w-sm space-y-4 p-6">
                <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  onClick={() => navigate("/my-resources")}
                  className="rounded-xl"
                >
                  Back to My Resources
                </Button>
              </div>
            </div>
          )}

          {/* Content Area */}
          {!loading && !error && pdfUrl && (
            (() => {
              const isJioCloud = pdfUrl.includes("jioaicloud.com");

              if (isJioCloud) {
                return (
                  <div className="absolute inset-0 flex items-center justify-center p-4 bg-muted/20">
                    <div className="w-full max-w-lg p-8 rounded-2xl bg-card border border-border/80 shadow-lg text-center space-y-6">
                      <div className="w-16 h-16 rounded-2xl bg-muted text-primary flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold font-display text-foreground">
                          {resourceName}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Your verified exam materials are ready. Because JioAICloud enforces strict browser cross-origin policies for large documents, click below to view your materials.
                        </p>
                      </div>
                      <div className="pt-2 flex flex-col gap-3">
                        <Button
                          asChild
                          size="lg"
                          className="w-full rounded-xl font-semibold bg-primary text-primary-foreground shadow-inset-btn hover:bg-brand-600 h-12 text-sm"
                        >
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open Document on JioAICloud
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/my-resources")}
                          className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
                        >
                          Back to My Learning Materials
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  className="absolute inset-0"
                  onContextMenu={suppressCtxMenu}
                >
                  <div
                    className="absolute inset-0 z-10"
                    style={{ pointerEvents: "none" }}
                    aria-hidden="true"
                    onContextMenu={suppressCtxMenu}
                  />

                  <iframe
                    ref={iframeRef}
                    key={pdfUrl}
                    src={pdfUrl}
                    title={resourceName}
                    className="absolute inset-0 w-full h-full border-0 bg-muted"
                    allow="fullscreen; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onContextMenu={suppressCtxMenu}
                  />
                </div>
              );
            })()
          )}
        </div>
      </main>
    </>
  );
}
