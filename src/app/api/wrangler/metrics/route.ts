import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function suggestGroupSize(params: {
  current: number;
  queueCount: number;
  avgWait: number; // minutes
}) {
  const { current, queueCount, avgWait } = params;

  // If not enough people to fill the current group size, suggest shrinking.
  if (queueCount > 0 && queueCount < current) {
    return {
      suggested: queueCount,
      reason: `Underfilled (${queueCount}/${current}). Consider lowering group size.`,
    };
  }

  // If nobody is queued, no suggestion.
  if (queueCount === 0) return { suggested: null as number | null, reason: null as string | null };

  // If wait is high, suggest increasing (bounded 1..5)
  if (avgWait > 18 && current < 5) {
    return {
      suggested: Math.min(5, current + 2),
      reason: `Average wait is high (${Math.round(avgWait)}m). Consider increasing group size.`,
    };
  }

  if (avgWait > 10 && current < 5) {
    return {
      suggested: Math.min(5, current + 1),
      reason: `Wait is building (${Math.round(avgWait)}m avg). Consider increasing group size.`,
    };
  }

  return { suggested: null as number | null, reason: null as string | null };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shiftId = searchParams.get("shiftId");

  if (!shiftId) {
    return NextResponse.json({ error: "shiftId is required" }, { status: 400 });
  }

  const supa = supabaseServer();

  // Get current_group_size from shifts
  const { data: shift, error: shiftErr } = await supa
    .from("shifts")
    .select("id, current_group_size")
    .eq("id", shiftId)
    .single();

  if (shiftErr) {
    return NextResponse.json({ error: shiftErr.message }, { status: 400 });
  }

  // Pull queued signups (only what we need)
  const { data: queued, error: qErr } = await supa
    .from("stage_signups")
    .select("queued_at")
    .eq("shift_id", shiftId)
    .eq("status", "queued");

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 400 });
  }

  const queueCount = queued?.length ?? 0;

  // Compute avg wait minutes
  const now = Date.now();
  let avgWaitMinutes = 0;

  if (queueCount > 0) {
    const waits = queued.map((r) => {
      const t = new Date(r.queued_at as string).getTime();
      return Math.max(0, (now - t) / 60000);
    });
    avgWaitMinutes = waits.reduce((a, b) => a + b, 0) / waits.length;
  }

  const current = Number(shift.current_group_size ?? 1);

  const { suggested, reason } = suggestGroupSize({
    current,
    queueCount,
    avgWait: avgWaitMinutes,
  });

  return NextResponse.json({
    shiftId,
    current_group_size: current,
    queue_count: queueCount,
    avg_wait_minutes: Math.round(avgWaitMinutes * 10) / 10, // 1 decimal
    suggested_group_size: suggested,
    suggestion_reason: reason,
  });
}