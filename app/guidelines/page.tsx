import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const rules = [
  ["Be respectful", "Disagree with ideas without attacking or targeting people."],
  ["Share context", "When sharing news or factual claims, include sources and relevant dates when available."],
  ["Disclose AI use honestly", "Creator declarations help readers understand media origin. AI-generated content is not automatically misinformation."],
  ["Do not mislead", "Do not knowingly present false context, impersonate others, or edit media to deceive people."],
  ["Protect privacy", "Do not publish personal information, private messages or identifying content without a lawful basis and appropriate permission."],
  ["Report responsibly", "Use reports for genuine policy concerns. Coordinated or knowingly false reports can harm the community."],
  ["Respect rights", "Only upload media you are allowed to share. Respect copyright and other people's rights."],
];

export default function GuidelinesPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f5f6fb] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={16} /> Back to Verity</Link>
        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><ShieldCheck size={24} /></div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Community standards</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Community guidelines</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">These starter guidelines set expectations for healthy discussions. They should be reviewed and expanded before Verity opens to the public.</p>
        <div className="mt-8 space-y-3">{rules.map(([title, body], index) => <section key={title} className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-extrabold text-indigo-700">{String(index + 1).padStart(2, "0")}</span><div><h2 className="font-extrabold">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{body}</p></div></div></section>)}</div>
        <p className="mt-6 text-sm leading-6 text-slate-500">Need help or want to report a concern? Open <Link href="/?support=1" className="font-bold text-indigo-700 underline">Verity support</Link>.</p>
      </article>
    </main>
  );
}
