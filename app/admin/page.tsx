"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowLeft, Ban, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, LoaderCircle, RefreshCw, ShieldCheck, Users, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string; display_name: string; role: string; is_suspended: boolean; created_at: string };
type Audit = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown>; created_at: string };
type Stats = { members: number; posts: number; reports: number; cases: number; tickets: number };
type DailyMetric = { day: string; members: number; posts: number; comments: number };
type ManagedPost = { id: string; author_id: string; title: string | null; body: string; status: string; removal_reason: string | null; created_at: string; edited_at: string | null; author_name: string; author_username: string };

const roleOptions = ["user", "support", "moderator", "admin"];
const fmt = (value: string) => { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—"; };
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({ members: 0, posts: 0, reports: 0, cases: 0, tickets: 0 });
  const [staff, setStaff] = useState<Profile[]>([]);
  const [peopleTotal, setPeopleTotal] = useState(0);
  const [peoplePage, setPeoplePage] = useState(0);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [daily, setDaily] = useState<DailyMetric[]>([]);
  const [engagement, setEngagement] = useState({ comments: 0, reactions: 0, communities: 0, contributors: 0 });
  const [selected, setSelected] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState("support");
  const [reason, setReason] = useState("");
  const [suspensionTarget, setSuspensionTarget] = useState<Profile | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [search, setSearch] = useState("");
  const [peopleRoleFilter, setPeopleRoleFilter] = useState("all");
  const [peopleStatusFilter, setPeopleStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [managedPosts, setManagedPosts] = useState<ManagedPost[]>([]);
  const [postTotal, setPostTotal] = useState(0);
  const [postPage, setPostPage] = useState(0);
  const [postSearch, setPostSearch] = useState("");
  const [postStatus, setPostStatus] = useState("all");
  const [postsLoading, setPostsLoading] = useState(false);
  const [postActionTarget, setPostActionTarget] = useState<ManagedPost | null>(null);
  const [postAction, setPostAction] = useState<"remove_post" | "restrict_post" | "restore_post">("remove_post");
  const [postActionReason, setPostActionReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      // Check for a session before getUser(): anonymous visitors can otherwise
      // surface an AuthSessionMissingError instead of reaching the login page.
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) { window.location.href = "/login?next=%2Fadmin"; return; }
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) { window.location.href = "/login?next=%2Fadmin"; return; }
      const { data: me, error: roleError } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      if (roleError) throw roleError;
      if (me.role !== "admin") { setAuthorized(false); setChecking(false); return; }
      setAuthorized(true);
      const since = new Date(); since.setDate(since.getDate() - 13); since.setHours(0,0,0,0);
      const sinceIso = since.toISOString();
      let peopleQuery = supabase.from("profiles")
        .select("id, username, display_name, role, is_suspended, created_at", { count: "exact" });
      const peopleTerm = search.trim().replace(/[^a-zA-Z0-9 -]/g, "").slice(0, 60);
      if (peopleTerm) {
        peopleQuery = peopleQuery.or(`username.ilike.%${peopleTerm}%,display_name.ilike.%${peopleTerm}%`);
      }
      if (peopleRoleFilter !== "all") peopleQuery = peopleQuery.eq("role", peopleRoleFilter);
      if (peopleStatusFilter !== "all") peopleQuery = peopleQuery.eq("is_suspended", peopleStatusFilter === "suspended");
      const [members, posts, reports, cases, tickets, people, logs, recentMembers, recentPosts, recentComments, recentReactions, recentMemberships] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("moderation_cases").select("id", { count: "exact", head: true }).neq("status", "resolved"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "resolved"),
        peopleQuery.order("created_at", { ascending: false }).range(peoplePage * 50, peoplePage * 50 + 49),
        supabase.from("audit_logs").select("id, actor_id, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false }).limit(30),
        supabase.from("profiles").select("created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
        supabase.from("posts").select("author_id, created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
        supabase.from("comments").select("author_id, created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
        supabase.from("reactions").select("user_id, created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
        supabase.from("community_memberships").select("created_at").gte("created_at", sinceIso).order("created_at").limit(10000),
      ]);
      if (members.error) throw members.error;
      if (posts.error) throw posts.error;
      if (reports.error) throw reports.error;
      if (cases.error) throw cases.error;
      if (tickets.error) throw tickets.error;
      if (people.error) throw people.error;
      if (logs.error) throw logs.error;
      if (recentMembers.error) throw recentMembers.error;
      if (recentPosts.error) throw recentPosts.error;
      if (recentComments.error) throw recentComments.error;
      if (recentReactions.error) throw recentReactions.error;
      if (recentMemberships.error) throw recentMemberships.error;
      setStats({ members: members.count ?? 0, posts: posts.count ?? 0, reports: reports.count ?? 0, cases: cases.count ?? 0, tickets: tickets.count ?? 0 });
      setStaff((people.data ?? []) as Profile[]);
      setPeopleTotal(people.count ?? 0);
      setAudit((logs.data ?? []) as Audit[]);
      const days: DailyMetric[] = Array.from({ length: 14 }, (_, index) => { const date = new Date(since); date.setDate(since.getDate() + index); return { day: date.toISOString().slice(0,10), members: 0, posts: 0, comments: 0 }; });
      const byDay = new Map(days.map((item) => [item.day, item]));
      for (const row of recentMembers?.data ?? []) { const day = byDay.get(row.created_at.slice(0,10)); if (day) day.members++; }
      for (const row of recentPosts?.data ?? []) { const day = byDay.get(row.created_at.slice(0,10)); if (day) day.posts++; }
      for (const row of recentComments?.data ?? []) { const day = byDay.get(row.created_at.slice(0,10)); if (day) day.comments++; }
      setDaily(days);
      const contributors = new Set<string>();
      for (const row of recentPosts?.data ?? []) contributors.add(row.author_id);
      for (const row of recentComments?.data ?? []) contributors.add(row.author_id);
      for (const row of recentReactions?.data ?? []) contributors.add(row.user_id);
      setEngagement({ comments: recentComments?.data?.length ?? 0, reactions: recentReactions?.data?.length ?? 0, communities: recentMemberships?.data?.length ?? 0, contributors: contributors.size });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load admin dashboard."); }
    finally { setLoading(false); setChecking(false); }
  }, [peoplePage, search, peopleRoleFilter, peopleStatusFilter]);

  const loadManagedPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from("posts")
        .select("id, author_id, title, body, status, removal_reason, created_at, edited_at", { count: "exact" })
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(postPage * 20, postPage * 20 + 19);
      if (postStatus !== "all") query = query.eq("status", postStatus);
      if (postSearch.trim()) query = query.textSearch("search", postSearch.trim(), { type: "websearch" });
      const { data, count, error: postsError } = await query;
      if (postsError) throw postsError;
      const rows = data ?? [];
      const authorIds = [...new Set(rows.map((row) => row.author_id))];
      const { data: profiles, error: profilesError } = authorIds.length
        ? await supabase.from("profiles").select("id, username, display_name").in("id", authorIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      setManagedPosts(rows.map((row) => {
        const author = byId.get(row.author_id);
        return { ...row, author_name: author?.display_name ?? "Unknown member", author_username: author?.username ?? "unknown" };
      }));
      setPostTotal(count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load posts.");
    } finally {
      setPostsLoading(false);
    }
  }, [postPage, postSearch, postStatus]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (authorized) void loadManagedPosts(); }, [authorized, loadManagedPosts]);

  async function applyPostAction() {
    if (!postActionTarget || saving) return;
    if (postActionReason.trim().length < 5) {
      setError("Enter a reason of at least 5 characters.");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("admin_manage_post", {
        p_post_id: postActionTarget.id,
        p_action: postAction,
        p_reason: postActionReason.trim(),
      });
      if (rpcError) throw rpcError;
      setNotice(`Post action completed for “${postActionTarget.title || postActionTarget.body.slice(0, 70)}”. The decision and reason were added to moderation and audit history.`);
      setPostActionTarget(null); setPostActionReason("");
      await Promise.all([load(), loadManagedPosts()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update post.");
    } finally {
      setSaving(false);
    }
  }

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

  async function toggleSuspension() {
    if (!suspensionTarget || saving) return;
    const person = suspensionTarget;
    const suspend = !person.is_suspended;
    if (suspensionReason.trim().length < 5) { setError("A reason of at least 5 characters is required."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("admin_set_suspended", { p_user: person.id, p_suspended: suspend, p_reason: suspensionReason.trim() });
      if (rpcError) throw rpcError;
      setNotice(`@${person.username} was ${suspend ? "suspended" : "restored"}; the action was recorded.`);
      setSuspensionTarget(null); setSuspensionReason("");
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
      <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-indigo-600"><ShieldCheck size={19}/><span className="text-xs font-extrabold uppercase tracking-wider">Platform administration</span></div><h1 className="mt-2 text-3xl font-black tracking-tight">Admin dashboard</h1><p className="mt-2 text-sm text-slate-500">Platform overview, staff access and administrative audit history.</p></div><div className="flex flex-wrap items-center gap-2"><Link href="/moderation" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700"><ShieldCheck size={15}/> Open moderation</Link><Link href="/support/staff" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-indigo-200"><ClipboardList size={15}/> Support desk</Link><button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh data</button></div></div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({label,value,icon:Icon,note}) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><Icon size={17} className="text-indigo-600"/></div><p className="mt-3 text-3xl font-black tabular-nums">{value.toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">{note}</p></article>)}</div>
      <section aria-labelledby="admin-shortcuts-title" className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">Workspace</p><h2 id="admin-shortcuts-title" className="mt-1 text-lg font-black tracking-tight">Admin quick actions</h2><p className="mt-1 text-xs text-slate-500">Jump straight to the areas that need attention.</p></div>
          <span className="text-xs font-semibold text-slate-400">Administrator tools</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Link href="/moderation" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><ShieldCheck size={20}/></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-900">Moderation queue</span><span className="mt-1 block text-xs text-slate-500">{stats.cases.toLocaleString()} open cases · Review reports and appeals</span></span><ChevronRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600"/>
          </Link>
          <Link href="/support/staff" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white"><ClipboardList size={20}/></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-900">Support desk</span><span className="mt-1 block text-xs text-slate-500">{stats.tickets.toLocaleString()} open tickets · Handle member requests</span></span><ChevronRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-600"/>
          </Link>
          <a href="#post-management" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white"><FileText size={20}/></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-900">Manage posts</span><span className="mt-1 block text-xs text-slate-500">Search, restrict, remove or restore content</span></span><ChevronRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-amber-600"/>
          </a>
          <a href="#people-management" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Users size={20}/></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-900">Manage members</span><span className="mt-1 block text-xs text-slate-500">Assign staff roles and manage account status</span></span><ChevronRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600"/>
          </a>
          <a href="#audit-history" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white"><Activity size={20}/></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-900">Audit history</span><span className="mt-1 block text-xs text-slate-500">Inspect recorded administrative actions</span></span><ChevronRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-violet-600"/>
          </a>
          <Link href="/verify" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white"><ShieldCheck size={20}/></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-900">Trust Center</span><span className="mt-1 block text-xs text-slate-500">Review media checks and evidence context</span></span><ChevronRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-rose-600"/>
          </Link>
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><Activity size={18} className="text-indigo-600"/><h2 className="font-extrabold">Growth & engagement · 14 days</h2></div><p className="mt-1 text-xs text-slate-500">Daily registrations, posts and comments from stored timestamps.</p></div><span className="text-xs text-slate-400">Rolling 14-day window</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[["Contributing members",engagement.contributors],["Comments",engagement.comments],["Reactions",engagement.reactions],["Community joins",engagement.communities]].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{Number(value).toLocaleString()}</p></div>)}
        </div>
        <div className="mt-6 space-y-3">{daily.map((item) => { const max = Math.max(1,...daily.flatMap((d) => [d.members,d.posts,d.comments])); return <div key={item.day} className="grid grid-cols-[76px_1fr_1fr_1fr] items-center gap-2 text-xs"><span className="text-slate-500">{new Date(item.day+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:(item.members/max*100)+"%"}}/></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:(item.posts/max*100)+"%"}}/></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{width:(item.comments/max*100)+"%"}}/></div></div>; })}</div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500"/> Registrations</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Posts</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"/> Comments</span></div>
        <p className="mt-4 text-[11px] leading-5 text-slate-400">“Contributing members” means unique accounts with at least one post, comment or reaction in this period. It is not a daily-active-user or retention metric. Recent event queries are capped at 10,000 rows per source.</p>
      </section>
      <section id="post-management" className="mt-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="flex items-center gap-2"><FileText size={18} className="text-indigo-600"/><h2 className="font-extrabold">Post management</h2></div><p className="mt-1 text-xs text-slate-500">Search posts, inspect their status and take audited moderation actions. Posts are never permanently deleted here.</p></div>
          <button onClick={() => void loadManagedPosts()} disabled={postsLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw size={13} className={postsLoading ? "animate-spin" : ""}/> Refresh posts</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
          <input value={postSearch} onChange={(event) => { setPostSearch(event.target.value); setPostPage(0); }} placeholder="Search post title and content" className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"/>
          <select value={postStatus} onChange={(event) => { setPostStatus(event.target.value); setPostPage(0); }} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All statuses</option><option value="published">Published</option><option value="restricted">Restricted</option><option value="removed">Removed</option></select>
        </div>
        <div className="mt-3 divide-y divide-slate-100">
          {managedPosts.map((post) => <article key={post.id} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold">{post.title || post.body.slice(0, 100) || "Untitled post"}</p><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${post.status === "published" ? "bg-emerald-50 text-emerald-700" : post.status === "restricted" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{post.status}</span></div>
                <p className="mt-1 line-clamp-2 break-words text-xs text-slate-600">{post.body}</p>
                <p className="mt-2 text-[11px] text-slate-400">By {post.author_name} (@{post.author_username}) · {fmt(post.created_at)} · ID {post.id.slice(0, 8)}</p>
                {post.removal_reason && <p className="mt-1 text-xs text-slate-500">Moderation reason: {post.removal_reason}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {post.status !== "removed" && <button onClick={() => { setPostActionTarget(post); setPostAction("remove_post"); setPostActionReason(""); setError(""); }} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">Remove</button>}
                {post.status === "published" && <button onClick={() => { setPostActionTarget(post); setPostAction("restrict_post"); setPostActionReason(""); setError(""); }} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100">Restrict</button>}
                {post.status !== "published" && <button onClick={() => { setPostActionTarget(post); setPostAction("restore_post"); setPostActionReason(""); setError(""); }} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Restore</button>}
              </div>
            </div>
          </article>)}
          {!managedPosts.length && <p className="py-8 text-center text-sm text-slate-500">{postsLoading ? "Loading posts…" : "No posts match these filters."}</p>}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">{postTotal.toLocaleString()} matching posts · Page {postPage + 1} of {Math.max(1, Math.ceil(postTotal / 20))}</p><div className="flex gap-2"><button disabled={postPage === 0 || postsLoading} onClick={() => setPostPage((page) => Math.max(0, page - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Previous</button><button disabled={(postPage + 1) * 20 >= postTotal || postsLoading} onClick={() => setPostPage((page) => page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Next</button></div></div>
      </section>
      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section id="people-management" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UserCog size={18} className="text-indigo-600"/><h2 className="font-extrabold">People & role management</h2></div><p className="mt-1 text-xs text-slate-500">Browse all {peopleTotal.toLocaleString()} profiles · 50 per page. Role changes use protected database functions and automatically create audit records.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPeoplePage(0); }} placeholder="Search all members by username or name" className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400"/>
            <select value={peopleRoleFilter} onChange={(event) => { setPeopleRoleFilter(event.target.value); setPeoplePage(0); }} aria-label="Filter members by role" className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="all">All roles</option>
              {roleOptions.map((role) => <option key={role} value={role}>{pretty(role)}</option>)}
            </select>
            <select value={peopleStatusFilter} onChange={(event) => { setPeopleStatusFilter(event.target.value); setPeoplePage(0); }} aria-label="Filter members by account status" className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="mt-3 divide-y divide-slate-100">{staff.map((person) => <article key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{person.display_name} <span className="font-normal text-slate-400">@{person.username}</span></p><p className="mt-1 text-xs text-slate-500">{pretty(person.role)} · {person.is_suspended ? "Suspended" : "Active"} · Joined {new Date(person.created_at).toLocaleDateString()}</p></div><div className="flex items-center gap-2"><button onClick={() => {setSelected(person);setNewRole(person.role);setReason("");setError("");}} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50">Change role</button><button disabled={saving} onClick={() => { setSuspensionTarget(person); setSuspensionReason(""); setError(""); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${person.is_suspended ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"} disabled:opacity-50`}>{person.is_suspended ? <><CheckCircle2 size={13} className="mr-1 inline"/>Restore</> : <><Ban size={13} className="mr-1 inline"/>Suspend</>}</button></div></article>)}</div>
          {!staff.length && <p className="py-8 text-center text-sm text-slate-500">No profiles on this page.</p>}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Page {peoplePage + 1} of {Math.max(1, Math.ceil(peopleTotal / 50))} · Showing {peopleTotal ? peoplePage * 50 + 1 : 0}–{Math.min((peoplePage + 1) * 50, peopleTotal)} of {peopleTotal.toLocaleString()}</p><div className="flex gap-2"><button disabled={peoplePage === 0 || loading} onClick={() => setPeoplePage((page) => Math.max(0, page - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"><ChevronLeft size={14}/> Previous</button><button disabled={(peoplePage + 1) * 50 >= peopleTotal || loading} onClick={() => setPeoplePage((page) => page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Next <ChevronRight size={14}/></button></div></div>
          {selected && <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"><div className="flex items-center justify-between"><h3 className="font-extrabold">Change role · @{selected.username}</h3><button onClick={() => setSelected(null)} className="text-xs font-bold text-slate-500">Cancel</button></div><label className="mt-3 block text-xs font-bold text-slate-600">New role<select value={newRole} onChange={(event) => setNewRole(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{roleOptions.map((role) => <option key={role} value={role}>{pretty(role)}</option>)}</select></label><label className="mt-3 block text-xs font-bold text-slate-600">Reason (required for audit)<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Explain why this role change is necessary."/></label><button disabled={saving || reason.trim().length < 5} onClick={() => void saveRole()} className="mt-3 min-h-10 rounded-lg bg-indigo-600 px-4 text-xs font-extrabold text-white disabled:opacity-50">{saving ? "Saving…" : "Save role change"}</button></div>}
        </section>
        <section id="audit-history" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Activity size={18} className="text-indigo-600"/><h2 className="font-extrabold">Administrative audit log</h2></div><p className="mt-1 text-xs text-slate-500">Latest 30 recorded administrative actions. Read access is restricted to admins.</p><div className="mt-4 space-y-3">{audit.length ? audit.map((entry) => <article key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold text-slate-800">{pretty(entry.action)}</p><time className="text-[11px] text-slate-400">{fmt(entry.created_at)}</time></div><p className="mt-1 text-xs text-slate-500">{pretty(entry.entity_type)} · {entry.entity_id || "No entity ID"}</p>{Object.keys(entry.details ?? {}).length > 0 && <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] text-slate-600">{JSON.stringify(entry.details,null,2)}</pre>}</article>) : <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No audit entries available.</p>}</div></section>
      </div>
      {postActionTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setPostActionTarget(null); }}><section role="dialog" aria-modal="true" aria-labelledby="post-action-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 id="post-action-title" className="text-lg font-black">{postAction === "remove_post" ? "Remove post" : postAction === "restrict_post" ? "Restrict post" : "Restore post"}</h2><p className="mt-1 text-sm text-slate-500">Post by @{postActionTarget.author_username}. This is a reversible status change, not a permanent delete. The action, reason and previous state will be recorded.</p><label className="mt-4 block text-xs font-bold text-slate-600">Reason (minimum 5 characters)<textarea autoFocus value={postActionReason} onChange={(event) => setPostActionReason(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="Explain the moderation decision."/></label><div className="mt-4 flex justify-end gap-2"><button disabled={saving} onClick={() => setPostActionTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50">Cancel</button><button disabled={saving || postActionReason.trim().length < 5} onClick={() => void applyPostAction()} className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${postAction === "restore_post" ? "bg-emerald-600" : postAction === "restrict_post" ? "bg-amber-600" : "bg-rose-600"}`}>{saving ? "Saving…" : "Confirm action"}</button></div></section></div>}
      {suspensionTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSuspensionTarget(null); }}><section role="dialog" aria-modal="true" aria-labelledby="suspension-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 id="suspension-title" className="text-lg font-black">{suspensionTarget.is_suspended ? "Restore account" : "Suspend account"}</h2><p className="mt-1 text-sm text-slate-500">Account: @{suspensionTarget.username}. This action will be written to the administrative audit log.</p><label className="mt-4 block text-xs font-bold text-slate-600">Reason (minimum 5 characters)<textarea autoFocus value={suspensionReason} onChange={(event) => setSuspensionReason(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" placeholder="Explain the reason for this account action."/></label><div className="mt-4 flex justify-end gap-2"><button disabled={saving} onClick={() => setSuspensionTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50">Cancel</button><button disabled={saving || suspensionReason.trim().length < 5} onClick={() => void toggleSuspension()} className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${suspensionTarget.is_suspended ? "bg-emerald-600" : "bg-rose-600"}`}>{saving ? "Saving…" : suspensionTarget.is_suspended ? "Restore account" : "Suspend account"}</button></div></section></div>}
      <p className="mt-5 text-xs text-slate-400">Counts reflect stored database rows, not unique active users or verified platform outcomes. This dashboard does not run AI detection or fact-checking jobs.</p>
    </section>
  </main>;
}
