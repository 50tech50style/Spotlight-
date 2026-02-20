import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { shiftId, size } = (await req.json()) as {
      shiftId?: string;
      size?: number;
    };

    if (!shiftId) {
      return NextResponse.json({ error: "shiftId is required" }, { status: 400 });
    }

    const n = Number(size);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return NextResponse.json(
        { error: "size must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    const supa = supabaseServer();

    const { data, error } = await supa
      .from("shifts")
      .update({ current_group_size: n })
      .eq("id", shiftId)
      .select("id, venue_name, is_active, created_at, join_code, current_group_size")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ shift: data });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}