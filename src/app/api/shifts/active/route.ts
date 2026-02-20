import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supa = await supabaseServer();

  const { data, error } = await supa
    .from("shifts")
    .select("id, venue_name, join_code, is_active, created_at, current_group_size")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ shift: data ?? null });
}