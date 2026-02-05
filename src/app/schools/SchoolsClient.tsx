"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getSessionUserId } from "../../lib/session";
import { DISTRICT_OPTIONS, TYPE_OPTIONS } from "./constants";
import { useRouter } from "next/navigation";

type FilterState = {
  q: string;
  level?: string;
  type?: string;
  districtEn?: string;
};

function labelBilingual(zh: string, en: string) {
  return `${zh} (${en})`;
}

export default function SchoolsClient() {
  const router = useRouter();
  const userId = getSessionUserId() as Id<"users"> | null;

  const [filters, setFilters] = useState<FilterState>({
    q: "",
    level: "PRIMARY",
  });

  const user = useQuery(api.usersQueries.getUser, userId ? { userId } : "skip");

  const selection = useQuery(
    api.userSelections.getForUser,
    userId ? { userId } : "skip",
  );

  // Access control / redirects
  useEffect(() => {
    if (!userId) {
      router.replace("/start");
      return;
    }

    // If the user already has a saved selection, they should not access /schools again.
    if (selection?.schoolIds && selection.schoolIds.length > 0) {
      router.replace("/dashboard");
    }
  }, [router, userId, selection?.schoolIds]);

  const saveSelection = useMutation(api.userSelections.saveForUser);

  const plan = user?.plan ?? "FREE";
  const locked = plan === "FREE" && !!selection?.lockedAt;

  const schools = useQuery(api.schools.listSchools, {
    q: filters.q || undefined,
    level: filters.level || undefined,
    type: filters.type || undefined,
    district: filters.districtEn || undefined,
    limit: 200,
  });

  const [selectedIds, setSelectedIds] = useState<Id<"schools">[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  // Initialize selection state from server when loaded.
  useMemo(() => {
    if (selection?.schoolIds && selectedIds.length === 0) {
      setSelectedIds(selection.schoolIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?._id]);

  const selectedCount = selectedIds.length;
  const maxFree = 5;

  const canSelectMore = plan === "PREMIUM" || selectedCount < maxFree;

  const toggleSchool = (schoolId: Id<"schools">) => {
    if (!userId) {
      setStatus("Please verify first.");
      return;
    }
    if (locked) {
      setStatus("Your selection is locked on the Free plan. Upgrade to edit.");
      return;
    }

    setStatus(null);

    setSelectedIds((prev) => {
      const exists = prev.includes(schoolId);
      if (exists) return prev.filter((id) => id !== schoolId);
      if (!canSelectMore) {
        setStatus("Free plan can select up to 5 schools.");
        return prev;
      }
      return [...prev, schoolId];
    });
  };

  const onSave = async () => {
    if (!userId) {
      setStatus("Please verify first.");
      return;
    }
    try {
      setStatus("Saving...");
      const result = await saveSelection({
        userId,
        schoolIds: selectedIds,
      });
      if (result.lockedAt && plan === "FREE") {
        setStatus("Saved. Your Free plan selection is now locked until upgrade.");
      } else {
        setStatus("Saved.");
      }
    } catch (err) {
      setStatus((err as Error).message || "Failed to save.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-emerald-100/70 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            選擇學校 (Select schools)
          </h1>
          <p className="text-sm text-slate-600">
            Plan: <span className="font-semibold">{plan}</span>
            {locked ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                已鎖定 (Locked)
              </span>
            ) : null}
          </p>
        </div>

        {!userId ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            你需要先完成 WhatsApp 驗證。 (Please verify via WhatsApp first.)
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            placeholder="搜尋學校… (Search)"
            className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm"
            disabled={locked}
          />

          <select
            value={filters.type ?? ""}
            onChange={(e) =>
              setFilters((p) => ({ ...p, type: e.target.value || undefined }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
            disabled={locked}
          >
            <option value="">學校類型 (Type)</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {labelBilingual(opt.labelZh, opt.labelEn)}
              </option>
            ))}
          </select>

          <select
            value={filters.districtEn ?? ""}
            onChange={(e) =>
              setFilters((p) => ({
                ...p,
                districtEn: e.target.value || undefined,
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
            disabled={locked}
          >
            <option value="">地區 (District)</option>
            {DISTRICT_OPTIONS.map((d) => (
              <option key={d.valueEn} value={d.valueEn}>
                {labelBilingual(d.labelZh, d.labelEn)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-700">
            已選 (Selected):{" "}
            <span className="font-semibold">
              {selectedCount}/{plan === "FREE" ? maxFree : "∞"}
            </span>
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={!userId || selectedCount === 0}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            開始監察 (Start monitoring)
          </button>
        </div>

        {status ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {status}
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">
            學校列表 (Schools)
          </h2>
          <div className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {(schools ?? []).map((s) => {
              const id = s._id;
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSchool(id)}
                    disabled={locked || (!checked && !canSelectMore)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {s.nameZh} <span className="text-slate-400">/</span> {s.nameEn}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {s.districtZh} ({s.districtEn}) · {s.type} · {s.level}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {locked ? (
          <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            你的免費方案已鎖定選校。升級後可再次編輯。 (Your free plan selection is locked. Upgrade to edit.)
          </div>
        ) : null}
      </div>
    </main>
  );
}
