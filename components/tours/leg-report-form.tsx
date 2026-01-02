"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ReportDefaults = {
  flightDate: string;
  callsign: string;
  aircraft: string;
  route: string;
  evidenceUrl: string;
  online: boolean;
};

type SessionOption = {
  id: number | string;
  callsign?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  aircraft?: string | null;
  departure?: string | null;
  arrival?: string | null;
  route?: string | null;
  flightRules?: string | null;
  remarks?: string | null;
  cruiseSpeed?: string | null;
  cruiseLevel?: string | null;
  isMilitary?: boolean | null;
};

type Props = {
  action: (formData: FormData) => void;
  legId: string;
  slug: string;
  locale: string;
  defaults: ReportDefaults;
  validationRules: string | null;
};

const formatSessionTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

export function LegReportForm({ action, legId, slug, locale, defaults, validationRules }: Props) {
  const [flightDate, setFlightDate] = useState(defaults.flightDate);
  const [callsign, setCallsign] = useState(defaults.callsign);
  const [aircraft, setAircraft] = useState(defaults.aircraft);
  const [route, setRoute] = useState(defaults.route);
  const [evidenceUrl, setEvidenceUrl] = useState(defaults.evidenceUrl);
  const [online, setOnline] = useState(defaults.online);
  const [manualEntry, setManualEntry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const isAutoLocked = !manualEntry && Boolean(selectedSessionId);

  const rules = useMemo(() => {
    if (!validationRules) return [];
    try {
      const parsed = JSON.parse(validationRules);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [validationRules]);

  const selectedSession = sessions.find((item) => String(item.id) === selectedSessionId) ?? null;

  const ruleChecks = useMemo(() => {
    if (rules.length === 0) return [];
    const checks: {
      key: string;
      label: string;
      expected: string;
      actual: string;
      state: "ok" | "violation" | "unknown";
    }[] = [];

    const getRule = (key: string) => rules.find((rule: any) => rule?.key === key);
    const normalize = (value?: string | null) => (value ?? "").trim().toUpperCase();
    const parseNumeric = (value?: string | null) => {
      if (!value) return null;
      const raw = value.toUpperCase();
      if (raw.startsWith("M")) return null;
      const match = raw.match(/(\d{2,5})/);
      if (!match) return null;
      const num = Number.parseInt(match[1], 10);
      return Number.isFinite(num) ? num : null;
    };
    const parseFlightLevel = (value?: string | null) => {
      const num = parseNumeric(value);
      if (num == null) return null;
      return num > 1000 ? Math.floor(num / 100) : num;
    };
    const parseFlightRules = (value?: string | null) => {
      const raw = normalize(value);
      if (!raw) return null;
      if (raw === "I" || raw === "Y") return "IFR";
      if (raw === "V" || raw === "Z") return "VFR";
      return raw;
    };

    const aircraftRule = getRule("aircraft");
    if (aircraftRule?.value) {
      const expected = normalize(aircraftRule.value);
      const actual = normalize(
        selectedSession?.aircraft ??
          (manualEntry ? aircraft : ""),
      );
      const list = expected.split(/[,\s]+/).filter(Boolean);
      const ok = actual && list.some((item) => actual.includes(item));
      checks.push({
        key: "aircraft",
        label: "Aircraft types",
        expected: aircraftRule.value,
        actual: actual || "-",
        state: actual ? (ok ? "ok" : "violation") : "unknown",
      });
    }

    const callsignRule = getRule("callsign");
    if (callsignRule?.value) {
      const expected = normalize(callsignRule.value);
      const actual = normalize(selectedSession?.callsign ?? (manualEntry ? callsign : ""));
      const ok = actual && actual.startsWith(expected);
      checks.push({
        key: "callsign",
        label: "Callsign",
        expected: callsignRule.value,
        actual: actual || "-",
        state: actual ? (ok ? "ok" : "violation") : "unknown",
      });
    }

    const remarksRule = getRule("remarks");
    if (remarksRule?.value) {
      const expected = normalize(remarksRule.value);
      const actual = normalize(selectedSession?.remarks ?? "");
      const ok = actual && actual.includes(expected);
      checks.push({
        key: "remarks",
        label: "Remarks",
        expected: remarksRule.value,
        actual: actual || "-",
        state: actual ? (ok ? "ok" : "violation") : "unknown",
      });
    }

    const flightRulesRule = getRule("flightRules");
    if (flightRulesRule?.value) {
      const expected = normalize(flightRulesRule.value);
      const actual = parseFlightRules(selectedSession?.flightRules ?? "") ?? "";
      const ok = actual && actual.startsWith(expected);
      checks.push({
        key: "flightRules",
        label: "Flight rules",
        expected: flightRulesRule.value,
        actual: actual || "-",
        state: actual ? (ok ? "ok" : "violation") : "unknown",
      });
    }

    const maxSpeedRule = getRule("maxSpeed");
    if (maxSpeedRule?.value) {
      const expected = parseNumeric(maxSpeedRule.value);
      const actualValue = parseNumeric(selectedSession?.cruiseSpeed ?? "");
      const ok = expected == null || actualValue == null ? null : actualValue <= expected;
      checks.push({
        key: "maxSpeed",
        label: "Max speed",
        expected: maxSpeedRule.value,
        actual: actualValue != null ? `${actualValue} kts` : "-",
        state: ok == null ? "unknown" : ok ? "ok" : "violation",
      });
    }

    const maxLevelRule = getRule("maxLevel");
    if (maxLevelRule?.value) {
      const expected = parseNumeric(maxLevelRule.value);
      const actualValue = parseFlightLevel(selectedSession?.cruiseLevel ?? "");
      const ok = expected == null || actualValue == null ? null : actualValue <= expected;
      checks.push({
        key: "maxLevel",
        label: "Max flight level",
        expected: `FL${maxLevelRule.value}`,
        actual: actualValue != null ? `FL${actualValue}` : "-",
        state: ok == null ? "unknown" : ok ? "ok" : "violation",
      });
    }

    const militaryRule = getRule("military");
    if (militaryRule?.value) {
      const expected = normalize(militaryRule.value);
      const actual = selectedSession?.isMilitary;
      const ok = expected === "ALLOWED" || actual === false;
      checks.push({
        key: "military",
        label: "Military flight",
        expected: militaryRule.value,
        actual: typeof actual === "boolean" ? (actual ? "Military" : "Civilian") : "-",
        state: typeof actual === "boolean" ? (ok ? "ok" : "violation") : "unknown",
      });
    }

    return checks;
  }, [rules, selectedSession, manualEntry, aircraft, callsign]);

  const violations = ruleChecks.filter((check) => check.state === "violation");

  const fetchSessions = async () => {
    if (!flightDate) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tours/sessions?date=${flightDate}`, { cache: "no-store" });
      const data = await res.json();
      setSessions(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const useSession = (session: SessionOption) => {
    setSelectedSessionId(String(session.id ?? ""));
    setCallsign(session.callsign ?? "");
    setAircraft(session.aircraft ?? "");
    setRoute(session.route ?? "");
    setOnline(true);
    setManualEntry(false);
  };

  const clearSelection = () => {
    setSelectedSessionId("");
  };

  const sessionLabel = useMemo(() => {
    if (!selectedSessionId) return "No flight selected.";
    const match = sessions.find((item) => String(item.id) === selectedSessionId);
    if (!match) return "Flight selected.";
    const dep = match.departure ?? "-";
    const arr = match.arrival ?? "-";
    return `${match.callsign ?? "Callsign"} ${dep} -> ${arr}`;
  }, [selectedSessionId, sessions]);

  const fieldBlock = (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/60">Callsign</label>
          <input
            name="callsign"
            value={callsign}
            readOnly={isAutoLocked}
            onChange={(event) => setCallsign(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/60">Aircraft</label>
          <input
            name="aircraft"
            value={aircraft}
            readOnly={isAutoLocked}
            onChange={(event) => setAircraft(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-semibold text-white/60">Route</label>
          <input
            name="route"
            value={route}
            readOnly={isAutoLocked}
            onChange={(event) => setRoute(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/60">Evidence URL (optional)</label>
        <input
          name="evidenceUrl"
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        />
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          name="online"
          checked={online}
          onChange={(event) => setOnline(event.target.checked)}
          className="h-4 w-4"
        />
        Flight was online
      </label>
      <div className="flex justify-end">
        <Button type="submit">Submit report</Button>
      </div>
    </>
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="legId" value={legId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sessionId" value={selectedSessionId} />
      <input type="hidden" name="flightDate" value={flightDate} />

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setManualEntry(false)}
          className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold ${manualEntry ? "border-white/10 bg-white/5 text-white/70" : "border-white/30 bg-white/10 text-white"}`}
        >
          Auto-fill from IVAO
        </button>
        {!manualEntry ? (
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-white/60">Pick a date, load your sessions, and choose a flight to auto-fill.</p>
              <button
                type="button"
                onClick={() => setManualEntry(true)}
                className="text-xs text-white/70 underline underline-offset-4 hover:text-white"
              >
                Manual entry
              </button>
            </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60">Flight date</label>
                <input
                  type="date"
                  name="flightDateDisplay"
                  value={flightDate}
                  onChange={(event) => {
                    setFlightDate(event.target.value);
                    setSessions([]);
                    setSelectedSessionId("");
                  }}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" size="sm" variant="secondary" onClick={fetchSessions} disabled={!flightDate || loading}>
                  {loading ? "Loading..." : "Find flights"}
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-2 text-xs text-white/70">
              <p>{sessionLabel}</p>
              {selectedSessionId ? (
                <button type="button" onClick={clearSelection} className="text-white/60 underline underline-offset-4">
                  Clear selection
                </button>
              ) : null}
            </div>

            {sessions.length > 0 ? (
              <div className="mt-4 space-y-3">
                {sessions.map((session) => {
                  const dep = session.departure ?? "-";
                  const arr = session.arrival ?? "-";
                  const isSelected = String(session.id) === selectedSessionId;
                  return (
                    <div key={String(session.id)} className={`rounded-md border px-3 py-2 text-sm ${isSelected ? "border-white/60 bg-white/10" : "border-white/10 bg-white/5"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{session.callsign ?? "Callsign"} {dep} {"->"} {arr}</p>
                          <p className="text-xs text-white/60">
                            {formatSessionTime(session.createdAt)} - {formatSessionTime(session.completedAt)}
                          </p>
                          <p className="text-xs text-white/60">
                            Aircraft {session.aircraft ?? "-"} {session.flightRules ? `| ${session.flightRules}` : ""}
                          </p>
                        </div>
                        <Button type="button" size="sm" variant="secondary" onClick={() => useSession(session)}>
                          Use this flight
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : flightDate && !loading ? (
              <p className="mt-3 text-xs text-white/60">No flights found for that date.</p>
            ) : null}
            {rules.length > 0 ? (
              <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${violations.length > 0 ? "border-rose-400/60 bg-rose-500/10 text-rose-100" : "border-white/10 bg-white/5 text-white/70"}`}>
                {violations.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-white">Rule checks found issues</p>
                    <div className="space-y-1 text-xs">
                      {violations.map((item) => (
                        <p key={item.key}>{item.label}: expected {item.expected}, got {item.actual}</p>
                      ))}
                    </div>
                    <p className="text-xs text-white/70">You can still submit the report for review.</p>
                  </div>
                ) : selectedSession ? (
                  <p className="text-xs text-white/70">No rule violations detected for this flight.</p>
                ) : (
                  <p className="text-xs text-white/70">Select a flight to check rules automatically.</p>
                )}
              </div>
            ) : null}
            <input type="hidden" name="callsign" value={callsign} />
            <input type="hidden" name="aircraft" value={aircraft} />
            <input type="hidden" name="route" value={route} />
            <input type="hidden" name="evidenceUrl" value={evidenceUrl} />
            <input type="hidden" name="online" value={online ? "on" : ""} />
            <div className="mt-4 flex justify-end">
              <Button type="submit">Submit report</Button>
            </div>
          </div>
        ) : null}
      </div>
      {manualEntry ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setManualEntry(false)}
            className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-left text-sm font-semibold text-white"
          >
            Manual submission
          </button>
          <p className="text-xs text-white/60">Auto-fill is hidden. Fill the fields below manually.</p>
          <div className="space-y-4">
            {fieldBlock}
          </div>
        </div>
      ) : null}
    </form>
  );
}
