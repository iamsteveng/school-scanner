"use client";

import { useMemo, useState } from "react";

type StartFormProps = {
  onSubmit: (payload: { phone: string; baseUrl: string }) => Promise<void>;
  getBaseUrl?: () => string;
};

const COUNTRY_CODES = [
  { label: "Hong Kong (+852)", value: "+852" },
  { label: "United States (+1)", value: "+1" },
  { label: "United Kingdom (+44)", value: "+44" },
  { label: "Australia (+61)", value: "+61" },
  { label: "Singapore (+65)", value: "+65" },
  { label: "Japan (+81)", value: "+81" },
  { label: "China (+86)", value: "+86" },
];

const MIN_DIGITS = 6;
const MAX_DIGITS = 15;

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidPhoneDigits(digits: string) {
  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS;
}

export default function StartForm({ onSubmit, getBaseUrl }: StartFormProps) {
  const [countryCode, setCountryCode] = useState("+852");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const phone = useMemo(
    () => `${countryCode}${phoneDigits}`,
    [countryCode, phoneDigits],
  );

  const isValid = isValidPhoneDigits(phoneDigits);
  const isSubmitDisabled = !termsAccepted || !isValid || status === "submitting";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError("Please accept the terms to continue.");
      return;
    }

    if (!isValid) {
      setError("Enter a valid phone number.");
      return;
    }

    try {
      setStatus("submitting");
      const baseUrl =
        getBaseUrl?.() ??
        (typeof window !== "undefined" ? window.location.origin : "");
      await onSubmit({ phone, baseUrl });
      setStatus("success");
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send verification message.",
      );
    }
  };

  return (
    <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          ✓
        </span>
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-600">
            Verify WhatsApp
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Get alerts for school open days
          </h1>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Enter your WhatsApp number and we will send you a secure verification
        link.
      </p>

      {status === "success" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          Message sent! Check WhatsApp for your verification link.
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-[160px_1fr]">
            <label className="text-sm font-medium text-slate-700">
              Country code
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
              >
                {COUNTRY_CODES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              WhatsApp number
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                inputMode="numeric"
                placeholder="Enter number"
                value={phoneDigits}
                onChange={(event) =>
                  setPhoneDigits(normalizePhoneDigits(event.target.value))
                }
              />
            </label>
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
            />
            <span>
              I agree to receive verification messages and updates via WhatsApp.
            </span>
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            type="submit"
            disabled={isSubmitDisabled}
          >
            {status === "submitting"
              ? "Sending..."
              : "Send verification link"}
          </button>
        </form>
      )}
    </div>
  );
}
