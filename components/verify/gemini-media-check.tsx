"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, Sparkles, ShieldAlert } from "lucide-react";

type MediaItem = { id: string; kind: "image" | "video" };

export function GeminiMediaCheck({ postId, media }: { postId: string; media: MediaItem[] }) {
  const [consent, setConsent] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (media.length === 0) return null;

  async function run(mediaId: string) {
    setError("");
    setMessage("");
    if (!consent) {
      setError("Confirm that you understand the media will be sent to Google Gemini before continuing.");
      return;
    }
    setBusyId(mediaId);
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in to request a Gemini assessment.");

      const response = await fetch("/api/verify/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId, mediaId, consent: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gemini assessment failed.");
      setMessage("Gemini assessment saved. It is marked uncertain and is not proof of AI generation or authenticity. Refresh the Trust Center to view the record.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the Gemini assessment.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
      <div className="flex items-center gap-2 text-sm font-extrabold text-violet-950"><Sparkles size={16} /> Gemini media analysis</div>
      <p className="mt-2 text-xs leading-5 text-violet-900">Optional AI-assisted inspection for your own uploaded media. Only the post author can submit it. Each request sends the selected file to Google.</p>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-5 text-violet-950">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-violet-700" />
        <span>I understand that this media and its post context will be sent to Google Gemini. Google’s free-tier data-use terms may allow submitted content to be used to improve Google products. I have permission to submit this media.</span>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {media.map((item, index) => (
          <button key={item.id} type="button" onClick={() => void run(item.id)} disabled={Boolean(busyId)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60">
            {busyId === item.id ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {busyId === item.id ? "Analysing…" : `Analyse ${item.kind} ${index + 1}`}
          </button>
        ))}
      </div>
      {message && <p role="status" className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-rose-800"><ShieldAlert size={14} className="mr-1 inline" />{error}</p>}
      <p className="mt-3 text-[11px] leading-5 text-violet-800">Important: Gemini is a general multimodal model, not a forensic AI/deepfake detector. Every result remains “uncertain”; it cannot prove whether media is AI-generated, genuine or manipulated. Up to 3 scans per post per hour.</p>
    </section>
  );
}
