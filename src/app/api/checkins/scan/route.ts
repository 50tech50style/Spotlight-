import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { token, performerId } = await req.json();

  if (!token || !performerId) {
    return NextResponse.json(
      { error: "Missing token or performerId" },
      { status: 400 }
    );
  }

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
  }

  let payloadObj: { shiftId: string; exp: number; nonce: string };
  try {
    payloadObj = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payloadObj.exp < Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ error: "QR expired" }, { status: 400 });
  }

  const { data: shift, error } = await supa
    .from("shifts")
    .select("id, secret, is_active")
    .eq("id", payloadObj.shiftId)
    .single();

  if (error || !shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (!shift.is_active) {
    return NextResponse.json({ error: "Shift not active" }, { status: 400 });
  }

  // Verify signature
  const expectedSig = sign(payloadB64, shift.secret);
  if (expectedSig !== sig) {
    return NextResponse.json({ error: "Invalid QR signature" }, { status: 400 });
  }

  // Create/return pending check-in (unique per performer per shift)
  const { data: checkin, error: upsertErr } = await supa
    .from("checkins")
    .upsert(
      {
        shift_id: shift.id,
        performer_id: performerId,
        status: "pending",
      },
      { onConflict: "shift_id,performer_id" }
    )
    .select("id, status, scanned_at, shift_id, performer_id")
    .single();

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 400 });
  }

  return NextResponse.json({ checkin });
}