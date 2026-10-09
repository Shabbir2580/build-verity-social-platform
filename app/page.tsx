"use client";

import { useMemo, useState, type FormEvent } from "react";

type Post = {
  id: number;
  author: string;
  username: string;
  community: string;
  title: string;
  body: string;
  label: string;
  labelColor: string;
  likes: number;
  comments: number;
  category: string;
};

const initialPosts: Post[] = [
  {
    id: 1,
    author: "Aarav Mehta",
    username: "curiousmind",
    community: "Digital Literacy",
    title: "Before forwarding viral news, check the original source.",
    body: "A screenshot can be genuine while the caption is misleading. Check the original publication, date, location and supporting evidence before sharing a claim.",
    label: "Not verified",
    labelColor: "gray",
    likes: 128,
    comments: 34,
    category: "Discussion",
  },
  {
    id: 2,
    author: "Sana Qureshi",
    username: "pixelandpaper",
    community: "AI & Technology",
    title: "AI-generated does not automatically mean fake.",
    body: "An AI illustration can be legitimate entertainment. A real photograph can also be used with a misleading caption. Media origin and factual accuracy are two different questions.",
    label: "Educational",
    labelColor: "blue",
    likes: 86,
    comments: 19,
    category: "Discussion",
  },
  {
    id: 3,
    author: "Rohan Shah",
    username: "chaiandcode",
    community: "Learning Together",
    title: "What skill are you learning this month?",
    body: "I am learning how databases and full-stack applications work. What are you learning, and which resources have helped you?",
    label: "Question",
    labelColor: "blue",
    likes: 52,
    comments: 12,
    category: "Question",
  },
  {
    id: 4,
    author: "Mira Creates",
    username: "miramakes",
    community: "Memes & Entertainment",
    title: "When AI writes your assignment but cannot explain it in viva.",
    body: "Submitting an answer and actually understanding it are two very different things. 😅",
    label: "Creator-declared meme",
    labelColor: "orange",
    likes: 241,
    comments: 48,
    category: "Meme",
  },
];

const navigation = [
  { id: "Home", icon: "⌂" },
  { id: "Explore", icon: "⌕" },
  { id: "Communities", icon: "◎" },
  { id: "Questions", icon: "?" },
  { id: "Verify", icon: "✳" },
  { id: "Support", icon: "♧" },
];

export default function HomePage() {
  const [posts, setPosts] = useState(initialPosts);
  const [activePage, setActivePage] = useState("Home");
  const [filter, setFilter] = useState("For you");
  const [search, setSearch] = useState("");
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("Discussion");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts.filter((post) => {
      const text =
        `${post.author} ${post.username} ${post.community} ${post.title} ${post.body}`.toLowerCase();

      if (query && !text.includes(query)) return false;
      if (activePage === "Questions" && post.category !== "Question")
        return false;
      if (activePage === "Communities" && !post.community) return false;

      if (filter === "Questions" && post.category !== "Question")
        return false;

      if (filter === "Discussions" && post.category === "Question")
        return false;

      return true;
    });
  }, [posts, search, activePage, filter]);

  function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newTitle.trim() || !newBody.trim()) return;

    const newPost: Post = {
      id: Date.now(),
      author: "Demo User",
      username: "demo_user",
      community: "General",
      title: newTitle.trim(),
      body: newBody.trim(),
      label:
        newCategory === "Meme"
          ? "Creator-declared meme"
          : "Not checked",
      labelColor: newCategory === "Meme" ? "orange" : "gray",
      likes: 0,
      comments: 0,
      category: newCategory,
    };

    setPosts((current) => [newPost, ...current]);
    setNewTitle("");
    setNewBody("");
    setNewCategory("Discussion");
    setCreateOpen(false);
    setActivePage("Home");
    setFilter("For you");
  }

  function toggleLike(id: number) {
    setLiked((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleSave(id: number) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  const heading =
    activePage === "Explore"
      ? "Explore ideas"
      : activePage === "Communities"
        ? "Your communities"
        : activePage === "Questions"
          ? "Questions worth answering"
          : "Your community feed";

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1450px] flex-wrap items-center gap-4 px-5 py-3">
          <button
            type="button"
            onClick={() => setActivePage("Home")}
            className="flex items-center gap-2 text-2xl font-black tracking-tight"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white">
              ◈
            </span>
            verity<span className="text-indigo-600">.</span>
          </button>

          <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-lg text-slate-400">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search posts and communities..."
              className="w-full bg-transparent text-sm outline-none"
              aria-label="Search posts"
            />
          </div>

          <a
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Log in
          </a>

          <a
            href="/signup"
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Join Verity
          </a>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1450px] grid-cols-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[220px_minmax(0,680px)] xl:grid-cols-[220px_minmax(0,680px)_280px]">
        <aside className="space-y-5">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            + Create a post
          </button>

          <nav className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2">
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActivePage(item.id);
                  setVerifyMessage("");
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${
                  activePage === item.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="w-6 text-center text-lg">{item.icon}</span>
                {item.id}
              </button>
            ))}
          </nav>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="text-lg">🛡️</div>
            <h3 className="mt-2 font-bold">Think before you share.</h3>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Look for evidence and context instead of relying on viral claims
              alone.
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          {activePage === "Verify" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="text-3xl">🔎</div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-indigo-600">
                Content context
              </p>
              <h1 className="mt-2 text-3xl font-black">
                Check before you share.
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enter a public article or post link to prepare it for a
                future evidence-based verification service.
              </p>

              <form
                className="mt-6 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setVerifyMessage(
                    verifyUrl.trim()
                      ? "Live verification is not connected yet. No claim has been verified."
                      : "Please enter a URL."
                  );
                }}
              >
                <input
                  value={verifyUrl}
                  onChange={(event) => setVerifyUrl(event.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                />
                <button className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">
                  Prepare check
                </button>
              </form>

              {verifyMessage && (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  {verifyMessage}
                </p>
              )}

              <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                A media file can be AI-generated without being misinformation.
                A genuine photograph can also accompany a false caption. These
                require separate assessments.
              </p>
            </div>
          ) : activePage === "Support" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h1 className="text-2xl font-black">Help & support</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Support tickets and human review will be connected to the
                database in the next development step.
              </p>

              {[
                "Incorrect AI label",
                "Appeal a moderation decision",
                "Report harmful content",
                "Account or technical issue",
              ].map((item) => (
                <div
                  key={item}
                  className="mt-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  Your corner of the internet
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">
                  {heading}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Ideas, discussions and content worth understanding.
                </p>
              </div>

              <div className="mb-4 flex flex-wrap gap-5 border-b border-slate-200">
                {["For you", "Latest", "Questions", "Discussions"].map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={`border-b-2 pb-3 text-sm font-semibold ${
                        filter === item
                          ? "border-indigo-600 text-indigo-700"
                          : "border-transparent text-slate-500"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mb-5 w-full rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-400 hover:border-indigo-300"
              >
                Share something worth discussing...
                <span className="float-right font-bold text-indigo-600">
                  + Create
                </span>
              </button>

              <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs leading-5 text-indigo-900">
                These posts are demonstration content. AI detection and
                live fact-checking are not connected yet.
              </div>

              <div className="space-y-4">
                {visiblePosts.map((post) => {
                  const isLiked = liked.includes(post.id);
                  const isSaved = saved.includes(post.id);

                  return (
                    <article
                      key={post.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                          {post.author
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold">{post.author}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            @{post.username} · {post.community}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            window.alert(
                              "Reporting will be connected to the support system later."
                            )
                          }
                          className="text-lg text-slate-400"
                          aria-label="Report options"
                        >
                          ···
                        </button>
                      </div>

                      <h2 className="mt-4 text-lg font-bold leading-7">
                        {post.title}
                      </h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                        {post.body}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                            post.labelColor === "blue"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : post.labelColor === "orange"
                                ? "border-orange-200 bg-orange-50 text-orange-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {post.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePage("Verify")}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Content context
                        </button>
                      </div>

                      <div className="mt-4 flex items-center gap-5 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => toggleLike(post.id)}
                          className={`text-sm font-semibold ${
                            isLiked ? "text-rose-600" : "text-slate-500"
                          }`}
                        >
                          {isLiked ? "♥" : "♡"}{" "}
                          {post.likes + (isLiked ? 1 : 0)}
                        </button>

                        <span className="text-sm text-slate-500">
                          ◯ {post.comments} comments
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleSave(post.id)}
                          className={`ml-auto text-sm font-semibold ${
                            isSaved ? "text-indigo-700" : "text-slate-500"
                          }`}
                        >
                          {isSaved ? "✓ Saved" : "♧ Save"}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {visiblePosts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <h2 className="font-bold">No posts found</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Try a different search or filter.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="hidden space-y-5 xl:block">
          <section className="rounded-2xl bg-gradient-to-br from-indigo-950 to-indigo-600 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">
              The Verity difference
            </p>
            <h2 className="mt-4 text-2xl font-black leading-tight">
              Context makes conversations better.
            </h2>
            <p className="mt-3 text-sm leading-6 text-indigo-100">
              Understand claims, inspect evidence and challenge incorrect
              labels through human review.
            </p>
            <button
              type="button"
              onClick={() => setActivePage("Verify")}
              className="mt-5 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-800"
            >
              Explore verification →
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Trending topics</h2>
            {[
              "#ArtificialIntelligence",
              "#DigitalLiteracy",
              "#ScienceExplained",
            ].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSearch(item.replace("#", ""))}
                className="mt-4 block text-left text-sm font-semibold text-indigo-700 hover:text-indigo-900"
              >
                {item}
              </button>
            ))}
          </section>

          <p className="px-2 text-xs leading-6 text-slate-400">
            Verity separates media origin from factual accuracy.
            <br />
            © 2026 Verity
          </p>
        </aside>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="create-title" className="text-xl font-black">
                Create a post
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold">
                Post type
                <select
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <option>Discussion</option>
                  <option>Question</option>
                  <option>News</option>
                  <option>Meme</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                Title
                <input
                  required
                  maxLength={160}
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="What would you like to share?"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500"
                />
              </label>

              <label className="block text-sm font-semibold">
                Description
                <textarea
                  required
                  rows={5}
                  maxLength={5000}
                  value={newBody}
                  onChange={(event) => setNewBody(event.target.value)}
                  placeholder="Add your thoughts, sources or context..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500"
                />
              </label>

              <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                This first version stores newly created posts only in
                temporary page state. Database publishing comes next.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Publish preview
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}