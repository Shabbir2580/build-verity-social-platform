"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleGoogleSignUp() {
    setError("");
    setSuccess("");
    setOauthLoading(true);
    try {
      const supabase = createClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/");
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.toString() },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up failed. Please try again.");
      setOauthLoading(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanUsername || !cleanEmail) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      setError(
        "Username must contain 3–24 characters using lowercase letters, numbers or underscores."
      );
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const callbackUrl = new URL(
        "/auth/callback",
        window.location.origin
      );

      callbackUrl.searchParams.set("next", "/");

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: callbackUrl.toString(),
            data: {
              display_name: cleanName,
              username: cleanUsername,
            },
          },
        });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }

      setSuccess(
        "Your account request was received. Check your email for the confirmation link before signing in."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 text-slate-900 sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        <section className="flex flex-col justify-between bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-600 p-8 text-white sm:p-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl font-black text-indigo-700">
              ◈
            </span>
            <span className="text-2xl font-black tracking-tight">
              verity<span className="text-indigo-300">.</span>
            </span>
          </Link>

          <div className="py-12 md:py-20">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
              A more thoughtful internet
            </span>

            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">
              Join the conversation.
              <br />
              Question what you see.
            </h1>

            <p className="mt-5 max-w-sm text-sm leading-7 text-indigo-100">
              Discover communities, share ideas, ask questions and explore
              the evidence behind the content you encounter.
            </p>

            <div className="mt-8 space-y-4 text-sm text-indigo-100">
              <p>✓ Communities built around your interests</p>
              <p>✓ Questions, discussions and useful answers</p>
              <p>✓ Transparent content context and human review</p>
            </div>
          </div>

          <p className="text-xs text-indigo-200">
            Share freely. Think critically. Know more.
          </p>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
              Get started
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Create your account
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Join Verity and make your voice part of the conversation.
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

          {success && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800"
            >
              {success}
              <p className="mt-3">
                <Link
                  href="/login"
                  className="font-bold underline underline-offset-4"
                >
                  Go to login
                </Link>
              </p>
            </div>
          )}

            <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm leading-6 text-slate-600">
              <input
                required
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) =>
                  setAcceptedTerms(event.target.checked)
                }
                className="mt-1 h-4 w-4 accent-indigo-600"
              />
              <span>
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-indigo-700 underline"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-indigo-700 underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

          <button
            type="button"
            onClick={() => void handleGoogleSignUp()}
            disabled={loading || oauthLoading || Boolean(success) || !acceptedTerms}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden="true" className="text-lg font-black text-[#4285F4]">G</span>
            {oauthLoading ? "Connecting to Google..." : "Continue with Google"}
          </button>
          <div className="mb-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400">OR SIGN UP WITH EMAIL</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Full name
              </span>
              <input
                required
                autoComplete="name"
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Username
              </span>
              <div className="flex items-center rounded-xl border border-slate-200 px-4 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50">
                <span className="text-sm text-slate-400">@</span>
                <input
                  required
                  autoComplete="username"
                  minLength={3}
                  maxLength={24}
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "")
                    )
                  }
                  placeholder="your_username"
                  className="w-full border-0 px-2 py-3 text-sm outline-none"
                />
              </div>
              <span className="mt-1 block text-xs text-slate-400">
                Use 3–24 lowercase letters, numbers or underscores.
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Email address
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Password
              </span>
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Confirm password
              </span>
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Enter your password again"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
            >
              {showPassword ? "Hide passwords" : "Show passwords"}
            </button>

            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating your account..."
                : success
                  ? "Check your email"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-indigo-700 hover:text-indigo-900"
            >
              Log in
            </Link>
          </p>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Protect your account. Never share your password or email
            verification link with anyone.
          </p>
        </section>
      </div>
    </main>
  );
}