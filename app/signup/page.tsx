"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-ink2 max-w-md mx-auto px-4 py-12">Laden…</div>}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null); setInfo(null);
    try {
      if (password.length < 8) throw new Error("Wachtwoord moet minimaal 8 tekens zijn");
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
      if (data.user && !data.session) {
        setInfo("Account aangemaakt! Bevestig je email via de link die we hebben gestuurd.");
      } else if (data.session) {
        router.replace(next);
        router.refresh();
      }
    } catch (e: any) {
      setErr(e?.message ?? "Aanmelden mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setErr(error.message);
  }

  return (
    <div className="fade-in max-w-md mx-auto px-4 py-12">
      <div className="bg-card rounded-md border p-7" style={{ borderColor: "#DCE7F4", boxShadow: "0 8px 24px rgba(11,42,74,.10)" }}>
        <div className="text-[11px] font-bold uppercase text-accent mb-2" style={{ letterSpacing: ".14em" }}>Begin met verzamelen</div>
        <h1 className="font-display text-[36px] text-ink m-0 mb-1" style={{ fontWeight: 400 }}>Account maken</h1>
        <p className="text-ink2 text-[14px] mb-6">Gratis. Sla je wallet op en synct over al je apparaten.</p>

        <button
          type="button"
          onClick={google}
          className="w-full inline-flex items-center justify-center gap-3 bg-white border-2 rounded-full py-2.5 px-5 text-[14px] font-semibold text-ink hover:bg-bg2 transition mb-4"
          style={{ borderColor: "#C3D5EC" }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2 14-5.3l-6.5-5.5C29.4 34.7 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.8l6.5 5.5C40.9 36.8 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
          Doorgaan met Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: "#DCE7F4" }} />
          <span className="text-[11px] text-ink3 uppercase font-bold" style={{ letterSpacing: ".1em" }}>of email</span>
          <div className="flex-1 h-px" style={{ background: "#DCE7F4" }} />
        </div>

        <form onSubmit={signup} className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".08em" }}>Email</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="jij@email.nl"
              className="w-full bg-card border rounded px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent transition"
              style={{ borderColor: "#C3D5EC" }}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".08em" }}>Wachtwoord (min. 8 tekens)</label>
            <input
              type="password" required autoComplete="new-password" minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-card border rounded px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent transition"
              style={{ borderColor: "#C3D5EC" }}
            />
          </div>

          {err && <div className="text-pokeRed text-[13px] font-semibold">{err}</div>}
          {info && <div className="text-pokeGreen text-[13px] font-semibold">{info}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn-physical w-full py-3 rounded-full text-[14px] disabled:opacity-50"
            style={{ background: "#FFCB05", color: "#0B2A4A", letterSpacing: ".5px", boxShadow: "0 3px 0 #F2B705", fontFamily: "\"Luckiest Guy\", sans-serif", fontSize: 16 }}
          >
            {loading ? "Bezig…" : "Account aanmaken"}
          </button>
        </form>

        <div className="flex items-center justify-center mt-5 text-[12px]">
          <a href={`/login?next=${encodeURIComponent(next)}`} className="text-ink3 hover:text-accent transition">
            Al een account? <span className="text-accent font-semibold">Inloggen →</span>
          </a>
        </div>
      </div>
    </div>
  );
}
