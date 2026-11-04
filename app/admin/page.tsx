"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowLeft, Ban, CheckCircle2, ClipboardList, FileText, LoaderCircle, RefreshCw, ShieldCheck, Users, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string; display_name: string; role: string; is_suspended: boolean; created_at: string };
type Audit = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown>; created_at: string };
type Stats = { members: number; posts: number; reports: number; cases: number; tickets: number };
type DailyMetric = { day: string; members: number; posts: number; comments: number };

const roleOptions = ["user", "support", "moderator", "admin"];
const fmt = (value: string) => { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—"; };
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({ members: 0, posts: 0, reports: 0, cases: 0, tickets: 0 });
  const [staff, setStaff] = useState<Profile[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [daily, setDaily] = useState<DailyMetric[]>([]);
  const [engagement, setEngagement] = useState({ comments: 0, reactions: 0, communities: 0, contributors: 0 });
  const [selected, setSelected] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState("support");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) { window.location.href = "/login?next=%2Fadmin"; return; }
      const { data: me, error: roleError } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      if (roleError) throw roleError;
      if (me.role !== "admin") { setAuthorized(false); setChecking(false); return; }
      setAuthorized(true);
      const since = new Date(); since.setDate(since.getDate() - 13); since.setHours(0,0,0,0);
      const sinceIso = since.toISOString();
      const [members, posts, reports, cases, tickets, people, logs, recentMembers, recentPosts, recentComments, recentReactions, recentMemberships] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("moderation_cases").select("id", { count: "exact", head: true }).neq("status", "resolved"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "resolved"),
        supabase.from("profiles").select("id, username, display_name, role, is_suspended, created_at").order("created_at", { ascending: false }).limit(200),
        supabase.from("audit_logs").select("id, actor_id, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false }).limit(30),
        supabase.from("profiles").select("created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
        supabase.from("posts").select("author_id, created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
        supabase.from("comments").select("author_id, created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
        supabase.from("reactions").select("user_id, created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
        supabase.from("community_memberships").select("created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
      ]);
      for (const result of [members, posts, reports, cases, tickets, people, logs, recentMembers, recentPosts, recentComments, recentReactions, recentMemberships]) if (result.error) throw result.error;
      setStats({ members: members.count ?? 0, posts: posts.count ?? 0, reports: reports.count ?? 0, cases: cases.count ?? 0, tickets: tickets.count ?? 0 });
      setStaff((people.data ?? []) as Profile[]);
      setAudit((logs.data ?? []) as Audit[]);
      const days: DailyMetric[] = Array.from({ length: 14 }, (_, index) => { const date = new Date(since); date.setDate(since.getDate() + index); return { day: date.toISOString().slice(0,10), members: 0, posts: 0, comments: 0 }; });
      const byDay = new Map(days.map((item) => [item.day, item]));
      for (const row of recentMembers.data ?? []) { const day = byDay.get(row.created_at.slice(0,10)); if (day) day.members++; }
      for (const row of recentPosts.data ?? []) { const day = byDay.get(row.created_at.slice(0,10)); if (day) day.posts++; }
      for (const row of recentComments.data ?? []) { const day = byDay.get(row.created_at.slice(0,10)); if (day) day.comments++; }
      setDaily(days);
      const contributors = new Set<string>();
      for (const row of recentPosts.data ?? []) contributors.add(row.author_id);
      for (const row of recentComments.data ?? []) contributors.add(row.author_id);
      for (const row of recentReactions.data ?? []) contributors.add(row.user_id);
      setEngagement({ comments: recentComments.data?.length ?? 0, reactions: recentReactions.data?.length ?? 0, communities: recentMemberships.data?.length ?? 0, contributors: contributors.size });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load admin dashboard."); }
    finally { setLoading(false); setChecking(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveRole() {
    if (!selected || saving) return;
    if (reason.trim().length < 5) { setError("Enter a reason of at least 5 characters for the audit log."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("admin_set_role", { p_user: selected.id, p_role: newRole, p_reason: reason.trim() });
      if (rpcError) throw rpcError;
      setNotice(`Role updated for @${selected.username}. The change was recorded in the audit log.`);
      setReason(""); setSelected(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update role."); }
    finally { setSaving(false); }
  }

  async function toggleSuspension(person: Profile) {
    const suspend = !person.is_suspended;
    const explanation = window.prompt(`Reason to ${suspend ? "suspend" : "restore"} @${person.username} (minimum 5 characters):`);
    if (explanation === null) return;
    if (explanation.trim().length < 5) { setError("A reason of at least 5 characters is required."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("admin_set_suspended", { p_user: person.id, p_suspended: suspend, p_reason: explanation.trim() });
      if (rpcError) throw rpcError;
      setNotice(`@${person.username} was ${suspend ? "suspended" : "restored"}; the action was recorded.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not change account status."); }
    finally { setSaving(false); }
  }

  if (checking) return <main className="flex min-h-screen items-center justify-center gap-2 bg-[#f5f6fb] text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin"/> Checking administrator access…</main>;
  if (!authorized) return <main className="min-h-screen bg-[#f5f6fb] px-4 py-16 text-slate-900"><section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center"><ShieldCheck size={30} className="mx-auto text-indigo-600"/><h1 className="mt-3 text-2xl font-black">Administrator access required</h1><p className="mt-2 text-sm text-slate-500">This workspace is restricted to administrators.</p><Link href="/" className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">Back to Verity</Link></section></main>;

  const cards = [
    { label: "Members", value: stats.members, icon: Users, note: "Registered profiles" },
    { label: "Posts", value: stats.posts, icon: FileText, note: "All stored posts" },
    { label: "Reports", value: stats.reports, icon: ClipboardList, note: "Reports submitted" },
    { label: "Open moderation", value: stats.cases, icon: ShieldCheck, note: "Cases not resolved" },
    { label: "Open support", value: stats.tickets, icon: Activity, note: "Tickets not resolved" },
  ];

  return <main className="min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
    <header className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between border-b border-slate-200"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/> Back to Verity</Link><span className="text-lg font-black">Verity<span className="text-indigo-600">.</span></span></header>
    <section className="mx-auto max-w-7xl pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-indigo-600"><ShieldCheck size={19}/><span className="text-xs font-extrabold uppercase tracking-wider">Platform administration</span></div><h1 className="mt-2 text-3xl font-black tracking-tight">Admin dashboard</h1><p className="mt-2 text-sm text-slate-500">Platform overview, staff access and administrative audit history.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh data</button></div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({label,value,icon:Icon,note}) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><Icon size={17} className="text-indigo-600"/></div><p className="mt-3 text-3xl font-black tabular-nums">{value.toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">{note}</p></article>)}</div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><Activity size={18} className="text-indigo-600"/><h2 className="font-extrabold">Growth & engagement · 14 days</h2></div><p className="mt-1 text-xs text-slate-500">Daily registrations, posts and comments from stored timestamps.</p></div><span className="text-xs text-slate-400">Rolling 14-day window</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[["Contributing members",engagement.contributors],["Comments",engagement.comments],["Reactions",engagement.reactions],["Community joins",engagement.communities]].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{Number(value).toLocaleString()}</p></div>)}
        </div>
        <div className="mt-6 space-y-3">{daily.map((item) => { const max = Math.max(1,...daily.flatMap((d) => [d.members,d.posts,d.comments])); return <div key={item.day} className="grid grid-cols-[76px_1fr_1fr_1fr] items-center gap-2 text-xs"><span className="text-slate-500">{new Date(item.day+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:(item.members/max*100)+"%"}}/></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:(item.posts/max*100)+"%"}}/></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{width:(item.comments/max*100)+"%"}}/></div></div>; })}</div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500"/> Registrations</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Posts</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"/> Comments</span></div>
        <p className="mt-4 text-[11px] leading-5 text-slate-400">“Contributing members” means unique accounts with at least one post, comment or reaction in this period. It is not a daily-active-user or retention metric. Recent event queries are capped at 10,000 rows per source.</p>
      </section>
      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UserCog size={18} className="text-indigo-600"/><h2 className="font-extrabold">People & role management</h2></div><p className="mt-1 text-xs text-slate-500">Role changes use protected database functions and automatically create audit records.</p>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members by username or name" className="mt-4 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"/>
          <div className="mt-3 divide-y divide-slate-100">{staff.filter((person) => `${person.username} ${person.display_name}`.toLowerCase().includes(search.toLowerCase())).map((person) => <article key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{person.display_name} <span className="font-normal text-slate-400">@{person.username}</span></p><p className="mt-1 text-xs text-slate-500">{pretty(person.role)} · {person.is_suspended ? "Suspended" : "Active"} · Joined {new Date(person.created_at).toLocaleDateString()}</p></div><div className="flex items-center gap-2"><button onClick={() => {setSelected(person);setNewRole(person.role);setReason("");setError("");}} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50">Change role</button><button disabled={saving} onClick={() => void toggleSuspension(person)} className={`rounded-lg px-3 py-2 text-xs font-bold ${person.is_suspended ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"} disabled:opacity-50`}>{person.is_suspended ? <><CheckCircle2 size={13} className="mr-1 inline"/>Restore</> : <><Ban size={13} className="mr-1 inline"/>Suspend</>}</button></div></article>)}</div>
          {!staff.length && <p className="py-8 text-center text-sm text-slate-500">No staff accounts found.</p>}
          {selected && <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><div className="flex items-center justify-between"><h3 className="font-extrabold">Change role · @{selected.username}</h3><button onClick={() => setSelected(null)} className="text-xs font-bold text-slate-500">Cancel</button></div><label className="mt-3 block text-xs font-bold text-slate-600">New role<select value={newRole} onChange={(event) => setNewRole(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{roleOptions.map((role) => <option key={role} value={role}>{pretty(role)}</option>)}</select></label><label className="mt-3 block text-xs font-bold text-slate-600">Reason (required for audit)<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Explain why this role change is necessary."/></label><button disabled={saving || reason.trim().length < 5} onClick={() => void saveRole()} className="mt-3 min-h-10 rounded-lg bg-indigo-600 px-4 text-xs font-extrabold text-white disabled:opacity-50">{saving ? "Saving…" : "Save role change"}</button></div>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Activity size={18} className="text-indigo-600"/><h2 className="font-extrabold">Administrative audit log</h2></div><p className="mt-1 text-xs text-slate-500">Latest 30 recorded administrative actions. Read access is restricted to admins.</p><div className="mt-4 space-y-3">{audit.length ? audit.map((entry) => <article key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold text-slate-800">{pretty(entry.action)}</p><time className="text-[11px] text-slate-400">{fmt(entry.created_at)}</time></div><p className="mt-1 text-xs text-slate-500">{pretty(entry.entity_type)} · {entry.entity_id || "No entity ID"}</p>{Object.keys(entry.details ?? {}).length > 0 && <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] text-slate-600">{JSON.stringify(entry.details,null,2)}</pre>}</article>) : <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No audit entries available.</p>}</div></section>
      </div>
      <p className="mt-5 text-xs text-slate-400">Counts reflect stored database rows, not unique active users or verified platform outcomes. This dashboard does not run AI detection or fact-checking jobs.</p>
    </section>
  </main>;
}
