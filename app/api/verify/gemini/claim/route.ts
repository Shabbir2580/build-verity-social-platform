import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type NewsItem = { title: string; url: string; publisher: string | null; publishedAt: string | null };

function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
}
function value(xml: string, tag: string) {
  const match = xml.match(new RegExp("<" + tag + "(?:\\\\s[^>]*)?>([\\\\s\\\\S]*?)</" + tag + ">", "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, "")) : null;
}
function parseNews(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const title = value(item, "title");
    const rawUrl = value(item, "link");
    const publisher = value(item, "source");
    const rawDate = value(item, "pubDate");
    let url: string | null = null;
    try { const parsed = new URL(rawUrl || ""); if (parsed.protocol === "https:" || parsed.protocol === "http:") url = parsed.toString(); } catch {}
    if (!title || !url) continue;
    const date = rawDate ? new Date(rawDate) : null;
    items.push({ title, url, publisher, publishedAt: date && Number.isFinite(date.getTime()) ? date.toISOString() : null });
    if (items.length === 6) break;
  }
  return items;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return NextResponse.json({ error: "Secure database access is not configured." }, { status: 503 });

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Sign in to request an assessment." }, { status: 401 });
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Your session is invalid. Sign in again." }, { status: 401 });

  let body: { postId?: unknown; claim?: unknown; consent?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const claim = typeof body.claim === "string" ? body.claim.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
  if (body.consent !== true) return NextResponse.json({ error: "Explicit consent to send this claim to Google is required." }, { status: 400 });
  if (typeof body.postId !== "string" || claim.length < 12 || claim.length > 1000) return NextResponse.json({ error: "Provide a claim between 12 and 1,000 characters." }, { status: 400 });

  const { data: post } = await supabase.from("posts").select("id, author_id").eq("id", body.postId).maybeSingle();
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (post.author_id !== authData.user.id) return NextResponse.json({ error: "Only the post author can submit its claim for external AI analysis." }, { status: 403 });

  if (!apiKey) {
    const { error: unavailableSaveError } = await supabase.from("content_checks").insert({
      post_id: post.id, provider: "Google Gemini (not configured)", check_type: "claim",
      status: "provider_not_configured", claim: claim.slice(0, 1000), signals: [], supporting: [], contradicting: [],
      explanation: "Automatic news claim review was requested after publishing, but the server has no Gemini API key configured. No claim analysis was performed.",
      uncertainty: "This news claim has not been checked. No truth or falsehood assessment is available.",
      is_demo: false, assessed_at: null,
    });
    if (unavailableSaveError) console.error("Could not record unavailable claim check:", unavailableSaveError.message);
    return NextResponse.json({ error: "Gemini is not configured on the server. The claim remains unchecked." }, { status: 503 });
  }
  const { count, error: countError } = await supabase.from("content_checks").select("id", { count: "exact", head: true })
    .eq("post_id", post.id).eq("provider", "Google Gemini / gemini-2.5-flash")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (countError) return NextResponse.json({ error: "Could not verify the assessment usage limit." }, { status: 503 });
  if ((count ?? 0) >= 6) return NextResponse.json({ error: "This post has reached its limit of 6 Gemini assessments per hour." }, { status: 429 });

  try {
    const feedUrl = new URL("https://news.google.com/rss/search");
    feedUrl.searchParams.set("q", claim.slice(0, 240));
    feedUrl.searchParams.set("hl", "en-IN"); feedUrl.searchParams.set("gl", "IN"); feedUrl.searchParams.set("ceid", "IN:en");
    const newsResponse = await fetch(feedUrl, { headers: { Accept: "application/rss+xml, application/xml" }, signal: AbortSignal.timeout(9000) });
    const news = newsResponse.ok ? parseNews(await newsResponse.text()) : [];
    const evidenceContext = news.map((item, index) => ({ index: index + 1, title: item.title, publisher: item.publisher, publishedAt: item.publishedAt, url: item.url }));
    const prompt = [
      "You assist a human fact-check reviewer. Assess the precise claim using ONLY the supplied Google News search-result headlines and metadata.",
      "Headlines are leads, not article evidence. Do not infer that an article supports a claim unless its headline directly addresses it.",
      "Do not invent sources, facts, quotations, URLs, or numeric confidence. Do not give a true/false verdict.",
      "Return JSON only with this shape: { \"claim\": string, \"summary\": string, \"supporting_indices\": number[], \"contradicting_indices\": number[], \"uncertainty\": string }.",
      "Only use valid source indices from the supplied list. If none directly supports or contradicts, return empty arrays.",
      "Explain that source headlines alone are insufficient and original reports must be read.",
      "Claim: " + claim,
      "Search results: " + JSON.stringify(evidenceContext),
    ].join("\n");
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 700 } }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      if (response.status === 429) return NextResponse.json({ error: "Gemini free-tier quota is currently exhausted. Try again later." }, { status: 429 });
      console.error("Gemini claim assessment failed:", response.status);
      return NextResponse.json({ error: "Gemini could not complete this assessment. No result was stored." }, { status: 502 });
    }
    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    let result: { claim?: string; summary?: string; supporting_indices?: number[]; contradicting_indices?: number[]; uncertainty?: string };
    try { result = JSON.parse(raw || ""); } catch { return NextResponse.json({ error: "Gemini returned an unreadable assessment. No result was stored." }, { status: 502 }); }
    if (typeof result.summary !== "string" || !Array.isArray(result.supporting_indices) || !Array.isArray(result.contradicting_indices)) {
      return NextResponse.json({ error: "Gemini returned an incomplete assessment. No result was stored." }, { status: 502 });
    }
    const selectSources = (indices: number[]) => indices.slice(0, 6).map((index) => evidenceContext.find((item) => item.index === index)).filter(Boolean).map((item) => ({ title: item!.title, detail: "Headline from " + (item!.publisher || "publisher not identified") + "; headlines are leads, not verified evidence.", url: item!.url }));
    const { data: saved, error: saveError } = await supabase.from("content_checks").insert({
      post_id: post.id, provider: "Google Gemini / gemini-2.5-flash", check_type: "claim", status: "uncertain",
      claim: claim.slice(0, 1000), signals: [{ kind: "claim_analysis", source_count: evidenceContext.length, method: "Google News RSS headlines reviewed by Gemini" }],
      supporting: selectSources(result.supporting_indices), contradicting: selectSources(result.contradicting_indices),
      explanation: result.summary.slice(0, 4000),
      uncertainty: (result.uncertainty || "This is a preliminary language-model review of search-result headlines, not a fact-check. Read original sources and primary evidence.").slice(0, 2000),
      is_demo: false, assessed_at: new Date().toISOString(),
    }).select("id, post_id, provider, check_type, status, claim, supporting, contradicting, explanation, uncertainty, assessed_at, created_at").single();
    if (saveError || !saved) { console.error("Could not save Gemini claim assessment:", saveError?.message); return NextResponse.json({ error: "The analysis completed but could not be safely recorded." }, { status: 500 }); }
    const { error: caseError } = await supabase.from("moderation_cases").insert({
      post_id: post.id, case_type: "label_review", status: "awaiting_review", priority: "normal",
      opened_by: authData.user.id,
      summary: "Automatic Gemini news claim review requires human assessment. " + result.summary.slice(0, 1500),
    });
    if (caseError) console.error("Could not queue claim assessment for human review:", caseError.message);

    return NextResponse.json({ assessment: saved, sourcesFound: evidenceContext.length, queuedForHumanReview: !caseError }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Gemini claim route error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Claim analysis timed out or failed. No assessment was recorded." }, { status: 502 });
  }
}
