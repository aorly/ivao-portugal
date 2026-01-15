"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type BadgeEntry = {
  id: string;
  tag: string;
  url: string;
  previewUrl: string;
};

type Props = {
  initialBadges: Record<string, string>;
};

const createEntry = (tag = "", url = ""): BadgeEntry => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  tag,
  url,
  previewUrl: url,
});

function RatingBadgesEditorInner({ initialBadges }: Props) {
  const initialEntries = useMemo(
    () => Object.entries(initialBadges).map(([tag, url]) => createEntry(tag, url)),
    [initialBadges],
  );
  const [entries, setEntries] = useState<BadgeEntry[]>(initialEntries);

  const updateEntry = (id: string, patch: Partial<BadgeEntry>) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  const addEntry = () => setEntries((current) => [...current, createEntry()]);
  const removeEntry = (id: string) =>
    setEntries((current) => current.filter((entry) => entry.id !== id));

  return (
    <div className="space-y-3">
      <input type="hidden" name="badgeCount" value={String(entries.length)} />
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map((entry, index) => (
          <div key={entry.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">Rating tag</span>
                <input
                  name={`badgeTag_${index}`}
                  value={entry.tag}
                  onChange={(event) => updateEntry(entry.id, { tag: event.target.value })}
                  placeholder="PP, APC, AS1"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <div className="h-12 w-24 overflow-hidden rounded-md border border-[color:var(--border)] bg-[color:var(--surface)]">
                {entry.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.previewUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    Preview
                  </div>
                )}
              </div>
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-[color:var(--text-muted)]">Badge URL (optional)</span>
              <input
                name={`badgeUrl_${index}`}
                value={entry.url}
                onChange={(event) => updateEntry(entry.id, { url: event.target.value, previewUrl: event.target.value })}
                placeholder="https://..."
                className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <label className="mt-3 flex cursor-pointer flex-col gap-2 rounded-md border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-muted)]">
              <span className="font-semibold text-[color:var(--text-primary)]">Upload PNG/SVG badge</span>
              <span>Click to choose a file</span>
              <input
                name={`badgeFile_${index}`}
                type="file"
                accept="image/png,image/svg+xml"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const previewUrl = URL.createObjectURL(file);
                  updateEntry(entry.id, { previewUrl });
                }}
              />
            </label>
            <div className="mt-3 flex justify-end">
              <Button type="button" size="sm" variant="secondary" onClick={() => removeEntry(entry.id)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={addEntry}>
        Add badge
      </Button>
    </div>
  );
}

export function RatingBadgesEditor(props: Props) {
  const key = JSON.stringify(props.initialBadges);
  return <RatingBadgesEditorInner key={key} {...props} />;
}
