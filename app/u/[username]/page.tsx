"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, LoaderCircle, MessageCircle, UserMinus, UserPlus, ShieldBan, Pencil, Trash2 } from "lucide-react";
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
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedByProfile, setBlockedByProfile] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [postBusy, setPostBusy] = useState(false);

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
      const [{ data: postRows, error: postsError }, { count: followerCount, error: followerError }, { count: followingTotal, error: followingError }, { count: isFollowing, error: relationError }, { count: isBlocked, error: blockError }, { data: blockedBetween, error: blockedBetweenError }] = await Promise.all([
        supabase.from("posts").select("id, title, body, type, created_at, community_id")
          .eq("author_id", found.id).eq("status", "published")
          .order("created_at", { ascending: false }).range(0, 29),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", found.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", found.id),
        viewer && viewer !== found.id
          ? supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("follower_id", viewer).eq("following_id", found.id)
          : Promise.resolve({ count: 0, error: null }),
        viewer && viewer !== found.id
          ? supabase.from("blocks").select("blocked_id", { count: "exact", head: true }).eq("blocker_id", viewer).eq("blocked_id", found.id)
          : Promise.resolve({ count: 0, error: null }),
        viewer && viewer !== found.id
          ? supabase.rpc("is_blocked_between", { a: viewer, b: found.id })
          : Promise.resolve({ data: false, error: null }),
      ]);
      if (postsError) throw postsError;
      if (followerError) throw followerError;
      if (followingError) throw followingError;
      if (relationError) throw relationError;
      if (blockError) throw blockError;
      if (blockedBetweenError) throw blockedBetweenError;
      const viewerBlockedProfile = (isBlocked ?? 0) > 0;
      const profileBlockedViewer = Boolean(blockedBetween) && !viewerBlockedProfile;
      const eitherAccountBlocked = Boolean(blockedBetween);
      setPosts(eitherAccountBlocked ? [] : postRows ?? []);
      setPostsHasMore(!eitherAccountBlocked && (postRows ?? []).length === 30);
      setFollowers(followerCount ?? 0);
      setFollowingCount(followingTotal ?? 0);
      setFollowing((isFollowing ?? 0) > 0);
      setBlocked(viewerBlockedProfile);
      setBlockedByProfile(profileBlockedViewer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this profile.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { void load(); }, [load]);

  async function loadMorePosts() {
    if (!profile || blocked || blockedByProfile || postsLoadingMore || !postsHasMore) return;
    setPostsLoadingMore(true);
    setError("");
    try {
      const supabase = createClient();
      const start = posts.length;
      const { data, error: postsError } = await supabase.from("posts")
        .select("id, title, body, type, created_at, community_id")
        .eq("author_id", profile.id).eq("status", "published")
        .order("created_at", { ascending: false }).range(start, start + 29);
      if (postsError) throw postsError;
      const nextRows = (data ?? []) as Post[];
      setPosts((current) => {
        const existing = new Set(current.map((post) => post.id));
        return [...current, ...nextRows.filter((post) => !existing.has(post.id))];
      });
      setPostsHasMore(nextRows.length === 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load older posts.");
    } finally {
      setPostsLoadingMore(false);
    }
  }

  async function toggleFollow() {
    if (!profile || busy) return;
    if (blocked || blockedByProfile) {
      setError(blockedByProfile
        ? "You cannot follow this account because it has blocked you."
        : "Unblock this account before following it.");
      return;
    }
    if (!viewerId) {
      router.push("/login?next=" + encodeURIComponent("/u/" + username));
      return;
    }
    if (viewerId === profile.id) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const result = following
        ? await supabase.from("follows").delete().eq("follower_id", viewerId).eq("following_id", profile.id)
        : await supabase.from("follows").insert({ follower_id: viewerId, following_id: profile.id });
      if (result.error) throw result.error;
      setFollowing(!following);
      setFollowers((count) => Math.max(0, count + (following ? -1 : 1)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this follow.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfilePost(postId: string) {
    if (!profile || viewerId !== profile.id || postBusy) return;
    if (!editBody.trim()) { setError("Post text cannot be empty."); return; }
    if (editTitle.trim().length > 300 || editBody.trim().length > 20000) {
      setError("The title or post text is too long.");
      return;
    }
    setPostBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase.from("posts")
        .update({ title: editTitle.trim() || null, body: editBody.trim() })
        .eq("id", postId).eq("author_id", profile.id).eq("status", "published")
        .select("id, edited_at").maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("This post is no longer available to edit. Refresh the page and try again.");
      setPosts((current) => current.map((post) => post.id === postId
        ? { ...post, title: editTitle.trim() || null, body: editBody.trim() }
        : post));
      setEditingPostId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this post.");
    } finally {
      setPostBusy(false);
    }
  }

  async function deleteProfilePost(postId: string) {
    if (!profile || viewerId !== profile.id || postBusy) return;
    if (!window.confirm("Delete this post and its attached media? It will be removed from public view, while its moderation history is retained.")) return;
    setPostBusy(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      // Hide the post first. Media cleanup is a separate storage operation and
      // must never prevent a successful post deletion or leave a broken public post.
      const { data, error: deleteError } = await supabase.from("posts")
        .update({ status: "removed", removal_reason: "Deleted by the author" })
        .eq("id", postId).eq("author_id", profile.id).eq("status", "published")
        .select("id").maybeSingle();
      if (deleteError) throw deleteError;
      if (!data) throw new Error("This post is no longer available to delete. Refresh the page and try again.");

      setPosts((current) => current.filter((post) => post.id !== postId));
      if (editingPostId === postId) setEditingPostId(null);
      setNotice("Post deleted. Its moderation history has been retained.");

      const { data: mediaRows, error: mediaLookupError } = await supabase
        .from("post_media").select("storage_path").eq("post_id", postId);
      if (mediaLookupError) {
        setNotice("Post deleted. Media cleanup is pending and may need staff attention.");
        return;
      }
      const mediaPaths = (mediaRows ?? []).map((media) => media.storage_path).filter(Boolean);
      if (mediaPaths.length) {
        const { error: storageError } = await supabase.storage.from("post-media").remove(mediaPaths);
        if (storageError) {
          setNotice("Post deleted. Media cleanup is pending and may need staff attention.");
          return;
        }
        const { error: metadataError } = await supabase.from("post_media").delete().eq("post_id", postId);
        if (metadataError) {
          setNotice("Post deleted. Stored media was removed, but its metadata cleanup is pending.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this post.");
    } finally {
      setPostBusy(false);
    }
  }

  async function toggleBlock() {
    if (!profile || !viewerId || busy || viewerId === profile.id) return;
    if (!window.confirm((blocked ? "Unblock " : "Block ") + "@" + profile.username + "?")) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const result = blocked
        ? await supabase.from("blocks").delete().eq("blocker_id", viewerId).eq("blocked_id", profile.id)
        : await supabase.from("blocks").insert({ blocker_id: viewerId, blocked_id: profile.id });
      if (result.error) throw result.error;

      if (blocked) {
        // Re-fetch posts and follow state when unblocking; the initial blocked
        // profile load intentionally kept its post list empty.
        await load();
      } else {
        setBlocked(true);
        if (following) {
          const { error: unfollowError } = await supabase.from("follows").delete()
            .eq("follower_id", viewerId).eq("following_id", profile.id);
          if (unfollowError) {
            setError("Account blocked, but the existing follow could not be removed. Please retry from your Following list.");
          } else {
            setFollowing(false);
            setFollowers((count) => Math.max(0, count - 1));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this block.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="verity-product-page flex min-h-screen items-center justify-center gap-2 bg-[#f5f6fb] text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Loading profile...</main>;

  if (!profile) return (
    <main className="verity-product-page min-h-screen bg-[#f5f6fb] px-4 py-16 text-slate-900">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black">Profile not found</h1>
        <p className="mt-2 text-sm text-slate-500">This username may have changed or the account may no longer be available.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"><ArrowLeft size={16} /> Back to Verity</Link>
      </section>
    </main>
  );

  return (
    <main className="verity-product-page verity-product-page min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-4xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to feed</Link>
        <Link href="/" className="text-lg font-black tracking-tight">Verity<span className="text-indigo-600">.</span></Link>
      </header>
      <section className="mx-auto max-w-4xl pt-8">
        {error && <div role="alert" className="mb-4 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="mb-4 break-words rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-600" />
          <div className="px-6 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="h-24 w-24 rounded-2xl border-4 border-white bg-white object-cover shadow-md" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-indigo-100 text-3xl font-black text-indigo-700 shadow-md">
                  {profile.display_name.slice(0, 1).toUpperCase()}
                </div>
              )}
              {viewerId !== profile.id ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void toggleBlock()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 hover:border-rose-200 hover:text-rose-700 disabled:opacity-60">
                    <ShieldBan size={15} />{blocked ? "Unblock" : "Block"}
                  </button>
                  {!blocked && !blockedByProfile && <button type="button" onClick={() => void toggleFollow()} disabled={busy} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:opacity-60 ${following ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
                    {busy ? <LoaderCircle size={15} className="animate-spin" /> : following ? <UserMinus size={15} /> : <UserPlus size={15} />}
                    {following ? "Following" : "Follow"}
                  </button>}
                </div>
              ) : null}
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight">{profile.display_name}</h1>
            <p className="mt-1 text-sm text-slate-500">@{profile.username}</p>
            {blocked && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">You have blocked this account. You can unblock it from here or in Settings.</p>}
            {blockedByProfile && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">This account has blocked you. You cannot follow it or view its posts.</p>}
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
          <span className="text-xs font-semibold text-slate-500">{posts.length} loaded{postsHasMore ? " · more available" : ""}</span>
        </div>
        {blocked || blockedByProfile ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><ShieldBan className="mx-auto text-slate-300" size={30} /><p className="mt-3 font-bold">Posts hidden</p><p className="mt-1 text-sm text-slate-500">{blocked ? "You blocked this account. Unblock them above to see their public posts again." : "This account has blocked you, so its posts are not available to your account."}</p></div>
        ) : posts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><MessageCircle className="mx-auto text-slate-300" size={30} /><p className="mt-3 font-bold">No public posts yet</p><p className="mt-1 text-sm text-slate-500">When this member shares something, it will appear here.</p></div>
        ) : (
          <div className="mt-4 space-y-3">
            {posts.map((post) => <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold capitalize">{post.type}</span>
                <div className="flex items-center gap-3">
                  <time dateTime={post.created_at}>{ago(post.created_at)}</time>
                  {viewerId === profile.id && <div className="flex items-center gap-1">
                    <button type="button" aria-label="Edit your post" title="Edit your post" disabled={postBusy} onClick={() => { setEditingPostId(post.id); setEditTitle(post.title ?? ""); setEditBody(post.body); setError(""); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"><Pencil size={16}/></button>
                    <button type="button" aria-label="Delete your post" title="Delete your post" disabled={postBusy} onClick={() => void deleteProfilePost(post.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 size={16}/></button>
                  </div>}
                </div>
              </div>
              {editingPostId === post.id ? (
                <form onSubmit={(event) => { event.preventDefault(); void saveProfilePost(post.id); }} className="mt-4 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <label className="block text-xs font-bold text-slate-600">Title<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={300} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="Optional title"/></label>
                  <label className="block text-xs font-bold text-slate-600">Post text<textarea required value={editBody} onChange={(event) => setEditBody(event.target.value)} maxLength={20000} rows={5} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6"/></label>
                  <div className="flex justify-end gap-2"><button type="button" disabled={postBusy} onClick={() => setEditingPostId(null)} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold">Cancel</button><button type="submit" disabled={postBusy || !editBody.trim()} className="min-h-9 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-50">{postBusy ? "Saving…" : "Save changes"}</button></div>
                </form>
              ) : (
                <>
                  {post.title && <h3 className="mt-3 text-lg font-extrabold">{post.title}</h3>}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.body}</p>
                </>
              )}
            </article>)}
          </div>
        )}
        {postsHasMore && <div className="mt-5 flex justify-center"><button type="button" onClick={() => void loadMorePosts()} disabled={postsLoadingMore} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50">{postsLoadingMore && <LoaderCircle size={15} className="animate-spin" />}{postsLoadingMore ? "Loading older posts…" : "Load older posts"}</button></div>}
      </section>
    </main>
  );
}
