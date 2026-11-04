import Navbar from "@/components/Navbar";
import Footer from "@/components/sections/Footer";
import { SEO } from "@/components/SEO";

const sections = [
  {
    title: "Cancellation Policy",
    body: [
      "Orders for certification vouchers, digital study material, training seats, event passes, mentorship sessions, and other services may be cancelled only before the order has been fulfilled, delivered, activated, scheduled, or shared with the learner.",
      "If you need to cancel, contact us as early as possible with your order ID, registered email, and payment reference.",
    ],
  },
  {
    title: "Refund Policy",
    body: [
      "Refunds are reviewed case by case. If a payment was charged but the product or service was not delivered, or if we are unable to fulfill the order, we will issue a refund to the original payment method.",
      "Digital products, activated vouchers, attended training sessions, downloaded resources, scheduled mentorship calls, and successfully delivered services are generally non-refundable unless required by law or explicitly approved by Yatri Cloud.",
    ],
  },
  {
    title: "Refund Timeline",
    body: [
      "Approved refunds are initiated within 5–7 working days. The time taken for the refund to reflect in your bank/card/UPI account depends on your payment provider or bank.",
    ],
  },
  {
    title: "How to Request a Refund",
    body: [
      "Email support@yatricloud.com or use the Contact Us page with your order ID, payment ID, registered email, reason for cancellation/refund, and any relevant screenshots.",
    ],
  },
];

export default function CancellationRefundPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Cancellation and Refund Policy · Yatri Cloud" description="Cancellation and refund policy for Yatri Cloud orders, vouchers, trainings, events and digital services." />
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-24 md:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Cancellation and Refund Policy</h1>
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
