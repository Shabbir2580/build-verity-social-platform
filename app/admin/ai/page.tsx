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
  businessLeads: number | null; openBusinessLeads: number | null; aiRequests24h: number | null;
};
type Message = { role: "user" | "assistant"; content: string };

const suggestionsByRole = {
  admin: [
    "Prepare an executive operations briefing for today.",
    "Which moderation and support queues need attention first?",
    "Summarize platform growth over the last 7 days.",
    "How many business enquiries need follow-up? Are any payments recorded?",
  ],
  moderator: [
    "Prepare a moderation queue briefing for today.",
    "Which cases are urgent or overdue?",
    "What should a moderator prioritize first?",
    "Explain the current moderation workload and its limitations.",
  ],
  support: [
    "Prepare a support desk briefing for today.",
    "Which support tickets are overdue?",
    "What should the support team prioritize first?",
    "Summarize the current support workload and response deadlines.",
  ],
} as const;

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
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Get a role-specific operational briefing, understand urgent work and identify next steps. Answers use live aggregate counts; the assistant cannot take moderation actions or make decisions for staff.</p>
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
            <MetricCard label="Members" value={metrics?.members ?? null} note={`+${(metrics?.newMembers7d ?? 0).toLocaleString()} in 7 days`} icon={Users}/>
            <MetricCard label="Posts" value={metrics?.posts ?? null} note={`+${(metrics?.newPosts7d ?? 0).toLocaleString()} in 7 days`} icon={FileText}/>
            <MetricCard label="Business enquiries" value={metrics?.businessLeads ?? null} note={`${(metrics?.openBusinessLeads ?? 0).toLocaleString()} still open · not revenue`} icon={Briefcase}/>
          </>}
          {(staffRole === "admin" || staffRole === "moderator") && <MetricCard label="Active cases" value={metrics?.activeCases ?? null} note={`${metrics?.urgentCases ?? 0} marked urgent`} icon={Flag}/>}
          {(staffRole === "admin" || staffRole === "support") && <MetricCard label="Open support" value={metrics?.openTickets ?? null} note="Not marked resolved" icon={Headphones}/>}
          {staffRole && <MetricCard label="AI requests · 24h" value={metrics?.aiRequests24h ?? null} note={staffRole === "admin" ? "Across authorized staff" : "Your recorded requests"} icon={Bot}/>}
        </div>

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
            <span>I understand that my question is sent to Google Gemini for processing. Google's free-tier data-use terms may allow submitted content to be used to improve Google products. I will ask only about aggregate operations and will not include names, private messages, credentials or personal data.</span>
          </label>
          <form onSubmit={(event) => void ask(event)} className="flex gap-2 border-t border-slate-100 bg-white p-3 sm:p-4">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} disabled={!aiEnabled || !aiConsent || sending} placeholder={!aiEnabled ? "AI assistant is currently disabled" : aiConsent ? "Ask about workload, activity or priorities…" : "Confirm the Google data-use notice to continue"} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white disabled:opacity-60"/>
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
            <li>• Current assistant answers are limited to aggregate operational counts; individual case and ticket records are not yet connected.</li>
            <li>• AI cannot suspend accounts, delete posts or resolve cases.</li>
            <li>• AI cannot determine whether a claim or media item is true or authentic.</li>
            <li>• Admins remain responsible for decisions and should verify records.</li>
            <li>• Best-effort app limits are 12 per hour and 40 per day per staff account; provider quotas remain the hard ceiling.</li>
            <li>• Usage events store token counts, not the question text; token counts are not a currency-cost estimate.</li>
          </ul>
        </section>
        <Link href="/admin" className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Return to admin console</Link>
      </aside>
    </div>
  </main>;
}
