import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f5f6fb] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={16} /> Back to Verity</Link>
        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><ShieldCheck size={24} /></div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Verity policies</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Privacy policy</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Initial draft for the Verity project. Review and adapt this policy with qualified legal counsel before public launch.</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section><h2 className="text-lg font-extrabold text-slate-900">Information we handle</h2><p className="mt-2">Verity may process account details such as email, username and profile information; posts and comments you submit; media you upload; community memberships; and support requests, reports and appeal history.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">How information is used</h2><p className="mt-2">Information is used to operate accounts, publish content, support community interactions, manage moderation and appeals, prevent abuse, and maintain site security. Content checks may store evidence links and assessment history when those services are configured.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">Public content</h2><p className="mt-2">Posts, comments, usernames and public profile fields may be visible to other visitors according to your settings and platform rules. Do not publish private information that you do not intend to share publicly.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">Security and retention</h2><p className="mt-2">Verity uses access controls and database policies, but no internet service can promise absolute security. Data is retained as necessary to provide the service, resolve reports, comply with applicable requirements and protect users. The exact retention schedule must be finalized before launch.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">Your choices</h2><p className="mt-2">Contact support to ask about account access, correction or deletion. The final product must implement and document the applicable process for data requests and account closure.</p></section>
          <section><h2 className="text-lg font-extrabold text-slate-900">Contact</h2><p className="mt-2">Use the <Link href="/?support=1" className="font-bold text-indigo-700 underline">Verity support area</Link> for privacy questions. Replace this route with the final designated privacy contact before launching.</p></section>
        </div>
      </article>
    </main>
  );
}
