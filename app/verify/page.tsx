"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileSearch,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  MessageSquareWarning,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PostMedia = {
  id: string;
  post_id: string;
  kind: "image" | "video";
  storage_path: string;
  mime_type: string;
  alt_text: string | null;
  size_bytes: number;
  position: number;
  url: string;
};

type PublicPost = {
  id: string;
  author_id: string;
  type: string;
  title: string | null;
  body: string;
  link_url: string | null;
  video_url: string | null;
  source_url: string | null;
  declared_category: string | null;
  ai_disclosure: boolean;
  status: string;
  removal_reason: string | null;
  created_at: string;
  author_name: string;
  author_username: string;
  media: PostMedia[];
};

type ContentCheck = {
  id: string;
  post_id: string;
  provider: string;
  check_type: string;
  status: string;
  claim: string | null;
  signals: unknown;
  supporting: unknown;
  contradicting: unknown;
  explanation: string | null;
  uncertainty: string | null;
  is_demo: boolean;
  assessed_at: string | null;
  created_at: string;
};

type PostLabel = {
  id: string;
  post_id: string;
  dimension: string;
  value: string;
  basis: string;
  evidence_check_id: string | null;
  status: string;
  explanation: string | null;
  created_at: string;
};

type PostSource = {
  id: string;
  post_id: string;
  url: string;
  title: string | null;
  publisher: string | null;
  stance: string;
  origin: string;
  created_at: string;
};

type ReviewRequest = {
  id: string;
  post_id: string;
  label_id: string | null;
  case_id: string | null;
  reason: string;
  evidence: string | null;
  status: string;
  final_decision: string | null;
  decided_at: string | null;
  created_at: string;
};

type EvidenceItem = {
  label: string;
  detail: string;
  url: string | null;
};

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function pretty(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Recently";
  return date.toLocaleString();
}

function evidenceItems(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item, index) => {
    if (typeof item === "string") {
      return { label: `Evidence ${index + 1}`, detail: item, url: null };
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const title = [record.title, record.label, record.name, record.source]
        .find((candidate) => typeof candidate === "string") as string | undefined;
      const detail = [record.detail, record.description, record.snippet, record.reason]
        .find((candidate) => typeof candidate === "string") as string | undefined;
      const rawUrl = [record.url, record.href, record.source_url]
        .find((candidate) => typeof candidate === "string") as string | undefined;
      return {
        label: title || `Evidence ${index + 1}`,
        detail: detail || "Evidence record supplied by the assessment provider.",
        url: safeHttpUrl(rawUrl),
      };
    }
    return { label: `Evidence ${index + 1}`, detail: String(item), url: null };
  });
}

function CheckStatus({ status, demo }: { status: string; demo: boolean }) {
  const positive = status === "evidence_found";
  const uncertain = ["uncertain", "disputed", "not_checked", "provider_not_configured"].includes(status);
  const style = positive
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : uncertain
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : status === "failed"
        ? "bg-rose-50 text-rose-800 ring-rose-200"
        : "bg-sky-50 text-sky-800 ring-sky-200";

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${style}`}>
      {status === "failed" ? <ShieldAlert size={13} /> : positive ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
      <span className="break-words">{pretty(status)}</span>
      {demo && <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Demo</span>}
    </span>
  );
}

export default function VerifyPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [checks, setChecks] = useState<ContentCheck[]>([]);
  const [labels, setLabels] = useState<PostLabel[]>([]);
  const [sources, setSources] = useState<PostSource[]>([]);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [search, setSearch] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [selectedLabelId, setSelectedLabelId] = useState("");

  const selectedPost = posts.find((post) => post.id === selectedPostId) || null;

  async function loadMyRequests(userId: string) {
    const supabase = createClient();
    const { data, error: requestError } = await supabase
      .from("appeals")
      .select("id, post_id, label_id, case_id, reason, evidence, status, final_decision, decided_at, created_at")
      .eq("appellant_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (requestError) throw requestError;
    setRequests((data ?? []) as ReviewRequest[]);
  }

  async function loadPosts() {
    setLoadingPosts(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const currentUser = authData.user ? { id: authData.user.id, email: authData.user.email } : null;
      setUser(currentUser);

      let postQuery = supabase
        .from("posts")
        .select("id, author_id, type, title, body, link_url, video_url, source_url, declared_category, ai_disclosure, status, removal_reason, created_at");
      postQuery = currentUser
        ? postQuery.or(`status.eq.published,author_id.eq.${currentUser.id}`)
        : postQuery.eq("status", "published");
      const { data, error: postError } = await postQuery
        .order("created_at", { ascending: false })
        .limit(100);
      if (postError) throw postError;

      const rows = (data ?? []) as Omit<PublicPost, "author_name" | "author_username" | "media">[];
      const authorIds = [...new Set(rows.map((row) => row.author_id))];
      const postIds = rows.map((row) => row.id);
      let profiles: { id: string; username: string; display_name: string; avatar_url: string | null }[] = [];
      let mediaRows: Omit<PostMedia, "url">[] = [];

      if (authorIds.length) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", authorIds);
        if (profileError) throw profileError;
        profiles = (profileData ?? []) as typeof profiles;
      }

      if (postIds.length) {
        const { data: mediaData, error: mediaError } = await supabase
          .from("post_media")
          .select("id, post_id, kind, storage_path, mime_type, alt_text, size_bytes, position")
          .in("post_id", postIds)
          .order("position", { ascending: true });
        if (mediaError) throw mediaError;
        mediaRows = (mediaData ?? []) as Omit<PostMedia, "url">[];
      }

      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
      const supabaseMedia = supabase.storage.from("post-media");
      const mediaByPost = new Map<string, PostMedia[]>();
      for (const media of mediaRows) {
        const url = safeHttpUrl(supabaseMedia.getPublicUrl(media.storage_path).data.publicUrl);
        if (!url) continue;
        mediaByPost.set(media.post_id, [
          ...(mediaByPost.get(media.post_id) ?? []),
          { ...media, url },
        ]);
      }

      const options: PublicPost[] = rows.map((row) => {
        const profile = profileMap.get(row.author_id);
        return {
          ...row,
          author_name: profile?.display_name || profile?.username || "Community member",
          author_username: profile?.username || "member",
          media: mediaByPost.get(row.id) ?? [],
        };
      });
      setPosts(options);

      const requested = new URLSearchParams(window.location.search).get("post");
      const initialId = requested && options.some((post) => post.id === requested)
        ? requested
        : options[0]?.id || "";
      setSelectedPostId(initialId);

      if (currentUser) {
        await loadMyRequests(currentUser.id);
      } else {
        setRequests([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the verification center.");
    } finally {
      setLoadingPosts(false);
    }
  }

  async function loadDetails(postId: string) {
    if (!postId) {
      setChecks([]);
      setLabels([]);
      setSources([]);
      return;
    }
    setLoadingDetails(true);
    setError("");
    try {
      const supabase = createClient();
      const [checkResult, labelResult, sourceResult] = await Promise.all([
        supabase
          .from("content_checks")
          .select("id, post_id, provider, check_type, status, claim, signals, supporting, contradicting, explanation, uncertainty, is_demo, assessed_at, created_at")
          .eq("post_id", postId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("post_labels")
          .select("id, post_id, dimension, value, basis, evidence_check_id, status, explanation, created_at")
          .eq("post_id", postId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("post_sources")
          .select("id, post_id, url, title, publisher, stance, origin, created_at")
          .eq("post_id", postId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (checkResult.error) throw checkResult.error;
      if (labelResult.error) throw labelResult.error;
      if (sourceResult.error) throw sourceResult.error;
      setChecks((checkResult.data ?? []) as ContentCheck[]);
      setLabels((labelResult.data ?? []) as PostLabel[]);
      setSources((sourceResult.data ?? []) as PostSource[]);
      setSelectedLabelId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load evidence records.");
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    void loadPosts();
    // Load on entry; manual refresh uses loadPosts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDetails(selectedPostId);
    // loadDetails reads the selected ID only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPostId]);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) =>
      [post.title || "", post.body, post.author_name, post.author_username, post.source_url || ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [posts, search]);

  async function requestHumanReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!user) {
      router.push("/login?next=%2Fverify");
      return;
    }
    if (!selectedPost) {
      setError("Choose a post to request review.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Explain what should be reviewed in at least 10 characters.");
      return;
    }
    if (reason.trim().length > 2000 || evidenceNote.trim().length > 4000) {
      setError("The review explanation or evidence note is too long.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("appeals").insert({
        post_id: selectedPost.id,
        label_id: selectedLabelId || null,
        appellant_id: user.id,
        reason: reason.trim(),
        evidence: evidenceNote.trim() || null,
      });
      if (insertError) throw insertError;

      setReason("");
      setEvidenceNote("");
      setSelectedLabelId("");
      setNotice("Your human-review request was submitted. The database workflow has recorded a case; this is not an automated verdict.");
      await loadMyRequests(user.id);
      await loadDetails(selectedPost.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the review request.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusSummary = checks.length
    ? `${checks.length} stored assessment record${checks.length === 1 ? "" : "s"}`
    : "No assessment records";

  return (
    <main className="min-h-[100dvh] bg-[#f5f6fb] px-4 pb-12 text-slate-900 sm:px-6 sm:pb-16">
      <header className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-3 border-b border-slate-200/80 bg-[#f5f6fb]/95">
        <Link href="/" className="flex min-h-12 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200"><ShieldCheck size={22} /></span>
          <span className="text-[23px] font-black tracking-tight">verity<span className="text-indigo-600">.</span></span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? <span className="hidden max-w-48 truncate text-xs text-slate-500 sm:block">{user.email}</span> : <Link href="/login?next=%2Fverify" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-white">Log in</Link>}
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold hover:border-indigo-200 hover:text-indigo-700"><ArrowLeft size={16} /> <span className="hidden sm:inline">Back to feed</span><span className="sm:hidden">Back</span></Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px]">
        <section className="relative isolate mt-5 overflow-hidden rounded-[28px] bg-[#171832] p-6 text-white shadow-xl shadow-indigo-950/10 sm:mt-7 sm:p-9">
          <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-violet-600/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 right-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-100"><Sparkles size={13} /> Verity Trust Center</span>
          <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">See the evidence.<br /><span className="bg-gradient-to-r from-cyan-300 via-indigo-200 to-violet-300 bg-clip-text text-transparent">Challenge the label.</span></h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">Inspect assessments and sources already stored for Verity posts, then request human review when a label looks wrong. AI-generated does not automatically mean false, and missing evidence does not prove authenticity.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><FileSearch size={19} className="text-cyan-200" /><p className="mt-2 text-sm font-bold">Evidence records</p><p className="mt-1 text-xs leading-5 text-slate-300">View actual saved checks and sources.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><MessageSquareWarning size={19} className="text-violet-200" /><p className="mt-2 text-sm font-bold">Human review</p><p className="mt-1 text-xs leading-5 text-slate-300">Submit a request that creates a review case.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><ShieldCheck size={19} className="text-emerald-200" /><p className="mt-2 text-sm font-bold">Clear uncertainty</p><p className="mt-1 text-xs leading-5 text-slate-300">No fake verdicts or invented confidence scores.</p></div>
          </div>
        </section>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)] xl:gap-7">
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="text-base font-extrabold">Posts & reviews</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{posts.length}</span></div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Inspect public posts or your own restricted posts, including their recorded checks, labels and sources.</p>
            <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search size={16} className="shrink-0 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search posts" className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm" /></label>
            {loadingPosts ? <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Loading posts</div> : filteredPosts.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-center"><FileText size={25} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold">No posts found</p><p className="mt-1 text-xs leading-5 text-slate-500">Public posts and your own posts appear here when available.</p><Link href="/" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Go to feed</Link></div> : <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {filteredPosts.map((post) => <button key={post.id} type="button" onClick={() => { setSelectedPostId(post.id); setNotice(""); setError(""); }} className={`w-full rounded-2xl border p-3.5 text-left transition ${selectedPostId === post.id ? "border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"}`}><div className="flex items-start gap-2.5"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${post.media.some((item) => item.kind === "video") ? "bg-violet-50 text-violet-700" : post.media.length ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>{post.media.some((item) => item.kind === "video") ? <Video size={17} /> : post.media.length ? <ImageIcon size={17} /> : <FileText size={17} />}</span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold leading-5">{post.title || "Untitled post"}</span><span className="mt-1 block text-xs text-slate-500">by {post.author_name}</span><span className="mt-1 block text-[11px] text-slate-400">{timeLabel(post.created_at)}</span></span></div></button>)}
            </div>}
            <button type="button" onClick={() => void loadPosts()} disabled={loadingPosts} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><Clock3 size={15} /> Refresh posts</button>
          </aside>

          <section className="min-w-0 space-y-5">
            {error && <div role="alert" className="break-words rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">{error}</div>}
            {notice && <div role="status" className="break-words rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">{notice}</div>}

            {!selectedPost ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12"><ShieldCheck size={34} className="mx-auto text-slate-300" /><h2 className="mt-4 text-xl font-extrabold">Choose a post to begin</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">When posts exist, select one to see any stored assessments and submit a human-review request.</p></div> : <>
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{pretty(selectedPost.type)}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{selectedPost.ai_disclosure ? "Creator disclosed AI use" : "No creator AI disclosure"}</span>{selectedPost.status !== "published" && <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${selectedPost.status === "restricted" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>{pretty(selectedPost.status)}</span>}</div>{selectedPost.status !== "published" && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-extrabold uppercase tracking-wide text-amber-900">Moderation explanation</p><p className="mt-1 text-sm leading-6 text-amber-950">{selectedPost.removal_reason || "No additional explanation was recorded for this post."}</p><p className="mt-2 text-xs leading-5 text-amber-800">You can submit a human-review request below. The current status remains in place until a reviewer records a decision.</p></div>}
                <h2 className="mt-4 break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl">{selectedPost.title || "Untitled post"}</h2>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{selectedPost.body || "This post has no description."}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span>Posted by <strong className="text-slate-700">{selectedPost.author_name}</strong> (@{selectedPost.author_username})</span><span>·</span><span>{timeLabel(selectedPost.created_at)}</span></div>
                {selectedPost.media.length > 0 && <div className={`mt-5 grid gap-3 ${selectedPost.media.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>{selectedPost.media.map((media) => media.kind === "video" ? <video key={media.id} controls playsInline preload="metadata" className="max-h-[420px] w-full rounded-2xl bg-slate-950 object-contain"><source src={media.url} type={media.mime_type} />Video playback is not supported in this browser.</video> : <img key={media.id} src={media.url} alt={media.alt_text || "Media attached to this post"} className="max-h-[420px] w-full rounded-2xl border border-slate-100 object-contain" loading="lazy" />)}</div>}
                {(selectedPost.link_url || selectedPost.source_url || selectedPost.video_url) && <div className="mt-4 flex flex-wrap gap-2">{[["Open linked content", selectedPost.link_url], ["Original source", selectedPost.source_url], ["Video source", selectedPost.video_url]].map(([label, rawUrl]) => { const url = safeHttpUrl(rawUrl); return url ? <a key={label} href={url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><span className="break-all">{label}</span><ArrowUpRight size={14} className="shrink-0" /></a> : null; })}</div>}
              </article>

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">Stored assessments</p><h3 className="mt-1 text-lg font-black">Evidence checks</h3></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{checks.length}</span></div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{statusSummary}. These are database records, not a new scan run by this page.</p>
                  {loadingDetails ? <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17} /> Loading evidence</div> : checks.length === 0 ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">No assessment recorded</p><p className="mt-1 text-xs leading-5 text-amber-800">No automated verification result is stored for this post. A detector/search provider must be integrated server-side before Verity can run live checks. No verdict is inferred here.</p></div> : <div className="mt-4 space-y-3">{checks.map((check) => <div key={check.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><CheckStatus status={check.status} demo={check.is_demo} /><span className="text-[11px] text-slate-400">{pretty(check.check_type)}</span></div><p className="mt-2 text-xs text-slate-500">Provider: <strong className="break-words text-slate-700">{check.provider}</strong></p>{check.claim && <p className="mt-2 text-sm font-bold leading-6">Claim: {check.claim}</p>}{check.explanation && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{check.explanation}</p>}{check.uncertainty && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Uncertainty: {check.uncertainty}</p>}{(evidenceItems(check.supporting).length > 0 || evidenceItems(check.contradicting).length > 0) && <div className="mt-3 space-y-2">{[["Supporting evidence", evidenceItems(check.supporting)], ["Contradicting evidence", evidenceItems(check.contradicting)]].map(([group, items]) => <div key={String(group)}><p className="text-xs font-extrabold text-slate-700">{String(group)}</p><ul className="mt-1 space-y-1">{(items as EvidenceItem[]).map((item, index) => <li key={`${group}-${index}`} className="rounded-lg bg-slate-50 p-2.5 text-xs leading-5 text-slate-600"><span className="font-bold">{item.label}:</span> {item.detail}{item.url && <a href={item.url} target="_blank" rel="noreferrer noopener" className="ml-1 inline-flex items-center gap-1 font-bold text-indigo-700 underline">Open source <ArrowUpRight size={11} /></a>}</li>)}</ul></div>)}</div>}<p className="mt-3 text-[11px] text-slate-400">{check.assessed_at ? `Assessed ${timeLabel(check.assessed_at)}` : `Recorded ${timeLabel(check.created_at)}`}</p></div>)}</div>}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">Current labels</p><h3 className="mt-1 text-lg font-black">Context labels</h3></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{labels.length}</span></div>
                  {labels.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4"><p className="text-sm font-bold">No active labels</p><p className="mt-1 text-xs leading-5 text-slate-500">The post has no active stored origin, accuracy or intent label.</p></div> : <div className="mt-4 space-y-3">{labels.map((label) => <div key={label.id} className="rounded-2xl border border-slate-200 p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">{pretty(label.dimension)}</span><span className="text-[10px] text-slate-400">{pretty(label.basis)}</span></div><p className="mt-2 break-words text-sm font-extrabold">{pretty(label.value)}</p>{label.explanation && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{label.explanation}</p>}</div>)}</div>}
                </section>
              </div>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-2"><BookOpen size={19} className="text-indigo-600" /><h3 className="text-lg font-black">Source links</h3></div>
                {sources.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">No source records have been attached to this post in the database.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{sources.map((source) => { const url = safeHttpUrl(source.url); return <div key={source.id} className="min-w-0 rounded-2xl border border-slate-200 p-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">{pretty(source.stance)}</span><p className="mt-2 break-words text-sm font-bold">{source.title || source.publisher || url || "Source link"}</p>{source.publisher && <p className="mt-1 text-xs text-slate-500">{source.publisher}</p>}{url && <a href={url} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-bold text-indigo-700 underline underline-offset-2">Open source <ArrowUpRight size={13} /></a>}<p className="mt-2 text-[10px] text-slate-400">Added by {source.origin}</p></div>; })}</div>}
              </section>

              <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><MessageSquareWarning size={21} /></div><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">Ask the team</p><h3 className="mt-1 text-xl font-black">Request human review</h3><p className="mt-2 text-sm leading-6 text-slate-500">Use this if a stored label appears incorrect or the post needs closer review. A request creates an entry in the existing appeals and moderation workflow; it does not generate an instant automated verdict.</p></div></div>
                {!user ? <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold">Log in to request a review</p><p className="mt-1 text-xs leading-5 text-slate-500">Review requests are associated with your Verity account so you can track their status.</p><Link href="/login?next=%2Fverify" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700">Log in to continue</Link></div> : <form onSubmit={(event) => void requestHumanReview(event)} className="mt-5 space-y-4">
                  <label className="block text-sm font-bold">Which label should be reviewed? <span className="font-normal text-slate-400">(optional)</span><select value={selectedLabelId} onChange={(event) => setSelectedLabelId(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-indigo-400 sm:text-sm"><option value="">Review the post generally</option>{labels.map((label) => <option key={label.id} value={label.id}>{pretty(label.dimension)} — {pretty(label.value)}</option>)}</select></label>
                  <label className="block text-sm font-bold">What should the reviewer investigate?<textarea required minLength={10} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain which label or context may be incorrect, and why..." rows={4} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-base font-normal leading-6 outline-none focus:border-indigo-400 sm:text-sm" /></label>
                  <label className="block text-sm font-bold">Evidence or additional context <span className="font-normal text-slate-400">(optional)</span><textarea maxLength={4000} value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Add a source URL, date, correction or other context. Do not include private information." rows={3} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-base font-normal leading-6 outline-none focus:border-indigo-400 sm:text-sm" /></label>
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">The current database workflow sets a 24-hour review target. Actual response time depends on staff capacity and case complexity; submission does not mean the label has been changed.</p>
                  {error && <p role="alert" className="break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800">{error}</p>}
                  <button type="submit" disabled={submitting || loadingDetails} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"><ShieldCheck size={17} />{submitting ? "Submitting request..." : "Submit human-review request"}</button>
                </form>}
              </section>
            </>}
          </section>
        </div>

        {user && <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">Your activity</p><h2 className="mt-1 text-xl font-black">Review requests</h2><p className="mt-1 text-sm text-slate-500">Requests submitted from this account.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{requests.length}</span></div>{requests.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">You haven't requested a review yet.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{requests.map((request) => { const post = posts.find((item) => item.id === request.post_id); return <article key={request.id} className="min-w-0 rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{pretty(request.status)}</span><span className="text-[11px] text-slate-400">{timeLabel(request.created_at)}</span></div><h3 className="mt-3 break-words text-sm font-extrabold">{post?.title || `Post ${request.post_id.slice(0, 8)}…`}</h3><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{request.reason}</p>{request.evidence && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Evidence supplied</p><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{request.evidence}</p></div>}{request.final_decision && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">Reviewer decision</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-emerald-950">{request.final_decision}</p>{request.decided_at && <p className="mt-2 text-[10px] text-emerald-800">Recorded {timeLabel(request.decided_at)}</p>}</div>}<p className="mt-3 text-xs leading-5 text-slate-500">{request.status === "awaiting_review" || request.status === "submitted" ? "Your request is waiting for a reviewer." : request.status === "under_review" ? "A reviewer is examining the request." : request.status === "awaiting_information" ? "The review team needs more information. Check the evidence and support details before responding." : request.status === "appealed" ? "This request has been escalated for another review." : request.status === "resolved" ? "This request has a recorded decision." : "Status reflects the latest saved review workflow state."}</p>{request.case_id && <p className="mt-3 break-all text-[10px] text-slate-400">Case ID: {request.case_id}</p>}</article>; })}</div>}</section>}

        <footer className="pb-6 pt-8 text-center text-xs leading-6 text-slate-400">Verity displays only assessments actually stored in the database. A missing result is not proof that content is genuine or false.</footer>
      </div>
    </main>
  );
}
