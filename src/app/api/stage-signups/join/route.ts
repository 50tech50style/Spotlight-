import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supa = supabaseServer();

  const body = await req.json().catch(() => ({}));
  const shiftId = body.shiftId as string | undefined;
  const performerId = body.performerId as string | undefined;
  const code = body.code as string | undefined;

  if (!shiftId || !performerId || !code) {
    return NextResponse.json(
      { error: "shiftId, performerId, and code are required" },
      { status: 400 }
    );
  }

  // 1) Validate shift + code + active
  const { data: shift, error: shiftErr } = await supa
    .from("shifts")
    .select("id, join_code, is_active")
    .eq("id", shiftId)
    .single();

  if (shiftErr || !shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (!shift.is_active) {
    return NextResponse.json({ error: "Stage is closed" }, { status: 400 });
  }
  if (!shift.join_code || shift.join_code !== code) {
    return NextResponse.json({ error: "Invalid join code" }, { status: 400 });
  }

  // 2) Require approved check-in for this shift
  const { data: approvedCheckin, error: checkinErr } = await supa
    .from("checkins")
    .select("id")
    .eq("shift_id", shiftId)
    .eq("performer_id", performerId)
    .eq("status", "approved")
    .maybeSingle();

  if (checkinErr) {
    return NextResponse.json({ error: checkinErr.message }, { status: 400 });
  }
  if (!approvedCheckin) {
    return NextResponse.json(
      { error: "Not approved for tonight yet" },
      { status: 403 }
    );
  }

  // 3) Insert into stage_signups as queued
  // Note: you already added a unique index on (shift_id, performer_id),
  // so if they try again you’ll get a clean error.
  const { data: signup, error: insertErr } = await supa
    .from("stage_signups")
    .insert({
      shift_id: shiftId,
      performer_id: performerId,
      status: "queued",
      queued_at: new Date().toISOString(),
    })
    .select("id, shift_id, performer_id, status, queued_at, grouped_at, done_at")
    .single();

  if (insertErr) {
    // If they’re already signed up, return a friendly message
    const msg =
      insertErr.code === "23505"
        ? "Already signed up for this shift"
        : insertErr.message;

    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ signup });
}