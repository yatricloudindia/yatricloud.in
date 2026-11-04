import Navbar from "@/components/Navbar";
import Footer from "@/components/sections/Footer";
import { ContactSection } from "@/components/sections/ContactSection";
import { SEO } from "@/components/SEO";

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Contact Us · Yatri Cloud" description="Contact Yatri Cloud for support, certification vouchers, trainings, events, payments and partnership questions." />
      <Navbar />
      <main className="pt-20">
        <section className="container mx-auto max-w-4xl px-4 pt-16 pb-12 text-center md:px-6">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Say hello, <span className="text-primary">Yatri</span></h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Questions about a voucher, a training, a payment or a partnership? Send us a note. A real person on the team reads every message and writes back.
          </p>
        </section>
        <ContactSection hideIntro />
      </main>
      <Footer />
    </div>
  );
}
