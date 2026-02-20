import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shiftId = url.searchParams.get("shiftId");

  if (!shiftId) {
    return NextResponse.json({ error: "Missing shiftId" }, { status: 400 });
  }

  const supa = await supabaseServer();

  const { data, error } = await supa
    .from("checkins")
    .select("id,status,scanned_at,performer_id,shift_id")
    .eq("shift_id", shiftId)
    .order("scanned_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const pending = (data ?? []).filter((c) => c.status === "pending");
  const approved = (data ?? []).filter((c) => c.status === "approved");

  return NextResponse.json({ pending, approved });
}