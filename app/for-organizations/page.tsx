"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, BarChart3, BadgeCheck, Building2, CheckCircle2,
  GraduationCap, Handshake, Layers3, LoaderCircle, Mail, Megaphone,
  ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const offerings = [
  "Organization workspace / enterprise plan",
  "Advertising and sponsorship",
  "Education and campus partnership",
  "Community partnership",
  "Research or newsroom collaboration",
  "Request a media kit",
] as const;

export default function BusinessPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [offering, setOffering] = useState<(typeof offerings)[number]>(offerings[0]);
  const [budget, setBudget] = useState("Not decided yet");
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

  async function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!userId) {
      setError("Sign in before sending a business enquiry.");
      return;
    }
    if (organization.trim().length < 2 || role.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail.trim())) {
      setError("Add your organization, role and a valid work email.");
      return;
    }
    if (details.trim().length < 20) {
      setError("Please provide at least 20 characters describing what you need.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const description = [
        "VERITY BUSINESS ENQUIRY",
        "",
        `Organization: ${organization.trim()}`,
        `Contact role: ${role.trim()}`,
        `Work email: ${workEmail.trim()}`,
        `Enquiry type: ${offering}`,
        `Indicative budget: ${budget}`,
        "",
        "Goals and requirements:",
        details.trim(),
        "",
        "Submitted from: /for-organizations",
      ].join("\n");
      const { data, error: insertError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          category: "general",
          subject: `Business enquiry — ${organization.trim()}`.slice(0, 150),
          description,
        })
        .select("ticket_number")
        .single();
      if (insertError) throw insertError;
      setNotice(`Enquiry submitted${data?.ticket_number ? ` as request #${data.ticket_number}` : ""}. You can track it from Support in your Verity account.`);
      setOrganization("");
      setRole("");
      setWorkEmail("");
      setDetails("");
      setBudget("Not decided yet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not submit your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f6fc] text-slate-900">
      <header className="border-b border-white/10 bg-[#0c1531] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-xl text-lg font-black tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500"><ShieldCheck size={20} /></span>
            verity<span className="text-indigo-300">.</span><span className="ml-1 hidden rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-100 sm:inline">Business</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex" aria-label="Business page navigation">
            <a href="#solutions" className="transition hover:text-white">Solutions</a>
            <a href="#advertising" className="transition hover:text-white">Advertising</a>
            <a href="#principles" className="transition hover:text-white">Our standards</a>
          </nav>
          <a href="#enquiry" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-[#101b3d] transition hover:bg-indigo-50 sm:text-sm">Talk to our team <ArrowRight size={15} /></a>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#0c1531] text-white">
        <div aria-hidden="true" className="absolute -right-32 -top-36 h-[34rem] w-[34rem] rounded-full border border-indigo-300/10" />
        <div aria-hidden="true" className="absolute right-[-5rem] top-12 h-[25rem] w-[25rem] rounded-full border border-indigo-300/10" />
        <div aria-hidden="true" className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-600/20 blur-[100px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.19em] text-indigo-200"><Sparkles size={14} /> Verity business partnerships</div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Grow your brand.<br/><span className="bg-gradient-to-r from-indigo-200 via-sky-200 to-white bg-clip-text text-transparent">Respect the truth.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">Connect with thoughtful communities, support useful conversations and build partnerships with a platform that puts transparency first.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#enquiry" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400">Start a conversation <ArrowRight size={17}/></a>
              <a href="#advertising" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Explore advertising</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
              <span className="inline-flex items-center gap-2"><BadgeCheck size={15} className="text-emerald-300"/> Clearly labelled partnerships</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300"/> Trust stays independent</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="rounded-[2rem] border border-white/15 bg-white/[0.07] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div><p className="text-xs font-bold text-indigo-200">PARTNERSHIP OVERVIEW</p><p className="mt-1 text-lg font-extrabold">Build with Verity</p></div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/20 text-indigo-100"><Building2 size={21}/></span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#172448] p-4"><Megaphone size={20} className="text-sky-200"/><p className="mt-5 text-sm font-extrabold">Brand campaigns</p><p className="mt-1 text-xs leading-5 text-slate-400">Transparent sponsorship opportunities</p></div>
                <div className="rounded-2xl border border-white/10 bg-[#172448] p-4"><Building2 size={20} className="text-violet-200"/><p className="mt-5 text-sm font-extrabold">Organizations</p><p className="mt-1 text-xs leading-5 text-slate-400">Tools for teams and institutions</p></div>
                <div className="rounded-2xl border border-white/10 bg-[#172448] p-4"><GraduationCap size={20} className="text-emerald-200"/><p className="mt-5 text-sm font-extrabold">Education</p><p className="mt-1 text-xs leading-5 text-slate-400">Learning and media literacy</p></div>
                <div className="rounded-2xl border border-white/10 bg-[#172448] p-4"><Handshake size={20} className="text-amber-200"/><p className="mt-5 text-sm font-extrabold">Partnerships</p><p className="mt-1 text-xs leading-5 text-slate-400">Community-first collaborations</p></div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07] p-3.5">
                <ShieldCheck size={19} className="shrink-0 text-emerald-200"/>
                <p className="text-xs leading-5 text-emerald-50">No paid verification. No hidden sponsored content. No selling private user data.</p>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 -z-10 h-32 w-32 rounded-full bg-indigo-500/30 blur-3xl"/>
          </div>
        </div>
      </section>

      <section id="solutions" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Ways to work together</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Business built around better conversations.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">Start with one focused use case. We will scope the audience, deliverables and commercial terms before any commitment.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Building2 size={23}/></span>
            <h3 className="mt-5 text-lg font-extrabold">Organization plans</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Team spaces, onboarding, moderation workflows and reporting for institutions and professional groups.</p>
            <p className="mt-4 text-xs font-bold text-indigo-700">Custom scoped pilot</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Megaphone size={23}/></span>
            <h3 className="mt-5 text-lg font-extrabold">Advertising & sponsorship</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Clearly labelled educational campaigns, sponsored guides and relevant community initiatives.</p>
            <p className="mt-4 text-xs font-bold text-sky-700">Partner enquiries open</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><GraduationCap size={23}/></span>
            <h3 className="mt-5 text-lg font-extrabold">Education & research</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Media literacy programmes, campus communities and research collaborations with clear data boundaries.</p>
            <p className="mt-4 text-xs font-bold text-emerald-700">Pilot discussions</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Handshake size={23}/></span>
            <h3 className="mt-5 text-lg font-extrabold">Community partnerships</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Support community events, expert discussions and useful initiatives without buying influence.</p>
            <p className="mt-4 text-xs font-bold text-violet-700">Collaboration proposals</p>
          </article>
        </div>
      </section>

      <section id="advertising" className="scroll-mt-8 border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Advertising with Verity</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Be visible. Stay transparent.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">We are opening conversations with potential sponsors and advertisers. These are proposed formats, not live ad inventory. Placement, audience availability and pricing will only be confirmed after a pilot is agreed.</p>
            <a href="#enquiry" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101b3d] px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-900">Request advertising information <ArrowRight size={16}/></a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">01 · Sponsored guide</span><Layers3 size={19} className="text-indigo-600"/></div>
              <h3 className="mt-4 font-extrabold">Useful, clearly labelled content</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">A sponsor-supported educational resource or explainer, reviewed for clarity and labelled as sponsored.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">02 · Community initiative</span><Users size={19} className="text-indigo-600"/></div>
              <h3 className="mt-4 font-extrabold">Support a relevant programme</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Sponsor a public learning session, community event or discussion series with clear commercial disclosure.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">03 · Campaign placement</span><BarChart3 size={19} className="text-indigo-600"/></div>
              <h3 className="mt-4 font-extrabold">A labelled campaign card</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">A separate, clearly marked campaign surface. No disguised posts or paid ranking in organic feeds.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-5">
              <div className="flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">04 · Custom partnership</span><Handshake size={19} className="text-indigo-600"/></div>
              <h3 className="mt-4 font-extrabold">A measured collaboration</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">A scoped partnership with agreed deliverables, reporting and a transparent review process.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="principles" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-[#101b3d] p-7 text-white sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-200">The Verity standard</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Revenue must never compromise trust.</h2><p className="mt-4 text-sm leading-7 text-slate-300">Our commercial model is designed to support the platform—not influence what people see as true or how community decisions are made.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Every paid placement is clearly labelled.",
                "No payment can buy a verification result or badge.",
                "Sponsors cannot influence moderation or appeals.",
                "Private user data is not sold to advertisers.",
                "Paid reach is never disguised as organic ranking.",
                "Core safety and appeal tools remain free.",
              ].map((item) => <div key={item} className="flex gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] p-3.5 text-sm leading-6 text-slate-100"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-300"/>{item}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="enquiry" className="scroll-mt-8 bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Let's talk</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Tell us what you want to build.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">Share your goals and we will review the proposal. Enquiries are not contracts, bookings or paid campaigns. Commercial terms are discussed and approved separately.</p>
            <div className="mt-7 space-y-4 text-sm text-slate-600">
              <div className="flex gap-3"><Mail size={18} className="mt-0.5 text-indigo-600"/><span>Enquiries are tracked privately through your Verity support account.</span></div>
              <div className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 text-indigo-600"/><span>No payment details are requested on this page.</span></div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-[#f8faff] p-6 shadow-sm sm:p-8">
            <h3 className="text-xl font-extrabold">Business enquiry form</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">All fields marked required help us route your request correctly.</p>
            {!authLoading && !userId && <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">Please <Link className="font-extrabold underline" href="/login?next=%2Ffor-organizations">sign in</Link> to submit an enquiry. Your request will be attached to your account.</div>}
            <form onSubmit={(event) => void submitEnquiry(event)} className="mt-5 space-y-4">
              <label className="block text-sm font-bold">Organization / brand name
                <input required minLength={2} maxLength={120} value={organization} onChange={(event) => setOrganization(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" placeholder="Your organization or brand"/>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold">Your role
                  <input required minLength={2} maxLength={100} value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-400" placeholder="Marketing, founder, faculty..."/>
                </label>
                <label className="block text-sm font-bold">Work email
                  <input required type="email" maxLength={254} value={workEmail} onChange={(event) => setWorkEmail(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-400" placeholder="you@company.com"/>
                </label>
              </div>
              <label className="block text-sm font-bold">What are you interested in?
                <select value={offering} onChange={(event) => setOffering(event.target.value as (typeof offerings)[number])} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-400">
                  {offerings.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold">Indicative budget <span className="font-normal text-slate-500">(optional)</span>
                <select value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-400">
                  <option>Not decided yet</option><option>Under ₹10,000</option><option>₹10,000–₹50,000</option><option>₹50,000–₹2,00,000</option><option>₹2,00,000+</option><option>Prefer to discuss</option>
                </select>
              </label>
              <label className="block text-sm font-bold">Tell us about your goals
                <textarea required minLength={20} maxLength={3000} rows={5} value={details} onChange={(event) => setDetails(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal leading-6 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" placeholder="What audience or community do you want to reach? What outcome would make this partnership successful?"/>
              </label>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              {notice && <p role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900"><CheckCircle2 size={18} className="mt-0.5 shrink-0"/>{notice}</p>}
              <button type="submit" disabled={authLoading || !userId || submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? <LoaderCircle size={17} className="animate-spin"/> : <ArrowRight size={17}/>}
                {submitting ? "Submitting enquiry..." : "Submit business enquiry"}
              </button>
              <p className="text-center text-xs leading-5 text-slate-500">Submitting this form does not create a subscription, reserve advertising inventory or charge you.</p>
            </form>
          </div>
        </div>
      </section>

      <footer className="bg-[#0c1531] px-4 py-7 text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-xs sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Verity. Partnerships with transparency.</p>
          <div className="flex flex-wrap gap-5"><Link href="/" className="hover:text-white">Back to Verity</Link><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link></div>
        </div>
      </footer>
    </main>
  );
}
