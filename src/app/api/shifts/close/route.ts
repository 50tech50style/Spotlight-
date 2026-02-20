import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { shiftId } = await req.json();

    if (!shiftId || typeof shiftId !== "string") {
      return NextResponse.json(
        { error: "Missing shiftId" },
        { status: 400 }
      );
    }

    const supa = supabaseServer();

    // Close the shift
    const { data, error } = await supa
      .from("shifts")
      .update({ is_active: false })
      .eq("id", shiftId)
      .select("id, venue_name, is_active, created_at, join_code, current_group_size")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ shift: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}