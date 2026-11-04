"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUp, Check, CircleHelp, LoaderCircle, MessageSquare, Plus, Send, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: string;
  author_id: string;
  community_id: string | null;
  title: string;
  details: string;
  tags: string[];
  references: string[];
  accepted_answer_id: string | null;
  status: string;
  created_at: string;
  author_name: string;
  username: string;
};

type Answer = {
  id: string;
  question_id: string;
  author_id: string;
  body: string;
  citations: string[];
  status: string;
  created_at: string;
  author_name: string;
  username: string;
  score: number;
  myVote: number;
};

function timeAgo(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

export default function QuestionsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [tags, setTags] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const [{ data: authData, error: authError }, { data: questionRows, error: questionError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("questions")
          .select("id, author_id, community_id, title, details, tags, references, accepted_answer_id, status, created_at")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(60),
      ]);
      if (authError) throw authError;
      if (questionError) throw questionError;
      const currentUserId = authData.user?.id ?? null;
      setUserId(currentUserId);
      const rows = questionRows ?? [];
      const authorIds = [...new Set(rows.map((row) => row.author_id))];
      const questionIds = rows.map((row) => row.id);

      let profiles: { id: string; display_name: string; username: string }[] = [];
      let answerRows: { id: string; question_id: string; author_id: string; body: string; citations: string[]; status: string; created_at: string }[] = [];
      if (authorIds.length) {
        const { data, error: profileError } = await supabase.from("profiles")
          .select("id, display_name, username").in("id", authorIds);
        if (profileError) throw profileError;
        profiles = data ?? [];
      }
      if (questionIds.length) {
        const { data, error: answerError } = await supabase.from("answers")
          .select("id, question_id, author_id, body, citations, status, created_at")
          .in("question_id", questionIds).eq("status", "published")
          .order("created_at", { ascending: true }).limit(300);
        if (answerError) throw answerError;
        answerRows = data ?? [];
      }
      const answerAuthorIds = [...new Set(answerRows.map((row) => row.author_id))];
      const missingAuthors = answerAuthorIds.filter((id) => !authorIds.includes(id));
      if (missingAuthors.length) {
        const { data, error: profileError } = await supabase.from("profiles")
          .select("id, display_name, username").in("id", missingAuthors);
        if (profileError) throw profileError;
        profiles = [...profiles, ...(data ?? [])];
      }
      const answerIds = answerRows.map((row) => row.id);
      let voteRows: { answer_id: string; user_id: string; value: number }[] = [];
      if (answerIds.length) {
        const { data, error: voteError } = await supabase.from("question_votes")
          .select("answer_id, user_id, value").in("answer_id", answerIds);
        if (voteError) throw voteError;
        voteRows = data ?? [];
      }
      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
      const answerMap: Record<string, Answer[]> = {};
      for (const row of answerRows) {
        const profile = profileMap.get(row.author_id);
        const votes = voteRows.filter((vote) => vote.answer_id === row.id);
        const answer: Answer = {
          ...row,
          author_name: profile?.display_name || profile?.username || "Community member",
          username: profile?.username || "member",
          score: votes.reduce((total, vote) => total + vote.value, 0),
          myVote: currentUserId ? votes.find((vote) => vote.user_id === currentUserId)?.value ?? 0 : 0,
        };
        answerMap[row.question_id] = [...(answerMap[row.question_id] ?? []), answer];
      }
      setAnswers(answerMap);
      setQuestions(rows.map((row) => {
        const profile = profileMap.get(row.author_id);
        return {
          ...row,
          tags: row.tags ?? [],
          references: row.references ?? [],
          author_name: profile?.display_name || profile?.username || "Community member",
          username: profile?.username || "member",
        };
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQuestions(); }, [loadQuestions]);

  const visibleQuestions = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return questions;
    return questions.filter((question) =>
      [question.title, question.details, question.author_name, question.username, ...question.tags]
        .join(" ").toLowerCase().includes(value),
    );
  }, [questions, query]);

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!userId) {
      window.location.href = "/login?next=%2Fquestions";
      return;
    }
    if (title.trim().length < 10) {
      setError("Write a clear question title with at least 10 characters.");
      return;
    }
    if (title.trim().length > 300 || details.trim().length > 10000) {
      setError("The title or details exceed the allowed length.");
      return;
    }
    const cleanTags = [...new Set(tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("questions").insert({
        author_id: userId,
        title: title.trim(),
        details: details.trim(),
        tags: cleanTags,
        references: [],
        status: "published",
      });
      if (insertError) throw insertError;
      setTitle("");
      setDetails("");
      setTags("");
      setShowComposer(false);
      setNotice("Your question has been published.");
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish your question.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>, questionId: string) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!userId) {
      window.location.href = "/login?next=%2Fquestions";
      return;
    }
    const body = (drafts[questionId] ?? "").trim();
    if (!body) return;
    if (body.length > 20000) {
      setError("Your answer is too long (maximum 20,000 characters).");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("answers").insert({
        question_id: questionId,
        author_id: userId,
        body,
        citations: [],
        status: "published",
      });
      if (insertError) throw insertError;
      setDrafts((current) => ({ ...current, [questionId]: "" }));
      setNotice("Your answer has been added.");
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your answer.");
    } finally {
      setBusy(false);
    }
  }

  async function vote(answer: Answer, value: number) {
    if (!userId) {
      window.location.href = "/login?next=%2Fquestions";
      return;
    }
    setError("");
    const supabase = createClient();
    const nextValue = answer.myVote === value ? 0 : value;
    const result = nextValue === 0
      ? await supabase.from("question_votes").delete().eq("answer_id", answer.id).eq("user_id", userId)
      : await supabase.from("question_votes").upsert(
          { answer_id: answer.id, user_id: userId, value: nextValue },
          { onConflict: "answer_id,user_id" },
        );
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setAnswers((current) => ({
      ...current,
      [answer.question_id]: (current[answer.question_id] ?? []).map((item) => item.id === answer.id
        ? { ...item, score: item.score - item.myVote + nextValue, myVote: nextValue }
        : item),
    }));
  }

  async function acceptAnswer(question: Question, answer: Answer) {
    if (!userId || userId !== question.author_id) return;
    setError("");
    setNotice("");
    const supabase = createClient();
    const { error: updateError } = await supabase.from("questions")
      .update({ accepted_answer_id: answer.id })
      .eq("id", question.id)
      .eq("author_id", userId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setQuestions((current) => current.map((item) => item.id === question.id
      ? { ...item, accepted_answer_id: answer.id }
      : item));
    setNotice("Answer marked as accepted.");
  }

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 pb-16 text-slate-900 sm:px-6">
      <header className="mx-auto flex min-h-[72px] max-w-5xl items-center justify-between border-b border-slate-200">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700">
          <ArrowLeft size={17} /> Back to feed
        </Link>
        <Link href="/" className="text-lg font-black tracking-tight text-slate-950">Verity<span className="text-indigo-600">.</span></Link>
      </header>

      <section className="mx-auto max-w-5xl pt-9">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-200 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-100">
                <CircleHelp size={14} /> Knowledge, not noise
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Questions worth answering.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Ask clearly, share useful sources, and build answers together. Community votes show which answers people find helpful; they do not prove a claim is true.
              </p>
            </div>
            <button type="button" onClick={() => setShowComposer((value) => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-400">
              <Plus size={17} /> Ask a question
            </button>
          </div>
          <label className="mt-7 block">
            <span className="sr-only">Search questions</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions, topics or people..." className="min-h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/30" />
          </label>
        </div>

        {showComposer && (
          <form onSubmit={createQuestion} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2"><CircleHelp className="text-indigo-600" size={19} /><h2 className="font-extrabold">Ask the community</h2></div>
            <label className="mb-2 block text-xs font-bold text-slate-600">Question title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} required placeholder="What do you want to understand?" className="mb-4 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            <label className="mb-2 block text-xs font-bold text-slate-600">Details (optional)</label>
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={10000} rows={4} placeholder="Add context, what you have tried, and what kind of answer would help..." className="mb-4 w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            <label className="mb-2 block text-xs font-bold text-slate-600">Topics (comma-separated)</label>
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="science, technology, media literacy" className="mb-5 min-h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setShowComposer(false)} className="min-h-10 rounded-xl px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={15} />} Publish question</button>
            </div>
          </form>
        )}

        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
        {error && <div role="alert" className="mt-5 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

        <div className="mt-7 flex items-center justify-between gap-3">
          <div><h2 className="text-xl font-black">Community questions</h2><p className="mt-1 text-xs text-slate-500">{visibleQuestions.length} shown · newest first</p></div>
          <button type="button" onClick={() => void loadQuestions()} className="min-h-9 rounded-lg px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Refresh</button>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Loading questions...</div>
        ) : visibleQuestions.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <CircleHelp className="mx-auto text-slate-300" size={34} />
            <h3 className="mt-3 font-extrabold">No questions found</h3>
            <p className="mt-1 text-sm text-slate-500">Try another search or ask the first question.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {visibleQuestions.map((question) => {
              const questionAnswers = answers[question.id] ?? [];
              const sortedAnswers = [...questionAnswers].sort((a, b) =>
                Number(b.id === question.accepted_answer_id) - Number(a.id === question.accepted_answer_id) || b.score - a.score,
              );
              return (
                <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{question.author_name} <span className="font-normal text-slate-400">@{question.username}</span></span>
                    <time dateTime={question.created_at}>{timeAgo(question.created_at)}</time>
                  </div>
                  <h3 className="mt-3 text-xl font-extrabold leading-snug tracking-tight">{question.title}</h3>
                  {question.details && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{question.details}</p>}
                  {question.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{question.tags.map((tag) => <span key={tag} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">#{tag}</span>)}</div>}

                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
                    <MessageSquare size={15} /> {questionAnswers.length} {questionAnswers.length === 1 ? "answer" : "answers"}
                    {question.accepted_answer_id && <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"><ShieldCheck size={13} /> Accepted answer</span>}
                  </div>

                  {sortedAnswers.map((answer) => (
                    <div key={answer.id} className={`mt-4 rounded-xl border p-4 ${answer.id === question.accepted_answer_id ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-slate-50/70"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-slate-700">{answer.author_name} <span className="font-normal text-slate-400">@{answer.username}</span> · {timeAgo(answer.created_at)}</p>
                        {answer.id === question.accepted_answer_id && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"><Check size={13} /> Accepted</span>}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{answer.body}</p>
                      {answer.citations.length > 0 && <div className="mt-3 border-t border-slate-200 pt-3"><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">References supplied by author</p>{answer.citations.map((citation, index) => <p key={index} className="break-all text-xs text-indigo-700">{citation}</p>)}</div>}
                      <div className="mt-3 flex items-center gap-2">
                        <button type="button" aria-label="Upvote answer" aria-pressed={answer.myVote === 1} onClick={() => void vote(answer, 1)} className={`inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold ${answer.myVote === 1 ? "bg-indigo-100 text-indigo-700" : "bg-white text-slate-500 hover:text-indigo-700"}`}><ArrowUp size={14} /> Helpful · {answer.score}</button>
                        {userId === question.author_id && answer.id !== question.accepted_answer_id && <button type="button" onClick={() => void acceptAnswer(question, answer)} className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"><Check size={14} /> Accept answer</button>}
                      </div>
                    </div>
                  ))}

                  <form onSubmit={(event) => void submitAnswer(event, question.id)} className="mt-4">
                    <label className="mb-2 block text-xs font-bold text-slate-600">Add an answer</label>
                    <textarea value={drafts[question.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [question.id]: event.target.value }))} rows={3} maxLength={20000} placeholder="Share a useful explanation. Include evidence where possible..." className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                    <div className="mt-2 flex justify-end"><button disabled={busy || !(drafts[question.id] ?? "").trim()} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-xs font-bold text-white disabled:opacity-40"><Send size={13} /> Submit answer</button></div>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
