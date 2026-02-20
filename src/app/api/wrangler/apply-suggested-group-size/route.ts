import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const shiftId = body?.shiftId as string | undefined;
  const size = body?.size as number | undefined;

  if (!shiftId || !size || size < 1 || size > 5) {
    return NextResponse.json(
      { error: "shiftId and size (1..5) are required" },
      { status: 400 }
    );
  }

  const supa = await supabaseServer();

  const { data, error } = await supa
    .from("shifts")
    .update({ current_group_size: size })
    .eq("id", shiftId)
    .select("id, current_group_size")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ shift: data });
}