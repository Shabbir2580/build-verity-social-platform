"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkRecoverySession() {
      try {
        const supabase = createClient();
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (!active) return;

        if (sessionError) {
          setValidSession(false);
        } else {
          setValidSession(Boolean(data.session));
        }
      } catch {
        if (active) {
          setValidSession(false);
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    checkRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setValidSession(false);
        throw new Error(
          "Your recovery session has expired. Please request a new password reset link."
        );
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not update your password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f6fb] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-9">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-lg text-xl font-black tracking-tight focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ShieldCheck size={23} />
          </span>
          verity<span className="text-indigo-600">.</span>
        </Link>

        <div className="mt-9 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          {success ? (
            <CheckCircle2 size={28} />
          ) : (
            <LockKeyhole size={28} />
          )}
        </div>

        {checkingSession ? (
          <>
            <h1 className="mt-6 text-2xl font-black tracking-tight sm:text-3xl">
              Checking your recovery link
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Please wait while we verify your password recovery session.
            </p>
            <div
              className="mt-6 h-1.5 overflow-hidden rounded-full bg-indigo-100"
              role="progressbar"
              aria-label="Checking recovery session"
            >
              <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-600" />
            </div>
          </>
        ) : success ? (
          <>
            <h1 className="mt-6 text-2xl font-black tracking-tight sm:text-3xl">
              Password updated!
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Your password has been changed successfully. Keep it private
              and never share your recovery link with anyone.
            </p>

            <Link
              href="/"
              className="mt-7 flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Continue to Verity
            </Link>
          </>
        ) : !validSession ? (
          <>
            <h1 className="mt-6 text-2xl font-black tracking-tight sm:text-3xl">
              Recovery link unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              This recovery link may have expired or already been used.
              Request a new link and open the latest email.
            </p>

            <Link
              href="/forgot-password"
              className="mt-7 flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Request a new link
            </Link>
          </>
        ) : (
          <>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">
              Account security
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Create a new password
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Choose a strong password to secure your Verity account.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleReset} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-semibold"
                >
                  New password
                </label>

                <div className="flex min-h-12 items-center rounded-xl border border-slate-200 pr-3 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-base outline-none sm:text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Use at least 8 characters. A longer, unique password is
                  preferable.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-semibold"
                >
                  Confirm new password
                </label>

                <div className="flex min-h-12 items-center rounded-xl border border-slate-200 pr-3 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Enter the password again"
                    className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-base outline-none sm:text-sm"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation"
                        : "Show confirmation"
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating password..." : "Update password"}
              </button>
            </form>
          </>
        )}

        <Link
          href="/login"
          className="mt-7 flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-indigo-700"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>
      </section>
    </main>
  );
}