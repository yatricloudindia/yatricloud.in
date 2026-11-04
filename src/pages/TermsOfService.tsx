import { useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/sections/Footer";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { FALLBACK_LEGAL_PAGES, getLegalPage, useSiteContent } from "@/lib/site-content";

/* Tiny local markdown renderer for legal pages.
 * `## heading` becomes the section heading, `- item` becomes a list
 * item, and every other non-empty line becomes a paragraph. The output
 * markup and classes match the previous hardcoded JSX exactly. */

type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] };

type LegalSection = { heading: string; blocks: LegalBlock[] };

const parseLegalMarkdown = (body: string): LegalSection[] => {
  const sections: LegalSection[] = [];
  let current: LegalSection | null = null;
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      current = { heading: line.slice(3).trim(), blocks: [] };
      sections.push(current);
      continue;
    }
    if (!current || !line) continue;
    if (line.startsWith("- ")) {
      const last = current.blocks[current.blocks.length - 1];
      if (last && last.kind === "list") {
        last.items.push(line.slice(2).trim());
      } else {
        current.blocks.push({ kind: "list", items: [line.slice(2).trim()] });
      }
    } else {
      current.blocks.push({ kind: "p", text: line });
    }
  }
  return sections;
};

const TermsOfService = () => {
  const page =
    useSiteContent(
      () => getLegalPage("terms-of-service"),
      FALLBACK_LEGAL_PAGES["terms-of-service"]
    ) ?? FALLBACK_LEGAL_PAGES["terms-of-service"];

  const sections = useMemo(() => parseLegalMarkdown(page.body_md), [page.body_md]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Terms and Conditions · Yatri Cloud"
        description="The simple terms for using Yatri Cloud practice tests, vouchers, courses and community events."
      />
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 py-24 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-invert max-w-none space-y-6">
            {sections.map((section, sectionIndex) => (
              <section key={sectionIndex}>
                <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
                {section.blocks.map((block, blockIndex) =>
                  block.kind === "list" ? (
                    <ul
                      key={blockIndex}
                      className="list-disc list-inside text-muted-foreground space-y-2 ml-4"
                    >
                      {block.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p
                      key={blockIndex}
                      className={
                        blockIndex < section.blocks.length - 1
                          ? "text-muted-foreground leading-relaxed mb-3"
                          : "text-muted-foreground leading-relaxed"
                      }
                    >
                      {block.text}
                    </p>
                  )
                )}
              </section>
            ))}
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
