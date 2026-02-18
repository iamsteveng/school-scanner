export type Plan = 'FREE' | 'PREMIUM';
export type SummaryCadence = 'daily' | 'weekly';

export type CadenceEligibility =
  | {
      status: 'eligible';
      plan: Plan;
      requestedCadence: SummaryCadence;
    }
  | {
      status: 'ineligible';
      reason: 'cadence_mismatch' | 'invalid_plan';
      plan?: string;
      requestedCadence: SummaryCadence;
    };

/**
 * Centralized cadence enforcement logic.
 *
 * FREE => weekly only
 * PREMIUM => daily only
 */
export function enforceCadence(
  planInput: string,
  requestedCadence: SummaryCadence
): CadenceEligibility {
  const plan = planInput as Plan;

  if (plan !== 'FREE' && plan !== 'PREMIUM') {
    return {
      status: 'ineligible',
      reason: 'invalid_plan',
      plan: planInput,
      requestedCadence,
    };
  }

  if (plan === 'FREE' && requestedCadence !== 'weekly') {
    return {
      status: 'ineligible',
      reason: 'cadence_mismatch',
      plan,
      requestedCadence,
    };
  }

  if (plan === 'PREMIUM' && requestedCadence !== 'daily') {
    return {
      status: 'ineligible',
      reason: 'cadence_mismatch',
      plan,
      requestedCadence,
    };
  }

  return { status: 'eligible', plan, requestedCadence };
}

/**
 * Convenience boolean checker for gating higher-level flows.
 */
export function isCadenceEligible(planInput: string, requestedCadence: SummaryCadence): boolean {
  return enforceCadence(planInput, requestedCadence).status === 'eligible';
}
