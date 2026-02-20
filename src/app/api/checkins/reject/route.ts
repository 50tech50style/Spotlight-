import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supa = await supabaseServer();

  const body = await req.json().catch(() => null);
  const checkinId = body?.checkinId as string | undefined;
  const rejectedBy = body?.rejectedBy as string | undefined;

  if (!checkinId || !rejectedBy) {
    return NextResponse.json(
      { error: "Missing checkinId or rejectedBy" },
      { status: 400 }
    );
  }

  const { data, error } = await supa
    .from("checkins")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejected_by: rejectedBy,
    })
    .eq("id", checkinId)
    .select("id,status,performer_id,shift_id,rejected_at,rejected_by")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ checkin: data });
}