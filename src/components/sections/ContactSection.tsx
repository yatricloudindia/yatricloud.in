import { type ReactNode, type FormEvent, useState } from "react";
import { ArrowRight, Loader2, Mail, Phone, MapPin, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldLabel, OptionalTag } from "@/components/ui/form-layout";
import { useToast } from "@/hooks/use-toast";
import { useSiteContent, getSiteSettings, FALLBACK_SETTINGS } from "@/lib/site-content";

const Field = ({ id, label, optional, children }: { id: string; label: string; optional?: boolean; children: ReactNode }) => (
  <div>
    <Label htmlFor={id} className={fieldLabel}>{label}{optional && <OptionalTag />}</Label>
    {children}
  </div>
);

/** `hideIntro`: the host page already shows its own heading (e.g. /contact-us). */
export const ContactSection = ({ hideIntro = false }: { hideIntro?: boolean } = {}) => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  /* Contact details come from Supabase site_settings (seeded identical). */
  const settings = useSiteContent(getSiteSettings, FALLBACK_SETTINGS);
  const contact = settings.contact || FALLBACK_SETTINGS.contact;

  const CONTACT_INFO = [
    { label: "Email", value: contact.email, href: `mailto:${contact.email}`, icon: Mail },
    { label: "Phone", value: contact.phone, href: contact.phone_href, icon: Phone },
    { label: "Location", value: contact.location, icon: MapPin },
    { label: "Office hours (IST)", value: contact.hours, icon: Clock },
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim().toLowerCase(),
      subject: String(fd.get("subject") || "").trim() || null,
      message: String(fd.get("message") || "").trim(),
    });
    setSending(false);
    if (error) {
      toast({
        title: "That didn't go through",
        description: `Please try again in a moment, or email us directly at ${contact.email}.`,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Message sent!",
      description: "Thanks for reaching out, Yatri. We'll get back to you very soon.",
    });
    form.reset();
  };

  const renderValue = (val: string) => {
    if (val.includes(" · ")) {
      const parts = val.split(" · ");
      return (
        <div className="mt-1 space-y-1 font-medium text-foreground text-sm leading-relaxed">
          {parts.map((p) => (
            <div key={p} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span>{p}</span>
            </div>
          ))}
        </div>
      );
    }
    return <div className="mt-0.5 font-semibold text-foreground text-sm leading-relaxed">{val}</div>;
  };

  return (
    <section id="contact" className={`bg-background ${hideIntro ? "pb-20 md:pb-28" : "py-20 md:py-28"}`}>
      <div className="container mx-auto px-4 md:px-6">
        {!hideIntro && (<ScrollReveal>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight">
              Say hello, <span className="text-primary">Yatri</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Questions, ideas, or just want to talk cloud? We read every message and we'll get back to you soon.
            </p>
          </div>
        </ScrollReveal>)}

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Contact info, unified single card container */}
          <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 md:p-8 lg:col-span-2 shadow-2xs space-y-6">
            <div>
              <h3 className="font-display text-2xl font-black text-foreground mb-1">Get in touch</h3>
              <p className="text-sm text-muted-foreground mb-6">We'd love to hear from you. Reach out through any of these channels.</p>
              
              <div className="space-y-6">
                {CONTACT_INFO.map((info) => {
                  const inner = (
                    <div className="group cursor-pointer">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                        {info.label}
                      </div>
                      {renderValue(info.value)}
                    </div>
                  );
                  return info.href ? (
                    <a key={info.label} href={info.href} className="block focus-visible:outline-none">{inner}</a>
                  ) : (
                    <div key={info.label}>{inner}</div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Message form */}
          <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-border/80 bg-card p-6 md:p-8 lg:col-span-3 shadow-2xs">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field id="c-name" label="Your name">
                <Input id="c-name" name="name" required placeholder="Your full name" />
              </Field>
              <Field id="c-email" label="Email address">
                <Input id="c-email" name="email" type="email" required placeholder="you@example.com" />
              </Field>
            </div>
            <Field id="c-subject" label="Subject" optional>
              <Input id="c-subject" name="subject" placeholder="How can we help?" />
            </Field>
            <Field id="c-message" label="Message">
              <Textarea id="c-message" name="message" required placeholder="Tell us a little about what you need" />
            </Field>
            <Button type="submit" disabled={sending} className="w-full gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-inset-btn hover:bg-primary/90 min-h-[48px]">
              {sending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>) : (<>Send message <ArrowRight className="h-4 w-4" /></>)}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
