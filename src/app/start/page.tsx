"use client";

import { useAction } from "convex/react";
import StartForm from "./StartForm";
import { api } from "../../../convex/_generated/api";

export default function StartPage() {
  const startVerification = useAction(api.verificationFlow.startVerification);

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-10 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">
            School Open Day Radar
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Track open day announcements without the noise.
          </h1>
          <p className="mt-4 text-base text-slate-600">
            We will send a secure verification link to WhatsApp. You choose the
            schools — we handle the monitoring.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Daily checks</span>
            <span>Instant alerts</span>
            <span>HK-focused</span>
          </div>
        </div>

        <StartForm
          onSubmit={async ({ phone, baseUrl }) => {
            await startVerification({ phone, baseUrl });
          }}
        />
      </div>
    </main>
  );
}
