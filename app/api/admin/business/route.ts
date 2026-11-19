import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return fail("Sign in to access business management.", 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return fail("Secure database access is not configured.", 503);

  const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return fail("Your session is invalid. Sign in again.", 401);
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role, is_suspended").eq("id", auth.user.id).maybeSingle();
  if (profileError) return fail("Could not verify administrator access.", 503);
  if (profile?.role !== "admin" || profile?.is_suspended) return fail("Administrator access is required.", 403);

  const leadQuery = () => supabase.from("support_tickets")
    .select("id, ticket_number, subject, status, priority, assigned_team, created_at, response_due_at")
    .ilike("subject", "Business enquiry —%");
  const now = new Date().toISOString();
  const [leadRows, allCount, openCount, resolvedCount, receivedCount, overdueCount] = await Promise.all([
    leadQuery().order("created_at", { ascending: false }).limit(30),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).ilike("subject", "Business enquiry —%"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).ilike("subject", "Business enquiry —%").neq("status", "resolved"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).ilike("subject", "Business enquiry —%").eq("status", "resolved"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).ilike("subject", "Business enquiry —%").eq("status", "received"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).ilike("subject", "Business enquiry —%").neq("status", "resolved").lt("response_due_at", now),
  ]);
  const errors = [leadRows, allCount, openCount, resolvedCount, receivedCount, overdueCount].filter((item) => item.error);
  if (errors.length) return fail("Business enquiry records could not be loaded.", 503);

  const nowMs = Date.now();
  const leads = (leadRows.data ?? []).map((ticket) => ({
    ...ticket,
    organization: ticket.subject.replace(/^Business enquiry —\s*/i, "").slice(0, 120),
    overdue: ticket.status !== "resolved" && ticket.response_due_at
      ? new Date(ticket.response_due_at).getTime() < nowMs
      : false,
  }));
  return NextResponse.json({
    metrics: {
      total: allCount.count ?? 0,
      open: openCount.count ?? 0,
      resolved: resolvedCount.count ?? 0,
      received: receivedCount.count ?? 0,
      overdue: overdueCount.count ?? 0,
    },
    leads,
    revenue: {
      status: "not_configured",
      explanation: "Verity has no active payment processor or financial ledger. No advertising or subscription revenue is currently recorded by this dashboard.",
    },
    generatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
