"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getSessionUserId } from "../../lib/session";
import { useRouter } from "next/navigation";

function formatTs(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function DashboardClient() {
  const router = useRouter();
  const userId = getSessionUserId() as Id<"users"> | null;

  const [sinceAt] = useState<number | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const uid = getSessionUserId();
    if (!uid) return undefined;
    const key = `ss_last_dashboard_seen:${uid}`;
    const raw = window.localStorage.getItem(key);
    const prev = raw ? Number(raw) : NaN;
    return !Number.isNaN(prev) && prev > 0 ? prev : undefined;
  });

  // Persist a local "last seen" (no state update needed).
  useEffect(() => {
    if (!userId) return;
    const key = `ss_last_dashboard_seen:${userId}`;
    const now = Date.now();
    window.localStorage.setItem(key, String(now));
  }, [userId]);

  const dashboard = useQuery(
    api.dashboardQueries.getDashboardForUser,
    userId ? { userId, limitUpdates: 50, perSchoolLimit: 5, sinceAt } : "skip",
  );

  const hasSelection = (dashboard?.selection?.schoolIds?.length ?? 0) > 0;

  // Access control / redirects
  useEffect(() => {
    if (!userId) {
      router.replace("/start");
      return;
    }
    if (dashboard && !hasSelection) {
      router.replace("/schools");
    }
  }, [router, userId, dashboard, hasSelection]);

  const monitoringLabel = useMemo(() => {
    if (!dashboard?.monitoring) return "No monitoring runs yet";
    const m = dashboard.monitoring;
    return `${m.status} • schools=${m.schoolsChecked} • pages=${m.pagesFetched} • new=${m.changesNew} • updated=${m.changesUpdated} • errors=${m.errors}`;
  }, [dashboard?.monitoring]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {dashboard?.user ? (
              <>
                Plan: <span className="font-semibold">{dashboard.user.plan}</span>
              </>
            ) : (
              "Loading…"
            )}
          </p>
          <div className="mt-3 text-xs text-slate-600">
            Monitoring: <span className="font-semibold">{monitoringLabel}</span>
            {dashboard?.monitoring?.finishedAt ? (
              <>
                {" "}
                (last run: {formatTs(dashboard.monitoring.finishedAt)})
              </>
            ) : null}
          </div>

          {sinceAt && dashboard?.sinceCounts ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Since last visit: <span className="font-semibold">{dashboard.sinceCounts.total}</span> updates
              (events: {dashboard.sinceCounts.events}, announcements: {dashboard.sinceCounts.announcements})
            </div>
          ) : null}
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Selected schools</h2>
            <button
              type="button"
              onClick={() => router.push("/schools")}
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              View
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {(dashboard?.schools ?? []).slice(0, 10).map((s) => (
              <div key={s._id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">{s.nameZh}</div>
                <div className="text-xs text-slate-600">{s.nameEn}</div>
              </div>
            ))}
          </div>

          {(dashboard?.schools ?? []).length > 10 ? (
            <p className="mt-3 text-xs text-slate-600">
              Showing 10 of {(dashboard?.schools ?? []).length}.
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Latest updates</h2>
          <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {(dashboard?.updates ?? []).length === 0 ? (
              <div className="p-4 text-sm text-slate-600">No updates yet.</div>
            ) : (
              (dashboard?.updates ?? []).map((u, idx) => (
                <div key={idx} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {u.kind}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {u.title}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {u.schoolNameZh} • {formatTs(u.at)}
                    {u.kind === "announcement" ? ` • ${u.changeType}` : ""}
                  </div>
                  <div className="mt-2">
                    <a
                      className="text-sm font-semibold text-emerald-700 hover:underline"
                      href={u.kind === "event" ? u.sourceUrl : u.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
