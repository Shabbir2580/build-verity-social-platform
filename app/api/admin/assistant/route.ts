import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type AdminContext = {
  generatedAt: string;
  members: number | null; posts: number | null; reports: number | null;
  activeCases: number | null; urgentCases: number | null; overdueCases: number | null;
  openTickets: number | null; overdueTickets: number | null; newTickets7d: number | null;
  newMembers7d: number | null; newPosts7d: number | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

async function getAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return { error: jsonError("Sign in to access the admin assistant.", 401) };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return { error: jsonError("Secure database access is not configured.", 503) };

  const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return { error: jsonError("Your session is invalid. Sign in again.", 401) };

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role, is_suspended").eq("id", auth.user.id).maybeSingle();
  if (profileError) return { error: jsonError("Could not verify administrator permissions.", 503) };
  if (!["admin", "moderator", "support"].includes(profile?.role || "") || profile?.is_suspended) {
    return { error: jsonError("Authorized staff access is required.", 403) };
  }
  return { supabase, userId: auth.user.id, role: profile.role };
}

async function getContext(supabase: any, role: string): Promise<AdminContext> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const isoNow = now.toISOString();
  const isAdmin = role === "admin";
  const canModerate = isAdmin || role === "moderator";
  const canSupport = isAdmin || role === "support";
  const count = async (query: any): Promise<number> => {
    const { count: total, error } = await query;
    if (error) throw new Error("One or more staff metrics could not be loaded.");
    return total ?? 0;
  };
  const [
    members, posts, reports, activeCases, urgentCases, overdueCases,
    openTickets, overdueTickets, newTickets7d, newMembers, newPosts,
  ] = await Promise.all([
    isAdmin ? count(supabase.from("profiles").select("id", { count: "exact", head: true })) : null,
    isAdmin ? count(supabase.from("posts").select("id", { count: "exact", head: true })) : null,
    canModerate ? count(supabase.from("reports").select("id", { count: "exact", head: true })) : null,
    canModerate ? count(supabase.from("moderation_cases").select("id", { count: "exact", head: true }).neq("status", "resolved")) : null,
    canModerate ? count(supabase.from("moderation_cases").select("id", { count: "exact", head: true }).neq("status", "resolved").eq("priority", "urgent")) : null,
    canModerate ? count(supabase.from("moderation_cases").select("id", { count: "exact", head: true }).neq("status", "resolved").lt("due_at", isoNow)) : null,
    canSupport ? count(supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "resolved")) : null,
    canSupport ? count(supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "resolved").lt("response_due_at", isoNow)) : null,
    canSupport ? count(supabase.from("support_tickets").select("id", { count: "exact", head: true }).gte("created_at", weekAgo)) : null,
    isAdmin ? count(supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo)) : null,
    isAdmin ? count(supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", weekAgo)) : null,
  ]);
  return {
    generatedAt: isoNow, members, posts, reports, activeCases, urgentCases,
    overdueCases, openTickets, overdueTickets, newTickets7d, newMembers7d: newMembers, newPosts7d: newPosts,
  };
}

export async function GET(request: NextRequest) {
  const access = await getAdmin(request);
  if ("error" in access) return access.error!;
  try {
    const metrics = await getContext(access.supabase, access.role);
    return NextResponse.json({
      metrics,
      role: access.role,
      aiEnabled: process.env.VERITY_ADMIN_AI_ENABLED === "true" && Boolean(process.env.GEMINI_API_KEY),
      aiModel: "gemini-2.5-flash",
    }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Admin assistant metrics failed:", error instanceof Error ? error.message : "unknown");
    return jsonError("Could not load current platform metrics.", 503);
  }
}

export async function POST(request: NextRequest) {
  const access = await getAdmin(request);
  if ("error" in access) return access.error!;
  if (process.env.VERITY_ADMIN_AI_ENABLED !== "true") {
    return jsonError("The AI assistant is not enabled. Enable it only after reviewing the existing Gemini API billing and usage limits.", 503);
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonError("Gemini is not configured on the server.", 503);

  let body: { question?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid request body.", 400); }
  const question = typeof body.question === "string"
    ? body.question.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()
    : "";
  if (question.length < 4 || question.length > 500) return jsonError("Enter a question between 4 and 500 characters.", 400);

  try {
    const metrics = await getContext(access.supabase, access.role);
    const prompt = [
      "You are Verity's internal admin operations assistant.",
      "Answer using only the verified aggregate metrics supplied below. Never invent a count, user, event, revenue, cause, or trend.",
      "If a requested metric is not present, say it is not currently available.",
      "Recommend human review for moderation decisions. Never recommend automatic bans, removals, appeal outcomes, or truth verdicts.",
      "Do not claim that reports prove misconduct. Do not infer revenue because no financial metrics are supplied.",
      "Be concise, practical, and clearly distinguish observed counts from suggestions.",
      "Current platform metrics (counts from the database, generated at " + metrics.generatedAt + "):",
      JSON.stringify(metrics),
      "Administrator question: " + question,
    ].join("\n\n");

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      if (response.status === 429) return jsonError("Gemini usage limit reached. Try again later.", 429);
      console.error("Admin assistant provider error:", response.status);
      return jsonError("The AI assistant could not complete this request.", 502);
    }
    const payload = await response.json();
    const answer = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => typeof part.text === "string" ? part.text : "")
      .join("\n").trim();
    if (!answer) return jsonError("The AI provider returned an empty response.", 502);
    return NextResponse.json({
      answer: answer.slice(0, 5000),
      metricsGeneratedAt: metrics.generatedAt,
      disclaimer: "AI-generated operational guidance. Verify the underlying records; humans retain all moderation and account decisions.",
    }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Admin assistant request failed:", error instanceof Error ? error.message : "unknown");
    return jsonError("The assistant request failed. Please try again.", 502);
  }
}
