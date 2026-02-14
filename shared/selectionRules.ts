export type Plan = "FREE" | "PREMIUM";

export type SelectionGuardCode =
  | "OK"
  | "FREE_LIMIT_EXCEEDED"
  | "UPGRADE_REQUIRED";

export type SelectionGuardOutcome =
  | { ok: true; code: "OK" }
  | { ok: false; code: Exclude<SelectionGuardCode, "OK">; message: string };

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

export function getSelectionGuardOutcome(args: {
  plan: Plan;
  nextCount: number;
  wasPreviouslySaved: boolean;
  isLocked: boolean;
}): SelectionGuardOutcome {
  if (args.plan === "FREE") {
    if (args.nextCount > 5) {
      return {
        ok: false,
        code: "FREE_LIMIT_EXCEEDED",
        message: "Free plan can select up to 5 schools",
      };
    }

    if (args.wasPreviouslySaved && args.isLocked) {
      return {
        ok: false,
        code: "UPGRADE_REQUIRED",
        message: "Selection is locked for Free plan until upgrade",
      };
    }
  }

  return { ok: true, code: "OK" };
}

export function assertSelectionAllowed(args: {
  plan: Plan;
  nextCount: number;
  wasPreviouslySaved: boolean;
  isLocked: boolean;
}) {
  const outcome = getSelectionGuardOutcome(args);
  if (!outcome.ok) {
    throw new Error(outcome.message);
  }
}
