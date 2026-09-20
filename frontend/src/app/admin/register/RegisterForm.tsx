"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/api-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const RESEND_COOLDOWN_SECONDS = 30;

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  async function requestOtp() {
    const response = await fetch(apiUrl("/api/auth/request-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email.trim() }),
    });
    const text = await response.text();
    let data: { error?: string; message?: string } = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }
    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Could not send your verification code.",
      );
    }
    setOtpRequested(true);
    setOtp("");
    setResendCountdown(RESEND_COOLDOWN_SECONDS);
    setSuccessMessage("A new verification code has been sent to your email.");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!EMAIL_PATTERN.test(form.email.trim()))
      return setError("Enter a valid email address.");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");
    setLoading(true);
    try {
      if (!otpRequested) {
        await requestOtp();
        return;
      }

      if (!/^\d{6}$/.test(otp))
        return setError("Enter the 6-digit verification code from your email.");

      const response = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email.trim(),
          password: form.password,
          otp,
        }),
      });
      const text = await response.text();
      let data: { error?: string; message?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
      }
      if (!response.ok)
        return setError(
          data.error || data.message || "Could not create your account.",
        );
      router.push("/admin/billing");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error && error.message
          ? error.message
          : "Could not reach the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-parchment-300 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900"
    >
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {successMessage}
        </p>
      )}
      {!otpRequested ? (
        <>
          {(["name", "email", "password", "confirmPassword"] as const).map(
            (field) => (
              <label
                key={field}
                className="block text-sm font-medium text-ink-700 dark:text-parchment-200"
              >
                {field === "confirmPassword"
                  ? "Confirm password"
                  : field[0].toUpperCase() + field.slice(1)}
                <input
                  type={
                    field.includes("password")
                      ? "password"
                      : field === "email"
                        ? "email"
                        : "text"
                  }
                  required
                  minLength={field.includes("password") ? 8 : undefined}
                  value={form[field]}
                  onChange={(event) =>
                    setForm({ ...form, [field]: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2.5 text-sm outline-none focus:border-gold-400 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
                />
              </label>
            ),
          )}
        </>
      ) : (
        <label className="block text-sm font-medium text-ink-700 dark:text-parchment-200">
          Verification code
          <p className="mt-1 text-xs font-normal text-ink-500 dark:text-parchment-400">
            Enter the 6-digit code sent to {form.email}.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
            className="mt-2 w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2.5 text-center text-lg tracking-[0.35em] outline-none focus:border-gold-400 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {otpRequested
          ? "Verify email and create account"
          : "Send verification code"}
      </button>
      {otpRequested && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={async () => {
              setError(null);
              setSuccessMessage(null);
              setLoading(true);
              try {
                await requestOtp();
              } catch (error) {
                setError(
                  error instanceof Error && error.message
                    ? error.message
                    : "Could not resend your verification code.",
                );
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || resendCountdown > 0}
            className="w-full text-sm font-medium text-gold-700 hover:underline disabled:opacity-60 dark:text-gold-400"
          >
            {resendCountdown > 0
              ? `Resend in ${resendCountdown}s`
              : "Resend verification code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOtpRequested(false);
              setOtp("");
              setError(null);
              setSuccessMessage(null);
            }}
            className="w-full text-sm font-medium text-gold-700 hover:underline dark:text-gold-400"
          >
            Change email or account details
          </button>
        </div>
      )}
    </form>
  );
}
