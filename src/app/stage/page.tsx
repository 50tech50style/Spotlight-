"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";

export default function StageScreen() {
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  // placeholders (we’ll hook these to real groups later)
  const currently = { name: "—" };
  const next3 = [{ name: "—" }, { name: "—" }, { name: "—" }];

  const joinUrl = useMemo(() => {
    if (!activeShiftId || !joinCode) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/performer/stage-signup?shift=${activeShiftId}&code=${joinCode}`;
  }, [activeShiftId, joinCode]);

  async function loadActiveShift() {
    try {
      const res = await fetch("/api/shifts/active");
      const json = await res.json();
      setActiveShiftId(json.shift?.id ?? null);
      setJoinCode(json.shift?.join_code ?? null);
      setErr(null);
    } catch {
      setErr("Could not load active shift.");
      setActiveShiftId(null);
      setJoinCode(null);
    }
  }

  async function refreshToken(shiftId: string) {
    try {
      const res = await fetch("/api/shifts/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErr(json.error ?? "Could not load QR token.");
        setToken("");
        return;
      }

      setToken(json.token ?? "");
      setErr(null);
    } catch {
      setErr("Could not load QR token.");
      setToken("");
    }
  }

  // Poll active shift (updates when wrangler starts a new shift)
  useEffect(() => {
    loadActiveShift();
    const i = setInterval(loadActiveShift, 5000);
    return () => clearInterval(i);
  }, []);

  // Poll rotating token
  useEffect(() => {
    if (!activeShiftId) return;

    refreshToken(activeShiftId);
    const t = setInterval(() => refreshToken(activeShiftId), 30000); // keep 30s (or 45s later)
    return () => clearInterval(t);
  }, [activeShiftId]);

  return (
    <div className="relative min-h-screen text-white px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.25em] text-[#FFE066]">
              CLUB E11EVEN
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-[0.16em] text-glow-white">
              STAGE
            </h1>
          </div>
        </div>

        {/* Top grid: current + next 3 */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-white/10 bg-black/25 p-6">
            <p className="text-xs text-zinc-200/60 tracking-[0.2em] uppercase">
              Currently on stage
            </p>
            <div className="mt-4">
              <p className="text-2xl md:text-3xl font-semibold">
                {currently.name}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-6">
            <p className="text-xs text-zinc-200/60 tracking-[0.2em] uppercase">
              Next 3 groups
            </p>

            <div className="mt-4 space-y-3">
              {next3.map((g, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <p className="text-sm md:text-base font-medium">{g.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom grid: check-in + join */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Check-in QR (rotating) */}
          <div className="rounded-3xl border border-white/10 bg-black/25 p-6">
            <p className="text-xs text-zinc-200/60 tracking-[0.2em] uppercase">
              Check in
            </p>
            <p className="mt-2 text-sm text-zinc-200/70">
              Scan to request access. Wrangler approval required.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-center min-h-[260px]">
              {activeShiftId && token ? (
                <div className="bg-white p-3 rounded-2xl">
                  <QRCode value={token} size={210} />
                </div>
              ) : (
                <p className="text-sm text-zinc-200/70">
                  {activeShiftId ? "Loading…" : "No active shift"}
                </p>
              )}
            </div>

            {err && (
              <p className="mt-3 text-xs text-zinc-200/70 border border-white/10 bg-black/20 rounded-2xl p-3">
                {err}
              </p>
            )}
          </div>

          {/* Join rotation QR (per shift) */}
          <div className="rounded-3xl border border-white/10 bg-black/25 p-6">
            <p className="text-xs text-zinc-200/60 tracking-[0.2em] uppercase">
              Join rotation
            </p>
            <p className="mt-2 text-sm text-zinc-200/70">
              Scan to open stage signup. Changes every shift.
            </p>
                        {joinUrl && (
            <a
                href={joinUrl}
                className="mt-3 block text-xs text-zinc-200/70 underline underline-offset-4 hover:text-zinc-100"
            >
                Open Join Link (dev)
            </a>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-center min-h-[260px]">
              {joinUrl ? (
                <div className="bg-white p-3 rounded-2xl">
                  <QRCode value={joinUrl} size={210} />
                </div>
              ) : (
                <p className="text-sm text-zinc-200/70">
                  {activeShiftId ? "Loading…" : "No active shift"}
                </p>
              )}
            </div>

            {/* optional tiny label */}
            {joinCode && (
              <p className="mt-3 text-[11px] text-zinc-200/60">
                Code: {joinCode}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}