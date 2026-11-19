"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Handshake, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OrganizationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [useCase, setUseCase] = useState("Research and media literacy");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      try {
        const supabase = createClient();
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (active) setUserId(data.user?.id ?? null);
      } catch {
        if (active) setError("We could not confirm your sign-in. Refresh the page and try again.");
      } finally {
        if (active) setAuthLoading(false);
      }
    };
    void loadUser();
    return () => { active = false; };
  }, []);

  async function submitInterest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!userId) {
      setError("Sign in before sending an organization enquiry.");
      return;
    }
    if (organization.trim().length < 2 || role.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail.trim())) {
      setError("Add your organization, role and a valid work email.");
      return;
    }
    if (details.trim().length < 20) {
      setError("Tell us a little more about your intended use (at least 20 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const description = [
        "Organization partnership / pilot enquiry",
        "",
        `Organization: ${organization.trim()}`,
        `Contact role: ${role.trim()}`,
        `Work email: ${workEmail.trim()}`,
        `Intended use: ${useCase}`,
        "",
        "Details:",
        details.trim(),
      ].join("\n");
      const { data, error: insertError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          category: "general",
          subject: `Organization enquiry — ${organization.trim()}`.slice(0, 150),
          description,
        })
        .select("ticket_number")
        .single();
      if (insertError) throw insertError;
      setNotice(`Your enquiry was submitted${data?.ticket_number ? ` as request #${data.ticket_number}` : ""}. Our team can follow up through your Verity support requests.`);
      setOrganization("");
      setRole("");
      setWorkEmail("");
      setDetails("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not submit your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7ff] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-indigo-700">
          <ArrowLeft size={17} /> Back to Verity
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-[#101b3d] px-6 py-10 text-white shadow-xl shadow-indigo-950/10 sm:px-10 sm:py-14">
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-2 top-10 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide text-indigo-100"><Building2 size={14} /> VERITY FOR ORGANIZATIONS</span>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Bring clearer context to your community.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-indigo-100 sm:text-lg">Explore Verity for classrooms, newsrooms, research teams and community organizations that want healthier discussions and more transparent content review.</p>
            <a href="#pilot-enquiry" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-900 transition hover:bg-indigo-50">Discuss an organization pilot <ArrowRight size={17} /></a>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><ShieldCheck size={22} /></div>
            <h2 className="mt-4 text-lg font-extrabold">Transparent review</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Understand reported content, review workflows and evidence context without presenting automated guesses as facts.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Sparkles size={22} /></div>
            <h2 className="mt-4 text-lg font-extrabold">Learning and literacy</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use discussion prompts and source-checking workflows to teach critical thinking and responsible sharing.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Handshake size={22} /></div>
            <h2 className="mt-4 text-lg font-extrabold">Pilot with your team</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Start with a scoped conversation about your use case before committing to a paid plan or long-term contract.</p>
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">Possible partnership paths</p>
            <h2 className="mt-2 text-2xl font-black">A practical starting point</h2>
            <div className="mt-6 space-y-5">
              <div><h3 className="font-extrabold">Education and campus plan</h3><p className="mt-1 text-sm leading-6 text-slate-600">Workshops, private learning communities and educator-facing discussion tools.</p></div>
              <div><h3 className="font-extrabold">Newsroom and research plan</h3><p className="mt-1 text-sm leading-6 text-slate-600">Structured source notes, review queues and exportable research workflows, subject to privacy and access controls.</p></div>
              <div><h3 className="font-extrabold">Community organization plan</h3><p className="mt-1 text-sm leading-6 text-slate-600">Moderation support, community onboarding and transparent reporting for larger groups.</p></div>
            </div>
            <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <strong>No pay-to-trust policy:</strong> payment will never buy a verification result, moderation outcome, credibility badge or hidden reach advantage.
            </div>
          </div>

          <section id="pilot-enquiry" className="scroll-mt-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">Pilot enquiry</p>
            <h2 className="mt-2 text-2xl font-black">Tell us what your team needs.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">This sends a request to Verity support. It does not start a subscription or charge you.</p>
            {!authLoading && !userId && <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">Please <Link className="font-extrabold underline" href="/login?next=%2Ffor-organizations">sign in</Link> to submit an enquiry. Your request will be attached to your Verity account.</div>}
            <form onSubmit={(event) => void submitInterest(event)} className="mt-5 space-y-4">
              <label className="block text-sm font-bold">Organization name
                <input required minLength={2} maxLength={120} value={organization} onChange={(event) => setOrganization(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" placeholder="College, newsroom or organization" />
              </label>
              <label className="block text-sm font-bold">Your role
                <input required minLength={2} maxLength={100} value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" placeholder="Faculty, editor, researcher..." />
              </label>
              <label className="block text-sm font-bold">Work email
                <input required type="email" maxLength={254} value={workEmail} onChange={(event) => setWorkEmail(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" placeholder="you@organization.org" />
              </label>
              <label className="block text-sm font-bold">Primary use case
                <select value={useCase} onChange={(event) => setUseCase(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-400">
                  <option>Research and media literacy</option><option>Campus discussions and education</option><option>Newsroom research and source review</option><option>Community moderation</option><option>Other</option>
                </select>
              </label>
              <label className="block text-sm font-bold">What are you trying to achieve?
                <textarea required minLength={20} maxLength={3000} rows={4} value={details} onChange={(event) => setDetails(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal leading-6 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" placeholder="Describe your team, audience and the problem you want Verity to help with." />
              </label>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              {notice && <p role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{notice}</p>}
              <button type="submit" disabled={authLoading || !userId || submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}
                {submitting ? "Sending enquiry..." : "Send pilot enquiry"}
              </button>
            </form>
          </section>
        </section>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-slate-500">Verity is exploring organization pilots. Features, availability and pricing will be agreed transparently before any paid engagement. No payment processing is enabled on this page.</p>
      </div>
    </main>
  );
}
