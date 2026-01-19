"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/public/turnstile-widget";

type Labels = {
  name: string;
  email: string;
  vid: string;
  title: string;
  message: string;
  submit: string;
  note: string;
};

type Props = {
  initialName?: string | null;
  initialEmail?: string | null;
  initialVid?: string | null;
  labels: Labels;
};

export function FeedbackForm({ initialName, initialEmail, initialVid, labels }: Props) {
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setStatus("idle");
    setErrorMessage("");

    const form = event.currentTarget as HTMLFormElement | null;
    const data = new FormData(form ?? undefined);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const vid = String(data.get("vid") ?? "").trim();
    const title = String(data.get("title") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const honeypot = String(data.get("company") ?? "").trim();
    const formToken = String(data.get("h-captcha-response") ?? "").trim();
    const resolvedToken = formToken || token;

    if (!resolvedToken) {
      setErrorMessage("Captcha token missing. Please retry.");
      setStatus("error");
      setPending(false);
      return;
    }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          vid,
          title,
          message,
          honeypot,
          token: resolvedToken,
        }),
      });
      const result = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !result?.ok) {
        setErrorMessage(result?.error ?? "Please complete the captcha and try again.");
        setStatus("error");
        setPending(false);
        return;
      }
      setStatus("success");
      setErrorMessage("");
      form?.reset();
      setToken("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Submission failed. Please try again.");
      setStatus("error");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-[color:var(--text-muted)]">
          <span>{labels.name}</span>
          <input
            name="name"
            defaultValue={initialName ?? ""}
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <label className="space-y-1 text-sm text-[color:var(--text-muted)]">
          <span>{labels.email}</span>
          <input
            name="email"
            type="email"
            defaultValue={initialEmail ?? ""}
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-[color:var(--text-muted)]">
          <span>{labels.vid}</span>
          <input
            name="vid"
            defaultValue={initialVid ?? ""}
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <label className="space-y-1 text-sm text-[color:var(--text-muted)]">
          <span>{labels.title}</span>
          <input
            name="title"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
      </div>
      <label className="space-y-1 text-sm text-[color:var(--text-muted)]">
        <span>{labels.message}</span>
        <textarea
          name="message"
          rows={6}
          className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </label>
      <label className="hidden">
        <span>Company</span>
        <input name="company" tabIndex={-1} autoComplete="off" />
      </label>
      <TurnstileWidget onVerify={setToken} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[color:var(--text-muted)]">{labels.note}</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending..." : labels.submit}
        </Button>
      </div>
      {status === "success" ? (
        <p className="text-xs font-semibold text-[color:var(--success)]">Message sent.</p>
      ) : null}
      {status === "error" ? (
        <p className="text-xs font-semibold text-[color:var(--danger)]">{errorMessage}</p>
      ) : null}
    </form>
  );
}
