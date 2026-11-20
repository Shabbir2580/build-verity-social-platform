import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(request: NextRequest) {
  const communityId = request.nextUrl.searchParams.get("communityId") || "";
  if (!UUID.test(communityId)) return fail("A valid community ID is required.", 400);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return fail("Community metrics are temporarily unavailable.", 503);

  const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const [community, membershipCount] = await Promise.all([
    supabase.from("communities").select("id").eq("id", communityId).maybeSingle(),
    supabase.from("community_memberships").select("user_id", { count: "exact", head: true }).eq("community_id", communityId),
  ]);
  if (community.error || membershipCount.error) {
    console.error("Public community count failed:", community.error?.message || membershipCount.error?.message);
    return fail("Community metrics are temporarily unavailable.", 503);
  }
  if (!community.data) return fail("Community not found.", 404);

  return NextResponse.json({ count: membershipCount.count ?? 0 }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
