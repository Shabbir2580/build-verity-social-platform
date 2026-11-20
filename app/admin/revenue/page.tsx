"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, BarChart3, BriefcaseBusiness, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type BusinessPayload = {
  metrics: { total: number; open: number; resolved: number; received: number; overdue: number };
  revenue: { status: "not_configured"; explanation: string };
  generatedAt: string;
};
type AssistantPayload = {
  role: string;
  aiEnabled: boolean;
  metrics: {
    members: number | null;
    posts: number | null;
    newMembers7d: number | null;
    newPosts7d: number | null;
  };
};

const number = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString();

function Metric({ label, value, note, icon: Icon }: {
  label: string; value: string; note: string; icon: typeof Wallet;
}) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon size={17}/></span>
    </div>
    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 tabular-nums">{value}</p>
    <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
  </article>;
}

export default function AdminRevenuePage() {
  const [business, setBusiness] = useState<BusinessPayload | null>(null);
  const [platform, setPlatform] = useState<AssistantPayload["metrics"] | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session.session) {
        window.location.href = "/login?next=%2Fadmin%2Frevenue";
        return;
      }
      const headers = { Authorization: "Bearer " + session.session.access_token };
      const [businessResponse, assistantResponse] = await Promise.all([
        fetch("/api/admin/business", { headers, cache: "no-store" }),
        fetch("/api/admin/assistant", { headers, cache: "no-store" }),
      ]);
      const [businessPayload, assistantPayload] = await Promise.all([
        businessResponse.json(), assistantResponse.json(),
      ]);
      if (businessResponse.status === 401 || assistantResponse.status === 401) {
        window.location.href = "/login?next=%2Fadmin%2Frevenue";
        return;
      }
      if (businessResponse.status === 403 || assistantResponse.status === 403) {
        throw new Error("Administrator access is required to view financial and platform reporting.");
      }
      if (!businessResponse.ok) throw new Error(businessPayload.error || "Could not load business metrics.");
      if (!assistantResponse.ok) throw new Error(assistantPayload.error || "Could not load platform metrics.");
      if (assistantPayload.role !== "admin") throw new Error("Administrator access is required.");
      setBusiness(businessPayload as BusinessPayload);
      setPlatform(assistantPayload.metrics as AssistantPayload["metrics"]);
      setAiEnabled(assistantPayload.aiEnabled === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load revenue reporting.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pipeline = business?.metrics;
  return <main className="verity-workspace min-h-screen bg-[#f6f8fb] text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" aria-label="Back to admin console" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ArrowLeft size={18}/></Link>
          <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700">Verity finance</p><h1 className="text-lg font-semibold tracking-tight sm:text-xl">Revenue & impact</h1></div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh</button>
      </div>
    </header>

    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <section className="rounded-3xl bg-[#172943] p-6 text-white sm:p-8">
        <div className="flex items-center gap-2 text-indigo-200"><BarChart3 size={18}/><span className="text-xs font-bold uppercase tracking-[0.15em]">Executive reporting</span></div>
        <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">Know what Verity earns, what it costs, and what it contributes.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">This workspace separates confirmed financial transactions from sales pipeline and platform activity. It will not turn enquiries, proposed budgets or forecasts into reported revenue.</p>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <section aria-labelledby="financial-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Private · administrators only</p><h2 id="financial-title" className="mt-1 text-xl font-semibold tracking-tight">Financial performance</h2></div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Ledger not connected</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Collected revenue" value="Not recorded" note="No payment ledger is connected." icon={Wallet}/>
          <Metric label="Refunds" value="Not recorded" note="No verified refund records are available." icon={RefreshCw}/>
          <Metric label="Net revenue" value="Not available" note="Cannot calculate without settled transactions and refunds." icon={BarChart3}/>
          <Metric label="Operating profit" value="Not available" note="Expenses and verified revenue are not recorded." icon={CheckCircle2}/>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Wallet size={20} className="mt-0.5 shrink-0 text-amber-800"/>
            <div className="min-w-0">
              <h3 className="font-semibold text-amber-950">No real earnings are recorded yet</h3>
              <p className="mt-1 text-sm leading-6 text-amber-900">{business?.revenue.explanation || "Financial records are not configured. No revenue figure will be displayed until verified transactions are recorded."}</p>
              <p className="mt-2 text-xs leading-5 text-amber-900">Before reporting earnings, connect a payment provider and build a reconciled ledger for payment captures, settlements, refunds, fees, taxes and expenses. A checkout success screen alone is not proof of settlement.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="revenue-ai-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">AI finance intelligence</p><h2 id="revenue-ai-title" className="mt-1 text-xl font-semibold tracking-tight">AI Revenue Analyst</h2></div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Waiting for verified ledger</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-indigo-700"><BarChart3 size={18}/><h3 className="font-semibold text-slate-900">Earnings briefing</h3></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Explain collected and settled revenue, refunds, provider fees, taxes, net revenue and operating costs with links back to source transactions.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-indigo-700"><BriefcaseBusiness size={18}/><h3 className="font-semibold text-slate-900">Sponsor performance</h3></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Compare approved campaigns using delivered impressions, qualified clicks, conversions, contract value and attributable costs—not enquiry budgets.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-indigo-700"><Sparkles size={18}/><h3 className="font-semibold text-slate-900">Forecast scenarios</h3></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Build conservative, base and upside scenarios only after enough verified history exists, with assumptions and uncertainty shown beside every estimate.</p>
          </article>
        </div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">The analyst is intentionally inactive. It will not generate earnings summaries, ROI claims or forecasts until settled transactions, refunds, expenses and campaign attribution are available in a reconciled ledger.</p>
      </section>

      <section aria-labelledby="pipeline-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Commercial pipeline</p><h2 id="pipeline-title" className="mt-1 text-xl font-semibold tracking-tight">Business enquiries</h2></div>
          <Link href="/admin/business" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-900">Open business workspace <ArrowUpRight size={15}/></Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Total enquiries" value={number(pipeline?.total)} note="Submitted enquiries, not sales." icon={BriefcaseBusiness}/>
          <Metric label="Open" value={number(pipeline?.open)} note="Still in the follow-up pipeline." icon={Clock3}/>
          <Metric label="Received" value={number(pipeline?.received)} note="Awaiting first response." icon={BriefcaseBusiness}/>
          <Metric label="Resolved" value={number(pipeline?.resolved)} note="Closed support workflow status." icon={CheckCircle2}/>
          <Metric label="Overdue" value={number(pipeline?.overdue)} note="Past the recorded response deadline." icon={Clock3}/>
        </div>
      </section>

      <section aria-labelledby="impact-title" className="space-y-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Impact reporting</p><h2 id="impact-title" className="mt-1 text-xl font-semibold tracking-tight">Platform activity snapshot</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Community members" value={number(platform?.members)} note="Current registered profiles." icon={ShieldCheck}/>
          <Metric label="Posts published" value={number(platform?.posts)} note="Current post records." icon={BarChart3}/>
          <Metric label="New members · 7 days" value={number(platform?.newMembers7d)} note="Recent registrations." icon={CheckCircle2}/>
          <Metric label="New posts · 7 days" value={number(platform?.newPosts7d)} note="Recent publishing activity." icon={Sparkles}/>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <Sparkles size={20} className="mt-0.5 shrink-0 text-indigo-700"/>
            <div>
              <h3 className="font-semibold">AI reporting readiness</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{aiEnabled
                ? "The staff AI assistant is enabled. It can summarize operational metrics, but financial analysis must remain disabled until a verified ledger exists."
                : "The staff AI assistant is currently disabled or not configured. Once enabled, it can summarize operational trends. It must not invent revenue, profit, sponsor performance or forecasts."}</p>
              <p className="mt-2 text-xs text-slate-500">Last refreshed: {business?.generatedAt ? new Date(business.generatedAt).toLocaleString() : "—"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-700"/>
            <div className="min-w-0">
              <h2 className="font-semibold">Public impact showcase</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">The public impact page is live. It displays aggregate platform counts and explains what those counts do—and do not—prove. Private financials, user-level activity and unreviewed AI verdicts stay excluded.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Review the public definitions and limitations before sharing impact claims externally.</p>
            </div>
          </div>
          <Link href="/impact" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">View public impact <ArrowUpRight size={14}/></Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/ai" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800"><Sparkles size={16}/> Open AI workspace</Link>
        <Link href="/for-organizations" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Organization partnerships <ArrowUpRight size={15}/></Link>
      </div>
      {loading && <p role="status" className="text-xs text-slate-500">Refreshing verified platform records…</p>}
    </div>
  </main>;
}
