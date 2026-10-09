"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const supabase = createClient();

      const callbackUrl = new URL(
        "/auth/callback",
        window.location.origin
      );

      callbackUrl.searchParams.set("next", "/reset-password");

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: callbackUrl.toString(),
        });

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not send the recovery email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6fb] px-4 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xl font-black tracking-tight"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ShieldCheck size={23} />
          </span>
          verity<span className="text-indigo-600">.</span>
        </Link>

        <div className="mt-9 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          {success ? (
            <CheckCircle2 size={27} />
          ) : (
            <Mail size={27} />
          )}
        </div>

        <h1 className="mt-6 text-3xl font-black tracking-tight">
          Forgot your password?
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter the email address associated with your account. If the account
          is eligible, Supabase will send a password recovery link.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            {error}
          </div>
        )}

        {success ? (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5"
          >
            <h2 className="font-bold text-green-900">
              Check your email
            </h2>
            <p className="mt-2 text-sm leading-6 text-green-800">
              If a matching account exists, a recovery email will arrive
              shortly. Check your spam folder too, and use the newest recovery
              link.
            </p>

            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="mt-4 text-sm font-bold text-green-900 underline underline-offset-4"
            >
              Try another email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Email address
              </span>

              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending recovery email..." : "Send recovery link"}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-7 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-700"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>
      </section>
    </main>
  );
}