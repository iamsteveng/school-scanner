import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">School Open Day Radar</h1>
        <p className="mt-2 text-slate-600">
          App shell routes for MVP scaffolding.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
            href="/start"
          >
            /start
          </Link>
          <Link
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
            href="/schools"
          >
            /schools
          </Link>
          <Link
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
            href="/dashboard"
          >
            /dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
