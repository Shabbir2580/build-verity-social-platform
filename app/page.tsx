"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
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
  ImagePlus,
  LockKeyhole,
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

type Post = {
  id: number;
  author: string;
  username: string;
  community: string;
  time: string;
  title: string;
  body: string;
  category: "Discussion" | "Question" | "News" | "Meme";
  label: string;
  tone: "neutral" | "blue" | "violet" | "orange";
  likes: number;
  comments: number;
  art?: "violet" | "cyan" | "rose";
};

const initialPosts: Post[] = [
  {
    id: 1,
    author: "Aarav Mehta",
    username: "curiousmind",
    community: "Digital Literacy",
    time: "22 min ago",
    title: "Before you share that viral news, check this.",
    body: "A screenshot can be genuine while its caption is misleading. Check the original source, publication date, location and supporting evidence before sharing a claim.",
    category: "Discussion",
    label: "Not verified",
    tone: "neutral",
    likes: 128,
    comments: 34,
  },
  {
    id: 2,
    author: "Sana Qureshi",
    username: "pixelandpaper",
    community: "AI & Technology",
    time: "2 hours ago",
    title: "AI-generated does not automatically mean fake.",
    body: "An AI illustration can be legitimate entertainment. A real photograph can also accompany a false caption. Media origin and factual accuracy need separate assessments.",
    category: "Discussion",
    label: "Educational",
    tone: "blue",
    likes: 86,
    comments: 19,
    art: "violet",
  },
  {
    id: 3,
    author: "Rohan Shah",
    username: "chaiandcode",
    community: "Learning Together",
    time: "5 hours ago",
    title: "What is one skill you are learning this month?",
    body: "I am learning how databases and full-stack applications work. What are you learning, and which resources have helped you?",
    category: "Question",
    label: "Community question",
    tone: "blue",
    likes: 52,
    comments: 12,
    art: "cyan",
  },
  {
    id: 4,
    author: "Mira Creates",
    username: "miramakes",
    community: "Memes & Entertainment",
    time: "7 hours ago",
    title: "When AI writes your assignment but cannot explain it in viva.",
    body: "Submitting an answer and actually understanding it are two very different things. 😅",
    category: "Meme",
    label: "Creator-declared meme",
    tone: "orange",
    likes: 241,
    comments: 48,
    art: "rose",
  },
];

const navItems = [
  { name: "Home", icon: Home },
  { name: "Explore", icon: Compass },
  { name: "Communities", icon: Users },
  { name: "Questions", icon: CircleHelp },
  { name: "Verify", icon: FileSearch },
  { name: "Support", icon: Headphones },
];

const trending = [
  { name: "Artificial Intelligence", count: "2.4k discussions" },
  { name: "Digital Literacy", count: "1.8k discussions" },
  { name: "Science Explained", count: "956 discussions" },
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-extrabold text-indigo-700">
      {initials}
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: Post["tone"];
}) {
  let style = "bg-slate-100 text-slate-600 ring-slate-200";

  if (tone === "blue") {
    style = "bg-sky-50 text-sky-700 ring-sky-200";
  } else if (tone === "violet") {
    style = "bg-violet-50 text-violet-700 ring-violet-200";
  } else if (tone === "orange") {
    style = "bg-orange-50 text-orange-700 ring-orange-200";
  }

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 ring-inset " +
        style
      }
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
  const colors = {
    violet: "from-violet-800 via-indigo-600 to-blue-500",
    cyan: "from-cyan-800 via-teal-600 to-emerald-400",
    rose: "from-rose-700 via-fuchsia-600 to-orange-400",
  };

  const titles = {
    violet: "THE AI ERA",
    cyan: "STAY CURIOUS",
    rose: "INTERNET CULTURE",
  };

  const subtitles = {
    violet: "Creativity meets technology",
    cyan: "Questions create knowledge",
    rose: "Laugh. Learn. Repeat.",
  };

  return (
    <div
      className={
        "relative mt-4 min-h-[175px] overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white " +
        colors[tone]
      }
    >
      <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full border border-white/20" />
      <div className="absolute -right-2 -top-6 h-32 w-32 rounded-full border border-white/20" />
      <div className="absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex min-h-[125px] flex-col justify-between">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
          <Sparkles size={13} />
          A thought worth sharing
        </span>

        <div>
          <h3 className="text-3xl font-black tracking-tight">
            {titles[tone]}
          </h3>
          <p className="mt-1 text-sm text-white/80">{subtitles[tone]}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState(initialPosts);
  const [activePage, setActivePage] = useState("Home");
  const [filter, setFilter] = useState("For you");
  const [search, setSearch] = useState("");
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] =
    useState<Post["category"]>("Discussion");

  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");

  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsByPost, setCommentsByPost] = useState<
    Record<number, string[]>
  >({});

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts.filter((post) => {
      const text = [
        post.author,
        post.username,
        post.community,
        post.title,
        post.body,
        post.label,
      ]
        .join(" ")
        .toLowerCase();

      if (query && !text.includes(query)) return false;

      if (
        (activePage === "Questions" || filter === "Questions") &&
        post.category !== "Question"
      ) {
        return false;
      }

      if (
        filter === "Discussions" &&
        post.category === "Question"
      ) {
        return false;
      }

      return true;
    });
  }, [posts, search, activePage, filter]);

  function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newTitle.trim() || !newBody.trim()) return;

    const isMeme = newCategory === "Meme";

    const post: Post = {
      id: Date.now(),
      author: "Demo User",
      username: "demo_user",
      community: "General",
      time: "Just now",
      title: newTitle.trim(),
      body: newBody.trim(),
      category: newCategory,
      label: isMeme ? "Creator-declared meme" : "Not checked",
      tone: isMeme ? "orange" : "neutral",
      likes: 0,
      comments: 0,
    };

    setPosts((current) => [post, ...current]);
    setNewTitle("");
    setNewBody("");
    setNewCategory("Discussion");
    setCreateOpen(false);
    setActivePage("Home");
    setFilter("For you");
  }

  function toggleLike(postId: number) {
    setLiked((current) =>
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId],
    );
  }

  function toggleBookmark(postId: number) {
    setSaved((current) =>
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId],
    );
  }

  function addComment(
    event: FormEvent<HTMLFormElement>,
    postId: number,
  ) {
    event.preventDefault();

    const message = commentDraft.trim();
    if (!message) return;

    setCommentsByPost((current) => ({
      ...current,
      [postId]: [...(current[postId] || []), message],
    }));

    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, comments: post.comments + 1 }
          : post,
      ),
    );

    setCommentDraft("");
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
    <main className="min-h-screen bg-[#f5f6fb] pb-20 text-slate-900 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1500px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
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

          <label className="ml-4 hidden max-w-[500px] flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 md:flex">
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

            <Link
              href="/login"
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Join Verity ↗
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[220px_minmax(0,680px)] xl:grid-cols-[220px_minmax(0,680px)_280px]">
        {/* Left sidebar */}
        <aside
          className={
            (mobileMenuOpen ? "block" : "hidden") +
            " fixed inset-x-0 bottom-0 top-[72px] z-30 overflow-y-auto border-r border-slate-200 bg-[#f5f6fb] p-4 lg:sticky lg:top-[72px] lg:block lg:h-[calc(100vh-72px)] lg:border-0 lg:bg-transparent lg:p-0"
          }
        >
          <div className="py-6">
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Welcome to Verity</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ideas with context
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl"
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
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition " +
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
                Explore evidence and context instead of relying on viral claims
                alone.
              </p>
              <button
                type="button"
                onClick={() => setActivePage("Verify")}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900"
              >
                Explore trust tools <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 py-6">
          <label className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 md:hidden">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Verity..."
              className="w-full bg-transparent text-sm outline-none"
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
                A good check examines evidence about specific claims and
                separate signals about how media was created.
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Prepare check
                </button>
              </form>

              {verifyMessage && (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  {verifyMessage}
                </p>
              )}

              <div className="mt-7 space-y-3 rounded-2xl bg-slate-50 p-4">
                {[
                  "Identify the claim being evaluated.",
                  "Find supporting and contradicting source links.",
                  "Separate media origin from factual accuracy.",
                  "Show uncertainty and allow human review.",
                ].map((item) => (
                  <p key={item} className="flex gap-2 text-sm text-slate-600">
                    <CheckCircle2
                      size={17}
                      className="shrink-0 text-indigo-600"
                    />
                    {item}
                  </p>
                ))}
              </div>
            </section>
          ) : activePage === "Support" ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <Headphones size={25} />
              </div>

              <h1 className="mt-5 text-3xl font-black">How can we help?</h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose the type of support you need. Database-backed ticket
                submission will be connected separately.
              </p>

              {[
                ["Incorrect AI label", "Request a review of a content label."],
                ["Appeal a decision", "Challenge a moderation decision."],
                ["Report harmful content", "Report abuse or impersonation."],
                ["Account help", "Get help with a sign-in problem."],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="mt-3 rounded-2xl border border-slate-200 p-4"
                >
                  <h3 className="text-sm font-bold">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              ))}
            </section>
          ) : (
            <>
              {/* Hero section */}
              <section className="relative isolate overflow-hidden rounded-[28px] bg-[#171832] p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
                <div className="absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full bg-violet-600/45 blur-3xl" />
                <div className="absolute -bottom-40 right-20 -z-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute right-8 top-8 -z-10 hidden h-36 w-36 rounded-full border border-white/10 sm:block" />
                <div className="absolute right-14 top-14 -z-10 hidden h-24 w-24 rounded-full border border-white/10 sm:block" />

                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.19em] text-indigo-100">
                  <Sparkles size={13} />
                  A more thoughtful internet
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
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-indigo-950 transition hover:bg-indigo-50"
                  >
                    <Plus size={17} />
                    Start a conversation
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePage("Verify")}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
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

              {/* Feed heading */}
              <div className="mb-5 mt-8 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-600">
                    Your daily dose of curiosity
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-[28px]">
                    {pageTitle}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Good conversations start with better questions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="hidden shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 sm:flex"
                >
                  <Plus size={17} />
                  Post
                </button>
              </div>

              {/* Feed filters */}
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
                      "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:text-sm " +
                      (filter === name
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")
                    }
                  >
                    <Icon size={15} />
                    {name}
                  </button>
                ))}
              </div>

              {/* Post composer shortcut */}
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
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition group-hover:scale-105">
                  <ImagePlus size={18} />
                </span>
              </button>

              <div className="mb-4 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3 text-xs leading-5 text-indigo-950">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-indigo-700" />
                <p>
                  <strong>Content with context.</strong> The example posts
                  below are demonstration content, not live AI-detection
                  results.
                </p>
              </div>

              {/* Posts */}
              <div className="space-y-4">
                {visiblePosts.map((post) => {
                  const isLiked = liked.includes(post.id);
                  const isSaved = saved.includes(post.id);

                  return (
                    <article
                      key={post.id}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-indigo-100 hover:shadow-lg hover:shadow-slate-200/50"
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
                              <Users size={12} />
                              {post.community}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const report = window.confirm(
                                "Report this post for review?",
                              );

                              if (report) {
                                window.alert(
                                  "Reporting will be connected to the support system in a later step.",
                                );
                              }
                            }}
                            className="rounded-xl px-2 py-1 text-lg text-slate-400 hover:bg-slate-100"
                            aria-label="Post options"
                          >
                            ···
                          </button>
                        </div>

                        <h3 className="mt-4 text-[17px] font-extrabold leading-7 tracking-tight text-slate-900 sm:text-lg">
                          {post.title}
                        </h3>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {post.body}
                        </p>

                        {post.art && <Artwork tone={post.art} />}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Badge label={post.label} tone={post.tone} />

                          <button
                            type="button"
                            onClick={() => setActivePage("Verify")}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                          >
                            <ShieldCheck size={13} />
                            Content context
                          </button>
                        </div>

                        <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 sm:gap-6">
                          <button
                            type="button"
                            onClick={() => toggleLike(post.id)}
                            className={
                              "inline-flex items-center gap-2 text-sm font-bold transition " +
                              (isLiked
                                ? "text-rose-600"
                                : "text-slate-500 hover:text-rose-600")
                            }
                          >
                            <Heart
                              size={18}
                              fill={isLiked ? "currentColor" : "none"}
                            />
                            {post.likes + (isLiked ? 1 : 0)}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setOpenComments((current) =>
                                current === post.id ? null : post.id,
                              )
                            }
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
                          >
                            <MessageCircle size={18} />
                            {post.comments}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleBookmark(post.id)}
                            className={
                              "ml-auto inline-flex items-center gap-2 text-sm font-bold " +
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
                                  window.location.href,
                                );
                                window.alert("Page link copied.");
                              } catch {
                                window.alert(
                                  "Copy the page URL from your browser.",
                                );
                              }
                            }}
                            aria-label="Share page"
                            className="text-slate-400 hover:text-indigo-700"
                          >
                            <Share2 size={17} />
                          </button>
                        </div>

                        {openComments === post.id && (
                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <form
                              onSubmit={(event) => addComment(event, post.id)}
                              className="flex gap-2"
                            >
                              <input
                                value={commentDraft}
                                onChange={(event) =>
                                  setCommentDraft(event.target.value)
                                }
                                placeholder="Add a thoughtful comment..."
                                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                              />
                              <button
                                type="submit"
                                aria-label="Send comment"
                                className="rounded-xl bg-indigo-600 px-3 text-white hover:bg-indigo-700"
                              >
                                <Send size={16} />
                              </button>
                            </form>

                            {(commentsByPost[post.id] || []).map(
                              (comment, index) => (
                                <p
                                  key={`${post.id}-${index}`}
                                  className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
                                >
                                  {comment}
                                </p>
                              ),
                            )}

                            <p className="mt-3 text-xs text-slate-400">
                              Comments are temporary until connected to the
                              database.
                            </p>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}

                {visiblePosts.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <Search size={28} className="mx-auto text-slate-300" />
                    <h3 className="mt-4 font-extrabold">No posts found</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Try a different search or select another filter.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* Right sidebar */}
        <aside className="hidden space-y-5 py-6 xl:block">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-5 text-white">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                <Activity size={15} />
                THE VERITY DIFFERENCE
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
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-extrabold text-indigo-900 hover:bg-indigo-50"
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
              {trending.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSearch(item.name)}
                  className="group flex w-full items-start gap-3 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[10px] font-extrabold text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold group-hover:text-indigo-700">
                      {item.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {item.count}
                    </span>
                  </span>
                  <ArrowUpRight
                    size={15}
                    className="text-slate-300 group-hover:text-indigo-600"
                  />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Users size={20} />
            </div>

            <h2 className="mt-3 text-sm font-extrabold">
              Better discussions start together.
            </h2>

            <p className="mt-2 text-xs leading-6 text-slate-500">
              Follow your interests and find people who enjoy discussing and
              learning about ideas.
            </p>

            <button
              type="button"
              onClick={() => setActivePage("Communities")}
              className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-indigo-700 hover:text-indigo-900"
            >
              Browse communities <ArrowRight size={14} />
            </button>
          </section>

          <div className="px-2 text-[11px] leading-6 text-slate-400">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Link href="/guidelines" className="hover:text-indigo-700">
                Guidelines
              </Link>
              <Link href="/privacy" className="hover:text-indigo-700">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-indigo-700">
                Terms
              </Link>
            </div>
            <p className="mt-2">
              © 2026 Verity. Media origin and factual accuracy are assessed
              separately.
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile navigation */}
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
              "flex flex-col items-center gap-1 py-2 text-[10px] font-bold " +
              (activePage === name ? "text-indigo-700" : "text-slate-400")
            }
          >
            <Icon size={20} />
            {name}
          </button>
        ))}
      </nav>

      {/* Create post dialog */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCreateOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-post-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-center justify-between">
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
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createPost} className="mt-6 space-y-4">
              <label className="block text-sm font-bold">
                Post type
                <select
                  value={newCategory}
                  onChange={(event) =>
                    setNewCategory(event.target.value as Post["category"])
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="Discussion">Discussion</option>
                  <option value="Question">Question</option>
                  <option value="News">News</option>
                  <option value="Meme">Meme or entertainment</option>
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
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-indigo-400"
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
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal leading-6 outline-none focus:border-indigo-400"
                />
              </label>

              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                This version uses temporary browser state. Posts are not saved
                to Supabase yet.
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-indigo-700"
                >
                  Publish preview <Send size={15} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}