"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, Sparkles, ShieldAlert } from "lucide-react";

type MediaItem = { id: string; kind: "image" | "video"; mime_type: string; size_bytes: number };

export function GeminiMediaCheck({ postId, media, onComplete }: { postId: string; media: MediaItem[]; onComplete?: () => Promise<void> | void }) {
  const [consent, setConsent] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (media.length === 0) return null;
  const supportedMedia = media.filter((item) =>
    item.kind === "image" && ["image/jpeg", "image/png", "image/webp"].includes(item.mime_type) && item.size_bytes <= 8 * 1024 * 1024,
  );

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
      setMessage("Assessment saved. Updating the evidence records…");
      await onComplete?.();
      setMessage("Assessment saved and added to the evidence records below. It remains uncertain and is not proof of AI generation or authenticity.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the Gemini assessment.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
      <div className="flex items-center gap-2 text-sm font-extrabold text-violet-950"><Sparkles size={16} /> Gemini media analysis</div>
      <p className="mt-2 text-xs leading-5 text-violet-900">Optional AI-assisted inspection for your own uploaded images. Image review is the current project scope; video analysis is not available. Only the post author can submit an image. Each request sends the selected image to Google.</p>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-5 text-violet-950">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-violet-700" />
        <span>I understand that this media and its post context will be sent to Google Gemini. Google’s free-tier data-use terms may allow submitted content to be used to improve Google products. I have permission to submit this media.</span>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {supportedMedia.map((item, index) => (
          <button key={item.id} type="button" onClick={() => void run(item.id)} disabled={Boolean(busyId)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60">
            {busyId === item.id ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {busyId === item.id ? "Analysing…" : `Analyse ${item.kind} ${index + 1}`}
          </button>
        ))}
      </div>
      {media.length > supportedMedia.length && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{media.length - supportedMedia.length} item(s) are not eligible for Gemini analysis. Only JPG, PNG and WebP images up to 8 MB can be analysed. Videos can still be viewed and published, but video analysis is outside the current project scope.</p>}
      {supportedMedia.length === 0 && <p className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">No attached image matches Gemini’s current supported formats and 8 MB size limit.</p>}
      {message && <p role="status" className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-rose-800"><ShieldAlert size={14} className="mr-1 inline" />{error}</p>}
      <p className="mt-3 text-[11px] leading-5 text-violet-800">Important: Gemini is a general multimodal model, not a forensic AI/deepfake detector. Every result remains “uncertain”; it cannot prove whether media is AI-generated, genuine or manipulated. Up to 6 assessment attempts per post per hour.</p>
    </section>
  );
}
