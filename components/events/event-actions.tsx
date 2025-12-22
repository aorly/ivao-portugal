"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  startIso: string;
  endIso: string;
  url: string;
  location?: string | null;
  description?: string | null;
  layout?: "grid" | "stacked";
  calendarLabel?: string;
  shareLabel?: string;
  showLabels?: boolean;
  className?: string;
  buttonClassName?: string;
};

const escapeIcsText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

const toIcsDate = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

export function EventActions({
  title,
  startIso,
  endIso,
  url,
  location,
  description,
  layout = "grid",
  calendarLabel = "Add to calendar",
  shareLabel = "Share link",
  showLabels = true,
  className,
  buttonClassName,
}: Props) {
  const [copied, setCopied] = useState(false);
  const shareStatus = copied ? "Link copied to clipboard" : "";

  const CalendarIcon = (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10z"
        fill="currentColor"
      />
    </svg>
  );
  const ShareIcon = (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M18 16a3 3 0 0 0-2.4 1.2l-6.1-3.1a3.2 3.2 0 0 0 0-2.2l6-3.1A3 3 0 1 0 14 6a3 3 0 0 0 .1.8l-6 3.1a3 3 0 1 0 0 4.2l6.1 3.1A3 3 0 1 0 18 16z"
        fill="currentColor"
      />
    </svg>
  );

  const downloadIcs = () => {
    const dtStart = toIcsDate(startIso);
    const dtEnd = toIcsDate(endIso);
    const stamp = toIcsDate(new Date().toISOString());
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//IVAO Portugal//Events//EN",
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(url)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcsText(title)}`,
      `DESCRIPTION:${escapeIcsText(description ?? "")}`,
      `URL:${url}`,
      location ? `LOCATION:${escapeIcsText(location)}` : null,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean);

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${title}.ics`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({ title, url, text: description ?? undefined });
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const wrapperClass =
    layout === "stacked"
      ? "flex flex-col gap-2"
      : "grid gap-2 sm:grid-cols-2";

  return (
    <div className={`${wrapperClass} ${className ?? ""}`.trim()}>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        onClick={downloadIcs}
        className={`w-full ${buttonClassName ?? ""}`.trim()}
        aria-label={calendarLabel}
        title={calendarLabel}
        data-analytics="cta"
        data-analytics-label="Add to calendar"
        data-analytics-href={url}
      >
        <span className="flex items-center justify-center gap-2">
          {CalendarIcon}
          {showLabels ? calendarLabel : <span className="sr-only">{calendarLabel}</span>}
        </span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        onClick={shareLink}
        className={`w-full ${buttonClassName ?? ""}`.trim()}
        aria-label={shareLabel}
        title={shareLabel}
        data-analytics="cta"
        data-analytics-label="Share event"
        data-analytics-href={url}
      >
        <span className="flex items-center justify-center gap-2">
          {ShareIcon}
          {showLabels ? (copied ? "Link copied" : shareLabel) : <span className="sr-only">{shareLabel}</span>}
        </span>
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {shareStatus}
      </span>
    </div>
  );
}
