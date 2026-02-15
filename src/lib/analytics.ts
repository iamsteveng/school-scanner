export type AnalyticsEventName = "upgrade_cta_clicked";

export type AnalyticsEventProperties = Record<string, unknown>;

type AnalyticsLike = {
  track?: (event: string, properties?: AnalyticsEventProperties) => void;
};

function getAnalyticsClient(): AnalyticsLike | null {
  if (typeof window === "undefined") return null;

  const analytics = (window as Window & { analytics?: AnalyticsLike }).analytics;
  if (analytics?.track) return analytics;

  // TODO(analytics): wire provider-specific client here when analytics infra is standardized.
  return null;
}

export function trackEvent(event: AnalyticsEventName, properties?: AnalyticsEventProperties): void {
  const analytics = getAnalyticsClient();
  if (!analytics?.track) return;
  analytics.track(event, properties);
}
