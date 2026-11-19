"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Briefcase, CheckCircle2, Clock3, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string; ticket_number: number | string; subject: string; organization: string;
  status: string; priority: string; assigned_team: string; created_at: string;
  response_due_at: string | null; overdue: boolean;
};
type Payload = {
  metrics: { total: number; open: number; resolved: number; received: number; overdue: number };
  leads: Lead[];
  revenue: { status: "not_configured"; explanation: string };
  generatedAt: string;
};

const number = (value: number) => value.toLocaleString();
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function AdminBusinessPage() {
  const [data, setData] = useState<Payload | null>(null);
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
        window.location.href = "/login?next=%2Fadmin%2Fbusiness";
        return;
      }
      const response = await fetch("/api/admin/business", {
        headers: { Authorization: "Bearer " + session.session.access_token },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load business records.");
      setData(payload as Payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load business records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <main className="verity-workspace min-h-screen bg-[#f7f8fa] text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" aria-label="Back to admin console" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ArrowLeft size={18}/></Link>
          <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Verity Business</p><h1 className="text-lg font-semibold tracking-tight sm:text-xl">Business & revenue</h1></div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh</button>
      </div>
    </header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <section className="rounded-3xl bg-[#182743] p-6 text-white sm:p-8">
        <div className="flex items-center gap-2 text-indigo-200"><Briefcase size={18}/><span className="text-xs font-bold uppercase tracking-[0.15em]">Commercial workspace</span></div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Build the business without guessing the numbers.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Track real organization enquiries and keep future revenue reporting separate from leads, proposals and estimated campaign value.</p>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">Total enquiries</p><Briefcase size={17} className="text-slate-400"/></div><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{number(data?.metrics.total ?? 0)}</p><p className="mt-1 text-xs text-slate-500">Submitted business enquiries</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">Open enquiries</p><Clock3 size={17} className="text-slate-400"/></div><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{number(data?.metrics.open ?? 0)}</p><p className="mt-1 text-xs text-slate-500">Not marked resolved</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">New enquiries</p><TrendingUp size={17} className="text-slate-400"/></div><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{number(data?.metrics.received ?? 0)}</p><p className="mt-1 text-xs text-slate-500">Awaiting first review</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">Resolved</p><CheckCircle2 size={17} className="text-slate-400"/></div><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{number(data?.metrics.resolved ?? 0)}</p><p className="mt-1 text-xs text-slate-500">Closed business enquiries</p></div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-rose-700">Overdue follow-ups</p><Clock3 size={17} className="text-rose-500"/></div><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-rose-800">{number(data?.metrics.overdue ?? 0)}</p><p className="mt-1 text-xs text-rose-700">Open enquiries past response deadline</p></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Business enquiry pipeline</h2><p className="mt-1 text-xs text-slate-500">Latest 30 leads from the existing support ticket workflow.</p></div>
          <Link href="/support/staff" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open staff queue <ExternalLink size={13}/></Link>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {data?.leads.map((lead) => <article key={lead.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{lead.organization || "Organization enquiry"}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">#{lead.ticket_number}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${lead.status === "resolved" ? "bg-emerald-50 text-emerald-700" : lead.overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{lead.overdue ? "Overdue" : lead.status.replaceAll("_", " ")}</span></div>
              <p className="mt-1 text-xs text-slate-500">Received {date(lead.created_at)} · Team: {lead.assigned_team || "Unassigned"} · {lead.response_due_at ? `Response due ${date(lead.response_due_at)}` : "No response deadline set"}</p>
            </div>
            <Link href="/support/staff" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open ticket queue</Link>
          </article>)}
          {!data?.leads.length && <p className="py-10 text-center text-sm text-slate-500">{loading ? "Loading enquiries…" : "No business enquiries have been submitted yet."}</p>}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-center gap-2 text-amber-800"><Wallet size={18}/><h2 className="font-semibold">Revenue reporting</h2></div>
          <p className="mt-3 text-sm leading-6 text-amber-950">{data?.revenue.explanation || "Revenue reporting is not configured yet. This page will not display fabricated earnings or estimates."}</p>
          <p className="mt-3 text-xs font-semibold text-amber-800">Status: Not configured · No payment processor connected</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-emerald-700"><ShieldCheck size={18}/><h2 className="font-semibold">Commercial trust rules</h2></div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
            <li>• Enquiries are not revenue.</li>
            <li>• Proposals and campaign estimates are not collected payments.</li>
            <li>• Verification and moderation cannot be purchased.</li>
            <li>• Payment records must reconcile with a real provider before earnings are reported.</li>
          </ul>
        </div>
      </section>
      {data && <p className="text-right text-[11px] text-slate-400">Data refreshed {new Date(data.generatedAt).toLocaleString()}</p>}
    </div>
  </main>;
}
