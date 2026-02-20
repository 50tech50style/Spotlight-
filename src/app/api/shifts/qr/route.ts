import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { shiftId } = await req.json();

  if (!shiftId) {
    return NextResponse.json({ error: "Missing shiftId" }, { status: 400 });
  }

  const { data: shift, error } = await supa
    .from("shifts")
    .select("id, secret, is_active")
    .eq("id", shiftId)
    .single();

  if (error || !shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (!shift.is_active) {
    return NextResponse.json({ error: "Shift not active" }, { status: 400 });
  }

  // expires in 45 seconds - temp 5 min need to revert
  const exp = Math.floor(Date.now() / 1000) + 300;
  const nonce = crypto.randomBytes(8).toString("hex");

  const payloadObj = { shiftId: shift.id, exp, nonce };
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = sign(payload, shift.secret);

  return NextResponse.json({ token: `${payload}.${sig}`, exp });
}