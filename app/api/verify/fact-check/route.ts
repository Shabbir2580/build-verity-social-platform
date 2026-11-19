import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FactCheckReview = {
  claimText: string;
  claimant: string | null;
  claimDate: string | null;
  title: string | null;
  publisher: string | null;
  publisherSite: string | null;
  url: string;
  reviewDate: string | null;
  rating: string | null;
  languageCode: string | null;
};

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return fail("Sign in to search published fact-checks.", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return fail("Secure database access is not configured.", 503);

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return fail("Your session is invalid. Sign in again.", 401);

  const query = (request.nextUrl.searchParams.get("q") || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  if (query.length < 12) return fail("Enter a claim or event with at least 12 characters.", 400);

  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!apiKey) return fail("Published fact-check search is not configured. The Google Fact Check API key is missing.", 503);

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: usageError } = await supabase.from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", auth.user.id)
    .eq("action", "fact_check_search")
    .gte("created_at", hourAgo);
  if (usageError) return fail("Fact-check search usage could not be verified.", 503);
  if ((count ?? 0) >= 20) return fail("You have reached the limit of 20 published fact-check searches per hour.", 429);

  const { data: usageEvent, error: insertError } = await supabase.from("audit_logs")
    .insert({
      actor_id: auth.user.id,
      action: "fact_check_search",
      entity_type: "verification",
      entity_id: null,
      details: { provider: "Google Fact Check Tools", status: "started" },
    })
    .select("id")
    .single();
  if (insertError || !usageEvent) return fail("Search usage tracking is unavailable. The request was not sent.", 503);

  try {
    const endpoint = new URL("https://factchecktools.googleapis.com/v1alpha1/claims:search");
    endpoint.searchParams.set("query", query);
    endpoint.searchParams.set("languageCode", "en-IN");
    endpoint.searchParams.set("pageSize", "8");
    endpoint.searchParams.set("key", apiKey);

    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (!response.ok) {
      await supabase.from("audit_logs").update({
        details: { provider: "Google Fact Check Tools", status: "provider_error", providerStatus: response.status },
      }).eq("id", usageEvent.id);
      if (response.status === 429) return fail("Google Fact Check Tools usage limit reached. Try again later.", 429);
      console.error("Google Fact Check Tools request failed:", response.status);
      return fail("Published fact-check search is temporarily unavailable.", 502);
    }

    const payload = await response.json();
    const results: FactCheckReview[] = [];
    const claims = Array.isArray(payload?.claims) ? payload.claims.slice(0, 8) : [];
    for (const claim of claims) {
      if (!claim || typeof claim.text !== "string") continue;
      const reviews = Array.isArray(claim.claimReview) ? claim.claimReview.slice(0, 4) : [];
      for (const review of reviews) {
        const url = safeHttpUrl(review?.url);
        if (!url) continue;
        const publisher = typeof review?.publisher?.name === "string" ? review.publisher.name.slice(0, 160) : null;
        const publisherSite = typeof review?.publisher?.site === "string" ? review.publisher.site.slice(0, 160) : null;
        results.push({
          claimText: claim.text.slice(0, 1200),
          claimant: typeof claim.claimant === "string" ? claim.claimant.slice(0, 160) : null,
          claimDate: typeof claim.claimDate === "string" ? claim.claimDate : null,
          title: typeof review.title === "string" ? review.title.slice(0, 300) : null,
          publisher,
          publisherSite,
          url,
          reviewDate: typeof review.reviewDate === "string" ? review.reviewDate : null,
          rating: typeof review.textualRating === "string" ? review.textualRating.slice(0, 160) : null,
          languageCode: typeof review.languageCode === "string" ? review.languageCode.slice(0, 20) : null,
        });
        if (results.length >= 16) break;
      }
      if (results.length >= 16) break;
    }

    const { error: updateError } = await supabase.from("audit_logs").update({
      details: { provider: "Google Fact Check Tools", status: "completed", resultsCount: results.length },
    }).eq("id", usageEvent.id);
    if (updateError) console.error("Could not update fact-check usage event:", updateError.message);

    return NextResponse.json({
      provider: "Google Fact Check Tools",
      checkedAt: new Date().toISOString(),
      results,
      interpretation: "These are third-party reviews already published by fact-checking organizations. Ratings are the publishers' own wording, not Verity's verdict. Read the full review, compare its exact claim, date and context, and do not assume no result means a claim is true.",
    }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    await supabase.from("audit_logs").update({
      details: { provider: "Google Fact Check Tools", status: "failed" },
    }).eq("id", usageEvent.id);
    console.error("Fact-check search failed:", error instanceof Error ? error.message : "unknown");
    return fail("Published fact-check search timed out or failed.", 502);
  }
}
