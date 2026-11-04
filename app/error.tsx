"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep diagnostic details in the browser console without exposing them to visitors.
    console.error("Verity route error:", error);
  }, [error]);

  return (
    <main className="verity-app flex min-h-screen items-center justify-center px-5 py-12 text-slate-900">
      <section
        role="alert"
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-10"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-black text-indigo-700">
          !
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          This page hit an unexpected error.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your account and saved content have not been intentionally changed.
          Try loading this page again. If the problem continues, return to the
          Verity home page.
        </p>
        {error.digest ? (
          <p className="mt-4 text-xs text-slate-400">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Back to Verity
          </a>
        </div>
      </section>
    </main>
  );
}
