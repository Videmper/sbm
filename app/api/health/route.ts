import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sbc-modern-app",
    checkedAt: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured(),
  });
}
