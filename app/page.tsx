"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Compass,
  FileSearch,
  Flame,
  Headphones,
  Heart,
  Home,
  LoaderCircle,
  LockKeyhole,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type DbPost = {
  id: string;
  author_id: string;
  community_id: string | null;
  type: string;
  title: string | null;
  body: string;
  link_url: string | null;
  source_url: string | null;
  declared_category: string | null;
  ai_disclosure: boolean;
  tags: string[] | null;
  status: string;
  created_at: string;
};

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type Community = {
  id: string;
  name: string;
  slug: string;
};

type CommentItem = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  display_name: string;
};

type FeedPost = {
  id: string;
  author_id: string;
  author: string;
  username: string;
  community_id: string | null;
  community: string;
  time: string;
  title: string;
  body: string;
  category: string;
  label: string;
  tone: "neutral" | "blue" | "violet" | "orange";
  likes: number;
  comments: number;
  link_url: string | null;
  source_url: string | null;
};

const navItems = [
  { name: "Home", icon: Home },
  { name: "Explore", icon: Compass },
  { name: "Communities", icon: Users },
  { name: "Questions", icon: CircleHelp },
  { name: "Verify", icon: FileSearch },
  { name: "Support", icon: Headphones },
];

const trending = [
  "Artificial Intelligence",
  "Digital Literacy",
  "Science Explained",
];

function formatTime(dateString: string) {
  const timestamp = new Date(dateString).getTime();

  if (!Number.isFinite(timestamp)) return "Recently";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateString).toLocaleDateString();
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-extrabold text-indigo-700">
      {initials || "V"}
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: FeedPost["tone"];
}) {
  const styles: Record<FeedPost["tone"], string> = {
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
    blue: "bg-sky-50 text-sky-700 ring-sky-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 ring-inset ${styles[tone]}`}
    >
      {tone === "violet" ? (
        <Sparkles size={12} />
      ) : tone === "orange" ? (
        <span>☺</span>
      ) : tone === "blue" ? (
        <CheckCircle2 size={12} />
      ) : (
        <Clock3 size={12} />
      )}
      {label}
    </span>
  );
}

function Artwork({ tone }: { tone: "violet" | "cyan" | "rose" }) {
  const designs = {
    violet: {
      colors: "from-violet-800 via-indigo-600 to-blue-500",
      title: "THE AI ERA",
      subtitle: "Creativity meets technology",
    },
    cyan: {
      colors: "from-cyan-800 via-teal-600 to-emerald-400",
      title: "STAY CURIOUS",
      subtitle: "Questions create knowledge",
    },
    rose: {
      colors: "from-rose-700 via-fuchsia-600 to-orange-400",
      title: "INTERNET CULTURE",
      subtitle: "Laugh. Learn. Repeat.",
    },
  };

  const design = designs[tone];

  return (
    <div
      className={`relative mt-4 min-h-[150px] overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white ${design.colors}`}
    >
      <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-white/20" />
      <div className="absolute right-6 top-8 h-24 w-24 rounded-full border border-white/20" />
      <div className="relative flex min-h-[102px] flex-col justify-between">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
          <Sparkles size={13} />
          A thought worth sharing
        </span>
        <div>
          <h3 className="text-2xl font-black tracking-tight">
            {design.title}
          </h3>
          <p className="mt-1 text-sm text-white/80">{design.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(
    null,
  );
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, CommentItem[]>
  >({});

  const [activePage, setActivePage] = useState("Home");
  const [filter, setFilter] = useState("For you");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState<
    "Discussion" | "Question" | "News" | "Meme"
  >("Discussion");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newAiDisclosure, setNewAiDisclosure] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");

  async function loadComments(postId: string) {
    const supabase = createClient();

    const { data, error: commentsError } = await supabase
      .from("comments")
      .select("id, post_id, author_id, body, created_at")
      .eq("post_id", postId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(100);

    if (commentsError) {
      setError(`Could not load comments: ${commentsError.message}`);
      return;
    }

    const rows = (data ?? []) as unknown as Omit<
      CommentItem,
      "display_name"
    >[];

    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    let profiles: Profile[] = [];

    if (authorIds.length) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", authorIds);

      profiles = (profileData ?? []) as Profile[];
    }

    const names = new Map(
      profiles.map((profile) => [
        profile.id,
        profile.display_name || profile.username,
      ]),
    );

    setCommentsByPost((current) => ({
      ...current,
      [postId]: rows.map((row) => ({
        ...row,
        display_name: names.get(row.author_id) || "Community member",
      })),
    }));
  }

  async function loadFeed() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const currentUser = authData.user
        ? {
            id: authData.user.id,
            email: authData.user.email,
          }
        : null;

      setUser(currentUser);

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select(
          "id, author_id, community_id, type, title, body, link_url, source_url, declared_category, ai_disclosure, tags, status, created_at",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);

      if (postError) throw postError;

      const rows = (postData ?? []) as unknown as DbPost[];
      const postIds = rows.map((row) => row.id);
      const authorIds = [...new Set(rows.map((row) => row.author_id))];
      const communityIds = [
        ...new Set(
          rows
            .map((row) => row.community_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      let profiles: Profile[] = [];
      let communities: Community[] = [];
      let reactions: { post_id: string }[] = [];
      let commentRows: { post_id: string }[] = [];
      let myReactions: { post_id: string }[] = [];
      let myBookmarks: { post_id: string }[] = [];

      if (authorIds.length) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", authorIds);

        if (profileError) throw profileError;
        profiles = (data ?? []) as Profile[];
      }

      if (communityIds.length) {
        const { data, error: communityError } = await supabase
          .from("communities")
          .select("id, name, slug")
          .in("id", communityIds);

        if (communityError) throw communityError;
        communities = (data ?? []) as Community[];
      }

      if (postIds.length) {
        const { data, error: reactionError } = await supabase
          .from("reactions")
          .select("post_id")
          .in("post_id", postIds)
          .limit(5000);

        if (reactionError) throw reactionError;
        reactions = (data ?? []) as { post_id: string }[];

        const { data: commentData, error: commentError } = await supabase
          .from("comments")
          .select("post_id")
          .eq("is_deleted", false)
          .in("post_id", postIds)
          .limit(5000);

        if (commentError) throw commentError;
        commentRows = (commentData ?? []) as { post_id: string }[];

        if (currentUser) {
          const { data: myReactionData, error: myReactionError } =
            await supabase
              .from("reactions")
              .select("post_id")
              .eq("user_id", currentUser.id)
              .in("post_id", postIds);

          if (myReactionError) throw myReactionError;
          myReactions = (myReactionData ?? []) as { post_id: string }[];

          const { data: bookmarkData, error: bookmarkError } = await supabase
            .from("bookmarks")
            .select("post_id")
            .eq("user_id", currentUser.id)
            .in("post_id", postIds);

          if (bookmarkError) throw bookmarkError;
          myBookmarks = (bookmarkData ?? []) as { post_id: string }[];
        }
      }

      const profileMap = new Map(
        profiles.map((profile) => [
          profile.id,
          profile.display_name || profile.username,
        ]),
      );

      const usernameMap = new Map(
        profiles.map((profile) => [profile.id, profile.username]),
      );

      const communityMap = new Map(
        communities.map((community) => [community.id, community.name]),
      );

      const reactionCounts = new Map<string, number>();
      const commentCounts = new Map<string, number>();

      for (const reaction of reactions) {
        reactionCounts.set(
          reaction.post_id,
          (reactionCounts.get(reaction.post_id) ?? 0) + 1,
        );
      }

      for (const comment of commentRows) {
        commentCounts.set(
          comment.post_id,
          (commentCounts.get(comment.post_id) ?? 0) + 1,
        );
      }

      const formattedPosts: FeedPost[] = rows.map((row) => {
        const declared = (row.declared_category || "").toLowerCase();
        const type = (row.type || "text").toLowerCase();

        let label = "Not checked";
        let tone: FeedPost["tone"] = "neutral";

        if (row.ai_disclosure) {
          label = "Creator-declared AI";
          tone = "violet";
        } else if (declared.includes("meme")) {
          label = "Creator-declared meme";
          tone = "orange";
        } else if (
          declared.includes("question") ||
          type.includes("question")
        ) {
          label = "Community question";
          tone = "blue";
        } else if (
          declared.includes("educational") ||
          declared.includes("education")
        ) {
          label = "Educational";
          tone = "blue";
        }

        return {
          id: row.id,
          author_id: row.author_id,
          author: profileMap.get(row.author_id) || "Community member",
          username: usernameMap.get(row.author_id) || "member",
          community_id: row.community_id,
          community: row.community_id
            ? communityMap.get(row.community_id) || "Community"
            : "General",
          time: formatTime(row.created_at),
          title: row.title || "Untitled post",
          body: row.body,
          category: declared || type || "discussion",
          label,
          tone,
          likes: reactionCounts.get(row.id) ?? 0,
          comments: commentCounts.get(row.id) ?? 0,
          link_url: row.link_url,
          source_url: row.source_url,
        };
      });

      setPosts(formattedPosts);
      setLiked(myReactions.map((item) => item.post_id));
      setSaved(myBookmarks.map((item) => item.post_id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load the feed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
    // Initial feed load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts.filter((post) => {
      const searchable = [
        post.author,
        post.username,
        post.community,
        post.title,
        post.body,
        post.label,
      ]
        .join(" ")
        .toLowerCase();

      if (query && !searchable.includes(query)) return false;

      if (
        (activePage === "Questions" || filter === "Questions") &&
        !post.category.includes("question")
      ) {
        return false;
      }

      if (
        filter === "Discussions" &&
        post.category.includes("question")
      ) {
        return false;
      }

      return true;
    });
  }, [posts, search, activePage, filter]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!newTitle.trim() || !newBody.trim()) {
      setError("Add a title and description before publishing.");
      return;
    }

    setActionLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!data.user) {
        router.push("/login");
        return;
      }

      const sourceUrl = newSourceUrl.trim();

      if (sourceUrl) {
        try {
          const parsed = new URL(sourceUrl);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error("Use a valid HTTP or HTTPS source URL.");
          }
        } catch {
          throw new Error("Enter a valid source URL beginning with https://");
        }
      }

      const { error: insertError } = await supabase.from("posts").insert({
        author_id: data.user.id,
        community_id: null,
        type: "text",
        title: newTitle.trim(),
        body: newBody.trim(),
        source_url: sourceUrl || null,
        declared_category: newCategory.toLowerCase(),
        ai_disclosure: newAiDisclosure,
        tags: [],
        status: "published",
      });

      if (insertError) throw insertError;

      setCreateOpen(false);
      setNewTitle("");
      setNewBody("");
      setNewSourceUrl("");
      setNewCategory("Discussion");
      setNewAiDisclosure(false);
      setActivePage("Home");
      setFilter("For you");
      setNotice("Your post has been published.");

      await loadFeed();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not publish your post.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleLike(postId: string) {
    setError("");

    if (!user) {
      router.push("/login");
      return;
    }

    const supabase = createClient();
    const isLiked = liked.includes(postId);

    const { error: mutationError } = isLiked
      ? await supabase
          .from("reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
      : await supabase.from("reactions").insert({
          post_id: postId,
          user_id: user.id,
        });

    if (mutationError) {
      setError(mutationError.message);
      return;
    }

    setLiked((current) =>
      isLiked
        ? current.filter((id) => id !== postId)
        : [...current, postId],
    );

    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, likes: Math.max(0, post.likes + (isLiked ? -1 : 1)) }
          : post,
      ),
    );
  }

  async function toggleBookmark(postId: string) {
    setError("");

    if (!user) {
      router.push("/login");
      return;
    }

    const supabase = createClient();
    const isSaved = saved.includes(postId);

    const { error: mutationError } = isSaved
      ? await supabase
          .from("bookmarks")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
      : await supabase.from("bookmarks").insert({
          post_id: postId,
          user_id: user.id,
        });

    if (mutationError) {
      setError(mutationError.message);
      return;
    }

    setSaved((current) =>
      isSaved
        ? current.filter((id) => id !== postId)
        : [...current, postId],
    );
  }

  async function addComment(
    event: FormEvent<HTMLFormElement>,
    postId: string,
  ) {
    event.preventDefault();
    setError("");

    if (!commentDraft.trim()) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const supabase = createClient();

    const { error: insertError } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: user.id,
      body: commentDraft.trim(),
      is_deleted: false,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCommentDraft("");
    await Promise.all([loadComments(postId), loadFeed()]);
  }

  async function signOut() {
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    setUser(null);
    setLiked([]);
    setSaved([]);
    router.refresh();
    await loadFeed();
  }

  const pageTitle =
    activePage === "Explore"
      ? "Discover something new."
      : activePage === "Communities"
        ? "Find your people."
        : activePage === "Questions"
          ? "Questions worth answering."
          : "Ideas worth your time.";

  return (
    <main className="min-h-[100dvh] bg-[#f5f6fb] pb-20 text-slate-900 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] max-w-[1500px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu size={21} />
          </button>

          <button
            type="button"
            onClick={() => setActivePage("Home")}
            className="flex shrink-0 items-center gap-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
              <ShieldCheck size={22} />
            </span>
            <span className="text-[23px] font-black tracking-tight">
              verity<span className="text-indigo-600">.</span>
            </span>
          </button>

          <label className="ml-3 hidden max-w-[500px] flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 md:flex">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ideas, communities and people..."
              className="w-full bg-transparent text-sm outline-none"
              aria-label="Search posts"
            />
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePage("Verify")}
              className="hidden items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 sm:flex"
            >
              <Sparkles size={16} />
              Verify
            </button>

            {user ? (
              <>
                <span className="hidden max-w-36 truncate text-xs text-slate-500 md:block">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 sm:px-4"
                >
                  Join Verity ↗
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[220px_minmax(0,680px)] xl:grid-cols-[220px_minmax(0,680px)_280px]">
        <aside
          className={
            (mobileMenuOpen ? "block" : "hidden") +
            " fixed inset-x-0 bottom-0 top-[68px] z-30 overflow-y-auto border-r border-slate-200 bg-[#f5f6fb] p-4 lg:sticky lg:top-[68px] lg:block lg:h-[calc(100dvh-68px)] lg:border-0 lg:bg-transparent lg:p-0"
          }
        >
          <div className="py-6">
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <Avatar name={user?.email || "Verity Community"} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {user?.email ? "Welcome back" : "Welcome to Verity"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ideas with context
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreateOpen(true);
                setError("");
              }}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl"
            >
              <Plus size={18} />
              Create a post
            </button>

            <p className="mb-3 mt-8 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
              Your space
            </p>

            <nav className="space-y-1">
              {navItems.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setActivePage(name);
                    setMobileMenuOpen(false);
                  }}
                  className={
                    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition " +
                    (activePage === name
                      ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:bg-white hover:text-slate-900")
                  }
                >
                  <Icon
                    size={19}
                    className={
                      activePage === name
                        ? "text-indigo-600"
                        : "text-slate-400"
                    }
                  />
                  <span className="flex-1">{name}</span>
                  {activePage === name && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  )}
                </button>
              ))}
            </nav>

            <div className="my-7 border-t border-slate-200" />

            <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ShieldCheck size={20} />
              </div>
              <h3 className="mt-3 text-sm font-extrabold">
                Think before you share.
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Examine evidence and context instead of relying on viral claims.
              </p>
              <button
                type="button"
                onClick={() => setActivePage("Verify")}
                className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-indigo-700"
              >
                Explore trust tools <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 py-5 sm:py-6">
          <label className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 md:hidden">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Verity..."
              className="w-full bg-transparent text-base outline-none"
              aria-label="Search posts"
            />
          </label>

          {activePage === "Verify" ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <FileSearch size={25} />
              </div>
              <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">
                Content context
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Check before you share.
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                A reliable assessment distinguishes the origin of media from
                the accuracy of the claims it contains.
              </p>

              <form
                className="mt-7 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setVerifyMessage(
                    verifyUrl.trim()
                      ? "Live verification is not connected yet. No claim has been verified."
                      : "Enter a public URL first.",
                  );
                }}
              >
                <label className="block text-sm font-bold">
                  Article or public post URL
                </label>
                <input
                  type="url"
                  value={verifyUrl}
                  onChange={(event) => setVerifyUrl(event.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:text-sm"
                />
                <button className="min-h-12 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">
                  Prepare check
                </button>
              </form>

              {verifyMessage && (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  {verifyMessage}
                </p>
              )}
            </section>
          ) : activePage === "Support" ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <Headphones size={25} />
              </div>
              <h1 className="mt-5 text-3xl font-black">How can we help?</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                The support interface is ready for database-backed tickets.
                Ticket creation is not connected in this page yet.
              </p>
              {[
                "Incorrect AI label",
                "Appeal a moderation decision",
                "Report harmful content",
                "Account or technical issue",
              ].map((title) => (
                <div
                  key={title}
                  className="mt-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold"
                >
                  {title}
                </div>
              ))}
            </section>
          ) : (
            <>
              <section className="relative isolate overflow-hidden rounded-[28px] bg-[#171832] p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
                <div className="absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full bg-violet-600/45 blur-3xl" />
                <div className="absolute -bottom-40 right-20 -z-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute right-8 top-8 -z-10 hidden h-36 w-36 rounded-full border border-white/10 sm:block" />

                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.19em] text-indigo-100">
                  <Sparkles size={13} /> A more thoughtful internet
                </span>

                <h1 className="mt-6 max-w-lg text-3xl font-black leading-tight tracking-tight sm:text-[42px]">
                  The internet is loud.
                  <br />
                  <span className="bg-gradient-to-r from-cyan-300 via-indigo-200 to-violet-300 bg-clip-text text-transparent">
                    Make sense of it.
                  </span>
                </h1>

                <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
                  Discover communities, exchange ideas, ask better questions,
                  and explore the evidence behind what you see.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setCreateOpen(true);
                    }}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-indigo-950 hover:bg-indigo-50"
                  >
                    <Plus size={17} /> Start a conversation
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePage("Verify")}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
                  >
                    Explore verification <ArrowUpRight size={16} />
                  </button>
                </div>

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <Users size={15} className="text-cyan-300" />
                    Community first
                  </span>
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-violet-300" />
                    Evidence with context
                  </span>
                  <span className="flex items-center gap-2">
                    <LockKeyhole size={15} className="text-emerald-300" />
                    Trust by design
                  </span>
                </div>
              </section>

              <div className="mb-5 mt-8 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-600">
                    Your daily dose of curiosity
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-[28px]">
                    {pageTitleFor(activePage)}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Good conversations start with better questions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="hidden min-h-11 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 sm:flex"
                >
                  <Plus size={17} /> Post
                </button>
              </div>

              <div className="mb-5 flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                {[
                  { name: "For you", icon: Sparkles },
                  { name: "Latest", icon: Clock3 },
                  { name: "Questions", icon: CircleHelp },
                  { name: "Discussions", icon: MessageCircle },
                ].map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setFilter(name)}
                    className={
                      "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:text-sm " +
                      (filter === name
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")
                    }
                  >
                    <Icon size={15} /> {name}
                  </button>
                ))}
              </div>

              {notice && (
                <div
                  role="status"
                  className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                  {notice}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-4 break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="group mb-5 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700">
                  <Sparkles size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-700">
                    What is on your mind?
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Share an idea, ask a question or start a discussion...
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white group-hover:scale-105">
                  <Plus size={19} />
                </span>
              </button>

              <div className="mb-4 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3 text-xs leading-5 text-indigo-950">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-indigo-700" />
                <p>
                  <strong>Content with context.</strong> Labels show creator
                  declarations or unverified status. Live AI detection is not
                  connected yet.
                </p>
              </div>

              {loading ? (
                <div className="flex min-h-48 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">
                  <LoaderCircle className="animate-spin text-indigo-600" size={22} />
                  Loading posts from Supabase...
                </div>
              ) : visiblePosts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <MessageCircle size={25} />
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold">
                    {search ? "No matching posts" : "Your feed starts here"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    {search
                      ? "Try another search or clear your search field."
                      : "No published posts were returned. Sign in and publish the first real post to your Verity community."}
                  </p>
                  {!search && (
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setCreateOpen(true);
                      }}
                      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                    >
                      <Plus size={16} /> Create the first post
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {visiblePosts.map((post) => {
                    const isLiked = liked.includes(post.id);
                    const isSaved = saved.includes(post.id);

                    return (
                      <article
                        key={post.id}
                        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-100 hover:shadow-lg hover:shadow-slate-200/50"
                      >
                        <div className="p-5 sm:p-6">
                          <div className="flex items-start gap-3">
                            <Avatar name={post.author} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-extrabold">
                                {post.author}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                <span>@{post.username}</span>
                                <span>·</span>
                                <span>{post.time}</span>
                              </div>
                              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                                <Users size={12} /> {post.community}
                              </p>
                            </div>
                          </div>

                          <h3 className="mt-4 break-words text-[17px] font-extrabold leading-7 tracking-tight sm:text-lg">
                            {post.title}
                          </h3>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                            {post.body}
                          </p>

                          {post.category.includes("meme") ? (
                            <Artwork tone="rose" />
                          ) : post.category.includes("question") ? (
                            <Artwork tone="cyan" />
                          ) : post.category.includes("educational") ? (
                            <Artwork tone="violet" />
                          ) : null}

                          {post.link_url && (
                            <a
                              href={post.link_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="mt-4 inline-flex min-h-10 items-center gap-2 break-all rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                            >
                              Open linked content <ArrowUpRight size={15} />
                            </a>
                          )}

                          {post.source_url && (
                            <a
                              href={post.source_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="mt-3 block break-all text-xs text-slate-500 underline underline-offset-2 hover:text-indigo-700"
                            >
                              Original source
                            </a>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Badge label={post.label} tone={post.tone} />
                            <button
                              type="button"
                              onClick={() => setActivePage("Verify")}
                              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                            >
                              <ShieldCheck size={13} /> Content context
                            </button>
                          </div>

                          <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 sm:gap-6">
                            <button
                              type="button"
                              onClick={() => void toggleLike(post.id)}
                              className={
                                "inline-flex min-h-10 items-center gap-2 text-sm font-bold " +
                                (isLiked
                                  ? "text-rose-600"
                                  : "text-slate-500 hover:text-rose-600")
                              }
                            >
                              <Heart
                                size={18}
                                fill={isLiked ? "currentColor" : "none"}
                              />
                              {post.likes}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const opening = openComments !== post.id;
                                setOpenComments(opening ? post.id : null);
                                if (opening) void loadComments(post.id);
                              }}
                              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
                            >
                              <MessageCircle size={18} />
                              {post.comments}
                            </button>

                            <button
                              type="button"
                              onClick={() => void toggleBookmark(post.id)}
                              className={
                                "ml-auto inline-flex min-h-10 items-center gap-2 text-sm font-bold " +
                                (isSaved
                                  ? "text-indigo-700"
                                  : "text-slate-400 hover:text-indigo-700")
                              }
                            >
                              <Bookmark
                                size={18}
                                fill={isSaved ? "currentColor" : "none"}
                              />
                              <span className="hidden sm:inline">
                                {isSaved ? "Saved" : "Save"}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    `${window.location.origin}/?post=${post.id}`,
                                  );
                                  setNotice("Post link copied.");
                                } catch {
                                  setNotice("Copy the URL from your browser.");
                                }
                              }}
                              aria-label="Share post"
                              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-indigo-700"
                            >
                              <Share2 size={17} />
                            </button>
                          </div>

                          {openComments === post.id && (
                            <div className="mt-4 border-t border-slate-100 pt-4">
                              <form
                                onSubmit={(event) =>
                                  void addComment(event, post.id)
                                }
                                className="flex gap-2"
                              >
                                <input
                                  value={commentDraft}
                                  onChange={(event) =>
                                    setCommentDraft(event.target.value)
                                  }
                                  placeholder="Add a thoughtful comment..."
                                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-base outline-none focus:border-indigo-400 sm:text-sm"
                                  aria-label="Write a comment"
                                />
                                <button
                                  type="submit"
                                  aria-label="Send comment"
                                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                  <Send size={16} />
                                </button>
                              </form>

                              {(commentsByPost[post.id] || []).map(
                                (comment) => (
                                  <div
                                    key={comment.id}
                                    className="mt-3 rounded-xl bg-slate-50 p-3"
                                  >
                                    <p className="text-xs font-bold text-slate-700">
                                      {comment.display_name}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                                      {comment.body}
                                    </p>
                                  </div>
                                ),
                              )}

                              {(commentsByPost[post.id] || []).length === 0 && (
                                <p className="mt-4 text-sm text-slate-400">
                                  No comments yet. Start the conversation.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => void loadFeed()}
                disabled={loading}
                className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-60"
              >
                <Clock3 size={16} /> Refresh feed
              </button>
            </>
          )}
        </section>

        <aside className="hidden space-y-5 py-6 xl:block">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-5 text-white">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                <Sparkles size={15} /> THE VERITY DIFFERENCE
              </div>
              <h2 className="mt-4 text-2xl font-black leading-tight">
                Curiosity is good.
                <br />
                Context is better.
              </h2>
              <p className="mt-3 text-xs leading-6 text-indigo-100">
                Explore what is known, what is disputed and what still needs
                evidence.
              </p>
              <button
                type="button"
                onClick={() => setActivePage("Verify")}
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-extrabold text-indigo-900 hover:bg-indigo-50"
              >
                Explore trust tools <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-violet-50 p-2 text-violet-700">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold">Media origin</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Explore available signals about how content was created.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-sky-50 p-2 text-sky-700">
                  <FileSearch size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold">Evidence and sources</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Examine evidence behind specific factual claims.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <Headphones size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold">Human review</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Request help when a label or moderation decision is wrong.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">Trending topics</h2>
              <Flame size={17} className="text-orange-500" />
            </div>
            <div className="mt-4 space-y-4">
              {trending.map((topic, index) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSearch(topic)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[10px] font-extrabold text-slate-500">
                    0{index + 1}
                  </span>
                  <span className="text-sm font-bold">{topic}</span>
                  <ArrowUpRight size={15} className="ml-auto text-slate-300" />
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {[
          { name: "Home", icon: Home },
          { name: "Explore", icon: Compass },
          { name: "Create", icon: Plus },
          { name: "Questions", icon: CircleHelp },
          { name: "Support", icon: Headphones },
        ].map(({ name, icon: Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              if (name === "Create") {
                setCreateOpen(true);
              } else {
                setActivePage(name);
              }
            }}
            className={
              "flex min-h-12 flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold " +
              (activePage === name ? "text-indigo-700" : "text-slate-400")
            }
          >
            <Icon size={20} />
            {name}
          </button>
        ))}
      </nav>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
              setCreateOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-post-title"
            className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">
                  Your community
                </p>
                <h2
                  id="create-post-title"
                  className="mt-1 text-2xl font-black tracking-tight"
                >
                  Start a conversation.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={actionLoading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {!user && (
              <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-900">
                You need to log in to publish a post.{" "}
                <Link href="/login" className="font-bold underline">
                  Log in
                </Link>
              </div>
            )}

            <form onSubmit={createPost} className="mt-6 space-y-4">
              <label className="block text-sm font-bold">
                Post type
                <select
                  value={newCategory}
                  onChange={(event) =>
                    setNewCategory(
                      event.target.value as typeof newCategory,
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-indigo-400 sm:text-sm"
                >
                  <option>Discussion</option>
                  <option>Question</option>
                  <option>News</option>
                  <option>Meme</option>
                </select>
              </label>

              <label className="block text-sm font-bold">
                Title
                <input
                  required
                  maxLength={160}
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="What would you like to share?"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm"
                />
              </label>

              <label className="block text-sm font-bold">
                Description
                <textarea
                  required
                  rows={5}
                  maxLength={5000}
                  value={newBody}
                  onChange={(event) => setNewBody(event.target.value)}
                  placeholder="Add your thoughts, a question or some context..."
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-base font-normal leading-6 outline-none focus:border-indigo-400 sm:text-sm"
                />
              </label>

              <label className="block text-sm font-bold">
                Original source URL (optional)
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(event) => setNewSourceUrl(event.target.value)}
                  placeholder="https://example.com/article"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal outline-none focus:border-indigo-400 sm:text-sm"
                />
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={newAiDisclosure}
                  onChange={(event) =>
                    setNewAiDisclosure(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-indigo-600"
                />
                <span>
                  <strong>AI disclosure</strong>
                  <span className="block text-xs leading-5 text-slate-500">
                    I used AI to generate or materially alter this content.
                    This is a creator declaration, not a detector result.
                  </span>
                </span>
              </label>

              {error && (
                <p
                  role="alert"
                  className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
                >
                  {error}
                </p>
              )}

              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                Only publish content you have the right to share. AI detection
                and automatic fact-checking are not connected yet.
              </div>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={actionLoading}
                  className="min-h-12 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !user}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  {actionLoading ? "Publishing..." : "Publish post"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function pageTitleFor(page: string) {
  if (page === "Explore") return "Discover something new.";
  if (page === "Communities") return "Find your people.";
  if (page === "Questions") return "Questions worth answering.";
  return "Ideas worth your time.";
}