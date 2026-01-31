"use client";

import { useActionState, useEffect, useId, useMemo, useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MultiAirportInput } from "@/components/admin/multi-airport-input";
import { EventPuckEditor } from "@/components/admin/event-puck-editor";
import { type EventLayoutData } from "@/components/puck/event-context";

type EventDto = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  puckLayout: string | null;
  bannerUrl: string | null;
  infoUrl: string | null;
  eventType: string | null;
  divisions: string | null;
  routes: string | null;
  hqeAward: boolean;
  externalId: string | null;
  startTime: string;
  endTime: string;
  isPublished: boolean;
  airports: { icao: string }[];
};

type AirportOption = { icao: string };

type Props = {
  upcoming: EventDto[];
  past: EventDto[];
  airports: AirportOption[];
  locale: string;
  createAction: (prevState: { success?: boolean; error?: string }, formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  updateAction: (prevState: { success?: boolean; error?: string }, formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  deleteAction: (formData: FormData) => Promise<void>;
  importAction: (prevState: { success?: boolean; error?: string }, formData: FormData) => Promise<{ success?: boolean; error?: string }>;
};

type Mode = "upcoming" | "past" | "all";

export function EventsAdmin({ upcoming, past, airports, locale, createAction, updateAction, deleteAction, importAction }: Props) {
  const [mode, setMode] = useState<Mode>("upcoming");
  const [editing, setEditing] = useState<EventDto | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");
  const [importDivision, setImportDivision] = useState("");
  const [createState, createFormAction] = useActionState(createAction, { success: false, error: undefined });
  const [updateState, updateFormAction] = useActionState(updateAction, { success: false, error: undefined });
  const [importState, importFormAction] = useActionState(importAction, { success: false, error: undefined });
  const [importing, setImporting] = useState(false);
  const editFormId = useId();
  const searchId = useId();
  const importDivisionId = useId();
  const [ivaoEvents, setIvaoEvents] = useState<
    {
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      airports: string[];
      bannerUrl: string | null;
      description: string | null;
      infoUrl?: string | null;
      eventType?: string | null;
      divisions?: string[];
      hqeAward?: boolean;
    }[]
  >([]);
  const [importError, setImportError] = useState<string | null>(null);

  const visibleEvents = useMemo(() => {
    if (mode === "upcoming") return upcoming;
    if (mode === "past") return past;
    return [...upcoming, ...past];
  }, [mode, upcoming, past]);

  const parseCommaList = (value?: string | null) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).toUpperCase()).filter(Boolean);
    } catch {
      // fall through
    }
    return value
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
  };

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return visibleEvents;
    const needle = search.toLowerCase();
    return visibleEvents.filter((event) => {
      const divisions = parseCommaList(event.divisions);
      const haystack = [
        event.title,
        event.slug,
        event.eventType ?? "",
        event.externalId ?? "",
        event.airports.map((a) => a.icao).join(" "),
        divisions.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [visibleEvents, search]);

  useEffect(() => {
    if (createState?.success) {
      setShowCreate(false);
    }
  }, [createState?.success]);

  useEffect(() => {
    if (updateState?.success) {
      setEditing(null);
    }
  }, [updateState?.success]);

  useEffect(() => {
    if (importState?.success) {
      setShowImport(false);
    }
  }, [importState?.success]);

  const formatDateTimeLocal = (iso: string) => {
    const d = new Date(iso);
    return d.toISOString().slice(0, 16);
  };

  const formatDateTimeUtc = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso));

  const formatRange = (start: string, end: string) => `${formatDateTimeUtc(start)} - ${formatDateTimeUtc(end)} UTC`;

  const formatListInput = (value?: string | null) => {
    if (!value) return "";
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {
      // fall through
    }
    return value;
  };

  const formatRoutesInput = (value?: string | null) => {
    if (!value) return "";
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") return parsed;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const buildEventContext = (event: EventDto): EventLayoutData => {
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    const startLabel = formatDateTimeUtc(event.startTime);
    const endLabel = formatDateTimeUtc(event.endTime);
    const divisions = parseCommaList(event.divisions);
    const routes = formatRoutesInput(event.routes);
    return {
      id: event.id,
      slug: event.slug,
      locale,
      title: event.title,
      description: event.description ?? "",
      bannerUrl: event.bannerUrl ?? null,
      startIso: startDate.toISOString(),
      endIso: endDate.toISOString(),
      startLabel,
      endLabel,
      timeframe: formatRange(event.startTime, event.endTime),
      statusLabel: event.isPublished ? "Published" : "Draft",
      updatedLabel: null,
      updatedIso: null,
      airports: event.airports.map((a) => a.icao),
      firs: [],
      divisions,
      eventType: event.eventType ?? null,
      infoUrl: event.infoUrl ?? null,
      hqeAward: event.hqeAward,
      routes: routes ?? null,
      registrations: [],
      registrationsCount: 0,
      eventUrl: `/${locale}/events/${event.slug}`,
      eventLocation: event.airports.length ? event.airports.map((a) => a.icao).join(", ") : "Portugal",
      isRegistered: false,
      registerLabel: "Register",
      unregisterLabel: "Unregister",
    };
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Events</h1>
          <p className="text-xs text-[color:var(--text-muted)]">Create, import, and publish division events.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            New event
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowImport(true)}>
            Import from IVAO
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          size="sm"
          variant={mode === "upcoming" ? "secondary" : "ghost"}
          onClick={() => setMode("upcoming")}
          aria-pressed={mode === "upcoming"}
        >
          Upcoming ({upcoming.length})
        </Button>
        <Button
          size="sm"
          variant={mode === "past" ? "secondary" : "ghost"}
          onClick={() => setMode("past")}
          aria-pressed={mode === "past"}
        >
          Past ({past.length})
        </Button>
        <Button
          size="sm"
          variant={mode === "all" ? "secondary" : "ghost"}
          onClick={() => setMode("all")}
          aria-pressed={mode === "all"}
        >
          All ({upcoming.length + past.length})
        </Button>
        <label htmlFor={searchId} className="sr-only">
          Search events
        </label>
        <input
          id={searchId}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, slug, airport, division..."
          className="ml-auto w-full max-w-xs rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
        />
      </div>

      <Card className="space-y-3 p-4">
        {visibleEvents.length === 0 ? (
          <p role="status" className="text-sm text-[color:var(--text-muted)]">
            No events in this view.
          </p>
        ) : filteredEvents.length === 0 ? (
          <p role="status" className="text-sm text-[color:var(--text-muted)]">
            No events match your search.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const divisions = parseCommaList(event.divisions);
              const meta = [
                event.eventType,
                event.hqeAward ? "HQE Award" : null,
                event.externalId ? "IVAO" : null,
                ...divisions.map((d) => `DIV ${d}`),
              ].filter((item): item is string => Boolean(item));

              return (
                <div key={event.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-3)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{event.title}</p>
                        <p className="text-xs text-[color:var(--text-muted)]">{formatRange(event.startTime, event.endTime)}</p>
                      </div>
                      {event.airports.length ? (
                        <div className="flex flex-wrap gap-2 text-[11px] text-[color:var(--text-muted)]">
                          {event.airports.map((airport) => (
                            <span
                              key={airport.icao}
                              className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[color:var(--text-primary)]"
                            >
                              {airport.icao}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {meta.length ? (
                        <div className="flex flex-wrap gap-2 text-[11px] text-[color:var(--text-muted)]">
                          {meta.map((item) => (
                            <span key={item} className="rounded-full bg-[color:var(--surface-2)] px-2 py-1">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          event.isPublished
                            ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                            : "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"
                        }`}
                      >
                        {event.isPublished ? "Published" : "Draft"}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(event)}>
                          Edit
                        </Button>
                        <form action={deleteAction}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <Button size="sm" variant="ghost" type="submit">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showCreate ? (
        <Modal title="Create event" onClose={() => setShowCreate(false)}>
          <form
            action={createFormAction}
            className="space-y-3"
          >
            <input type="hidden" name="locale" value={locale} />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="title"
                required
                aria-label="Event title"
                placeholder="Title"
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="slug"
                aria-label="Event slug"
                placeholder="Slug (optional)"
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Description</span>
              <textarea
                name="description"
                rows={5}
                aria-label="Event description"
                placeholder="Event briefing..."
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                name="eventType"
                aria-label="Event type"
                placeholder="Event type (optional)"
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="infoUrl"
                aria-label="Briefing link"
                placeholder="Briefing link (optional)"
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                name="startTime"
                required
                aria-label="Start time"
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                type="datetime-local"
                name="endTime"
                required
                aria-label="End time"
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </div>
            <MultiAirportInput name="airports" options={airports.map((a) => a.icao)} label="Airports" />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                name="divisions"
                aria-label="Divisions"
                placeholder="Divisions (comma-separated, optional)"
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="externalId"
                aria-label="IVAO event id"
                placeholder="IVAO event id (optional)"
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </div>
            <textarea
              name="routes"
              rows={3}
              aria-label="Routes"
              placeholder="Routes JSON or notes (optional)"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="bannerUrl"
              aria-label="Banner URL"
              placeholder="Banner URL (optional)"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
              <input type="checkbox" name="hqeAward" /> HQE award
            </label>
            <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
              <input type="checkbox" name="isPublished" /> Published
            </label>
            <div className="flex justify-end gap-2">
              <Button size="sm" type="submit">
                Save event
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
            {createState?.error ? <p className="text-sm text-[color:var(--danger)]">{createState.error}</p> : null}
          </form>
        </Modal>
      ) : null}

      {editing ? (
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Edit event</p>
              <p className="text-xs text-[color:var(--text-muted)]">Update event details and layout.</p>
            </div>
            <Button size="sm" variant="secondary" type="button" onClick={() => setEditing(null)}>
              Close editor
            </Button>
          </div>
          <div className="space-y-3">
            <input type="hidden" name="eventId" value={editing.id} form={editFormId} />
            <input type="hidden" name="locale" value={locale} form={editFormId} />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                name="title"
                defaultValue={editing.title}
                aria-label="Event title"
                form={editFormId}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="slug"
                defaultValue={editing.slug}
                aria-label="Event slug"
                form={editFormId}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Description</span>
              <textarea
                name="description"
                rows={5}
                defaultValue={editing.description ?? ""}
                aria-label="Event description"
                placeholder="Event briefing..."
                form={editFormId}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                name="eventType"
                defaultValue={editing.eventType ?? ""}
                aria-label="Event type"
                placeholder="Event type (optional)"
                form={editFormId}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="infoUrl"
                defaultValue={editing.infoUrl ?? ""}
                aria-label="Briefing link"
                placeholder="Briefing link (optional)"
                form={editFormId}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                name="startTime"
                defaultValue={formatDateTimeLocal(editing.startTime)}
                aria-label="Start time"
                form={editFormId}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                type="datetime-local"
                name="endTime"
                defaultValue={formatDateTimeLocal(editing.endTime)}
                aria-label="End time"
                form={editFormId}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </div>
            <MultiAirportInput
              name="airports"
              initial={editing.airports.map((a) => a.icao)}
              options={airports.map((a) => a.icao)}
              label="Airports"
              formId={editFormId}
            />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                name="divisions"
                defaultValue={formatListInput(editing.divisions)}
                aria-label="Divisions"
                placeholder="Divisions (comma-separated, optional)"
                form={editFormId}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="externalId"
                defaultValue={editing.externalId ?? ""}
                aria-label="IVAO event id"
                placeholder="IVAO event id (optional)"
                form={editFormId}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </div>
            <textarea
              name="routes"
              rows={3}
              defaultValue={formatRoutesInput(editing.routes)}
              aria-label="Routes"
              placeholder="Routes JSON or notes (optional)"
              form={editFormId}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="bannerUrl"
              placeholder="Banner URL (optional)"
              defaultValue={editing.bannerUrl ?? ""}
              aria-label="Banner URL"
              form={editFormId}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
              <input type="checkbox" name="hqeAward" defaultChecked={editing.hqeAward} form={editFormId} /> HQE award
            </label>
            <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
              <input type="checkbox" name="isPublished" defaultChecked={editing.isPublished} form={editFormId} /> Published
            </label>
            <div className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Event layout</p>
              <p className="text-xs text-[color:var(--text-muted)]">
                Drag blocks to arrange the event page layout.
              </p>
              <EventPuckEditor
                name="puckLayout"
                defaultValue={editing.puckLayout}
                context={buildEventContext(editing)}
                formId={editFormId}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" type="submit" form={editFormId}>
                Save
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
            {updateState?.error ? <p className="text-sm text-[color:var(--danger)]">{updateState.error}</p> : null}
          </div>
          <form id={editFormId} action={updateFormAction} />
        </Card>
      ) : null}

      {showImport ? (
        <Modal title="Import from IVAO Events API" onClose={() => setShowImport(false)}>
          <div className="space-y-3">
            <p className="text-sm text-[color:var(--text-muted)]">
              Loads events from IVAO and lets you prefill a local entry. Imported events start unpublished.
            </p>
            <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
              <label htmlFor={importDivisionId} className="sr-only">
                Division code
              </label>
              <input
                id={importDivisionId}
                value={importDivision}
                onChange={(e) => setImportDivision(e.target.value.toUpperCase())}
                placeholder="Division code (e.g. PT, DE)"
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={importing}
                onClick={async () => {
                  setImporting(true);
                  setImportError(null);
                  try {
                    const divisionParam = importDivision ? `?division=${encodeURIComponent(importDivision)}` : "";
                    const res = await fetch(`/api/ivao/events${divisionParam}`);
                    if (!res.ok) {
                      setImportError(`Failed to load IVAO events (${res.status})`);
                      return;
                    }
                    const data = await res.json();
                    setIvaoEvents(Array.isArray(data.events) ? data.events : []);
                  } catch (err: unknown) {
                    setImportError(err instanceof Error ? err.message : "Could not fetch events");
                  } finally {
                    setImporting(false);
                  }
                }}
              >
                {importing ? "Loading..." : "Refresh IVAO events"}
              </Button>
            </div>
            <div className="flex justify-end">
              <p className="text-xs text-[color:var(--text-muted)]">Defaults to env DIVISION_CODE if empty.</p>
            </div>
            {importError ? <p className="text-sm text-[color:var(--danger)]">{importError}</p> : null}
            <div className="grid gap-3 max-h-[360px] overflow-y-auto pr-1">
              {ivaoEvents.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No IVAO events loaded yet.</p>
              ) : (
                ivaoEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-3)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{event.title}</p>
                        <p className="text-[11px] text-[color:var(--text-muted)]">{formatRange(event.startTime, event.endTime)}</p>
                        {event.airports.length ? (
                          <p className="text-[11px] text-[color:var(--text-muted)]">Airports: {event.airports.join(", ")}</p>
                        ) : null}
                      </div>
                      <form action={importFormAction} className="flex flex-col items-end gap-2">
                        <input type="hidden" name="payload" value={JSON.stringify(event)} />
                        <input type="hidden" name="locale" value={locale} />
                        <Button size="sm" type="submit">
                          Import
                        </Button>
                        {importState?.error ? (
                          <p className="text-[11px] text-[color:var(--danger)] text-right">{importState.error}</p>
                        ) : null}
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-3xl space-y-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4"
      >
        <div className="flex items-center justify-between">
          <p id={titleId} className="text-sm font-semibold text-[color:var(--text-primary)]">
            {title}
          </p>
          <button
            type="button"
            className="text-sm text-[color:var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
