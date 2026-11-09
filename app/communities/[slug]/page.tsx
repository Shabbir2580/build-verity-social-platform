"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, MessageCircle, Users, ShieldCheck, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Community = { id: string; slug: string; name: string; description: string; topic: string; creator_id: string | null; created_at: string };
type Rule = { id: string; position: number; title: string; body: string };
type Post = { id: string; author_id: string; title: string | null; body: string; declared_category: string | null; created_at: string };
type Author = { id: string; username: string; display_name: string };

function ago(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return minutes < 1 ? "Just now" : minutes + "m ago";
  if (minutes < 1440) return Math.floor(minutes / 60) + "h ago";
  if (minutes < 10080) return Math.floor(minutes / 1440) + "d ago";
  return new Date(value).toLocaleDateString();
}

export default function CommunityDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = decodeURIComponent(params.slug);
  const [community, setCommunity] = useState<Community | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [members, setMembers] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      setUserId(auth.user?.id ?? null);
      const { data: communityData, error: communityError } = await supabase.from("communities")
        .select("id, slug, name, description, topic, creator_id, created_at").eq("slug", slug).maybeSingle();
      if (communityError) throw communityError;
      if (!communityData) { setCommunity(null); return; }
      const current = communityData as Community;
      setCommunity(current);

      const [ruleResult, memberResult, postResult, myMembership] = await Promise.all([
        supabase.from("community_rules").select("id, position, title, body").eq("community_id", current.id).order("position", { ascending: true }),
        supabase.from("community_memberships").select("user_id", { count: "exact", head: true }).eq("community_id", current.id),
        supabase.from("posts").select("id, author_id, title, body, declared_category, created_at").eq("community_id", current.id).eq("status", "published").order("created_at", { ascending: false }).limit(50),
        auth.user ? supabase.from("community_memberships").select("role").eq("community_id", current.id).eq("user_id", auth.user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (ruleResult.error) throw ruleResult.error;
      if (memberResult.error) throw memberResult.error;
      if (postResult.error) throw postResult.error;
      if (myMembership.error) throw myMembership.error;
      setRules((ruleResult.data ?? []) as Rule[]);
      setMembers(memberResult.count ?? 0);
      setRole(myMembership.data?.role ?? null);
      const postRows = (postResult.data ?? []) as Post[];
      setPosts(postRows);
      const ids = [...new Set(postRows.map((post) => post.author_id))];
      if (ids.length) {
        const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
        if (profileError) throw profileError;
        setAuthors(Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile as Author])));
      } else setAuthors({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this community.");
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);

  async function toggleMembership() {
    if (!community || working) return;
    if (!userId) { router.push("/login?next=" + encodeURIComponent("/communities/" + slug)); return; }
    if (role === "owner") return;

    setWorking(true);
    setError("");
    try {
      const supabase = createClient();
      const result = role
        ? await supabase.from("community_memberships").delete().eq("community_id", community.id).eq("user_id", userId)
        : await supabase.from("community_memberships").insert({ community_id: community.id, user_id: userId, role: "member" });

      if (result.error) throw result.error;
      setRole(role ? null : "member");
      setMembers((count) => Math.max(0, count + (role ? -1 : 1)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your community membership. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center gap-2 bg-[#f5f6fb] text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Loading community...</main>;
  if (!community) return <main className="min-h-screen bg-[#f5f6fb] px-5 py-16 text-center"><h1 className="text-2xl font-black">Community not found</h1><p className="mt-2 text-sm text-slate-500">This community may have been removed or the address is incorrect.</p><Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700"><ArrowLeft size={16} /> Back to Verity</Link></main>;

  return <main className="min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
    <header className="mx-auto flex min-h-[70px] max-w-5xl items-center justify-between border-b border-slate-200"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to feed</Link><Link href="/" className="text-lg font-black">Verity<span className="text-indigo-600">.</span></Link></header>
    <div className="mx-auto grid max-w-5xl gap-6 pt-7 lg:grid-cols-[minmax(0,1fr)_290px]">
      <section className="min-w-0">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">{community.topic}</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{community.name}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{community.description || "A place for thoughtful discussion and shared learning."}</p></div><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-500 text-white"><Users size={25}/></div></div>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1.5"><Users size={15}/> {members} members</span><span>Created {new Date(community.created_at).toLocaleDateString()}</span></div>
          <button type="button" onClick={() => void toggleMembership()} disabled={working || role === "owner"} className={`mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50 ${role ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{working ? <LoaderCircle size={16} className="animate-spin"/> : role === "owner" ? <ShieldCheck size={16}/> : <Users size={16}/>} {role === "owner" ? "Community owner" : role ? "Leave community" : "Join community"}</button>
          {error && <p role="alert" className="mt-4 break-words rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        </div>
        <div className="mt-6 flex items-center justify-between"><div><h2 className="text-xl font-black">Community discussions</h2><p className="mt-1 text-xs text-slate-500">Latest published posts in this community</p></div><Link href="/" className="text-xs font-bold text-indigo-700">Create a post</Link></div>
        <div className="mt-4 space-y-3">{posts.length ? posts.map((post) => { const author = authors[post.author_id]; return <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>{author ? <Link href={"/u/" + encodeURIComponent(author.username)} className="font-bold text-slate-600 hover:text-indigo-700">{author.display_name || "Verity member"}</Link> : "Verity member"}</span><time>{ago(post.created_at)}</time></div>{post.title && <h3 className="mt-3 text-base font-extrabold">{post.title}</h3>}<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{post.body}</p>{post.declared_category && <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{post.declared_category.replaceAll("_"," ")}</span>}</article>; }) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><MessageCircle className="mx-auto text-slate-300" size={30}/><h3 className="mt-3 font-bold">No discussions yet</h3><p className="mt-1 text-sm text-slate-500">Be the first to start a conversation.</p></div>}</div>
      </section>
      <aside className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold">About this community</h2><p className="mt-2 text-sm leading-6 text-slate-500">A community for members to share ideas, ask questions and discuss the topic thoughtfully.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold">Community rules</h2>{rules.length ? <ol className="mt-3 space-y-3">{rules.map((rule,index)=><li key={rule.id} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">{index+1}</span><span><span className="block text-sm font-bold">{rule.title}</span>{rule.body && <span className="mt-1 block text-xs leading-5 text-slate-500">{rule.body}</span>}</span></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">No rules have been published yet.</p>}</div></aside>
    </div>
  </main>;
}
