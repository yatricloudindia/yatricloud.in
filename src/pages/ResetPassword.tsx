import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { SEO } from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldLabel } from "@/components/ui/form-layout";
import { useToast } from "@/hooks/use-toast";

/**
 * Landing page for the Supabase password-recovery email link.
 * The link opens the app with a recovery session (detectSessionInUrl),
 * so here the user can set a new password WITHOUT the old one.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // A recovery link establishes a session; confirm one exists.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
      setReady(true);
    });
    check();
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", description: "Please retype them.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Password updated", description: "You're all set, Yatri. Redirecting…" });
    setTimeout(() => navigate("/certifiedyatris"), 1600);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Reset Password · Yatri Cloud" description="Set a new password for your Yatri Cloud account." noindex />
      <Navbar />
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-28">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            {done ? <CheckCircle2 className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Set a new password</h1>

          {!ready ? (
            <p className="mt-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking your reset link…</p>
          ) : done ? (
            <p className="mt-3 text-muted-foreground">Your password has been updated. Taking you back in…</p>
          ) : !hasSession ? (
            <div className="mt-3 space-y-4">
              <p className="text-muted-foreground">
                This reset link is invalid or has expired. Open the newest "reset password" email, or request a fresh link from the login screen.
              </p>
              <Button onClick={() => navigate("/certifiedyatris")} className="rounded-xl">Back to login</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <Label htmlFor="new-password" className={fieldLabel}>New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 8 characters" />
              </div>
              <div>
                <Label htmlFor="confirm-password" className={fieldLabel}>Confirm password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Retype it" />
              </div>
              <Button type="submit" disabled={saving} className="w-full h-12 gap-2 rounded-xl font-semibold shadow-inset-btn">
                {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>) : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
