"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, BookOpenCheck, FileText, MessageCircle, Users, UsersRound, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";

type ImpactMetrics = {
  activeMembers: number;
  publishedPosts: number;
  comments: number;
  communities: number;
  recordedAssessments: number;
  sourceLinks: number;
};
type ImpactPayload = {
  generatedAt: string;
  metrics: ImpactMetrics;
  definitions: Record<keyof ImpactMetrics, string>;
  notice: string;
};

const cards = [
  { key: "activeMembers", label: "Active members", icon: Users, note: "Profiles not currently suspended." },
  { key: "publishedPosts", label: "Published posts", icon: FileText, note: "Posts currently visible as published." },
  { key: "comments", label: "Comments", icon: MessageCircle, note: "Non-deleted post and answer comments." },
  { key: "communities", label: "Communities", icon: UsersRound, note: "Communities currently stored on Verity." },
  { key: "recordedAssessments", label: "Recorded assessments", icon: ShieldCheck, note: "Completed evidence, uncertain or disputed checks." },
  { key: "sourceLinks", label: "Source links", icon: BookOpenCheck, note: "Links attached to posts, not verified endorsements." },
] as const;

export default function ImpactPage() {
  const [data, setData] = useState<ImpactPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/public/impact", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Impact data is unavailable.");
      setData(payload as ImpactPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load impact data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <main className="verity-public-page min-h-screen bg-[#f5f7f6] px-4 pb-16 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={16}/> Back to Verity</Link>
        <span className="text-lg font-black tracking-tight">verity<span className="text-teal-700">.</span></span>
      </header>
      <section className="mx-auto max-w-6xl pt-10 sm:pt-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-teal-800"><Activity size={14}/> Public transparency</span>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Verity, in the open.</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">A live snapshot of community activity and the evidence records members have created. These numbers describe platform activity; they do not certify that content is true or that the platform has achieved a particular social outcome.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/verify" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800">Open Trust Center <ExternalLink size={14}/></Link>
            <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh counts</button>
          </div>
        </div>

        {error && <p role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        <section aria-label="Live platform activity" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ key, label, icon: Icon, note }) => (
            <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-slate-600">{label}</span><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800"><Icon size={19}/></span></div>
              <p className="mt-4 text-4xl font-black tabular-nums">{loading ? "—" : (data?.metrics[key] ?? "—").toLocaleString()}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
            </article>
          ))}
        </section>

        {data && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-extrabold">How to read these numbers</h2>
          <ul className="mt-3 grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-2">
            {cards.map(({ key, label }) => <li key={key}><strong className="text-slate-800">{label}:</strong> {data.definitions[key]}</li>)}
          </ul>
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{data.notice}</p>
          <p className="mt-3 text-[11px] text-slate-400">Last generated: {new Date(data.generatedAt).toLocaleString()}</p>
        </section>}
        {!loading && !data && !error && <p className="mt-8 text-sm text-slate-500">No public metrics are available right now.</p>}
      </section>
    </main>
  );
}
