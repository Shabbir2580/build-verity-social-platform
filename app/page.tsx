"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ShieldCheck,
  Search,
  Bell,
  Home,
  Compass,
  Users,
  CircleHelp,
  FileSearch,
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  X,
  Send,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  ImagePlus,
  Menu,
  ExternalLink,
  Headphones,
} from "lucide-react";

type Post = {
  id: string;
  name: string;
  username: string;
  time: string;
  community: string;
  title: string;
  body: string;
  kind: "discussion" | "question" | "news" | "meme";
  label: string;
  labelType: "ai" | "context" | "fun" | "neutral";
  likes: number;
  comments: number;
  image?: string;
};

const INITIAL_POSTS: Post[] = [
  {
    id: "p1",
    name: "Aarav Mehta",
    username: "curiousmind",
    time: "22 min ago",
    community: "Digital Literacy",
    title: "Before you forward that viral news, check this.",
    body: "A screenshot can be genuine while the caption attached to it is completely wrong. Always look for the original source, publication date and context before sharing a claim.",
    kind: "discussion",
    label: "Not verified",
    labelType: "neutral",
    likes: 128,
    comments: 34,
  },
  {
    id: "p2",
    name: "Sana Qureshi",
    username: "pixelandpaper",
    time: "2 hours ago",
    community: "AI & Technology",
    title: "AI-generated does not automatically mean fake.",
    body: "An AI-generated illustration can be perfectly legitimate entertainment. A real photograph can also be used with a misleading caption. Media origin and factual accuracy need separate assessments.",
    kind: "discussion",
    label: "Educational",
    labelType: "context",
    likes: 86,
    comments: 19,
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "p3",
    name: "Rohan Shah",
    username: "chaiandcode",
    time: "5 hours ago",
    community: "Learning Together",
    title: "What is one skill you are learning this month?",
    body: "I am working on understanding databases and building full-stack applications. What are you learning, and what resource has helped you most?",
    kind: "question",
    label: "Community question",
    labelType: "context",
    likes: 52,
    comments: 12,
  },
  {
    id: "p4",
    name: "Mira Creates",
    username: "miramakes",
    time: "7 hours ago",
    community: "Memes & Entertainment",
    title: "When the AI writes your assignment but cannot explain it in viva.",
    body: "The difference between submitting an answer and actually understanding it. 😅",
    kind: "meme",
    label: "Meme",
    labelType: "fun",
    likes: 241,
    comments: 48,
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
  },
];

const NAV_ITEMS = [
  { label: "Home feed", key: "home", icon: Home },
  { label: "Explore", key: "explore", icon: Compass },
  { label: "Communities", key: "communities", icon: Users },
  { label: "Questions", key: "questions", icon: CircleHelp },
  { label: "Verify content", key: "verify", icon: FileSearch },
] as const;

const TRENDING = [
  { tag: "ArtificialIntelligence", count: "2.4k discussions" },
  { tag: "DigitalLiteracy", count: "1.8k discussions" },
  { tag: "ScienceExplained", count: "956 discussions" },
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
      {initials}
    </div>
  );
}

function ContentBadge({
  label,
  type,
}: {
  label: string;
  type: Post["labelType"];
}) {
  const styles: Record<Post["labelType"], string> = {
    ai: "border-violet-200 bg-violet-50 text-violet-700",
    context: "border-blue-200 bg-blue-50 text-blue-700",
    fun: "border-orange-200 bg-orange-50 text-orange-700",
    neutral: "border-slate-200 bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${styles[type]}`}
    >
      {type === "ai" ? (
        <Sparkles size={12} />
      ) : type === "fun" ? (
        <span aria-hidden="true">☺</span>
      ) : type === "context" ? (
        <ShieldCheck size={12} />
      ) : (
        <AlertCircle size={12} />
      )}
      {label}
    </span>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeNav, setActiveNav] = useState<string>("home");
  const [activeFilter, setActiveFilter] = useState("For you");
  const [search, setSearch] = useState("");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, string[]>
  >({});
  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");

  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftKind, setDraftKind] = useState<Post["kind"]>("discussion");

  const displayedPosts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return posts.filter((post) => {
      const searchableText = [
        post.name,
        post.username,
        post.community,
        post.title,
        post.body,
        post.label,
      ]
        .join(" ")
        .toLowerCase();

      if (q && !searchableText.includes(q)) return false;

      if (activeNav === "questions" && post.kind !== "question") {
        return false;
      }

      if (
        activeNav === "communities" &&
        !post.community
      ) {
        return false;
      }

      if (activeNav === "explore") return true;

      if (activeFilter === "Questions" && post.kind !== "question") {
        return false;
      }

      if (activeFilter === "Discussions" && post.kind === "question") {
        return false;
      }

      return true;
    });
  }, [posts, search, activeNav, activeFilter]);

  function createPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftTitle.trim() || !draftBody.trim()) return;

    const newPost: Post = {
      id: crypto.randomUUID(),
      name: "Demo User",
      username: "demo_user",
      time: "Just now",
      community: "General",
      title: draftTitle.trim(),
      body: draftBody.trim(),
      kind: draftKind,
      label: draftKind === "meme" ? "Creator-declared meme" : "Not checked",
      labelType: draftKind === "meme" ? "fun" : "neutral",
      likes: 0,
      comments: 0,
    };

    setPosts((current) => [newPost, ...current]);
    setDraftTitle("");
    setDraftBody("");
    setDraftKind("discussion");
    setCreateOpen(false);
    setActiveNav("home");
    setActiveFilter("For you");
  }

  function addComment(event: React.FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();

    const text = commentDraft.trim();
    if (!text) return;

    setCommentsByPost((current) => ({
      ...current,
      [postId]: [...(current[postId] || []), text],
    }));

    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, comments: post.comments + 1 }
          : post
      )
    );

    setCommentDraft("");
  }

  const currentTitle =
    activeNav === "explore"
      ? "Explore ideas"
      : activeNav === "communities"
        ? "Your communities"
        : activeNav === "questions"
          ? "Questions worth answering"
          : "Your community feed";

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu size={21} />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveNav("home");
              setMobileMenuOpen(false);
            }}
            className="flex shrink-0 items-center gap-2 text-xl font-black tracking-tight"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ShieldCheck size={21} />
            </span>
            <span>
              verity<span className="text-indigo-600">.</span>
            </span>
          </button>

          <label className="ml-3 hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 md:flex">
            <Search size={17} className="shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search posts, communities and topics..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              aria-label="Search content"
            />
            <span className="hidden rounded border bg-white px-1.5 py-0.5 text-[10px] text-slate-400 lg:inline">
              SEARCH
            </span>
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              onClick={() => setActiveNav("verify")}
              className="hidden items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 sm:flex"
            >
              <Sparkles size={16} />
              Verify
            </button>

            <Link
              href="/login"
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Join Verity
            </Link>
          </div>
        </div>

        <div className="px-4 pb-3 md:hidden">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Verity..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>
      </header>

      {/* Main layout */}
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,680px)_290px]">
        {/* Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? "block" : "hidden"
          } fixed inset-x-0 top-[119px] z-30 max-h-[calc(100vh-119px)] overflow-y-auto border-b border-slate-200 bg-white p-4 shadow-xl lg:sticky lg:top-[84px] lg:block lg:max-h-[calc(100vh-84px)] lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <div className="py-6">
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <Avatar name="Verity Community" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Welcome to Verity</p>
                <p className="text-xs text-slate-500">Ideas with context</p>
              </div>
            </div>

            <button
              onClick={() => setCreateOpen(true)}
              className="mb-7 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus size={18} />
              Create a post
            </button>

            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Discover
            </p>

            <nav className="space-y-1">
              {NAV_ITEMS.map(({ label, key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveNav(key);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                    activeNav === key
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>

            <div className="my-7 border-t border-slate-200" />

            <button
              onClick={() => setActiveNav("support")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${
                activeNav === "support"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <Headphones size={18} />
              Help & support
            </button>

            <div className="mt-7 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-sm font-bold">Think before you share.</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Explore evidence and context instead of relying on viral
                claims alone.
              </p>
              <button
                onClick={() => setActiveNav("verify")}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-700"
              >
                Explore verification <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 py-6">
          {activeNav === "verify" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <FileSearch size={25} />
              </div>

              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                Verity content context
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Check before you share.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                Submit a public news link to prepare it for evidence-based
                review. AI origin and factual accuracy are different questions.
              </p>

              <form
                className="mt-7 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setVerifyMessage(
                    verifyUrl.trim()
                      ? "This preview does not run a live verification yet. Connect the verification service and evidence sources before presenting a real result."
                      : "Enter a public URL first."
                  );
                }}
              >
                <label className="block text-sm font-semibold">
                  Article or public post URL
                </label>
                <input
                  value={verifyUrl}
                  onChange={(event) => setVerifyUrl(event.target.value)}
                  placeholder="https://example.com/news-article"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
                <button className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">
                  <Search size={16} />
                  Prepare check
                </button>
              </form>

              {verifyMessage && (
                <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 shrink-0" size={18} />
                  <p>{verifyMessage}</p>
                </div>
              )}

              <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <CheckCircle2 size={17} className="text-indigo-600" />
                  What a real check should include
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>• The specific factual claim being examined.</li>
                  <li>• Supporting and contradicting source links.</li>
                  <li>• Available media-origin evidence.</li>
                  <li>• Uncertainty and the time of the assessment.</li>
                  <li>• A route to request human review.</li>
                </ul>
              </div>
            </section>
          ) : activeNav === "support" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <Headphones size={25} />
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                Help & support
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Get help with account access, technical problems, content
                labels and moderation decisions.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: "Incorrect AI label",
                    description: "Request a human review of a content label.",
                  },
                  {
                    title: "Appeal a decision",
                    description: "Challenge a moderation decision.",
                  },
                  {
                    title: "Report harmful content",