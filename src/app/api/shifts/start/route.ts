import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  const supa = supabaseServer();

  const secret = crypto.randomBytes(32).toString("hex");
  const join_code = crypto.randomBytes(4).toString("hex"); // 8 chars

  const { data, error } = await supa
    .from("shifts")
    .insert({
      venue_name: "CLUB E11EVEN",
      is_active: true,
      secret,
      join_code,
      current_group_size: 1, // ✅ new
    })
    .select("id, venue_name, is_active, created_at, join_code, current_group_size") // ✅ new
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ shift: data });
}