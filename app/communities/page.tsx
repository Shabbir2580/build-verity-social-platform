"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Search, Users, LoaderCircle, Compass } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  topic: string | null;
};

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [membershipRoles, setMembershipRoles] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      let currentUserId: string | null = null;
      if (sessionData.session) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        currentUserId = authData.user?.id ?? null;
      }
      setUserId(currentUserId);

      const { data, error: communityError } = await supabase
        .from("communities")
        .select("id, slug, name, description, topic")
        .order("name", { ascending: true })
        .limit(100);
      if (communityError) throw communityError;
      setCommunities((data ?? []) as Community[]);

      if (currentUserId) {
        const { data: memberships, error: membershipError } = await supabase
          .from("community_memberships")
          .select("community_id, role")
          .eq("user_id", currentUserId);
        if (membershipError) throw membershipError;
        const roles: Record<string, string> = {};
        for (const row of memberships ?? []) roles[row.community_id] = row.role;
        setMembershipRoles(roles);
      } else {
        setMembershipRoles({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Communities could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return communities;
    return communities.filter((community) =>
      [community.name, community.description ?? "", community.topic ?? "", community.slug]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [communities, search]);

  async function toggleMembership(community: Community) {
    if (busyId) return;
    if (!userId) {
      router.push("/login?next=%2Fcommunities");
      return;
    }
    const currentRole = membershipRoles[community.id];
    if (currentRole === "owner") {
      setNotice("Community owners cannot leave their own community.");
      return;
    }

    setBusyId(community.id);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const result = currentRole
        ? await supabase.from("community_memberships").delete().eq("community_id", community.id).eq("user_id", userId)
        : await supabase.from("community_memberships").insert({ community_id: community.id, user_id: userId, role: "member" });
      if (result.error) {
        if (result.error.code === "23505") throw new Error("You have already joined this community. Refresh the page and try again.");
        throw result.error;
      }
      setMembershipRoles((current) => {
        const next = { ...current };
        if (currentRole) delete next[community.id];
        else next[community.id] = "member";
        return next;
      });
      setNotice(currentRole ? "You left the community." : "You joined the community.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your membership could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="verity-workspace min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={16}/> Back to Verity</Link>
        <span className="text-lg font-black">Verity<span className="text-indigo-600">.</span></span>
      </header>
      <section className="mx-auto max-w-6xl pt-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600"><Compass size={18}/><span className="text-xs font-extrabold uppercase tracking-[0.18em]">Discover communities</span></div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Find your people.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Explore discussions around shared interests, join a community and take part in thoughtful conversations.</p>
          </div>
          <Link href="/login?next=%2Fcommunities" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-indigo-200">Sign in to join <ArrowRight size={15}/></Link>
        </div>

        <label className="mt-7 flex min-h-12 max-w-xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
          <Search size={17} className="shrink-0 text-slate-400"/>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search communities by name or topic" aria-label="Search communities" className="w-full bg-transparent text-sm outline-none"/>
        </label>

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        {loading ? (
          <div className="mt-8 flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin"/> Loading communities…</div>
        ) : filtered.length ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((community, index) => {
              const role = membershipRoles[community.id];
              const isBusy = busyId === community.id;
              return (
                <article key={community.id} className="verity-community-card flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${index % 3 === 0 ? "bg-gradient-to-br from-indigo-600 to-violet-500" : index % 3 === 1 ? "bg-gradient-to-br from-cyan-600 to-teal-500" : "bg-gradient-to-br from-rose-600 to-orange-500"}`}><Users size={20}/></div>
                  <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wide text-indigo-600">{community.topic || "Community"}</p>
                  <h2 className="mt-1 text-lg font-extrabold"><Link href={`/communities/${encodeURIComponent(community.slug)}`} className="hover:text-indigo-700">{community.name}</Link></h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{community.description || "Join the discussion and share ideas with this community."}</p>
                  <Link href={`/communities/${encodeURIComponent(community.slug)}`} className="mt-4 inline-flex min-h-9 items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900">Explore community <ArrowRight size={13}/></Link>
                  <button type="button" onClick={() => void toggleMembership(community)} disabled={isBusy || role === "owner"} className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${role ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
                    {isBusy ? <LoaderCircle size={15} className="animate-spin"/> : null}
                    {role === "owner" ? "Community owner" : role ? "Leave community" : "Join community"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Users size={30} className="mx-auto text-slate-300"/>
            <h2 className="mt-3 font-extrabold">{search.trim() ? "No matching communities" : "No communities yet"}</h2>
            <p className="mt-1 text-sm text-slate-500">{search.trim() ? "Try another name or topic." : "Communities will appear here when they are created."}</p>
          </div>
        )}
      </section>
    </main>
  );
}
