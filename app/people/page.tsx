"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, RefreshCw, Search, Sparkles, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Member = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  interests: string[] | null;
  created_at: string;
};

type Suggestion = Member & { sharedInterests: string[] };

export default function PeoplePage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const viewer = authData.user;
      if (!viewer) {
        setSignedIn(false);
        setSuggestions([]);
        setMyInterests([]);
        return;
      }
      setSignedIn(true);

      const [
        { data: ownProfile, error: ownProfileError },
        { data: follows, error: followsError },
        { data: blocks, error: blocksError },
        { data: members, error: membersError },
      ] = await Promise.all([
        supabase.from("profiles").select("interests").eq("id", viewer.id).maybeSingle(),
        supabase.from("follows").select("following_id").eq("follower_id", viewer.id),
        supabase.from("blocks").select("blocked_id").eq("blocker_id", viewer.id),
        supabase.from("profiles").select("id, username, display_name, bio, avatar_url, interests, created_at")
          .neq("id", viewer.id).order("created_at", { ascending: false }).limit(100),
      ]);
      if (ownProfileError) throw ownProfileError;
      if (followsError) throw followsError;
      if (blocksError) throw blocksError;
      if (membersError) throw membersError;

      const interests = ((ownProfile?.interests ?? []) as unknown[]).filter((item: unknown): item is string => typeof item === "string" && Boolean(item.trim()));
      setMyInterests(interests);
      const excluded = new Set([
        ...(follows ?? []).map((row) => row.following_id),
        ...(blocks ?? []).map((row) => row.blocked_id),
        viewer.id,
      ]);
      const normalizedInterests = interests.map((item: string) => item.trim().toLowerCase());
      const ranked = ((members ?? []) as Member[])
        .filter((member) => !excluded.has(member.id))
        .map((member) => {
          const memberInterests: string[] = Array.isArray(member.interests) ? member.interests.filter((item: unknown): item is string => typeof item === "string") : [];
          const sharedInterests = memberInterests.filter((item: string) => normalizedInterests.includes(item.trim().toLowerCase()));
          return { ...member, sharedInterests };
        })
        .sort((a, b) => b.sharedInterests.length - a.sharedInterests.length || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSuggestions(ranked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load people right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPeople(); }, [loadPeople]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return suggestions;
    return suggestions.filter((member) =>
      [member.display_name, member.username, member.bio ?? "", ...(member.interests ?? [])]
        .join(" ").toLowerCase().includes(term)
    );
  }, [suggestions, query]);

  async function followMember(member: Suggestion) {
    if (followingId) return;
    setFollowingId(member.id);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Your session expired. Log in again to follow members.");
      const { error: insertError } = await supabase.from("follows").insert({
        follower_id: authData.user.id,
        following_id: member.id,
      });
      if (insertError) {
        if (insertError.code === "23505") throw new Error("You already follow this member. Refresh the suggestions.");
        if (insertError.code === "42501") {
          throw new Error("You can't follow this account right now. Check that your account is active and that no block exists between the accounts.");
        }
        throw insertError;
      }
      setSuggestions((current) => current.filter((item) => item.id !== member.id));
      setNotice("You are now following @" + member.username + ". Their posts can appear in your Following feed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not follow this member.");
    } finally {
      setFollowingId(null);
    }
  }

  return (
    <main className="verity-product-page min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-5xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to feed</Link>
        <Link href="/" className="text-lg font-black tracking-tight">Verity<span className="text-indigo-600">.</span></Link>
      </header>

      <section className="mx-auto max-w-5xl pt-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-700 p-6 text-white shadow-lg sm:p-9">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10"><Users size={22} /></div>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-200">Community discovery</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Find people worth following.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-indigo-100">Discover members with interests similar to yours. Suggestions are ranked by shared interests, then by recently joined members.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {myInterests.length ? myInterests.slice(0, 6).map((interest) => <span key={interest} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">{interest}</span>) : <span className="text-xs text-indigo-100">Add your interests to get more relevant suggestions.</span>}
            <Link href="/settings" className="inline-flex min-h-8 items-center rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-indigo-800 hover:bg-indigo-50">Edit interests</Link>
          </div>
        </div>

        {!signedIn && !loading ? (
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-white p-8 text-center shadow-sm">
            <Users className="mx-auto text-indigo-600" size={30} />
            <h2 className="mt-3 text-lg font-extrabold">Log in to discover members</h2>
            <p className="mt-2 text-sm text-slate-500">Follow people to build a feed around the conversations you care about.</p>
            <Link href="/login?next=%2Fpeople" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Log in</Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50">
                <Search size={17} className="shrink-0 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, usernames or interests..." className="w-full min-w-0 bg-transparent text-base outline-none sm:text-sm" aria-label="Search members" />
              </label>
              <button type="button" onClick={() => void loadPeople()} disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
            </div>

            {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
            {error && <p role="alert" className="mt-4 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

            <div className="mb-3 mt-7 flex items-end justify-between gap-3">
              <div><h2 className="text-xl font-black">Suggested members</h2><p className="mt-1 text-xs text-slate-500">People you do not already follow or block.</p></div>
              <span className="text-xs font-semibold text-slate-500">{filtered.length} shown</span>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500"><LoaderCircle className="animate-spin text-indigo-600" size={21} /> Finding people...</div>
            ) : filtered.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filtered.map((member) => (
                  <article key={member.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <Link href={"/u/" + encodeURIComponent(member.username)} className="shrink-0">
                        {member.avatar_url ? <img src={member.avatar_url} alt="" className="h-12 w-12 rounded-2xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-black text-indigo-700">{member.display_name.slice(0, 1).toUpperCase()}</div>}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={"/u/" + encodeURIComponent(member.username)} className="block truncate text-sm font-extrabold hover:text-indigo-700">{member.display_name}</Link>
                        <p className="mt-0.5 truncate text-xs text-slate-400">@{member.username}</p>
                        {member.sharedInterests.length > 0 ? <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"><Sparkles size={12} /> {member.sharedInterests.length} shared {member.sharedInterests.length === 1 ? "interest" : "interests"}</p> : <p className="mt-2 text-[11px] font-semibold text-slate-400">Recently joined member</p>}
                      </div>
                    </div>
                    {member.bio && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{member.bio}</p>}
                    {member.interests?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{member.interests.slice(0, 4).map((interest) => <span key={interest} className={"rounded-full px-2.5 py-1 text-[10px] font-semibold " + (member.sharedInterests.some((shared) => shared.toLowerCase() === interest.toLowerCase()) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{interest}</span>)}</div> : null}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <Link href={"/u/" + encodeURIComponent(member.username)} className="text-xs font-bold text-indigo-700 hover:text-indigo-900">View profile</Link>
                      <button type="button" onClick={() => void followMember(member)} disabled={Boolean(followingId)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                        {followingId === member.id ? <LoaderCircle size={13} className="animate-spin" /> : <UserPlus size={13} />}
                        {followingId === member.id ? "Following..." : "Follow"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <Check className="mx-auto text-emerald-600" size={28} />
                <h3 className="mt-3 font-extrabold">{query ? "No matching members" : "You are all caught up"}</h3>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{query ? "Try a different name or interest." : "There are no more member suggestions right now. Check back as the community grows."}</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
