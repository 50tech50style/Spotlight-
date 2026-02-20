"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const GOLD = "#FFE066";

type Shift = {
  id: string;
  created_at: string;
  current_group_size: number;
  is_active: boolean;
};

type SignupRow = {
  id: string;
  performer_id: string;
  status: string;
  queued_at: string | null;
  grouped_at: string | null;
  done_at: string | null;
  wait_minutes: number | null;
};

type StageSignupsResponse = {
  shift: Shift;
  standby: SignupRow[];
  assigned: SignupRow[];
  history: SignupRow[];
  metrics: {
    standby_count: number;
    assigned_count: number;
    history_count: number;
    avg_wait_minutes: number;
  };
};

type CheckinRow = {
  id: string;
  status: "pending" | "approved";
  scanned_at: string;
  performer_id: string;
  shift_id: string;
};

function shortId(id: string) {
  return id.slice(0, 8);
}

function statusPill(status: string) {
  const s = status.toLowerCase();
  if (s.includes("confirm")) return "bg-emerald-500/15 text-emerald-200 border-emerald-500/25";
  if (s.includes("cancel")) return "bg-red-500/15 text-red-200 border-red-500/25";
  if (s.includes("pending")) return "bg-yellow-500/15 text-yellow-100 border-yellow-500/25";
  if (s.includes("queued")) return "bg-white/10 text-zinc-100 border-white/10";
  return "bg-white/10 text-zinc-100 border-white/10";
}

function fmtMinutes(n: number | null) {
  if (n == null) return "—";
  if (n < 1) return "<1 min";
  return `${n.toFixed(1)} min`;
}

function hourLabelFromISO(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const h = d.getHours();
  const suffix = h >= 12 ? "PM" : "AM";
  const hr12 = ((h + 11) % 12) + 1;
  return `${hr12}${suffix}`;
}

function groupRowsByHour(rows: SignupRow[], which: "grouped_at" | "done_at") {
  const map = new Map<string, SignupRow[]>();
  for (const r of rows) {
    const label = hourLabelFromISO(r[which]);
    const arr = map.get(label) ?? [];
    arr.push(r);
    map.set(label, arr);
  }

  const toHourNum = (label: string) => {
    if (label === "—") return -1;
    const m = label.match(/^(\d+)(AM|PM)$/);
    if (!m) return -1;
    const n = Number(m[1]);
    const ap = m[2];
    if (ap === "AM") return n === 12 ? 0 : n;
    return n === 12 ? 12 : n + 12;
  };

  return Array.from(map.entries())
    .map(([label, items]) => ({
      label,
      hour: toHourNum(label),
      items: items.sort((a, b) => {
        const ta = a[which] ? new Date(a[which] as string).getTime() : 0;
        const tb = b[which] ? new Date(b[which] as string).getTime() : 0;
        return tb - ta;
      }),
    }))
    .sort((a, b) => b.hour - a.hour);
}

function ShellCard({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-3xl border border-white/12 bg-black/20 backdrop-blur-xl shadow-[0_0_70px_rgba(255,255,255,0.10)]",
        className,
      ].join(" ")}
    >
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-zinc-200/60 tracking-[0.2em] uppercase">{title}</p>
          {subtitle ? <p className="mt-2 text-sm text-zinc-100/70">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85">
      {children}
    </span>
  );
}

function TimeBucketRow({
  label,
  items,
  chevron = "right",
}: {
  label: string;
  items: SignupRow[];
  chevron?: "right" | "down";
}) {
  const preview = items.slice(0, 3);
  const extra = items.length - preview.length;

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xl font-semibold text-white/85">{label}</p>
        <span className="text-white/45 text-xl">{chevron === "right" ? "›" : "⌄"}</span>
      </div>

      <div className="mt-3 border-t border-white/10" />

      <div className="mt-3 flex flex-wrap gap-2">
        {preview.map((r) => (
          <Chip key={r.id}>{shortId(r.performer_id)}</Chip>
        ))}
        {extra > 0 ? <Chip>+{extra}</Chip> : null}
      </div>
    </div>
  );
}

export default function WranglerPage() {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [signups, setSignups] = useState<StageSignupsResponse | null>(null);
  const [checkins, setCheckins] = useState<{ pending: CheckinRow[]; approved: CheckinRow[] } | null>(
    null
  );

  const [loadingShift, setLoadingShift] = useState(false);
  const [loadingClose, setLoadingClose] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Stopwatch (lives inside Groups)
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const elapsed = useMemo(() => {
    const totalSec = Math.floor(elapsedMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (x: number) => String(x).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }, [elapsedMs]);

  // Top tabs only
  const [groupsView, setGroupsView] = useState<"current" | "history">("current");

  const Background = (
    <>
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
    </>
  );

  async function loadActiveShift() {
    try {
      const res = await fetch("/api/shifts/active", { cache: "no-store" });
      const json = await res.json();
      setActiveShift(json.shift ?? null);
    } catch {
      setActiveShift(null);
    }
  }

  async function loadWranglerData(shiftId: string) {
    setLoadingData(true);
    setErr(null);

    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/wrangler/stage-signups?shiftId=${shiftId}`, { cache: "no-store" }),
        fetch(`/api/wrangler/checkins?shiftId=${shiftId}`, { cache: "no-store" }),
      ]);

      const sJson = await sRes.json();
      const cJson = await cRes.json();

      if (!sRes.ok) throw new Error(sJson.error ?? "Could not load stage signups");
      if (!cRes.ok) throw new Error(cJson.error ?? "Could not load check-ins");

      setSignups(sJson);
      setCheckins(cJson);
    } catch (e: any) {
      setErr(e?.message ?? "Could not load data");
      setSignups(null);
      setCheckins(null);
    } finally {
      setLoadingData(false);
    }
  }

  async function startNewShift() {
    setLoadingShift(true);
    setErr(null);
    try {
      const res = await fetch("/api/shifts/start", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start shift");
      await loadActiveShift();
    } catch (e: any) {
      setErr(e?.message ?? "Could not start shift");
    } finally {
      setLoadingShift(false);
    }
  }

  async function closeShift() {
    if (!activeShift?.id) return;
    setLoadingClose(true);
    setErr(null);
    try {
      // Implement this endpoint on your side:
      // POST /api/shifts/close { shiftId }
      const res = await fetch("/api/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: activeShift.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not close shift");
      await loadActiveShift();
    } catch (e: any) {
      setErr(e?.message ?? "Could not close shift");
    } finally {
      setLoadingClose(false);
    }
  }

  async function setGroupSize(size: number) {
    if (!activeShift) return;
    setErr(null);
    try {
      const res = await fetch("/api/shifts/group-size", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: activeShift.id, size }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not update group size");
      await loadActiveShift();
      await loadWranglerData(activeShift.id);
    } catch (e: any) {
      setErr(e?.message ?? "Could not update group size");
    }
  }

  // Polling
  useEffect(() => {
    loadActiveShift();
    const i = setInterval(loadActiveShift, 5000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!activeShift?.id) return;
    loadWranglerData(activeShift.id);
    const i = setInterval(() => loadWranglerData(activeShift.id), 5000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShift?.id]);

  // Stopwatch tick
  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setElapsedMs((v) => v + 250), 250);
    return () => clearInterval(i);
  }, [running]);

  const assigned = signups?.assigned ?? [];
  const standby = signups?.standby ?? [];
  const history = signups?.history ?? [];

  const currentBuckets = useMemo(() => groupRowsByHour(assigned, "grouped_at"), [assigned]);
  const historyBuckets = useMemo(() => groupRowsByHour(history, "done_at"), [history]);

  const shiftLabel = activeShift?.is_active ? "Open" : "Closed";

  const showStopwatch = groupsView === "current" && assigned.length > 0;

  return (
    <div className="relative z-0 min-h-screen text-white overflow-hidden">
      {Background}

      {/* add bottom padding so the bottom stage bar never covers content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 pb-32">
        {/* Header */}
        <div className="mb-6">
          <p
            className="text-[10px] md:text-xs tracking-[0.35em]"
            style={{ color: GOLD, textShadow: "0 0 18px rgba(245,197,66,0.22)" }}
          >
            CLUB E11EVEN
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold tracking-[0.14em] text-glow-white">
              GROUPS
            </h1>

            <span
              className={[
                "text-[11px] px-2 py-1 rounded-full border",
                activeShift?.is_active
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                  : "border-white/15 bg-white/5 text-white/70",
              ].join(" ")}
            >
              Shift: {shiftLabel}
            </span>

            <span className="text-xs text-zinc-100/55">{loadingData ? "Refreshing…" : "Live"}</span>
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100/90">
              {err}
            </div>
          ) : null}
        </div>

        {/* Responsive dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Groups + Standby */}
          <div className="lg:col-span-8 space-y-6">
            {/* Groups */}
            <ShellCard
              title="Groups"
              subtitle="Tap tabs to switch views."
              className="lg:min-h-[640px]"
              right={
                <div className="text-right">
                  <p className="text-[11px] text-zinc-100/55 tracking-[0.2em] uppercase">Timer</p>
                  <p className="mt-1 text-sm font-semibold tracking-[0.12em]">{elapsed}</p>
                </div>
              }
            >
              <div className="lg:h-[560px] lg:overflow-auto lg:pr-1">
                {/* Top tabs ONLY */}
                <div className="flex items-center gap-8 text-lg font-semibold mb-3">
                  <button
                    type="button"
                    onClick={() => setGroupsView("current")}
                    className={[
                      "transition",
                      groupsView === "current" ? "text-white" : "text-white/35 hover:text-white/60",
                    ].join(" ")}
                  >
                    Current
                    {groupsView === "current" ? (
                      <span className="block mt-2 h-[2px] w-16 bg-white/55 rounded-full" />
                    ) : null}
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupsView("history")}
                    className={[
                      "transition",
                      groupsView === "history" ? "text-white" : "text-white/35 hover:text-white/60",
                    ].join(" ")}
                  >
                    History
                    {groupsView === "history" ? (
                      <span className="block mt-2 h-[2px] w-16 bg-white/55 rounded-full" />
                    ) : null}
                  </button>
                </div>

                {/* Buckets */}
                {groupsView === "current" ? (
                  currentBuckets.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                      No groups yet.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {currentBuckets.map((b, idx) => (
                        <TimeBucketRow
                          key={`${b.label}-${idx}`}
                          label={b.label}
                          items={b.items}
                          chevron="right"
                        />
                      ))}
                    </div>
                  )
                ) : historyBuckets.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                    No history yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {historyBuckets.map((b, idx) => (
                      <TimeBucketRow
                        key={`${b.label}-${idx}`}
                        label={b.label}
                        items={b.items}
                        chevron="right"
                      />
                    ))}
                  </div>
                )}

                {/* Stopwatch INSIDE Groups, only when there are groups in queue */}
                {showStopwatch ? (
                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-5">
                    <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center">
                      <p className="text-[46px] sm:text-[56px] font-semibold tracking-[0.10em] text-white">
                        {elapsed}
                      </p>
                      <p className="mt-2 text-xs text-white/55 tracking-[0.2em] uppercase">
                        Stage Stopwatch
                      </p>

                      <div className="mt-6 flex items-center justify-center gap-3">
                        <button
                          onClick={() => setRunning(true)}
                          disabled={running}
                          className="rounded-full px-6 py-3 text-black text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                          style={{
                            backgroundColor: GOLD,
                            boxShadow: "0 0 44px rgba(245,197,66,0.35), 0 0 90px rgba(245,197,66,0.12)",
                          }}
                        >
                          Start
                        </button>

                        <button
                          onClick={() => setRunning(false)}
                          disabled={!running}
                          className="rounded-full px-6 py-3 text-sm border border-white/20 text-white/90 transition hover:border-white/35 hover:bg-white/5 disabled:opacity-50"
                        >
                          Pause
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setElapsedMs(0);
                          setRunning(false);
                        }}
                        className="mt-4 w-full rounded-full px-6 py-3 text-sm border border-white/20 text-white/90 transition hover:border-white/35 hover:bg-white/5"
                      >
                        Reset Timer
                      </button>
                    </div>

                    {/* Optional tiny stage stats (you can delete if you want it ultra-minimal) */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/55">Stage 1</p>
                        <p className="mt-1 text-sm text-white/85">—</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/55">Stage 2</p>
                        <p className="mt-1 text-sm text-white/85">—</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </ShellCard>

            {/* Standby */}
            <ShellCard title="Standby" subtitle="Signed up, not grouped yet." className="lg:min-h-[320px]">
              <div className="lg:max-h-[240px] lg:overflow-auto lg:pr-1 space-y-3">
                {standby.length === 0 ? (
                  <p className="text-sm text-zinc-100/60">No one in standby.</p>
                ) : (
                  standby.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Performer {shortId(r.performer_id)}</p>

                        <span
                          className={[
                            "text-[11px] px-2 py-1 rounded-full border",
                            statusPill(r.status),
                          ].join(" ")}
                        >
                          {r.status}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-zinc-100/60">
                          Waiting: <span className="text-zinc-100/85">{fmtMinutes(r.wait_minutes)}</span>
                        </p>

                        <button
                          disabled
                          className="text-xs rounded-full border border-white/15 px-3 py-2 text-white/70 opacity-60"
                          title="Grouping actions come next step"
                        >
                          Add to group
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-zinc-100/60">Avg wait (standby)</p>
                <p className="mt-1 text-lg font-semibold">
                  {signups ? `${signups.metrics.avg_wait_minutes.toFixed(1)} min` : "—"}
                </p>
              </div>
            </ShellCard>
          </div>

          {/* RIGHT: Check-ins only */}
          <div className="lg:col-span-4 space-y-6">
            <ShellCard title="Check-ins" subtitle="Pending approvals (actions next).">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-zinc-100/60">Pending</p>
                  <p className="mt-1 text-2xl font-semibold">{checkins?.pending?.length ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-zinc-100/60">Approved</p>
                  <p className="mt-1 text-2xl font-semibold">{checkins?.approved?.length ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-100/60 tracking-[0.2em] uppercase">Pending list</p>
                  <span className="text-xs text-zinc-100/55">{checkins?.pending?.length ?? 0}</span>
                </div>

                <div className="mt-3 space-y-2 max-h-[260px] overflow-auto pr-1">
                  {(checkins?.pending ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-100/60">No pending check-ins.</p>
                  ) : (
                    (checkins?.pending ?? []).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">Performer {shortId(c.performer_id)}</p>
                          <p className="text-xs text-zinc-100/55">
                            Scanned: {new Date(c.scanned_at).toLocaleTimeString()}
                          </p>
                        </div>

                        <button
                          disabled
                          className="ml-3 text-xs rounded-full border border-white/15 px-3 py-2 text-white/70 opacity-60"
                          title="Approval actions next step"
                        >
                          Approve
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ShellCard>
          </div>
        </div>

        <div className="h-10" />
      </div>

      {/* Bottom Stage Bar (Open/Close lives at the very bottom of the page) */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
          <div className="rounded-3xl border border-white/12 bg-black/35 backdrop-blur-xl shadow-[0_0_70px_rgba(255,255,255,0.10)] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-white/55 tracking-[0.2em] uppercase">Stage</span>

                <span
                  className={[
                    "text-[11px] px-2 py-1 rounded-full border",
                    activeShift?.is_active
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                      : "border-white/15 bg-white/5 text-white/70",
                  ].join(" ")}
                >
                  {shiftLabel}
                </span>

                <span className="text-xs text-white/50">
                  Group size: {activeShift?.current_group_size ?? "—"}
                </span>

                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setGroupSize(n)}
                      disabled={!activeShift}
                      className={[
                        "px-3 py-2 rounded-full text-xs border transition",
                        activeShift?.current_group_size === n
                          ? "border-white/35 bg-white/10 text-white"
                          : "border-white/15 text-white/80 hover:border-white/30 hover:bg-white/5 disabled:opacity-50",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                <button
                  onClick={startNewShift}
                  disabled={loadingShift}
                  className="rounded-full px-5 py-3 text-black text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
                  style={{
                    backgroundColor: GOLD,
                    boxShadow: "0 0 44px rgba(245,197,66,0.40), 0 0 90px rgba(245,197,66,0.16)",
                  }}
                >
                  {loadingShift ? "Opening…" : "Open Stage"}
                </button>

                <button
                  onClick={closeShift}
                  disabled={!activeShift?.is_active || loadingClose}
                  className="rounded-full px-5 py-3 text-sm border border-white/20 text-white/90 transition hover:border-white/35 hover:bg-white/5 disabled:opacity-50"
                  title="Requires POST /api/shifts/close"
                >
                  {loadingClose ? "Closing…" : "Close Stage"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}