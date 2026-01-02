"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FrequenciesList } from "@/components/admin/frequencies-list";
import { createFrequency } from "@/app/[locale]/(dashboard)/admin/frequencies/actions";
import { importFrequencies } from "@/app/[locale]/(dashboard)/admin/firs/actions";

type FrequencyDto = {
  id: string;
  station: string;
  frequency: string;
  name?: string | null;
  lower?: string | null;
  upper?: string | null;
  restricted?: boolean;
  firId?: string | null;
  firSlug?: string | null;
  airportId?: string | null;
  airportIcao?: string | null;
  airportIds?: string[];
  airportIcaos?: string[];
};

type Group = {
  label: string;
  frequencies: FrequencyDto[];
};

type Option = { id: string; label: string };

type Props = {
  firGroups: Group[];
  airportGroups: Group[];
  unassigned: FrequencyDto[];
  firOptions: Option[];
  airportOptions: Option[];
};

export function FrequenciesAdmin({
  firGroups,
  airportGroups,
  unassigned,
  firOptions,
  airportOptions,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"fir" | "airport" | "unassigned" | "all">("fir");
  const searchId = useId();

  const aggregated = (() => {
    const all: FrequencyDto[] = [
      ...firGroups.flatMap((g) => g.frequencies),
      ...airportGroups.flatMap((g) => g.frequencies),
      ...unassigned,
    ];
    const map = new Map<string, FrequencyDto>();
    for (const f of all) {
      const key = `${f.station}|${f.frequency}|${f.firId ?? ""}`;
      const existing = map.get(key);
      const airportsIds = new Set<string>(existing?.airportIds ?? []);
      const airportsIcaos = new Set<string>(existing?.airportIcaos ?? []);
      if (f.airportId) airportsIds.add(f.airportId);
      if (f.airportIcao) airportsIcaos.add(f.airportIcao);
      const merged: FrequencyDto = existing
        ? {
            ...existing,
            airportIds: Array.from(airportsIds),
            airportIcaos: Array.from(airportsIcaos),
          }
        : {
            ...f,
            airportIds: f.airportId ? [f.airportId] : [],
            airportIcaos: f.airportIcao ? [f.airportIcao] : [],
          };
      map.set(key, merged);
    }
    return Array.from(map.values());
  })();

  const matchesSearch = (f: FrequencyDto) => {
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return (
      f.station.toLowerCase().includes(needle) ||
      f.frequency.toLowerCase().includes(needle) ||
      (f.name ?? "").toLowerCase().includes(needle) ||
      (f.firSlug ?? "").toLowerCase().includes(needle) ||
      (f.airportIcaos ?? []).some((a) => a.toLowerCase().includes(needle))
    );
  };
  const filtered = aggregated.filter(matchesSearch);

  const groupedAll = filtered.reduce<Record<string, FrequencyDto[]>>((acc, f) => {
    const key = f.firSlug ?? "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  const filteredFirGroups = firGroups
    .map((group) => ({
      ...group,
      frequencies: group.frequencies.filter(matchesSearch),
    }))
    .filter((group) => group.frequencies.length > 0);

  const filteredAirportGroups = airportGroups
    .map((group) => ({
      ...group,
      frequencies: group.frequencies.filter(matchesSearch),
    }))
    .filter((group) => group.frequencies.length > 0);

  const filteredUnassigned = unassigned.filter(matchesSearch);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Frequencies</h1>
            <p className="text-xs text-[color:var(--text-muted)]">
              {aggregated.length} total, {filtered.length} visible
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowImport(true)}>
              Import
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowCreate(true)}>
              New frequency
            </Button>
          </div>
        </div>

        <Card className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: "fir", label: "By FIR" },
              { id: "airport", label: "By airport" },
              { id: "unassigned", label: "Unassigned" },
              { id: "all", label: "All" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[color:var(--primary)]/20 text-[color:var(--primary)]"
                    : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label htmlFor={searchId} className="sr-only">
            Search frequencies
          </label>
          <input
            id={searchId}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by station, freq, FIR, airport..."
            aria-label="Search frequencies"
            className="ml-auto w-full max-w-xs rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </Card>

        <Card className="space-y-4 p-4">
          {aggregated.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No frequencies.</p>
          ) : activeTab === "fir" ? (
            filteredFirGroups.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No results match your search.</p>
            ) : (
              filteredFirGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{group.label}</p>
                  <FrequenciesList frequencies={group.frequencies} firOptions={firOptions} airportOptions={airportOptions} />
                </div>
              ))
            )
          ) : activeTab === "airport" ? (
            filteredAirportGroups.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No results match your search.</p>
            ) : (
              filteredAirportGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{group.label}</p>
                  <FrequenciesList frequencies={group.frequencies} firOptions={firOptions} airportOptions={airportOptions} />
                </div>
              ))
            )
          ) : activeTab === "unassigned" ? (
            filteredUnassigned.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No unassigned frequencies.</p>
            ) : (
              <FrequenciesList frequencies={filteredUnassigned} firOptions={firOptions} airportOptions={airportOptions} />
            )
          ) : Object.keys(groupedAll).length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No results match your search.</p>
          ) : (
            Object.entries(groupedAll).map(([label, freqs]) => (
              <div key={label} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{label}</p>
                <FrequenciesList frequencies={freqs} firOptions={firOptions} airportOptions={airportOptions} />
              </div>
            ))
          )}
        </Card>
      </div>

      {showCreate ? (
        <Modal onClose={() => setShowCreate(false)} title="New frequency">
          <form action={createFrequency} className="space-y-3">
            <input
              name="station"
              placeholder="LPPC_CTR"
              aria-label="Station"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="frequency"
              placeholder="132.950"
              aria-label="Frequency"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="name"
              placeholder="Lisboa Control"
              aria-label="Name"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                name="lower"
                placeholder="Lower (GND/FL...)"
                aria-label="Lower limit"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="upper"
                placeholder="Upper (UNL/FL...)"
                aria-label="Upper limit"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-primary)]">
              <input type="checkbox" name="restricted" className="h-4 w-4" />
              <span>Requires ATC dept authorization</span>
            </label>
            <select
              name="firId"
              aria-label="FIR"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              <option value="">(Optional) Assign FIR</option>
              {firOptions.map((fir) => (
                <option key={fir.id} value={fir.id}>
                  {fir.label}
                </option>
              ))}
            </select>
            <div className="space-y-1">
              <select
                name="airportIds"
                multiple
                aria-label="Airports"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                {airportOptions.map((airport) => (
                  <option key={airport.id} value={airport.id}>
                    {airport.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[color:var(--text-muted)]">Select one or more airports (Ctrl/Cmd+click).</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" size="sm">
                Create
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showImport ? (
        <Modal onClose={() => setShowImport(false)} title="Import frequencies">
          <form action={importFrequencies} className="space-y-3" encType="multipart/form-data">
            <select
              name="firId"
              aria-label="FIR"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              <option value="">(Optional) Attach to FIR</option>
              {firOptions.map((fir) => (
                <option key={fir.id} value={fir.id}>
                  {fir.label}
                </option>
              ))}
            </select>
            <input
              name="freqFile"
              type="file"
              accept=".atc,.txt"
              aria-label="Frequency file"
              className="w-full text-sm text-[color:var(--text-primary)]"
            />
            <div className="flex justify-end gap-2">
              <Button type="submit" size="sm">
                Import
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowImport(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-xl space-y-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4"
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
