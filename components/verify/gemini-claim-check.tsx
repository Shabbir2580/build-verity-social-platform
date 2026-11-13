"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, SearchCheck, ShieldAlert } from "lucide-react";

export function GeminiClaimCheck({ postId, claim }: { postId: string; claim: string }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run() {
    setError(""); setMessage("");
    if (!consent) { setError("Confirm that you understand the claim will be sent to Google Gemini."); return; }
    if (claim.trim().length < 12) { setError("Enter a claim of at least 12 characters."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in to request a Gemini assessment.");
      const response = await fetch("/api/verify/gemini/claim", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId, claim: claim.trim(), consent: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Claim analysis failed.");
      setMessage("Gemini claim review saved. It used search-result headlines only and remains uncertain—not a fact-check verdict. Refresh the Trust Center to see it.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not run claim analysis."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
      <p className="text-sm font-extrabold text-indigo-950"><SearchCheck size={16} className="mr-1 inline" /> Gemini claim review</p>
      <p className="mt-1 text-xs leading-5 text-indigo-900">Compares the claim with Google News search-result headlines. It does not read full articles or establish truth.</p>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-5 text-indigo-950">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-indigo-700" />
        <span>I consent to sending this claim to Google Gemini. Google's free-tier data-use terms may allow submitted content to be used to improve Google products.</span>
      </label>
      <button type="button" onClick={() => void run()} disabled={busy || claim.trim().length < 12} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-50">
        {busy ? <LoaderCircle size={14} className="animate-spin" /> : <SearchCheck size={14} />}
        {busy ? "Reviewing…" : "Analyse claim with Gemini"}
      </button>
      {message && <p role="status" className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-rose-800"><ShieldAlert size={14} className="mr-1 inline" />{error}</p>}
    </div>
  );
}
