import Navbar from "@/components/Navbar";
import Footer from "@/components/sections/Footer";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="About Us · Yatri Cloud"
        description="Learn about Yatri Cloud's mission to make world-class cloud certifications accessible through verified practice exams, official vouchers, and practitioner-led learning."
        url="/about-us"
      />
      <Navbar />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="container mx-auto max-w-4xl px-4 py-16 text-center md:px-6">
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Affordable Cloud Certifications for Engineers Everywhere
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Yatri Cloud is an independent educational platform created to help engineers, students, and technology professionals navigate the path toward cloud mastery and career advancement.
          </p>
        </section>

        {/* Core Pillars */}
        <section className="container mx-auto max-w-5xl px-4 py-8 md:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold">Rigorous Practice Standards</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Our practice questions reflect current vendor blueprints, verified explanations, and practical architectural scenarios for AWS, Microsoft Azure, Google Cloud, and Kubernetes.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold">Affordable Access &amp; Vouchers</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Certification exams are costly. Through partnerships and volume programs, we make official exam vouchers and study materials accessible at significant savings for global candidates.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold">Editorial Integrity &amp; Insights</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Every guide, deep-dive, and case study published on our blog is contributed by certified professionals and experienced cloud practitioners who have walked the same path.
              </p>
            </div>
          </div>
        </section>

        {/* Narrative Section */}
        <section className="container mx-auto max-w-3xl px-4 py-12 md:px-6">
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <h2 className="font-display text-2xl font-bold tracking-tight">Our Mission</h2>
            <p className="leading-relaxed text-muted-foreground">
              In Sanskrit and Hindi, <strong className="text-foreground">"Yatri"</strong> means traveler or seeker. In the world of technology, every developer, administrator, and architect is a lifelong learner on a journey across evolving cloud ecosystems.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Yatri Cloud was founded by Yatharth Chauhan and a community of certified architects who saw how fragmented and expensive certification preparation had become. Our goal is simple: provide honest, accurate study materials, peer-driven mentorship, and transparent guidance without predatory pricing.
            </p>

            <h2 className="mt-8 font-display text-2xl font-bold tracking-tight">What We Do</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Practice Tests:</strong> Carefully maintained question banks with detailed architectural rationales, referencing official vendor whitepapers and documentation.
              </li>
              <li>
                <strong className="text-foreground">Exam Vouchers:</strong> Authorized discounted vouchers below retail pricing to lower financial barriers for students and early-career engineers.
              </li>
              <li>
                <strong className="text-foreground">Community &amp; Events:</strong> Live study groups, interactive workshops, and guest speaker sessions featuring industry experts.
              </li>
              <li>
                <strong className="text-foreground">Knowledge Sharing:</strong> Technical tutorials, exam strategy breakdowns, and career retrospectives on our public publication.
              </li>
            </ul>

            <h2 className="mt-8 font-display text-2xl font-bold tracking-tight">Editorial Standards &amp; Review Policy</h2>
            <p className="leading-relaxed text-muted-foreground">
              To ensure our visitors receive reliable, actionable technical information, all articles published under Yatri Cloud undergo editorial review. We verify code snippets, architectural patterns, and exam references against current cloud service releases.
            </p>
          </div>

          {/* Contact Box */}
          <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h3 className="font-display text-base font-bold">Have Questions or Suggestions?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Our team is always here to help you on your learning journey.</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-muted-foreground">Email:</span>
              <a href="mailto:support@yatricloud.com" className="font-medium text-primary hover:underline">
                support@yatricloud.com
              </a>
              <span className="text-muted-foreground">·</span>
              <Link to="/contact-us" className="font-medium text-primary hover:underline">
                Contact Form
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link to="/privacy-policy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
