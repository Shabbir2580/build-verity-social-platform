"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { ArrowLeft, FileSearch, ImagePlus, LoaderCircle, ShieldAlert, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Review = {
  review_risk_percent: number;
  review_priority: "low" | "medium" | "high";
  summary: string;
  signals: string[];
  missing_context: string[];
  verification_steps: string[];
  uncertainty: string;
  provider: string;
  checked_at: string;
  stored: false;
  evidence_status: "visual_only" | "google_search_grounded" | "search_no_sources";
  sources: { title: string; url: string }[];
  source_linked_statements: { statement: string; sources: { title: string; url: string }[] }[];
  search_queries: string[];
};

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}

export default function QuickReviewPage() {
  const [kind, setKind] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [humanReviewConfirmed, setHumanReviewConfirmed] = useState(false);
  const [humanConclusion, setHumanConclusion] = useState<"supported" | "contradicted" | "inconclusive" | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/verify/quick-review", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not check AI provider status.");
        return response.json();
      })
      .then((payload) => { if (active) setAiAvailable(payload.configured === true); })
      .catch(() => { if (active) setAiAvailable(false); });
    return () => { active = false; };
  }, []);

  async function submit() {
    setError("");
    setReview(null);
    setHumanReviewConfirmed(false);
    setHumanConclusion(null);
    if (!consent) { setError("Consent is required before sending content to Google Gemini."); return; }
    if (kind === "text" && text.trim().length < 30) { setError("Enter at least 30 characters to review."); return; }
    if (kind === "image" && !file) { setError("Choose an image first."); return; }
    if (file && file.size > 3 * 1024 * 1024) { setError("Choose an image no larger than 3 MB."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in to use quick review.");
      const payload = kind === "text"
        ? { kind, text: text.trim(), consent: true }
        : { kind, mimeType: file!.type, imageBase64: await readFile(file!), consent: true };
      const response = await fetch("/api/verify/quick-review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Review failed.");
      setReview(result.review as Review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete the review.");
    } finally { setBusy(false); }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null;
    setFile(next);
    setReview(null);
    setHumanReviewConfirmed(false);
    setHumanConclusion(null);
    setError("");
  }

  const priorityStyle = review?.review_priority === "high"
    ? "border-rose-200 bg-rose-50 text-rose-900"
    : review?.review_priority === "medium"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return <main className="min-h-screen bg-[#f5f7f8] text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
        <Link href="/verify" aria-label="Back to Trust Center" className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ArrowLeft size={18}/></Link>
        <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">Verity Trust Center</p><h1 className="text-lg font-semibold tracking-tight">Quick content review</h1></div>
      </div>
    </header>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <section className="rounded-3xl bg-[#142b3a] p-6 text-white sm:p-9">
        <div className="flex items-center gap-2 text-teal-200"><Sparkles size={18}/><span className="text-xs font-bold uppercase tracking-[0.16em]">AI-assisted triage</span></div>
        <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">Pause. Review. Verify.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Submit text or an image for an experimental 0–100 human-review risk index. The proposed bands are 0–30 low, 31–60 medium and 61–100 high. Text reviews can use live Google Search sources; image reviews inspect visible details and context only. The score is not a probability or truth verdict, and it is not yet validated against a labelled dataset.</p>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Content type">
          <button type="button" role="tab" aria-selected={kind === "text"} onClick={() => { setKind("text"); setReview(null); setHumanReviewConfirmed(false); setHumanConclusion(null); setError(""); }} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${kind === "text" ? "bg-[#142b3a] text-white" : "border border-slate-200 text-slate-600"}`}><FileSearch size={15} className="mr-2 inline"/>Text review</button>
          <button type="button" role="tab" aria-selected={kind === "image"} onClick={() => { setKind("image"); setReview(null); setHumanReviewConfirmed(false); setHumanConclusion(null); setError(""); }} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${kind === "image" ? "bg-[#142b3a] text-white" : "border border-slate-200 text-slate-600"}`}><ImagePlus size={15} className="mr-2 inline"/>Image review</button>
        </div>
        {aiAvailable === false && <div role="alert" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-950">AI review is currently unavailable</p>
          <p className="mt-1 text-xs leading-5 text-amber-900">The production server does not have its Gemini API key configured. No AI assessment will run, and Verity will not show a simulated result. You can still use the Trust Center to discover related news coverage and published fact-checks.</p>
          <Link href="/verify" className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100">Open Trust Center source discovery</Link>
        </div>}
        {aiAvailable === null && <p role="status" className="mt-5 text-xs text-slate-500">Checking AI provider availability…</p>}
        {kind === "text" ? <label className="mt-5 block text-sm font-semibold">Text or claim to review
          <textarea value={text} onChange={(event) => { setText(event.target.value.slice(0, 4000)); setReview(null); setHumanReviewConfirmed(false); setHumanConclusion(null); }} rows={7} placeholder="Paste the exact statement, headline or message. Include its date and source if known." className="mt-2 w-full rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-teal-600"/>
          <span className="mt-1 block text-xs font-normal text-slate-500">{text.length}/4000 characters · minimum 30</span>
        </label> : <div className="mt-5">
          <label className="block text-sm font-semibold">Choose an image
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"/>
          </label>
          <p className="mt-2 text-xs text-slate-500">JPG, PNG or WebP · maximum 3 MB. The model can describe visible details and context gaps; it cannot prove whether an image is AI-generated or manipulated. Text-only web source grounding is not used for images.</p>
          {file && <p className="mt-2 text-xs text-slate-600">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>}
        <label className="mt-5 flex cursor-pointer items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 shrink-0"/>
          <span>I explicitly consent to sending this {kind === "text" ? "text to Google Gemini and Google Search for source grounding" : "image to Google Gemini"} for this request. Google's unpaid Gemini service may use submitted content to improve Google products and may involve human review. For text grounding, Google stores prompts, context and outputs for 30 days to provide the service. Do not submit sensitive, confidential or personal information. I have permission to submit this content. Verity does not store the submitted content in its quick-review logs; only provider, request type and status are logged.</span>
        </label>
        <button type="button" onClick={() => void submit()} disabled={busy || aiAvailable !== true || (kind === "text" ? text.trim().length < 30 : !file)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#142b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1b3b4e] disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <LoaderCircle size={16} className="animate-spin"/> : <Sparkles size={16}/>}
          {busy ? "Reviewing…" : aiAvailable === false ? "AI review unavailable" : "Run AI-assisted review"}
        </button>
        <p className="mt-2 text-xs text-slate-500">Sign-in required · Up to 5 quick reviews per hour · Content is not retained in Verity's review log.</p>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><ShieldAlert size={15} className="mr-1 inline"/>{error}</p>}
      </section>

      {review && <section className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-700">Review result</p><h2 className="mt-1 text-xl font-semibold">Estimated review-risk indicator</h2></div>
          <span className={`rounded-full border px-4 py-2 text-sm font-bold uppercase ${priorityStyle}`}>{review.review_priority} · {review.review_risk_percent}/100</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-600">Experimental review-risk score</p><p className="text-lg font-black tabular-nums text-slate-900">{review.review_risk_percent}%</p></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`Experimental review-risk score ${review.review_risk_percent} out of 100`}><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${review.review_risk_percent}%` }} /></div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[10px] font-semibold text-slate-500"><span>0–30% · Low</span><span>31–60% · Medium</span><span>61–100% · High</span></div>
          <p className="mt-3 text-xs leading-5 text-slate-600">This score estimates how much human review is warranted. It is not the probability that the content is false.</p>
        </div>
        <p className="text-sm leading-7 text-slate-700">{review.summary}</p>
        <div className="grid gap-4 md:grid-cols-3">
          {[[ "Signals to inspect", review.signals ], [ "Missing context", review.missing_context ], [ "Next verification steps", review.verification_steps ]].map(([heading, items]) => <div key={String(heading)} className="rounded-2xl border border-slate-200 p-4"><h3 className="text-sm font-semibold">{heading}</h3>{(items as string[]).length ? <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-5 text-slate-600">{(items as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="mt-3 text-xs text-slate-500">No specific items returned.</p>}</div>)}
        </div>
        {kind === "text" && <section className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Evidence and source checks</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{review.evidence_status === "google_search_grounded" ? "Google Search grounded" : "No grounded sources returned"}</span>
          </div>
          {review.sources.length > 0 ? <ol className="mt-3 space-y-2">{review.sources.map((source, index) => <li key={source.url} className="flex items-start gap-2 text-xs leading-5"><span className="mt-0.5 text-slate-400">{index + 1}.</span><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950">{source.title}</a></li>)}</ol> : <p className="mt-3 text-xs leading-5 text-slate-600">Google Search did not return source citations for this response. Treat the analysis as ungrounded and verify the claim independently.</p>}
          {review.source_linked_statements.length > 0 && <div className="mt-4 border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Statements linked to sources</h4>
            <ul className="mt-2 space-y-3">{review.source_linked_statements.map((item, index) => <li key={index} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs leading-5 text-slate-700">{item.statement}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{item.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-teal-800 underline underline-offset-2">{source.title}</a>)}</div>
            </li>)}</ul>
          </div>}
          {review.search_queries.length > 0 && <p className="mt-3 text-[11px] leading-5 text-slate-500">Searches used: {review.search_queries.join(" · ")}</p>}
        </section>}
        <section className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4" aria-labelledby="human-review-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">Your decision · human check</p>
              <h3 id="human-review-heading" className="mt-1 text-sm font-semibold text-slate-900">Verify before you decide</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">Open the original sources, compare dates and context, and look for primary evidence. The AI score does not choose the outcome for you.</p>
            </div>
            <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-[10px] font-bold text-teal-900">Human judgement required</span>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-teal-200 bg-white p-3 text-xs leading-5 text-slate-800">
            <input type="checkbox" checked={humanReviewConfirmed} onChange={(event) => { setHumanReviewConfirmed(event.target.checked); setHumanConclusion(null); }} className="mt-0.5 size-4 shrink-0 accent-teal-700" />
            <span>I have independently checked the available sources and considered the missing context listed above.</span>
          </label>
          <fieldset className="mt-4" disabled={!humanReviewConfirmed}>
            <legend className="text-xs font-semibold text-slate-800">My assessment after checking</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(["supported", "contradicted", "inconclusive"] as const).map((value) => <button key={value} type="button" aria-pressed={humanConclusion === value} onClick={() => setHumanConclusion(value)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50 ${humanConclusion === value ? "border-teal-700 bg-teal-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-teal-400"}`}>{value === "supported" ? "Evidence supports it" : value === "contradicted" ? "Evidence contradicts it" : "Not enough evidence"}</button>)}
            </div>
          </fieldset>
          {humanConclusion && <p role="status" className="mt-3 rounded-xl border border-teal-200 bg-white p-3 text-xs leading-5 text-teal-950">Your manual assessment: <strong>{humanConclusion === "supported" ? "Evidence supports it" : humanConclusion === "contradicted" ? "Evidence contradicts it" : "Not enough evidence"}</strong>. This is your own review, not an AI verdict.</p>}
          {humanConclusion && <div className="mt-2">
            <button type="button" onClick={() => {
              const note = [
                "VERITY — HUMAN REVIEW NOTE",
                "AI review-risk index: " + review.review_risk_percent + "/100 (" + review.review_priority + ")",
                "AI summary: " + review.summary,
                "Signals: " + (review.signals.join("; ") || "None listed"),
                "Missing context: " + (review.missing_context.join("; ") || "None listed"),
                "Suggested checks: " + (review.verification_steps.join("; ") || "None listed"),
                "Sources: " + (review.sources.map((source) => source.title + " — " + source.url).join("; ") || "No sources returned"),
                "Human assessment: " + (humanConclusion === "supported" ? "Evidence supports it" : humanConclusion === "contradicted" ? "Evidence contradicts it" : "Not enough evidence"),
                "Limitations: experimental and uncalibrated; not a probability or truth verdict. Human assessment is user-provided, not independently verified.",
              ].join(String.fromCharCode(10));
              if (typeof navigator.share === "function") {
                void navigator.share({ title: "Verity human review note", text: note })
                  .then(() => setCopyStatus("Share sheet opened. Review the note before sending."))
                  .catch((shareError: unknown) => {
                    if (shareError instanceof Error && shareError.name === "AbortError") return;
                    void navigator.clipboard.writeText(note).then(() => setCopyStatus("Sharing was unavailable; review note copied instead.")).catch(() => setCopyStatus("Sharing and clipboard are unavailable. Copy the visible result manually."));
                  });
              } else {
                void navigator.clipboard.writeText(note).then(() => setCopyStatus("Review note copied. Check it before sharing.")).catch(() => setCopyStatus("Clipboard access was blocked; copy the visible result manually."));
              }
            }} className="min-h-10 rounded-xl border border-teal-300 px-3 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-50">Share / copy review note</button>
            {copyStatus && <p role="status" className="mt-2 text-xs text-teal-800">{copyStatus}</p>}
          </div>}
          <p className="mt-3 text-[11px] leading-5 text-slate-500">This manual assessment is held only in this page current session. It is not saved, sent to Google, or used to change the AI score. For images, review the original image and its provenance separately; this tool cannot authenticate image origins.</p>
        </section>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-sm font-semibold text-amber-950">Uncertainty and limitations</h3><p className="mt-2 text-xs leading-5 text-amber-900">{review.uncertainty}</p><p className="mt-2 text-xs leading-5 text-amber-900">The percentage is an experimental, uncalibrated AI triage index—not a probability, validated risk measurement, model-accuracy score or truth verdict. High means check more carefully; it does not mean false. Low does not mean verified. These bands follow the proposed PPT interface and have not been validated against a labelled dataset.</p></div>
        <p className="text-[11px] text-slate-400">{review.provider} · {new Date(review.checked_at).toLocaleString()} · Not stored as a permanent assessment</p>
      </section>}
    </div>
  </main>;
}
