import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function minutesSince(ts: string | null) {
  if (!ts) return null;
  const ms = Date.now() - new Date(ts).getTime();
  return Math.max(0, Math.round((ms / 1000 / 60) * 10) / 10); // 1 decimal
}

export async function GET(req: Request) {
  const supa = supabaseServer();

  const { searchParams } = new URL(req.url);
  const shiftId = searchParams.get("shiftId");

  if (!shiftId) {
    return NextResponse.json({ error: "shiftId is required" }, { status: 400 });
  }

  // 1) Load shift metadata (for the “date not id” requirement + group size)
  const { data: shift, error: shiftErr } = await supa
    .from("shifts")
    .select("id, created_at, current_group_size, is_active")
    .eq("id", shiftId)
    .single();

  if (shiftErr) {
    return NextResponse.json({ error: shiftErr.message }, { status: 400 });
  }

  // 2) Load all stage signups for that shift
  const { data: rows, error } = await supa
    .from("stage_signups")
    .select("id, performer_id, status, queued_at, grouped_at, done_at")
    .eq("shift_id", shiftId)
    .order("queued_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const normalized =
    (rows ?? []).map((r) => ({
      ...r,
      wait_minutes: minutesSince(r.queued_at),
    })) ?? [];

  const history = normalized.filter((r) => r.done_at !== null);
  const assigned = normalized.filter((r) => r.done_at === null && r.grouped_at !== null);
  const standby = normalized.filter((r) => r.done_at === null && r.grouped_at === null);

  // simple metrics
  const waitValues = standby.map((r) => r.wait_minutes ?? 0);
  const avg_wait_minutes =
    waitValues.length > 0
      ? Math.round((waitValues.reduce((a, b) => a + b, 0) / waitValues.length) * 10) / 10
      : 0;

  return NextResponse.json({
    shift: {
      id: shift.id,
      created_at: shift.created_at,
      current_group_size: shift.current_group_size,
      is_active: shift.is_active,
    },
    standby,
    assigned,
    history,
    metrics: {
      standby_count: standby.length,
      assigned_count: assigned.length,
      history_count: history.length,
      avg_wait_minutes,
    },
  });
}