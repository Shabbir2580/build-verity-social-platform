import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f5f6fb] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={16} /> Back to Verity</Link>
        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><FileText size={24} /></div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Verity policies</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Terms of service</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Initial draft for the Verity project. It is not a substitute for legally reviewed terms; finalize it before public launch.</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section><h2 className="text-lg font-extrabold text-slate-900">Use the platform responsibly</h2><p className="mt-2">Use Verity lawfully and respectfully. Do not harass, threaten, impersonate, expose private information about, or deliberately target other users. Do not use the platform to distribute malware, spam or unlawful material.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">Your content</h2><p className="mt-2">You remain responsible for the content you submit and should only upload material you have the right to share. By publishing, you authorize Verity to host, display and process the content as necessary to operate the service and its moderation features, subject to the final terms and privacy policy.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">Labels and verification</h2><p className="mt-2">Creator-declared AI use, AI-origin signals and factual accuracy are different concepts. A label or automated signal is not proof by itself that a claim is true or false. Assessments may be uncertain, corrected or appealed.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">Moderation</h2><p className="mt-2">Verity may review reports, apply proportionate restrictions and remove content that violates applicable policies. Users may request review of eligible decisions. The final moderation policy and appeal deadlines must be published before launch.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">Availability and changes</h2><p className="mt-2">Features may change as the service is developed. Demo or prototype features may be unavailable or incomplete. Do not rely on an unfinished verification feature for urgent or high-stakes decisions.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">Contact</h2><p className="mt-2">Use the <Link href="/?support=1" className="font-bold text-indigo-700 underline">Verity support area</Link> for questions. Have qualified counsel review these terms and add the legal entity, jurisdiction, effective date and required notices.</p></section>
        </div>
      </article>
    </main>
  );
}
