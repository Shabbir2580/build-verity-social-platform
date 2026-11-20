"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Bot, BrainCircuit, Briefcase, Clock3, LoaderCircle, RefreshCw, Send, ShieldCheck, Sparkles, Users, FileText, Flag, Headphones, AlertTriangle, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Metrics = {
  generatedAt: string; members: number | null; posts: number | null; reports: number | null;
  activeCases: number | null; urgentCases: number | null; overdueCases: number | null;
  openTickets: number | null; overdueTickets: number | null; newTickets7d: number | null;
  newMembers7d: number | null; newPosts7d: number | null;
  previousMembers7d: number | null; previousPosts7d: number | null; previousTickets7d: number | null;
  newComments7d: number | null; previousComments7d: number | null;
  newReactions7d: number | null; previousReactions7d: number | null;
  newCommunityJoins7d: number | null; previousCommunityJoins7d: number | null;
  businessLeads: number | null; openBusinessLeads: number | null; aiRequests24h: number | null;
  dailyActivity: { activity_date: string; new_members: number; published_posts: number; comments_created: number; post_reactions: number; community_joins: number }[] | null;
};
type Message = { role: "user" | "assistant"; content: string };

const suggestionsByRole = {
  admin: [
    "Prepare an executive operations briefing for today.",
    "Which moderation and support queues need attention first?",
    "Summarize platform growth over the last 7 days.",
    "How many business enquiries need follow-up? Are any payments recorded?",
    "Explain Verity's verification workflow and the limits of its AI checks.",
    "Which tasks can the AI assist with, and which actions require a human?",
  ],
  moderator: [
    "Prepare a moderation queue briefing for today.",
    "Which cases are urgent or overdue?",
    "What should a moderator prioritize first?",
    "Explain the current moderation workload and its limitations.",
    "Walk me through reviewing a report, label review and appeal safely.",
    "What evidence should I check before resolving a moderation case?",
  ],
  support: [
    "Prepare a support desk briefing for today.",
    "Which support tickets are overdue?",
    "What should the support team prioritize first?",
    "Summarize the current support workload and response deadlines.",
    "How should I investigate a ticket and prepare a safe customer reply?",
    "Which customer promises must I avoid making without verified records?",
  ],
} as const;

function PeriodComparison({ label, current, previous }: { label: string; current: number | null; previous: number | null }) {
  if (current === null || previous === null) return null;
  const peak = Math.max(current, previous, 1);
  const change = current - previous;
  const percentage = previous > 0 ? Math.round((change / previous) * 100) : null;
  const direction = change > 0 ? "more" : change < 0 ? "fewer" : "unchanged";
  return <div className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${change > 0 ? "bg-emerald-50 text-emerald-700" : change < 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
        {change === 0 ? "No change" : `${Math.abs(change).toLocaleString()} ${direction}`}
        {percentage !== null ? ` · ${change > 0 ? "+" : ""}${percentage}%` : " · % unavailable"}
      </span>
    </div>
    <div className="mt-4 space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Latest 7 days</span><strong className="tabular-nums text-slate-700">{current.toLocaleString()}</strong></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#168477]" style={{ width: `${(current / peak) * 100}%` }}/></div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Previous 7 days</span><strong className="tabular-nums text-slate-700">{previous.toLocaleString()}</strong></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-400" style={{ width: `${(previous / peak) * 100}%` }}/></div>
      </div>
    </div>
  </div>;
}

function MetricCard({ label, value, note, icon: Icon }: {
  label: string; value: number | null; note: string; icon: typeof Users;
}) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <Icon size={17} className="text-slate-400"/>
    </div>
    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value === null ? "—" : value.toLocaleString()}</p>
    <p className="mt-1 text-xs text-slate-500">{note}</p>
  </div>;
}

export default function AdminAiPage() {
  const pathname = usePathname();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [staffRole, setStaffRole] = useState<"admin" | "moderator" | "support" | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [aiConsent, setAiConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        window.location.href = "/login?next=" + encodeURIComponent(pathname || "/admin/ai");
        return;
      }
      const response = await fetch("/api/admin/assistant", {
        headers: { Authorization: "Bearer " + sessionData.session.access_token },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load admin assistant.");
      setMetrics(payload.metrics as Metrics);
      setStaffRole(payload.role as "admin" | "moderator" | "support");
      setAiEnabled(payload.aiEnabled === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the admin assistant.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function ask(event?: FormEvent, preset?: string, mode: "question" | "briefing" | "priorities" | "growth" | "workflow" = "question") {
    event?.preventDefault();
    const prompt = (preset ?? question).trim();
    if (!prompt || sending) return;
    if (!aiConsent) { setError("Confirm the Google Gemini data-use notice before sending a question."); return; }
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    setQuestion("");
    setSending(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error("Your session expired. Sign in again.");
      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + sessionData.session.access_token,
        },
        body: JSON.stringify({ question: prompt, mode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The assistant could not answer.");
      setMessages((current) => [...current, {
        role: "assistant",
        content: payload.answer + "\n\n" + payload.disclaimer,
      }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The assistant could not answer.";
      setError(message);
      setMessages((current) => [...current, { role: "assistant", content: "I couldn't complete that request: " + message }]);
    } finally {
      setSending(false);
    }
  }

  return <main className="verity-workspace min-h-screen bg-[#f7f8fa] text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin" aria-label="Back to admin console" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"><ArrowLeft size={18}/></Link>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Verity operations</p>
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{staffRole === "moderator" || staffRole === "support" ? "Staff AI assistant" : "AI command center"}</h1>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh</button>
      </div>
    </header>

    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-8">
      <section className="min-w-0 space-y-5">
        <div className="verity-ai-hero rounded-3xl p-6 text-white sm:p-8">
          <div className="verity-ai-accent flex items-center gap-2"><BrainCircuit size={18}/><span className="text-xs font-bold uppercase tracking-[0.15em]">Internal assistant</span></div>
          <h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Understand what needs attention.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Ask how Verity works, get role-specific workflow guidance, interpret live aggregate counts and identify next steps. The assistant uses a curated product handbook plus the data supplied for each request; it cannot browse every record or make decisions for staff.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-100">{staffRole === "admin" ? "Admin access" : staffRole === "moderator" ? "Moderator access" : staffRole === "support" ? "Support access" : "Staff access"}</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-100">Read-only data</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-100">Human decisions</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" disabled={!aiEnabled || !aiConsent || sending || loading} onClick={() => void ask(undefined, "Prepare today's role-specific operations briefing using the latest database snapshot.", "briefing")} className="verity-ai-primary inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45"><Sparkles size={15}/> Generate daily briefing</button>
            <button type="button" disabled={!aiEnabled || !aiConsent || sending || loading} onClick={() => void ask(undefined, "Rank the operational priorities for my role and explain the evidence for each.", "priorities")} className="verity-ai-secondary inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"><Flag size={14}/> Prioritise work</button>
            <button type="button" disabled={!aiEnabled || !aiConsent || sending || loading} onClick={() => void ask(undefined, "Review the supplied seven-day activity totals. State what they show, what cannot be concluded, and which additional comparison metrics would be needed.", "growth")} className="verity-ai-secondary inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"><Users size={14}/> Analyse growth</button>
            <button type="button" disabled={!aiEnabled || !aiConsent || sending || loading} onClick={() => void ask(undefined, "Give me a practical workflow for handling my role's current work safely, including checks before any decision.", "workflow")} className="verity-ai-secondary inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"><ClipboardList size={14}/> Explain workflow</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {staffRole === "admin" && <>
            <MetricCard label="Members" value={metrics?.members ?? null} note={`7d: +${(metrics?.newMembers7d ?? 0).toLocaleString()} · prior 7d: +${(metrics?.previousMembers7d ?? 0).toLocaleString()}`} icon={Users}/>
            <MetricCard label="Posts" value={metrics?.posts ?? null} note={`7d: +${(metrics?.newPosts7d ?? 0).toLocaleString()} · prior 7d: +${(metrics?.previousPosts7d ?? 0).toLocaleString()}`} icon={FileText}/>
            <MetricCard label="Business enquiries" value={metrics?.businessLeads ?? null} note={`${(metrics?.openBusinessLeads ?? 0).toLocaleString()} still open · not revenue`} icon={Briefcase}/>
          </>}
          {(staffRole === "admin" || staffRole === "moderator") && <MetricCard label="Active cases" value={metrics?.activeCases ?? null} note={`${metrics?.urgentCases ?? 0} marked urgent`} icon={Flag}/>}
          {(staffRole === "admin" || staffRole === "support") && <MetricCard label="Open support" value={metrics?.openTickets ?? null} note="Not marked resolved" icon={Headphones}/>}
          {staffRole && <MetricCard label="AI requests · 24h" value={metrics?.aiRequests24h ?? null} note={staffRole === "admin" ? "Across authorized staff" : "Your recorded requests"} icon={Bot}/>}
        </div>

        {(staffRole === "admin" || staffRole === "support") && <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Seven-day activity comparison</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Current period versus the immediately preceding seven days. These are activity volumes, not retention or user-quality metrics.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {staffRole === "admin" && <>
              <PeriodComparison label="New members" current={metrics?.newMembers7d ?? null} previous={metrics?.previousMembers7d ?? null}/>
              <PeriodComparison label="Posts created" current={metrics?.newPosts7d ?? null} previous={metrics?.previousPosts7d ?? null}/>
              <PeriodComparison label="Comments created" current={metrics?.newComments7d ?? null} previous={metrics?.previousComments7d ?? null}/>
              <PeriodComparison label="Post reactions" current={metrics?.newReactions7d ?? null} previous={metrics?.previousReactions7d ?? null}/>
              <PeriodComparison label="Community joins" current={metrics?.newCommunityJoins7d ?? null} previous={metrics?.previousCommunityJoins7d ?? null}/>
            </>}
            <PeriodComparison label="Support tickets created" current={metrics?.newTickets7d ?? null} previous={metrics?.previousTickets7d ?? null}/>
          </div>
          {staffRole === "admin" && <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h3 className="text-sm font-semibold text-slate-900">Daily platform activity</h3><p className="mt-1 text-xs text-slate-500">UTC calendar days · last 7 days · real database counts</p></div>
              <span className="text-[11px] text-slate-400">Admin only</span>
            </div>
            {metrics?.dailyActivity?.length ? <div className="mt-5 space-y-3">
              {metrics.dailyActivity.map((day) => {
                const total = day.new_members + day.published_posts + day.comments_created + day.post_reactions + day.community_joins;
                const peak = Math.max(...metrics.dailyActivity!.map((item) => item.new_members + item.published_posts + item.comments_created + item.post_reactions + item.community_joins), 1);
                return <div key={day.activity_date} className="grid grid-cols-[76px_minmax(0,1fr)_42px] items-center gap-3">
                  <span className="text-xs text-slate-500">{new Date(day.activity_date + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${total} total recorded activities`}><div className="h-full rounded-full bg-[#168477]" style={{ width: `${(total / peak) * 100}%` }}/></div>
                  <strong className="text-right text-xs tabular-nums text-slate-700">{total.toLocaleString()}</strong>
                </div>;
              })}
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <span>Members</span><span>Published posts</span><span>Comments</span><span>Reactions</span><span>Community joins</span>
              </div>
              <p className="text-[11px] leading-5 text-slate-400">Bars show combined daily volume, not unique people. A single person can create multiple activities. This is not a retention metric.</p>
            </div> : <p className="mt-4 text-xs text-slate-500">Daily activity data is not available yet.</p>}
          </div>}
          <p className="text-[11px] leading-5 text-slate-400">Percentage change is shown only when the previous period contains at least one record. Ticket counts follow the same team visibility rules as the support workspace.</p>
        </section>}

        <section className="verity-ai-panel overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2"><Bot size={18} className="text-indigo-600"/><h2 className="font-semibold">Ask Verity AI</h2></div>
            <span className="text-xs text-slate-400">Operational guidance</span>
          </div>
          <div className="verity-ai-chat min-h-72 space-y-4 p-4 sm:p-5">
            {!messages.length && <div className="mx-auto max-w-lg py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Sparkles size={22}/></div>
              <h3 className="mt-4 font-semibold text-slate-800">What would you like to understand?</h3>
              <p className="mt-1 text-sm text-slate-500">Start with one of these questions.</p>
              <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
                {(staffRole ? suggestionsByRole[staffRole] : suggestionsByRole.admin).map((item) => <button key={item} disabled={!aiEnabled || !aiConsent || sending} onClick={() => void ask(undefined, item)} className="verity-ai-suggestion rounded-xl border border-slate-200 bg-white p-3 text-left text-xs font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50">{item}</button>)}
              </div>
            </div>}
            {messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-[#34477f] px-4 py-3 text-sm leading-6 text-white" : "mr-auto max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"}>
              {message.content}
            </div>)}
            {sending && <div className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle size={14} className="animate-spin"/> Reviewing current aggregate metrics…</div>}
          </div>
          <label className="flex cursor-pointer items-start gap-2 border-t border-slate-100 bg-white px-4 pt-4 text-xs leading-5 text-slate-600">
            <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} disabled={!aiEnabled || sending} className="mt-0.5 size-4 shrink-0 accent-indigo-700" />
            <span>I understand that my question is sent to Google Gemini for processing. Google's free-tier data-use terms may allow submitted content to be used to improve Google products. I will ask about Verity's product, documented workflows or aggregate operations only. I will not include names, ticket or case content, private messages, credentials or personal data.</span>
          </label>
          <form onSubmit={(event) => void ask(event)} className="flex gap-2 border-t border-slate-100 bg-white p-3 sm:p-4">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} disabled={!aiEnabled || !aiConsent || sending} placeholder={!aiEnabled ? "AI assistant is currently disabled" : aiConsent ? "Ask how Verity works, about workflows or live metrics…" : "Confirm the Google data-use notice to continue"} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white disabled:opacity-60"/>
            <button type="submit" disabled={!aiEnabled || !aiConsent || sending || question.trim().length < 4} className="verity-ai-send inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"><Send size={15}/><span className="hidden sm:inline">Ask</span></button>
          </form>
          {!aiEnabled && <div className="verity-ai-note border-t px-4 py-3 text-xs leading-5"><strong>AI is not activated.</strong> This feature requires the existing Gemini key and the explicit server setting <code>VERITY_ADMIN_AI_ENABLED=true</code>. It is deliberately off by default to prevent unexpected API usage or charges.</div>}
          {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</p>}
        </section>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Operations snapshot</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Current counts from Verity records. Refresh to retrieve a new snapshot.</p>
          <div className="mt-4 space-y-3">
            {(staffRole === "admin" || staffRole === "moderator") && <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="flex items-center gap-2 text-sm text-slate-600"><AlertTriangle size={15} className="text-rose-600"/>Urgent cases</span>
                <strong className="text-sm tabular-nums">{(metrics?.urgentCases ?? 0).toLocaleString()}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Clock3 size={15} className="text-amber-600"/>Overdue cases</span>
                <strong className="text-sm tabular-nums">{(metrics?.overdueCases ?? 0).toLocaleString()}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Flag size={15} className="text-slate-500"/>All reports</span>
                <strong className="text-sm tabular-nums">{(metrics?.reports ?? 0).toLocaleString()}</strong>
              </div>
            </>}
            {(staffRole === "admin" || staffRole === "support") && <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Headphones size={15} className="text-slate-500"/>Open support tickets</span>
                <strong className="text-sm tabular-nums">{(metrics?.openTickets ?? 0).toLocaleString()}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Clock3 size={15} className="text-amber-600"/>Overdue support</span>
                <strong className="text-sm tabular-nums">{(metrics?.overdueTickets ?? 0).toLocaleString()}</strong>
              </div>
            </>}
          </div>
          {metrics && <p className="mt-4 text-[11px] text-slate-400">Updated {new Date(metrics.generatedAt).toLocaleString()}</p>}
          {loading && <p className="mt-3 text-xs text-slate-400">Loading metrics…</p>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600"/><h2 className="font-semibold">Safety boundaries</h2></div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
            <li>• The assistant uses Verity's product and operations handbook plus role-authorized aggregate metrics supplied with each request.</li>
            <li>• The general copilot cannot inspect individual tickets, moderation cases, private messages or member records. Open the relevant workspace for the original record.</li>
            <li>• Selected-case moderation summaries and selected-ticket support drafts are separate, consent-based tools with their own access checks.</li>
            <li>• AI cannot suspend accounts, delete posts, send customer replies or resolve cases. Staff must perform and audit those actions.</li>
            <li>• AI cannot prove whether a claim is true or media is authentic. Automated video-origin review is not available.</li>
            <li>• Admins and staff remain responsible for decisions and must verify original records.</li>
            <li>• Best-effort app limits are 12 per hour and 40 per day per staff account; provider quotas remain the hard ceiling.</li>
            <li>• Usage events store token counts, not the question text; token counts are not a currency-cost estimate.</li>
          </ul>
        </section>
        <Link href="/admin" className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Return to admin console</Link>
      </aside>
    </div>
  </main>;
}
