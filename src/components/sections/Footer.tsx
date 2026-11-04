import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  useSiteContent,
  getSiteSettings,
  getNavLinks,
  FALLBACK_SETTINGS,
  FALLBACK_NAV_LINKS,
} from "@/lib/site-content";
import { sendEmail } from "@/lib/email";
import { getSubscriberWelcomeEmail } from "@/lib/email-templates";


export const Footer = () => {
  const currentYear = 2026;
  const reduce = useReducedMotion();
  const { toast } = useToast();
  const [subscribing, setSubscribing] = useState(false);
  const [subName, setSubName] = useState("");

  /* Social links + brand tagline come from Supabase site_settings
   * (seeded identical to the fallbacks, so nothing visibly changes). */
  const settings = useSiteContent(getSiteSettings, FALLBACK_SETTINGS);
  const social = settings.social || FALLBACK_SETTINGS.social;
  const brandTagline = settings.brand?.tagline || FALLBACK_SETTINGS.brand.tagline;
  const designedBy = settings.brand?.designed_by || FALLBACK_SETTINGS.brand.designed_by;

  const handleSubscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const name = String(fd.get("name") || "").trim();
    if (!email.includes("@")) return;
    setSubscribing(true);
    const { error } = await supabase.from("subscribers").insert({ email, name: name || null });
    setSubscribing(false);
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Couldn't subscribe", description: "Please try again in a moment.", variant: "destructive" });
      return;
    }
    toast({ title: "You're in, Yatri!", description: "We'll keep you posted on new practice tests, events, and offers." });
    form.reset();
    setSubName("");
    // Fire welcome email (non-blocking, always)
    sendEmail({
      to: email,
      subject: "Welcome to the Yatri Cloud newsletter",
      html: getSubscriberWelcomeEmail(name || "Yatri", email),
    }).catch(() => { /* best effort */ });
  };


  /* Footer link columns come from Supabase `nav_links` (seeded identical
   * to the fallbacks, so nothing visibly changes). */
  const legalLinks = useSiteContent(
    () => getNavLinks("footer_legal"),
    FALLBACK_NAV_LINKS.footer_legal
  );

  const exploreLinks = [
    { href: "/training", label: "Training" },
    { href: "/blog", label: "Blog" },
  ];

  const quickLinks = [
    { href: "/about-us", label: "About Us" },
    { href: "/contact-us", label: "Contact Us" },
    { href: "/events", label: "Events" },
    { href: "/community", label: "Community" },
    { href: "/partners", label: "Partners" },
    { href: "/request-voucher", label: "Discounted Exam Vouchers" },
  ];

  const socialLinks = [
    {
      name: "YouTube",
      href: social.youtube || FALLBACK_SETTINGS.social.youtube,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: social.linkedin || FALLBACK_SETTINGS.social.linkedin,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37h2.8v-8.37h-2.8M7.86 6.75a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z"/>
        </svg>
      ),
    },
    {
      name: "WhatsApp",
      href: "https://whatsapp.com/channel/0029VakdAHIFHWq60yHA1Q0s",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 32 32">
          <path d="M26.576 5.363c-2.69-2.69-6.406-4.354-10.511-4.354-8.209 0-14.865 6.655-14.865 14.865 0 2.732 0.737 5.291 2.022 7.491l-0.038-0.070-2.109 7.702 7.879-2.067c2.051 1.139 4.498 1.809 7.102 1.809h0.006c8.209-0.003 14.862-6.659 14.862-14.868 0-4.103-1.662-7.817-4.349-10.507l0 0zM16.062 28.228h-0.005c-0 0-0.001 0-0.001 0-2.319 0-4.489-0.64-6.342-1.753l0.056 0.031-0.451-0.267-4.675 1.227 1.247-4.559-0.294-0.467c-1.185-1.862-1.889-4.131-1.889-6.565 0-6.822 5.531-12.353 12.353-12.353s12.353 5.531 12.353 12.353c0 6.822-5.53 12.353-12.353 12.353h-0zM22.838 18.977c-0.371-0.186-2.197-1.083-2.537-1.208-0.341-0.124-0.589-0.185-0.837 0.187-0.246 0.371-0.958 1.207-1.175 1.455-0.216 0.249-0.434 0.279-0.805 0.094-1.15-0.466-2.138-1.087-2.997-1.852l0.010 0.009c-0.799-0.74-1.484-1.587-2.037-2.521l-0.028-0.052c-0.216-0.371-0.023-0.572 0.162-0.757 0.167-0.166 0.372-0.434 0.557-0.65 0.146-0.179 0.271-0.384 0.366-0.604l0.006-0.017c0.043-0.087 0.068-0.188 0.068-0.296 0-0.131-0.037-0.253-0.101-0.357l0.002 0.003c-0.094-0.186-0.836-2.014-1.145-2.758-0.302-0.724-0.609-0.625-0.836-0.637-0.216-0.010-0.464-0.012-0.712-0.012-0.395 0.010-0.746 0.188-0.988 0.463l-0.001 0.002c-0.802 0.761-1.3 1.834-1.3 3.023 0 0.026 0 0.053 0.001 0.079l-0-0.004c0.131 1.467 0.681 2.784 1.527 3.857l-0.012-0.015c1.604 2.379 3.742 4.282 6.251 5.564l0.094 0.043c0.548 0.248 1.25 0.513 1.968 0.74l0.149 0.041c0.442 0.14 0.951 0.221 1.479 0.221 0.303 0 0.601-0.027 0.889-0.078l-0.031 0.004c1.069-0.223 1.956-0.868 2.497-1.749l0.009-0.017c0.165-0.366 0.261-0.793 0.261-1.242 0-0.185-0.016-0.366-0.047-0.542l0.003 0.019c-0.092-0.155-0.34-0.247-0.712-0.434z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      href: "https://instagram.com/yatricloud",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
    },
  ];

  const handleHashScroll = (e: React.MouseEvent, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // Anchor lives on the homepage, navigate there with the hash.
        window.location.href = `/${href}`;
      }
    }
  };

  const LinkColumn = ({ title, links }: { title: string; links: { href: string; label: string }[] }) => (
    <div className="space-y-4">
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <a
              href={link.href}
              onClick={(e) => handleHashScroll(e, link.href)}
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="h-px w-0 bg-primary transition-all duration-300 ease-out group-hover:w-4" />
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="relative isolate overflow-hidden bg-background text-foreground">
      {/* ── Light background with soft blue accents ── */}
      {/* Blue seam + top wash so the footer reads distinct from the section above */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/[0.07] to-transparent" />
      {/* Dotted texture fading downward */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.14) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, black, transparent 45%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 45%)",
        }}
      />
      {/* Drifting soft-blue aurora */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-[15%] h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-[130px]"
        animate={reduce ? undefined : { x: [0, 50, 0], y: [0, 24, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={reduce ? undefined : { duration: 13, ease: "easeInOut", repeat: Infinity }}
      />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* ── Main footer: brand + link columns ── */}
        <div className="grid grid-cols-2 gap-10 pb-14 pt-16 md:grid-cols-12">
          {/* Brand */}
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="col-span-2 space-y-6 md:col-span-4"
          >
            <a href="/" className="group flex w-fit items-center gap-3">
              <img
                src="/logo-192.png"
                alt="Yatri Cloud"
                className="h-10 w-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
              />
              <span className="font-display text-2xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                Yatri Cloud
              </span>
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {brandTagline}
            </p>
            {/* Newsletter, saves to Supabase `subscribers` */}
            <form onSubmit={handleSubscribe} className="flex max-w-xs flex-col gap-2">
              <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                <label htmlFor="footer-name" className="sr-only">Name</label>
                <input
                  id="footer-name"
                  name="name"
                  type="text"
                  placeholder="Name (optional)"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="h-11 w-full max-w-[120px] rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                />
                <label htmlFor="footer-subscribe" className="sr-only">Email address</label>
                <input
                  id="footer-subscribe"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  aria-label="Subscribe for updates"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-inset-btn transition-colors hover:bg-brand-600"
                >
                  {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
            <div className="flex items-center gap-3 pt-1">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={reduce ? undefined : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  aria-label={social.name}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Link columns */}
          <div className="col-span-1 md:col-span-3">
            <LinkColumn title="Explore" links={exploreLinks} />
          </div>
          <div className="col-span-1 md:col-span-3">
            <LinkColumn title="Company" links={quickLinks} />
          </div>
          <div className="col-span-2 md:col-span-2">
            <LinkColumn title="Legal" links={legalLinks} />
          </div>
        </div>
      </div>

      {/* ── Blue statement finale: tagline over the giant fitted "Yatri Cloud" wordmark ── */}
      <div className="relative overflow-hidden pt-12 pb-8 md:pt-16 md:pb-10">
        {/* Soft blue glow behind the statement */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-44 w-2/3 rounded-full bg-primary/10 blur-[120px]" />
        </div>
        {/* Tagline */}
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-[-0.02em] text-foreground md:text-5xl lg:text-6xl">
            Master cloud engineering,
            <br className="hidden sm:block" /> <span className="gradient-text">certify with confidence.</span>
          </h2>
        </div>
        {/* Giant blue "Yatri Cloud" wordmark, in-flow & fitted to width so the full text always shows (never clipped) */}
        <div className="relative z-0 mt-2 flex items-center justify-center">
          <span className="block w-full whitespace-nowrap bg-gradient-to-r from-primary/15 via-primary/40 to-primary/15 bg-[length:200%_auto] bg-clip-text px-4 pb-[0.12em] text-center font-display text-[12.5vw] font-black leading-[1.12] tracking-[-0.03em] text-transparent animate-shimmer [animation-duration:9s] [animation-timing-function:ease-in-out] motion-reduce:animate-none">
            Yatri Cloud
          </span>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="relative z-10 border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 text-sm md:flex-row md:px-6">
          <p className="text-muted-foreground text-center md:text-left flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1">
            <span>© {currentYear}</span>
            <a
              href="https://www.yatricloud.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary transition-colors hover:text-brand-600"
            >
              Yatri Cloud
            </a>
            <span>· All rights reserved.</span>
            <span className="hidden sm:inline text-muted-foreground/40" aria-hidden="true">·</span>
            <span>
              Designed by{" "}
              <a
                href="https://uimitra.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary transition-colors hover:text-brand-600"
              >
                {designedBy}
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
