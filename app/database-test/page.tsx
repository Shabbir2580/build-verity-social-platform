"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
} from "lucide-react";

type PostRow = {
  id: string;
  title: string | null;
  body: string;
  type: string;
  status: string;
  created_at: string;
};

export default function DatabaseTestPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState("");

  async function loadPosts() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: queryError } = await supabase
        .from("posts")
        .select("id, title, body, type, status, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(10);

      if (queryError) {
        throw queryError;
      }

      setPosts(data ?? []);
      setCheckedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  return (
    <main className="min-h-[100dvh] bg-[#f5f6fb] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white hover:text-indigo-700"
        >
          <ArrowLeft size={17} />
          Back to Verity
        </Link>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <Database size={25} />
          </div>

          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">
            Verity diagnostics
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Database connection test
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Checking whether the website can read published posts from your
            existing Supabase database.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              {loading ? (
                <RefreshCw className="animate-spin text-indigo-600" size={21} />
              ) : error ? (
                <AlertCircle className="text-red-600" size={22} />
              ) : (
                <CheckCircle2 className="text-emerald-600" size={22} />
              )}

              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {loading
                    ? "Connecting..."
                    : error
                      ? "Connection or query failed"
                      : "Database query successful"}
                </p>

                <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                  {loading
                    ? "Please wait."
                    : error
                      ? "Read the error details below."
                      : `${posts.length} published post(s) returned.`}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
            >
              <strong>Error details:</strong>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              The database query succeeded, but no published posts were
              returned. This is normal if your table is empty.
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div className="mt-5 space-y-3">
              <h2 className="font-bold">Posts retrieved from Supabase</h2>

              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                      {post.type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {post.status}
                    </span>
                  </div>

                  <h3 className="mt-3 break-words font-bold">
                    {post.title || "Untitled post"}
                  </h3>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                    {post.body}
                  </p>

                  <p className="mt-3 break-all text-xs text-slate-400">
                    ID: {post.id}
                  </p>
                </article>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => void loadPosts()}
            disabled={loading}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            Test connection again
          </button>

          {checkedAt && (
            <p className="mt-3 text-center text-xs text-slate-400">
              Last successful query: {checkedAt}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}