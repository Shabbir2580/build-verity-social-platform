"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, LoaderCircle, MessageCircle, UserMinus, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  interests: string[];
  created_at: string;
};
type Post = {
  id: string;
  title: string | null;
  body: string;
  type: string;
  created_at: string;
  community_id: string | null;
};

function ago(value: string) {
  const date = new Date(value);
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return minutes < 1 ? "Just now" : `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 43200) return `${Math.floor(minutes / 1440)}d ago`;
  return date.toLocaleDateString();
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = decodeURIComponent(params.username ?? "").toLowerCase();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const [{ data: auth }, { data: found, error: profileError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles")
          .select("id, username, display_name, bio, avatar_url, interests, created_at")
          .eq("username", username).maybeSingle(),
      ]);
      if (profileError) throw profileError;
      if (!found) {
        setProfile(null);
        setPosts([]);
        setLoading(false);
        return;
      }
      const viewer = auth.user?.id ?? null;
      setViewerId(viewer);
      setProfile(found);
      const [{ data: postRows, error: postsError }, { count: followerCount, error: followerError }, { count: followingTotal, error: followingError }, { count: isFollowing, error: relationError }] = await Promise.all([
        supabase.from("posts").select("id, title, body, type, created_at, community_id")
          .eq("author_id", found.id).eq("status", "published")
          .order("created_at", { ascending: false }).limit(30),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", found.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", found.id),
        viewer && viewer !== found.id
          ? supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("follower_id", viewer).eq("following_id", found.id)
          : Promise.resolve({ count: 0, error: null }),
      ]);
      if (postsError) throw postsError;
      if (followerError) throw followerError;
      if (followingError) throw followingError;
      if (relationError) throw relationError;
      setPosts(postRows ?? []);
      setFollowers(followerCount ?? 0);
      setFollowingCount(followingTotal ?? 0);
      setFollowing((isFollowing ?? 0) > 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this profile.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { void load(); }, [load]);

  async function toggleFollow() {
    if (!profile || busy) return;
    if (!viewerId) {
      router.push("/login?next=" + encodeURIComponent("/u/" + username));
      return;
    }
    if (viewerId === profile.id) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const result = following
      ? await supabase.from("follows").delete().eq("follower_id", viewerId).eq("following_id", profile.id)
      : await supabase.from("follows").insert({ follower_id: viewerId, following_id: profile.id });
    if (result.error) {
      setError(result.error.message);
    } else {
      setFollowing(!following);
      setFollowers((count) => Math.max(0, count + (following ? -1 : 1)));
    }
    setBusy(false);
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center gap-2 bg-[#f5f6fb] text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Loading profile...</main>;

  if (!profile) return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 py-16 text-slate-900">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black">Profile not found</h1>
        <p className="mt-2 text-sm text-slate-500">This username may have changed or the account may no longer be available.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"><ArrowLeft size={16} /> Back to Verity</Link>
      </section>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-4xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to feed</Link>
        <Link href="/" className="text-lg font-black tracking-tight">Verity<span className="text-indigo-600">.</span></Link>
      </header>
      <section className="mx-auto max-w-4xl pt-8">
        {error && <div role="alert" className="mb-4 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-600" />
          <div className="px-6 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.display_name} className="h-24 w-24 rounded-2xl border-4 border-white bg-white object-cover shadow-md" />
                : <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-indigo-100 text-3xl font-black text-indigo-700 shadow-md">{profile.display_name.slice(0, 1).toUpperCase()}</div>}
              {viewerId !== profile.id && <button type="button" onClick={() => void toggleFollow()} disabled={busy} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:opacity-60 ${following ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : following ? <UserMinus size={15} /> : <UserPlus size={15} />}{following ? "Following" : "Follow"}</button>}
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight">{profile.display_name}</h1>
            <p className="mt-1 text-sm text-slate-500">@{profile.username}</p>
            {profile.bio && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-slate-700">{profile.bio}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span><strong className="text-slate-900">{followers}</strong> followers</span>
              <span><strong className="text-slate-900">{followingCount}</strong> following</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
            </div>
            {profile.interests?.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{profile.interests.map((interest) => <span key={interest} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">{interest}</span>)}</div>}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div><h2 className="text-xl font-black">Posts</h2><p className="mt-1 text-xs text-slate-500">Public posts shared by @{profile.username}</p></div>
          <span className="text-xs font-semibold text-slate-500">{posts.length} recent</span>
        </div>
        {posts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><MessageCircle className="mx-auto text-slate-300" size={30} /><p className="mt-3 font-bold">No public posts yet</p><p className="mt-1 text-sm text-slate-500">When this member shares something, it will appear here.</p></div>
        ) : (
          <div className="mt-4 space-y-3">
            {posts.map((post) => <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold capitalize">{post.type}</span><time dateTime={post.created_at}>{ago(post.created_at)}</time></div>
              {post.title && <h3 className="mt-3 text-lg font-extrabold">{post.title}</h3>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.body}</p>
            </article>)}
          </div>
        )}
      </section>
    </main>
  );
}
