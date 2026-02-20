"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Status =
  | "loading"
  | "needs_login"
  | "invalid_link"
  | "not_approved"
  | "ready";

const GOLD = "#FFE066";

export default function StageSignupClient() {
  const supabase = supabaseBrowser(); // ✅ create the client in the browser, inside the component

  const params = useSearchParams();
  const shiftId = params.get("shift");
  const code = params.get("code");

  const [status, setStatus] = useState<Status>("loading");
  const [msg, setMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const primaryBtnStyle = useMemo(
    () => ({
      backgroundColor: GOLD,
      boxShadow:
        "0 0 44px rgba(245,197,66,0.40), 0 0 90px rgba(245,197,66,0.16)",
    }),
    []
  );

  useEffect(() => {
    async function run() {
      setMsg(null);

      if (!shiftId || !code) {
        setStatus("invalid_link");
        return;
      }

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      if (!uid) {
        setStatus("needs_login");
        return;
      }

      const active = await fetch("/api/shifts/active").then((r) => r.json());
      const activeShift = active.shift;

      if (
        !activeShift ||
        activeShift.id !== shiftId ||
        activeShift.join_code !== code
      ) {
        setStatus("invalid_link");
        return;
      }

      const { data: checkin, error } = await supabase
        .from("checkins")
        .select("id,status")
        .eq("shift_id", shiftId)
        .eq("performer_id", uid)
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setStatus("not_approved");
        setMsg(error.message);
        return;
      }

      if (!checkin || checkin.status !== "approved") {
        setStatus("not_approved");
        return;
      }

      setStatus("ready");
    }

    setStatus("loading");
    run();
  }, [shiftId, code, supabase]);

  async function continueFlow() {
    setMsg(null);

    if (!shiftId || !code) {
      setMsg("Missing shift or code.");
      return;
    }

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;

    if (!uid) {
      setStatus("needs_login");
      return;
    }

    setJoining(true);

    try {
      const res = await fetch("/api/stage-signups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          performerId: uid,
          code,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(json.error ?? "Could not join queue.");
        return;
      }

      setMsg("✅ You’re on standby. Watch the stage screen for your group.");
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="relative z-0 min-h-screen text-white flex items-center justify-center px-6 py-14 overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center scale-[1.03]"
        style={{
          backgroundImage: "url(/bg/e11even.jpg)",
          filter: "contrast(1.12) saturate(1.12) brightness(1.05)",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 z-0 bg-black/20" aria-hidden="true" />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 28%, rgba(255,255,255,0.12), transparent 62%), radial-gradient(120% 110% at 50% 120%, rgba(0,0,0,0.35), rgba(0,0,0,0.70))",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md text-center rounded-3xl border border-white/12 bg-black/22 backdrop-blur-xl shadow-[0_0_70px_rgba(255,255,255,0.10)] px-6 py-10">
        <p
          className="text-[10px] md:text-xs tracking-[0.35em]"
          style={{
            color: GOLD,
            textShadow: "0 0 18px rgba(245,197,66,0.22)",
          }}
        >
          CLUB E11EVEN
        </p>

        <h1 className="mt-4 text-2xl md:text-3xl font-semibold tracking-[0.16em] text-glow-white">
          STAGE SIGNUP
        </h1>

        <p className="mt-3 text-sm text-zinc-100/75 leading-relaxed">
          Confirm your access for tonight, then choose your stage options.
        </p>

        <div className="my-8 flex items-center justify-center">
          <div
            className="h-px w-16 md:w-24"
            style={{
              backgroundImage: `linear-gradient(to right, transparent, rgba(245,197,66,0.75), transparent)`,
              boxShadow: "0 0 16px rgba(245,197,66,0.18)",
            }}
          />
        </div>

        {status === "loading" && (
          <p className="text-sm text-zinc-100/70">Checking access…</p>
        )}

        {status === "needs_login" && (
          <>
            <p className="text-sm text-zinc-100/80">Please log in to continue.</p>

            <Link
              href="/login"
              className="mt-6 block w-full rounded-full text-black py-3.5 text-sm font-semibold transition hover:opacity-90 active:scale-[0.99]"
              style={primaryBtnStyle}
            >
              Log in
            </Link>

            <Link
              href="/"
              className="mt-3 block w-full rounded-full border border-white/20 py-3.5 text-sm text-zinc-100 transition hover:border-white/35 hover:bg-white/5"
            >
              Back to Home
            </Link>
          </>
        )}

        {status === "invalid_link" && (
          <>
            <p className="text-sm text-zinc-100/85">This signup link isn’t active.</p>
            <p className="mt-2 text-xs text-zinc-100/60">
              Please scan the current QR on the stage screen.
            </p>

            <Link
              href="/"
              className="mt-6 block w-full rounded-full border border-white/20 py-3.5 text-sm text-zinc-100 transition hover:border-white/35 hover:bg-white/5"
            >
              Back to Home
            </Link>
          </>
        )}

        {status === "not_approved" && (
          <>
            <p className="text-sm text-zinc-100/85">You’re not cleared yet.</p>
            <p className="mt-2 text-xs text-zinc-100/60">
              Scan the check-in QR and ask the wrangler to approve you.
            </p>

            <Link
              href="/stage"
              className="mt-6 block w-full rounded-full border border-white/20 py-3.5 text-sm text-zinc-100 transition hover:border-white/35 hover:bg-white/5"
            >
              View Stage Screen
            </Link>

            <Link
              href="/login"
              className="mt-3 block w-full rounded-full text-black py-3.5 text-sm font-semibold transition hover:opacity-90 active:scale-[0.99]"
              style={primaryBtnStyle}
            >
              Go to Login
            </Link>
          </>
        )}

        {status === "ready" && (
          <>
            <p className="text-sm text-zinc-100/85">✅ Cleared for tonight.</p>
            <p className="mt-2 text-xs text-zinc-100/60">Tap continue to join standby.</p>

            <button
              onClick={continueFlow}
              disabled={joining}
              className="mt-6 w-full rounded-full text-black py-3.5 text-sm font-semibold transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
              style={primaryBtnStyle}
            >
              {joining ? "Joining…" : "Continue"}
            </button>
          </>
        )}

        {msg && (
          <p className="mt-6 text-xs text-zinc-100/70 border border-white/10 bg-black/20 rounded-2xl p-3">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}