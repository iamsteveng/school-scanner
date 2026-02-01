"use client";

import { useAction } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";

type VerificationState =
  | { status: "loading" }
  | { status: "error"; message: string; debugDetails?: string };

const DEFAULT_ERROR_MESSAGE =
  "That verification link is invalid or has expired. Please request a new one.";

function stringifyError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack ?? err.message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export default function VerifyTokenPage({
  params,
}: {
  params: { token?: string };
}) {
  const router = useRouter();

  const debugEnabled = useMemo(() => {
    // useSearchParams can be unreliable during certain protected/redirect flows.
    // For a debug-only flag, reading from window.location is the most robust.
    if (typeof window === "undefined") {
      return false;
    }
    const value = new URLSearchParams(window.location.search).get("debug");
    return value === "1" || value === "true";
  }, []);

  const consumeVerificationLink = useAction(
    api.verificationActions.consumeVerificationLinkAction,
  );

  const [state, setState] = useState<VerificationState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isActive = true;

    const verify = async () => {
      const token = params?.token?.trim();
      if (!token) {
        if (isActive) {
          setState({ status: "error", message: DEFAULT_ERROR_MESSAGE });
        }
        return;
      }

      try {
        const result = await consumeVerificationLink({ token });
        if (!isActive) {
          return;
        }
        router.replace(result.redirectTo ?? "/start");
      } catch (err) {
        // Keep UI calm, but don't hide the real cause when debug is enabled.
        // This helps diagnose Convex client/config issues vs truly expired tokens.
        // Note: never display the returned session JWT on this page.
        // (We only log/display the error object.)
        // eslint-disable-next-line no-console
        console.error("Verification failed", err);

        if (!isActive) {
          return;
        }

        const baseDebug = debugEnabled
          ? [
              `token: ${token}`,
              `convexUrl: ${process.env.NEXT_PUBLIC_CONVEX_URL ?? "(unset)"}`,
              `error: ${stringifyError(err)}`,
            ].join("\n")
          : undefined;

        setState({
          status: "error",
          message: DEFAULT_ERROR_MESSAGE,
          debugDetails: baseDebug,
        });
      }
    };

    void verify();

    return () => {
      isActive = false;
    };
  }, [attempt, consumeVerificationLink, debugEnabled, params?.token, router]);

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-6 py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 rounded-2xl border border-emerald-100/70 bg-white/80 p-8 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">
              Verification link
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              We couldn&apos;t verify that link.
            </h1>
            <p className="mt-3 text-base text-slate-600">{state.message}</p>

            {state.debugDetails ? (
              <details className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <summary className="cursor-pointer select-none font-semibold text-slate-800">
                  Debug details
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-600">
                  {state.debugDetails}
                </pre>
              </details>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-5 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            >
              Retry verification
            </button>

            <Link
              href="/start"
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-6 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6 rounded-2xl border border-emerald-100/70 bg-white/80 p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">
            Verifying
          </p>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Checking your verification link
          </h1>
          <p className="mt-3 text-base text-slate-600">
            This should only take a moment. We&apos;ll send you to the next step
            automatically.
          </p>
        </div>
      </div>
    </main>
  );
}
