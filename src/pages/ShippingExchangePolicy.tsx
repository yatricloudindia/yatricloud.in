import Navbar from "@/components/Navbar";
import Footer from "@/components/sections/Footer";
import { SEO } from "@/components/SEO";

const sections = [
  {
    title: "Digital Delivery",
    body: [
      "Yatri Cloud primarily provides digital products and services such as certification vouchers, exam preparation resources, training access, event registrations, mentorship sessions, and downloadable/online learning material.",
      "Digital items are delivered through email, account access, direct links, or the relevant dashboard after successful payment and verification.",
    ],
  },
  {
    title: "Delivery Timeline",
    body: [
      "Most digital orders are processed immediately or within 24–48 working hours. Some certification vouchers, partner-issued access codes, or manually reviewed services may take longer depending on provider processing time.",
      "If your order is delayed, contact support@yatricloud.com with your order ID and payment reference.",
    ],
  },
  {
    title: "Shipping",
    body: [
      "We do not usually ship physical products. If a physical item is ever included in an order, the shipping timeline, courier details, and applicable charges will be clearly communicated before fulfillment.",
    ],
  },
  {
    title: "Exchange Policy",
    body: [
      "Digital products, vouchers, and access codes cannot usually be exchanged after delivery or activation. If the wrong item was delivered due to an error from our side, we will correct the order or provide a suitable replacement.",
    ],
  },
];

export default function ShippingExchangePolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Shipping and Exchange Policy · Yatri Cloud" description="Shipping, digital delivery and exchange policy for Yatri Cloud products and services." />
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-24 md:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Shipping and Exchange Policy</h1>
        <p className="mt-4 text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-2xl font-semibold">{section.title}</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                {section.body.map((p) => <p key={p}>{p}</p>)}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
