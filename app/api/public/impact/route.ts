import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    return NextResponse.json({ error: "Public impact data is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const [members, posts, comments, communities, checks, sources] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", false),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("communities").select("id", { count: "exact", head: true }),
    supabase.from("content_checks").select("id", { count: "exact", head: true }).eq("is_demo", false).in("status", ["evidence_found", "uncertain", "disputed"]),
    supabase.from("post_sources").select("id", { count: "exact", head: true }),
  ]);
  const failed = [members, posts, comments, communities, checks, sources].find((result) => result.error);
  if (failed?.error) {
    console.error("Public impact metrics query failed:", failed.error.message);
    return NextResponse.json({ error: "Public impact data could not be loaded." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    metrics: {
      activeMembers: members.count ?? 0,
      publishedPosts: posts.count ?? 0,
      comments: comments.count ?? 0,
      communities: communities.count ?? 0,
      recordedAssessments: checks.count ?? 0,
      sourceLinks: sources.count ?? 0,
    },
    definitions: {
      activeMembers: "Profiles not currently marked as suspended.",
      publishedPosts: "Posts currently in published status.",
      comments: "Comments not marked as deleted; includes post and answer discussions.",
      communities: "All communities currently stored on Verity.",
      recordedAssessments: "Non-demo content assessments with a completed evidence, uncertain or disputed status. This is not a count of proven true or false claims.",
      sourceLinks: "Source links attached to posts. A link being present does not mean the source or claim has been independently verified.",
    },
    notice: "These are live platform activity counts, not proof of social impact, accuracy, or authenticity. Counts may change as content is removed, edited, or reviewed.",
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
