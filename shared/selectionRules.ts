export type Plan = "FREE" | "PREMIUM";

export function normalizeSelection<T>(schoolIds: T[]): T[] {
  // De-dupe while preserving order.
  const seen = new Set<T>();
  const out: T[] = [];
  for (const id of schoolIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function assertSelectionAllowed(args: {
  plan: Plan;
  nextCount: number;
  wasPreviouslySaved: boolean;
  isLocked: boolean;
}) {
  if (args.plan === "FREE") {
    if (args.nextCount > 5) {
      throw new Error("Free plan can select up to 5 schools");
    }
    if (args.wasPreviouslySaved && args.isLocked) {
      throw new Error("Selection is locked for Free plan until upgrade");
    }
  }
}
