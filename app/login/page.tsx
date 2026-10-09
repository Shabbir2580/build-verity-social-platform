"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (loginError) {
        if (loginError.message.toLowerCase().includes("email not confirmed")) {
          throw new Error(
            "Please verify your email address before signing in. Check your inbox for the confirmation email."
          );
        }

        throw new Error(
          "We couldn't sign you in with those details. Check your email and password and try again."
        );
      }

      setNotice("Login successful. Opening Verity...");

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6fb] px-4 py-10 text-slate-900 sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        {/* Branding panel */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-8 text-white sm:p-10">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-violet-500/30 blur-3xl" />

          <Link href="/" className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700">
              <ShieldCheck size={25} />
            </span>

            <span className="text-2xl font-black tracking-tight">
              verity<span className="text-indigo-300">.</span>
            </span>
          </Link>

          <div className="relative py-12 md:py-20">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
              Welcome back
            </span>

            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">
              Good to see you.
              <br />
              <span className="text-indigo-200">Stay curious.</span>
            </h1>

            <p className="mt-5 max-w-sm text-sm leading-7 text-indigo-100">
              Return to your communities, continue conversations and explore
              the evidence behind the content you encounter.
            </p>

            <div className="mt-8 space-y-4 text-sm text-indigo-100">
              <p>✓ Discussions that matter</p>
              <p>✓ Communities built around your interests</p>
              <p>✓ Evidence and context in one place</p>
            </div>
          </div>

          <p className="relative text-xs text-indigo-200">
            Share freely. Think critically. Know more.
          </p>
        </section>

        {/* Login form */}
        <section className="p-6 sm:p-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"
          >
            <ArrowLeft size={16} />
            Back to homepage
          </Link>

          <div className="mb-8 mt-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
              Your account
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Log in to Verity
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pick up where you left off.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              {notice}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="flex items-center rounded-xl border border-slate-200 pr-3 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border-0 bg-transparent px-4 py-3.5 text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">NEW TO VERITY?</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Link
            href="/signup"
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
          >
            Create an account
          </Link>

          <p className="mt-7 text-center text-xs leading-5 text-slate-400">
            By using Verity, you agree to follow our community guidelines and
            respect other users.
          </p>
        </section>
      </div>
    </main>
  );
}