import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { checkinId, approvedBy } = await req.json();

  if (!checkinId || !approvedBy) {
    return NextResponse.json(
      { error: "Missing checkinId or approvedBy" },
      { status: 400 }
    );
  }

  const { data, error } = await supa
    .from("checkins")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
    })
    .eq("id", checkinId)
    .select("id, status, performer_id, shift_id, approved_at, approved_by")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ checkin: data });
}