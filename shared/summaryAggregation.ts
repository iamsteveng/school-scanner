export type SummaryUpdateRecord = {
  schoolId: string;
  updateId: string;
  at: number;
};

export type AggregateSelectedSchoolUpdatesArgs = {
  selectedSchoolIds: string[];
  updates: SummaryUpdateRecord[];
  windowStart: number;
  windowEnd: number;
};

export type AggregateSelectedSchoolUpdatesResult = {
  selectedSchoolCount: number;
  updatedSchoolCount: number;
  missedSchoolsCount: number;
  missedSchoolsMessage: string | null;
  totalRelevantUpdates: number;
  updateCountsBySchool: Record<string, number>;
};

/**
 * Aggregates updates for the caller's selected schools within an explicit time window.
 * Window boundaries are inclusive, and duplicates are collapsed by schoolId+updateId.
 */
export function aggregateSelectedSchoolUpdates(
  args: AggregateSelectedSchoolUpdatesArgs
): AggregateSelectedSchoolUpdatesResult {
  const { selectedSchoolIds, updates, windowStart, windowEnd } = args;

  if (windowStart > windowEnd) {
    throw new Error('Invalid summary window: windowStart must be <= windowEnd');
  }

  const normalizedSelectedSchoolIds = [...new Set(selectedSchoolIds)].sort();
  const selectedSet = new Set(normalizedSelectedSchoolIds);
  const deduped = new Map<string, SummaryUpdateRecord>();

  for (const update of updates) {
    if (!selectedSet.has(update.schoolId)) continue;
    if (update.at < windowStart || update.at > windowEnd) continue;

    const dedupeKey = `${update.schoolId}:${update.updateId}`;
    if (!deduped.has(dedupeKey)) {
      deduped.set(dedupeKey, update);
    }
  }

  const relevantUpdates = [...deduped.values()].sort((a, b) => {
    if (a.at !== b.at) return b.at - a.at;
    if (a.schoolId !== b.schoolId) return a.schoolId.localeCompare(b.schoolId);
    return a.updateId.localeCompare(b.updateId);
  });

  const updateCountsBySchool: Record<string, number> = {};
  for (const schoolId of normalizedSelectedSchoolIds) {
    updateCountsBySchool[schoolId] = 0;
  }
  for (const update of relevantUpdates) {
    updateCountsBySchool[update.schoolId] += 1;
  }

  const updatedSchoolCount = Object.values(updateCountsBySchool).filter((c) => c > 0).length;
  const missedSchoolsCount = normalizedSelectedSchoolIds.length - updatedSchoolCount;

  return {
    selectedSchoolCount: normalizedSelectedSchoolIds.length,
    updatedSchoolCount,
    missedSchoolsCount,
    missedSchoolsMessage: formatMissedSchoolsMessage(missedSchoolsCount),
    totalRelevantUpdates: relevantUpdates.length,
    updateCountsBySchool,
  };
}

export function formatMissedSchoolsMessage(missedSchoolsCount: number): string | null {
  if (missedSchoolsCount <= 0) return null;
  if (missedSchoolsCount === 1) return '1 selected school had no updates in this window.';
  return `${missedSchoolsCount} selected schools had no updates in this window.`;
}
