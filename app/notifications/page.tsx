"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, Check, CheckCheck, CircleHelp, FileText, Headphones, LoaderCircle, MessageCircle, ShieldCheck, Users, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  actor_id: string | null;
  type: "follow" | "comment" | "reply" | "mention" | "community" | "answer" | "support" | "appeal" | "moderation" | "review";
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  actor?: { username: string; display_name: string } | null;
};

const icons = {
  follow: UserPlus, comment: MessageCircle, reply: MessageCircle, mention: Bell,
  community: Users, answer: CircleHelp, support: Headphones, appeal: ShieldCheck,
  moderation: ShieldCheck, review: FileText,
} as const;

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m ago";
  if (minutes < 1440) return Math.floor(minutes / 60) + "h ago";
  if (minutes < 10080) return Math.floor(minutes / 1440) + "d ago";
  return new Date(value).toLocaleDateString();
}

export default function NotificationsPage() {
  const [rows, setRows] = useState<Notification[]>([]);
  const rowsRef = useRef<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const load = useCallback(async (silent = false, append = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        window.location.href = "/login?next=%2Fnotifications";
        return;
      }
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        window.location.href = "/login?next=%2Fnotifications";
        return;
      }
      setUserId(auth.user.id);
      const offset = append ? rowsRef.current.length : 0;
      const { data, error: queryError } = await supabase.from("notifications")
        .select("id, actor_id, type, message, link, read_at, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false }).range(offset, offset + 99);
      if (queryError) throw queryError;
      const items = (data ?? []) as Notification[];
      setHasMore(items.length === 100);
      const actorIds = [...new Set(items.map((item) => item.actor_id).filter((id): id is string => Boolean(id)))];
      if (actorIds.length) {
        const { data: actors, error: actorError } = await supabase.from("profiles")
          .select("id, username, display_name").in("id", actorIds);
        if (actorError) throw actorError;
        const actorMap = new Map((actors ?? []).map((actor) => [actor.id, actor]));
        const hydrated = items.map((item) => ({ ...item, actor: item.actor_id ? actorMap.get(item.actor_id) ?? null : null }));
        setRows((current) => append
          ? [...current, ...hydrated.filter((item) => !current.some((existing) => existing.id === item.id))]
          : silent ? [...hydrated, ...current.filter((item) => !hydrated.some((fresh) => fresh.id === item.id))] : hydrated);
      } else {
        setRows((current) => append
          ? [...current, ...items.filter((item) => !current.some((existing) => existing.id === item.id))]
          : silent ? [...items, ...current.filter((item) => !items.some((fresh) => fresh.id === item.id))] : items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let active = true;
    const channel = supabase.channel(`notification-list-${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, () => {
        if (active) void load(true);
      })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try { await load(true, true); }
    finally { setLoadingMore(false); }
  }

  async function markRead(id: string) {
    if (!userId) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from("notifications")
      .update({ read_at: now }).eq("id", id).eq("user_id", userId).is("read_at", null);
    if (updateError) { setError(updateError.message); return; }
    setRows((current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
  }

  async function markAllRead() {
    if (!userId || busy) return;
    setBusy(true);
    setError("");
    const now = new Date().toISOString();
    const supabase = createClient();
    const { error: updateError } = await supabase.from("notifications")
      .update({ read_at: now }).eq("user_id", userId).is("read_at", null);
    if (updateError) setError(updateError.message);
    else setRows((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    setBusy(false);
  }

  const unread = rows.filter((item) => !item.read_at).length;
  const visible = filter === "unread" ? rows.filter((item) => !item.read_at) : rows;

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-3xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to feed</Link>
        <Link href="/" className="text-lg font-black tracking-tight">Verity<span className="text-indigo-600">.</span></Link>
      </header>
      <section className="mx-auto max-w-3xl pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="flex items-center gap-2 text-indigo-600"><Bell size={19} /><span className="text-xs font-extrabold uppercase tracking-wider">Your activity</span></div><h1 className="mt-2 text-3xl font-black tracking-tight">Notifications</h1><p className="mt-2 text-sm text-slate-500">{unread} unread in the notifications loaded so far</p></div>
          <button type="button" onClick={() => void markAllRead()} disabled={busy || unread === 0} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-40">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCheck size={15} />} Mark all read</button>
        </div>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => setFilter("all")} className={`rounded-full px-4 py-2 text-xs font-bold ${filter === "all" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>All activity</button>
          <button type="button" onClick={() => setFilter("unread")} className={`rounded-full px-4 py-2 text-xs font-bold ${filter === "unread" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Unread ({unread})</button>
        </div>
        {error && <div role="alert" className="mt-5 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
        {loading ? <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Loading notifications...</div>
        : visible.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Bell className="mx-auto text-slate-300" size={34} /><h2 className="mt-3 font-extrabold">{filter === "unread" ? "You're all caught up" : "No notifications yet"}</h2><p className="mt-1 text-sm text-slate-500">New follows, replies and community activity will appear here.</p></div>
        : <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{visible.map((item) => {
          const Icon = icons[item.type] ?? Bell;
          const safeLink = item.link?.startsWith("/") && !item.link.startsWith("//") ? item.link : null;
          const content = <><span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.read_at ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-700"}`}><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm leading-6 text-slate-800">{item.message}</span><span className="mt-1 block text-xs text-slate-400">{item.actor ? `@${item.actor.username} · ` : ""}{timeAgo(item.created_at)}</span></span>{!item.read_at && <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-indigo-600" aria-label="Unread" />}</>;
          return <div key={item.id} className={`flex items-start gap-3 border-b border-slate-100 p-4 last:border-0 sm:p-5 ${item.read_at ? "" : "bg-indigo-50/35"}`}>
            {safeLink ? <Link href={safeLink} onClick={() => { if (!item.read_at) void markRead(item.id); }} className="flex min-w-0 flex-1 items-start gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{content}</Link> : <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>}
            {!item.read_at && <button type="button" onClick={() => void markRead(item.id)} className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-indigo-700" aria-label="Mark notification as read" title="Mark as read"><Check size={16} /></button>}
          </div>;
        })}</div>}
        {hasMore && <div className="mt-5 flex justify-center"><button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50">{loadingMore && <LoaderCircle size={15} className="animate-spin" />}{loadingMore ? "Loading older notifications..." : "Load older notifications"}</button></div>}
        <p className="mt-5 text-center text-xs text-slate-400">Notifications respect your account&apos;s notification preferences.</p>
      </section>
    </main>
  );
}
