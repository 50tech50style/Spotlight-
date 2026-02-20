"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [mode, setMode] = useState<Mode | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  

  // If user is already logged in (or becomes logged in), send them to performer flow.
  // /performer should handle redirecting to /onboarding if onboarding isn't complete.
  useEffect(() => {
    let mounted = true;

    async function redirectIfAuthed() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session?.user) {
        router.replace("/performer");
      }
    }

    redirectIfAuthed();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace("/performer");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function sendMagicLink() {
    if (!email) return;

    setLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // IMPORTANT:
        // - This is where Supabase will send users back after they click the email link.
        // - We want them to land in the performer flow (which will gate to onboarding).
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/performer`
            : undefined,
      },
    });

    setLoading(false);

    if (error) {
      setStatus(error.message);
    } else {
      setStatus(
        mode === "signup"
          ? "Check your email to create your account."
          : "Check your email to log in."
      );
    }
  }

  return (
    <div className="relative min-h-screen text-white flex items-center justify-center px-6 py-14 overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center scale-[1.03]"
        style={{
          backgroundImage: "url(/bg/e11even.jpg)",
          filter: "contrast(1.12) saturate(1.12) brightness(1.05)",
        }}
        aria-hidden="true"
      />

      {/* Lighter overlay */}
      <div className="absolute inset-0 z-0 bg-black/20" aria-hidden="true" />

      {/* Vignette (no blur) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 28%, rgba(255,255,255,0.12), transparent 62%), radial-gradient(120% 110% at 50% 120%, rgba(0,0,0,0.35), rgba(0,0,0,0.70))",
        }}
        aria-hidden="true"
      />

      {/* Foreground panel */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/12 bg-black/28 backdrop-blur-xl shadow-[0_0_70px_rgba(255,255,255,0.10)] px-6 py-10">
        {/* Header */}
        <div className="text-center">
          <p
            className="text-[10px] md:text-xs tracking-[0.35em]"
            style={{ color: "var(--gold)" }}
          >
            CLUB E11EVEN
          </p>

          <h1 className="mt-5 text-2xl md:text-3xl tracking-[0.28em] font-semibold text-shadow-[0_0_30px_rgba(255,255,255,0.18)]">
            SPOTLIGHT
          </h1>

          <p className="mt-4 text-sm text-zinc-100/75 leading-relaxed">
            {mode
              ? mode === "signup"
                ? "Create your performer account."
                : "Log in to your performer account."
              : "Choose an option to continue."}
          </p>
        </div>

        {/* Content */}
        <div className="mt-10">
          {/* ENTRY SCREEN */}
          {!mode ? (
            <div className="space-y-3">
              <button
                onClick={() => setMode("login")}
                className="w-full rounded-full py-3.5 text-sm md:text-base font-semibold transition active:scale-[0.99] hover:opacity-90"
                style={{
                  backgroundColor: "var(--gold)",
                  color: "#000",
                  boxShadow:
                    "0 0 44px var(--gold-glow), 0 0 90px var(--gold-soft)",
                }}
              >
                Login
              </button>

              <button
                onClick={() => setMode("signup")}
                className="w-full rounded-full border py-3.5 text-sm md:text-base font-semibold transition active:scale-[0.99] hover:bg-white/5"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--gold) 55%, transparent)",
                  color: "var(--gold)",
                }}
              >
                Create Account
              </button>

              <div className="pt-4 text-center">
                <Link
                  href="/"
                  className="text-xs md:text-sm text-zinc-100/55 hover:text-zinc-100 transition"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          ) : (
            /* EMAIL SCREEN */
            <div className="space-y-4">
              <p className="text-xs text-zinc-100/60 text-center tracking-[0.18em] uppercase">
                {mode === "signup" ? "Create Account" : "Login"}
              </p>

              <label className="block">
                <span className="sr-only">Email address</span>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full bg-black/35 border border-white/12 px-5 py-3 text-sm outline-none transition focus:border-white/25"
                />
              </label>

              <button
                onClick={sendMagicLink}
                disabled={!email || loading}
                className="w-full rounded-full py-3.5 text-sm md:text-base font-semibold transition active:scale-[0.99] hover:opacity-90 disabled:opacity-60"
                style={{
                  backgroundColor: "var(--gold)",
                  color: "#000",
                  boxShadow:
                    "0 0 44px var(--gold-glow), 0 0 90px var(--gold-soft)",
                }}
              >
                {loading ? "Sending..." : "Continue"}
              </button>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => {
                    setMode(null);
                    setEmail("");
                    setStatus(null);
                  }}
                  className="w-full rounded-full border border-white/12 py-3 text-sm text-zinc-100/80 hover:bg-white/5 transition"
                >
                  Back
                </button>

                <button
                  onClick={() => {
                    setEmail("");
                    setStatus(null);
                  }}
                  className="w-full rounded-full border border-white/12 py-3 text-sm text-zinc-100/80 hover:bg-white/5 transition"
                >
                  Clear
                </button>
              </div>

              {status && (
                <p className="text-xs text-center text-zinc-100/70 pt-2 leading-relaxed">
                  {status}
                </p>
              )}

              <p className="text-[11px] text-center text-zinc-100/45 pt-2 leading-relaxed">
                We’ll email you a secure sign-in link. No password required.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}