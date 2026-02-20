"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

const GOLD = "#FFE066";

const PRIMARY_BTN_STYLE: React.CSSProperties = {
  backgroundColor: GOLD,
  boxShadow: "0 0 44px rgba(245,197,66,0.40), 0 0 90px rgba(245,197,66,0.16)",
};

type ChannelPrefs = { push: boolean; email: boolean };
type NotificationPrefs = {
  ten_min: boolean;
  five_min: boolean;
  on_deck: boolean;
  now_on_stage: boolean;
  stage_hold: boolean;
  vibrate: boolean;
  silent_mode: boolean;
};

type ProfileRow = {
  id: string;
  full_name: string;
  dob: string; // YYYY-MM-DD
  channel_prefs: ChannelPrefs;
  notification_prefs: NotificationPrefs;
  onboarding_complete: boolean;
};

function yearsOld(dobISO: string) {
  const dob = new Date(dobISO + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function Toggle({
  label,
  desc,
  value,
  onChange,
  disabled,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-white/85">{label}</p>
        {desc ? <p className="mt-1 text-xs text-white/55">{desc}</p> : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={[
          "relative h-7 w-12 rounded-full border transition",
          value
            ? "bg-emerald-500/20 border-emerald-400/30"
            : "bg-white/5 border-white/15",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-white/30",
        ].join(" ")}
        aria-pressed={value}
      >
        <span
          className={[
            "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white transition",
            value ? "left-6" : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = supabaseBrowser(); // ✅ create client inside component (no hooks)

  const [uid, setUid] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");

  const [channelPrefs, setChannelPrefs] = useState<ChannelPrefs>({
    push: true,
    email: false,
  });

  const DEFAULT_NOTIFS: NotificationPrefs = {
    ten_min: true,
    five_min: true,
    on_deck: true,
    now_on_stage: true,
    stage_hold: true,
    vibrate: true,
    silent_mode: false,
  };

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFS);

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setErr(null);

      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id ?? null;

      if (!id) {
        router.replace("/login");
        return;
      }

      setUid(id);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, dob, channel_prefs, notification_prefs, onboarding_complete")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        const p = data as ProfileRow;
        setFullName(p.full_name ?? "");
        setDob(p.dob ?? "");
        setChannelPrefs((p.channel_prefs as any) ?? { push: true, email: false });
        setNotifPrefs((p.notification_prefs as any) ?? DEFAULT_NOTIFS);

        if (p.onboarding_complete) {
          router.replace("/performer");
          return;
        }
      }

      setLoading(false);
    }

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setErr(null);
    if (!uid) return;

    const name = fullName.trim();
    if (!name) return setErr("Please enter your full name.");
    if (!dob) return setErr("Please enter your date of birth.");

    const age = yearsOld(dob);
    if (Number.isNaN(age)) return setErr("DOB format looks invalid.");
    if (age < 21) return setErr("You must be 21+ to use this app.");

    const finalNotifs: NotificationPrefs = notifPrefs.silent_mode
      ? { ...notifPrefs, vibrate: false }
      : notifPrefs;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: uid,
            full_name: name,
            dob,
            channel_prefs: channelPrefs,
            notification_prefs: finalNotifs,
            onboarding_complete: true,
          },
          { onConflict: "id" }
        );

      if (error) throw error;

      router.replace("/performer");
    } catch (e: any) {
      setErr(e?.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative z-0 min-h-screen text-white flex items-center justify-center px-6 py-14 overflow-hidden">
      {/* Background */}
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

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/12 bg-black/22 backdrop-blur-xl shadow-[0_0_70px_rgba(255,255,255,0.10)] px-6 py-10">
        <p
          className="text-[10px] md:text-xs tracking-[0.35em] text-center"
          style={{ color: GOLD, textShadow: "0 0 18px rgba(245,197,66,0.22)" }}
        >
          CLUB E11EVEN
        </p>

        <h1 className="mt-4 text-center text-2xl font-semibold tracking-[0.16em] text-glow-white">
          SETUP
        </h1>

        <p className="mt-3 text-center text-sm text-zinc-100/75">
          One-time setup. You can change settings later.
        </p>

        <div className="my-8 h-px w-full bg-white/10" />

        {loading ? (
          <p className="text-sm text-zinc-100/70 text-center">Loading…</p>
        ) : (
          <>
            {err ? (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100/90">
                {err}
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <label className="text-xs text-white/55 tracking-[0.2em] uppercase">
                  Full name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full bg-transparent text-white outline-none placeholder:text-white/30"
                  placeholder="Your name"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <label className="text-xs text-white/55 tracking-[0.2em] uppercase">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="mt-2 w-full bg-transparent text-white outline-none placeholder:text-white/30"
                />
                <p className="mt-2 text-xs text-white/45">Must be 21+.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-xs text-white/55 tracking-[0.2em] uppercase">Channel</p>
              <Toggle
                label="Push notifications"
                desc="Recommended."
                value={channelPrefs.push}
                onChange={(v) => setChannelPrefs((p) => ({ ...p, push: v }))}
              />
              <Toggle
                label="Email notifications"
                desc="Optional."
                value={channelPrefs.email}
                onChange={(v) => setChannelPrefs((p) => ({ ...p, email: v }))}
              />
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-xs text-white/55 tracking-[0.2em] uppercase">Notifications</p>

              <Toggle
                label="10-min heads up"
                value={notifPrefs.ten_min}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, ten_min: v }))}
              />
              <Toggle
                label="5-min heads up"
                value={notifPrefs.five_min}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, five_min: v }))}
              />
              <Toggle
                label="On deck"
                value={notifPrefs.on_deck}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, on_deck: v }))}
              />
              <Toggle
                label="Now on stage"
                value={notifPrefs.now_on_stage}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, now_on_stage: v }))}
              />
              <Toggle
                label="Stage hold"
                value={notifPrefs.stage_hold}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, stage_hold: v }))}
              />

              <div className="my-2 h-px w-full bg-white/10" />

              <Toggle
                label="Silent mode"
                desc="Disables vibrate."
                value={notifPrefs.silent_mode}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, silent_mode: v }))}
              />
              <Toggle
                label="Vibrate"
                value={notifPrefs.vibrate}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, vibrate: v }))}
                disabled={notifPrefs.silent_mode}
              />
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="mt-8 w-full rounded-full text-black py-3.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
              style={PRIMARY_BTN_STYLE}
            >
              {saving ? "Saving…" : "Finish setup"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}