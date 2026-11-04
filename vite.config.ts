import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function devResumeUploadPlugin(env: Record<string, string>) {
  return {
    name: "dev-resume-upload",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === "/api/upload-resume" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => { body += chunk; });
          req.on("end", async () => {
            try {
              const { filename, fileData, contentType = "application/pdf", folder = "trainer-resumes" } = JSON.parse(body);
              const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
              const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
              if (!supabaseUrl || !serviceKey) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Missing Supabase credentials in .env" }));
                return;
              }
              const supabase = createClient(supabaseUrl, serviceKey);
              const buffer = Buffer.from(fileData, "base64");
              const cleanName = String(filename).replace(/[^\w.-]+/g, "_");
              const targetFolder = String(folder || "trainer-resumes").replace(/[^\w-]/g, "");
              const storagePath = `${targetFolder}/${Date.now()}-${cleanName}`;
              const { error: upErr } = await supabase.storage
                .from("product-images")
                .upload(storagePath, buffer, { contentType, upsert: true });

              if (upErr) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: upErr.message }));
                return;
              }
              const { data } = supabase.storage.from("product-images").getPublicUrl(storagePath);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ resumeUrl: data.publicUrl, url: data.publicUrl, path: storagePath }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message || "Failed to process resume upload" }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// Runs the Vercel functions in api/ inside the Vite dev server, so payments and
// emails work locally with `npm run dev` (no separate server.js). Mirrors the
// rewrites in vercel.json. Dev only; production uses Vercel directly.
function devVercelApiPlugin(env: Record<string, string>) {
  const ROUTES: Record<string, string> = { razorpay: "razorpay", "send-email": "send-email", currency: "currency" };
  return {
    name: "dev-vercel-api",
    configureServer(server: any) {
      for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = new URL(req.url || "/", "http://localhost");
        const m = url.pathname.match(/^\/api\/([^/]+)(?:\/([^/]+))?\/?$/);
        const file = m && ROUTES[m[1]];
        if (!file) return next();
        const query: Record<string, string> = Object.fromEntries(url.searchParams);
        if (file === "razorpay" && m![2]) query.action = m![2];
        let raw = "";
        req.on("data", (c: any) => { raw += c; });
        req.on("end", async () => {
          try {
            req.query = query;
            req.body = raw && String(req.headers["content-type"] || "").includes("json") ? JSON.parse(raw) : raw || undefined;
            res.status = (code: number) => { res.statusCode = code; return res; };
            res.json = (obj: unknown) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); return res; };
            res.send = (body: any) => { res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); return res; };
            res.redirect = (a: any, b?: any) => { res.statusCode = typeof a === "number" ? a : 302; res.setHeader("Location", typeof a === "number" ? b : a); res.end(); return res; };
            const mod = await server.ssrLoadModule(`/api/${file}.ts`);
            await mod.default(req, res);
          } catch (err: any) {
            console.error(`[dev-api] /api/${file}:`, err?.message || err);
            if (!res.headersSent) { res.statusCode = 500; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error: "Dev API error" })); }
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: "::",
      port: 8080,
      watch: {
        // Use polling for better file watching on external drives/network volumes
        usePolling: true,
        // Polling interval in milliseconds
        interval: 1000,
        // Ignore node_modules and other large directories
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      },
      hmr: {
        overlay: true,
      },
      // Set headers to allow Google Login popups
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
      // Proxy API routes to the local dev server (server.js on :3001) so the
      // frontend can always use relative `/api/*` paths. In production these
      // routes are served by Vercel serverless functions under `api/`.
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          bypass(req) {
            if (req.url === '/api/upload-resume' && req.method === 'POST') {
              return req.url;
            }
          },
        },
      },
    },
  // Optimize for development
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // Clear cache on build
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        // Long-lived shared vendors get their own chunks so route updates don't
        // invalidate them in users' caches, and so the entry chunk stays lean.
        // Route-specific heavies (html2canvas, maps, country data, the admin
        // console, TrainingManager, payments) fall into their own chunks
        // automatically via the lazy routes in App.tsx.
        // Only hoist the broadly-shared vendors into their own long-lived chunks.
        // Everything else is left to Rollup's default splitting, so a library used
        // only by a lazy route stays IN that route's chunk instead of being pulled
        // into an eagerly-loaded catch-all "vendor" bundle.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // Keep all of React in ONE chunk so there's a single copy of the
          // shared singleton, initialised before anything that depends on it.
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "react-vendor";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          return undefined;
        },
      },
    },
  },
  plugins: [react(), devResumeUploadPlugin(env), devVercelApiPlugin(env)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
