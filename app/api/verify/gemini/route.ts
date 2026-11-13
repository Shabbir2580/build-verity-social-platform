import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "gemini-2.5-flash";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp",
  "video/mp4", "video/quicktime", "video/webm",
]);

type GeminiAssessment = {
  media_type: "image" | "video";
  visible_content: string;
  origin_indicators: string[];
  limitations: string[];
  summary: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecret) return jsonError("Secure database access is not configured.", 503);

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return jsonError("Sign in to request an assessment.", 401);

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return jsonError("Your session is invalid. Sign in again.", 401);

  let body: { postId?: unknown; mediaId?: unknown; consent?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }
  if (body.consent !== true) return jsonError("Explicit consent to send this media to Google is required.", 400);
  if (typeof body.postId !== "string" || typeof body.mediaId !== "string") {
    return jsonError("A post and media item are required.", 400);
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_id, status, title, body")
    .eq("id", body.postId)
    .maybeSingle();
  if (postError || !post) return jsonError("Post not found.", 404);
  // Only the post author can send their own upload to the third-party AI provider.
  if (post.author_id !== authData.user.id) return jsonError("Only the author can request an external AI assessment for this post.", 403);

  const { data: media, error: mediaError } = await supabase
    .from("post_media")
    .select("id, post_id, kind, storage_path, mime_type, size_bytes")
    .eq("id", body.mediaId)
    .eq("post_id", body.postId)
    .maybeSingle();
  if (mediaError || !media) return jsonError("Media item not found.", 404);
  if (!ALLOWED_MIME.has(media.mime_type)) return jsonError("This media format is not supported for analysis.", 415);
  const maxBytes = media.kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (media.size_bytes > maxBytes) return jsonError(`This ${media.kind} exceeds the current ${Math.round(maxBytes / 1024 / 1024)} MB analysis limit.`, 413);

  if (!apiKey) {
    const { error: unavailableSaveError } = await supabase.from("content_checks").insert({
      post_id: post.id, provider: "Google Gemini (not configured)", check_type: "media_origin",
      status: "provider_not_configured", claim: null, signals: [], supporting: [], contradicting: [],
      explanation: "Automatic media review was requested after upload, but the server has no Gemini API key configured. No media analysis was performed.",
      uncertainty: "This media has not been checked for AI generation, manipulation or deepfakes.",
      is_demo: false, assessed_at: null,
    });
    if (unavailableSaveError) console.error("Could not record unavailable media check:", unavailableSaveError.message);
    const { error: caseError } = await supabase.from("moderation_cases").insert({
      post_id: post.id, case_type: "label_review", status: "awaiting_review", priority: "normal", opened_by: authData.user.id,
      summary: "Automatic media review unavailable: Gemini is not configured. Human review is required if this content needs assessment.",
    });
    if (caseError) console.error("Could not queue unconfigured media for human review:", caseError.message);
    return jsonError("Gemini is not configured on the server. The media remains unchecked.", 503);
  }
  const { count, error: countError } = await supabase
    .from("content_checks")
    .select("id", { count: "exact", head: true })
    .eq("post_id", post.id)
    .eq("provider", `Google Gemini / ${MODEL}`)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (countError) return jsonError("Could not verify the assessment usage limit.", 503);
  if ((count ?? 0) >= 6) return jsonError("This post has reached its limit of 6 Gemini assessments per hour.", 429);

  const { data: signed, error: signedError } = await supabase.storage
    .from("post-media")
    .createSignedUrl(media.storage_path, 60);
  if (signedError || !signed?.signedUrl) return jsonError("Could not securely retrieve this media.", 502);

  try {
    const mediaResponse = await fetch(signed.signedUrl, { signal: AbortSignal.timeout(15000) });
    if (!mediaResponse.ok) return jsonError("Could not retrieve the uploaded media.", 502);
    const buffer = Buffer.from(await mediaResponse.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > maxBytes) return jsonError("The uploaded media size is invalid for analysis.", 413);

    if (media.kind === "video" && buffer.byteLength > 20 * 1024 * 1024) {
      return jsonError("Video is too large for the current inline analysis route.", 413);
    }

    const prompt = [
      "You are assisting a human content reviewer. Inspect the supplied media and return JSON only.",
      "Do NOT claim to detect or prove AI generation, deepfakes, authenticity, identity, location, or factual truth.",
      "Do not infer provenance from visual style alone. Describe observable content and any concrete visual/audio inconsistencies only.",
      "If origin cannot be established from the media itself, say so clearly. Do not invent confidence percentages.",
      "Return exactly this JSON shape:",
      '{"media_type":"image|video","visible_content":"brief neutral description","origin_indicators":["observable clue or none"],"limitations":["specific limitation"],"summary":"short cautious assessment"}',
      "State explicitly that this multimodal model is not a forensic AI-generated-media detector.",
      `Post context (unverified user text): ${String(post.title || "").slice(0, 300)} ${String(post.body || "").slice(0, 700)}`,
    ].join("\n");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: media.mime_type, data: buffer.toString("base64") } },
            ],
          }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 700 },
        }),
        signal: AbortSignal.timeout(45000),
      },
    );

    if (!geminiResponse.ok) {
      const providerPayload = await geminiResponse.json().catch(() => ({}));
      const providerMessage = typeof providerPayload?.error?.message === "string" ? providerPayload.error.message : "";
      if (geminiResponse.status === 429) return jsonError("Gemini free-tier quota is currently exhausted. Try again later.", 429);
      if (geminiResponse.status === 400) return jsonError("Gemini rejected this media format or request.", 422);
      console.error("Gemini media assessment failed:", geminiResponse.status, providerMessage.slice(0, 300));
      return jsonError("Gemini could not complete this assessment. No result was stored.", 502);
    }

    const payload = await geminiResponse.json();
    const rawText = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();
    if (!rawText) return jsonError("Gemini returned no assessment. No result was stored.", 502);

    let assessment: GeminiAssessment;
    try {
      assessment = JSON.parse(rawText) as GeminiAssessment;
    } catch {
      return jsonError("Gemini returned an unreadable assessment. No result was stored.", 502);
    }
    if (
      typeof assessment.summary !== "string" ||
      typeof assessment.visible_content !== "string" ||
      !Array.isArray(assessment.origin_indicators) ||
      !Array.isArray(assessment.limitations)
    ) return jsonError("Gemini returned an incomplete assessment. No result was stored.", 502);

    const explanation = [assessment.summary, "", "Visible content: " + assessment.visible_content].join("\n").slice(0, 4000);
    const uncertainty = [
      "This is a language-model assessment, not forensic AI/deepfake detection. It cannot establish media provenance or authenticity.",
      ...assessment.limitations.slice(0, 6).map((item) => String(item).slice(0, 400)),
    ].join(" ").slice(0, 2000);

    const { data: saved, error: saveError } = await supabase
      .from("content_checks")
      .insert({
        post_id: post.id,
        provider: `Google Gemini / ${MODEL}`,
        check_type: "media_origin",
        status: "uncertain",
        claim: null,
        signals: [
          { kind: "model_assessment", media_type: media.kind, summary: assessment.summary.slice(0, 1000) },
          ...assessment.origin_indicators.slice(0, 8).map((detail) => ({ kind: "observable_indicator", detail: String(detail).slice(0, 500) })),
        ],
        supporting: [],
        contradicting: [],
        explanation,
        uncertainty,
        is_demo: false,
        assessed_at: new Date().toISOString(),
      })
      .select("id, post_id, provider, check_type, status, explanation, uncertainty, assessed_at, created_at")
      .single();
    if (saveError || !saved) {
      console.error("Could not save Gemini assessment:", saveError?.message);
      return jsonError("The analysis completed but could not be safely recorded. Please retry later.", 500);
    }

    const { error: caseError } = await supabase.from("moderation_cases").insert({
      post_id: post.id, case_type: "label_review", status: "awaiting_review", priority: "normal",
      opened_by: authData.user.id,
      summary: "Automatic Gemini media review requires human assessment. " + assessment.summary.slice(0, 1500),
    });
    if (caseError) console.error("Could not queue media assessment for human review:", caseError.message);

    return NextResponse.json({ assessment: saved, queuedForHumanReview: !caseError }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Gemini media route error:", error instanceof Error ? error.message : "unknown error");
    return jsonError("Media analysis timed out or failed. No assessment was recorded.", 502);
  }
}
