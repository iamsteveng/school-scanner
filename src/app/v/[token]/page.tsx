"use client";

import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";

type VerificationState =
  | { status: "loading" }
  | { status: "error"; message: string };

const DEFAULT_ERROR_MESSAGE =
  "That verification link is invalid or has expired. Please request a new one.";

export default function VerifyTokenPage({
  params,
}: {
  params: { token?: string };
}) {
  const router = useRouter();
  const consumeVerificationLink = useAction(
    api.verificationActions.consumeVerificationLinkAction,
  );
  const [state, setState] = useState<VerificationState>({
    status: "loading",
  });

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
      } catch {
        if (!isActive) {
          return;
        }
        const message = DEFAULT_ERROR_MESSAGE;
        setState({ status: "error", message });
      }
    };

    void verify();

    return () => {
      isActive = false;
    };
  }, [consumeVerificationLink, params?.token, router]);

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
            <p className="mt-3 text-base text-slate-600">
              {state.message}
            </p>
          </div>
          <Link
            href="/start"
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            Request a new link
          </Link>
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
