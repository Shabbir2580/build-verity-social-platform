import Link from "next/link";

export default function NotFound() {
  return (
    <main className="verity-app flex min-h-screen items-center justify-center px-5 py-12 text-slate-900">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-10">
        <p className="text-sm font-black tracking-[0.25em] text-indigo-600">
          404
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          We couldn’t find that page.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          The link may be outdated, or the page may have moved. Head back to
          Verity and continue exploring.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Return to homepage
        </Link>
      </section>
    </main>
  );
}
