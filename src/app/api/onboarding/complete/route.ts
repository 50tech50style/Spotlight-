import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function yearsBetween(dob: Date, now: Date) {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export async function POST(req: Request) {
  const supa = supabaseServer();

  const {
    full_name,
    dob, // "YYYY-MM-DD"
    channel_prefs,
    notification_prefs,
  } = await req.json().catch(() => ({}));

  if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }
  if (!dob || typeof dob !== "string") {
    return NextResponse.json({ error: "Date of birth is required." }, { status: 400 });
  }

  const { data: authData, error: authErr } = await supa.auth.getUser();
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const dobDate = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(dobDate.getTime())) {
    return NextResponse.json({ error: "Invalid DOB format." }, { status: 400 });
  }

  const age = yearsBetween(dobDate, new Date());
  if (age < 21) {
    return NextResponse.json({ error: "You must be 21+ to use this platform." }, { status: 403 });
  }

  const userId = authData.user.id;

  const payload = {
    id: userId,
    full_name: full_name.trim(),
    dob,
    channel_prefs: channel_prefs ?? { push: true, email: false },
    notification_prefs:
      notification_prefs ??
      {
        ten_min: true,
        five_min: true,
        on_deck: true,
        now_on_stage: true,
        stage_hold: true,
        vibrate: true,
        silent_mode: false,
      },
    onboarding_complete: true,
  };

  const { error } = await supa.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}