"use client";

import { useEffect, useId, useState } from "react";

type LinkItem = { url: string; simulator?: string | null };

type Props = {
  label: string;
  namePrefix: string;
  placeholder?: string;
  initial?: LinkItem[];
  withSimulator?: boolean;
};

export function LinkListInput({ label, namePrefix, placeholder, initial = [], withSimulator = true }: Props) {
  const [links, setLinks] = useState<LinkItem[]>(initial);
  const [url, setUrl] = useState("");
  const [simulator, setSimulator] = useState("");
  const urlId = useId();
  const simulatorId = useId();

  useEffect(() => {
    setLinks(initial);
  }, [initial]);

  const addLink = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setLinks([...links, { url: trimmedUrl, simulator: withSimulator ? simulator.trim() : undefined }]);
    setUrl("");
    if (withSimulator) setSimulator("");
  };

  const removeLink = (targetUrl: string) => {
    setLinks(links.filter((link) => link.url !== targetUrl));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[color:var(--text-primary)]">{label}</p>
      <div className="space-y-2">
        {links.map((link) => (
          <div
            key={link.url}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
          >
            <div className="flex-1 min-w-[200px]">
              <p className="text-[color:var(--text-primary)] break-all">{link.url}</p>
              {withSimulator && link.simulator ? (
                <p className="text-xs text-[color:var(--text-muted)]">Sim: {link.simulator}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="text-[color:var(--danger)] text-xs"
              onClick={() => removeLink(link.url)}
              aria-label={`Remove ${link.url}`}
            >
              Remove
            </button>
            <input type="hidden" name={`${namePrefix}Url`} value={link.url} />
            {withSimulator ? <input type="hidden" name={`${namePrefix}Simulator`} value={link.simulator ?? ""} /> : null}
          </div>
        ))}
        {links.length === 0 ? (
          <p role="status" className="text-xs text-[color:var(--text-muted)]">
            No links added.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <label htmlFor={urlId} className="sr-only">
          {label} URL
        </label>
        <input
          id={urlId}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder ?? "https://example.com"}
          aria-label={placeholder ?? "Link URL"}
          className="flex-1 min-w-[200px] rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
        {withSimulator ? (
          <>
            <label htmlFor={simulatorId} className="sr-only">
              Simulator
            </label>
            <input
              id={simulatorId}
              value={simulator}
              onChange={(e) => setSimulator(e.target.value)}
              placeholder="Simulator (e.g. MSFS, X-Plane)"
              aria-label="Simulator"
              className="w-56 min-w-[180px] rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </>
        ) : null}
        <button
          type="button"
          className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
          onClick={addLink}
        >
          Add
        </button>
      </div>
    </div>
  );
}
