export type SearchableSchool = {
  nameEn: string;
  nameZh: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function scoreTextMatch(textRaw: string, queryRaw: string): number {
  const text = normalize(textRaw);
  const query = normalize(queryRaw);

  if (!query) return 0;
  if (!text) return 0;

  if (text === query) return 1000;

  // Prefix matches are usually the most relevant for “typeahead”.
  if (text.startsWith(query)) {
    // Prefer tighter matches (shorter total name).
    const lengthPenalty = Math.min(100, Math.max(0, text.length - query.length));
    return 850 - lengthPenalty;
  }

  const idx = text.indexOf(query);
  if (idx >= 0) {
    // Earlier occurrences are more relevant.
    const positionBoost = Math.max(0, 200 - idx);
    return 500 + positionBoost;
  }

  return 0;
}

export function scoreSchoolMatch(school: SearchableSchool, query: string): number {
  return Math.max(
    scoreTextMatch(school.nameEn, query),
    scoreTextMatch(school.nameZh, query),
  );
}

export function sortSchoolsByRelevance<T extends SearchableSchool>(
  schools: T[],
  query: string,
): T[] {
  const scored = schools
    .map((s) => ({ s, score: scoreSchoolMatch(s, query) }))
    .filter((row) => row.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable tie-breaker: English name, then Chinese name.
    const en = a.s.nameEn.localeCompare(b.s.nameEn);
    if (en !== 0) return en;
    return a.s.nameZh.localeCompare(b.s.nameZh);
  });

  return scored.map((row) => row.s);
}
