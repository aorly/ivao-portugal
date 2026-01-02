"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnalyticsConfig } from "@/lib/analytics-config";

type ProviderId = "ga4" | "umami" | "plausible";

type Provider = {
  id: ProviderId;
  name: string;
  description: string;
  status: "Connected" | "Not connected";
  brand: ProviderId;
};

type Props = {
  locale: string;
  config: AnalyticsConfig;
  saveAction: (formData: FormData) => void;
};

export default function AnalyticsSettingsClient({ locale, config, saveAction }: Props) {
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(null);

  const providers = useMemo<Provider[]>(
    () => [
      {
        id: "ga4",
        name: "Google Analytics",
        description: "Track standard analytics using GA4.",
        status: config.ga4MeasurementId ? "Connected" : "Not connected",
        brand: "ga4",
      },
      {
        id: "umami",
        name: "Umami",
        description: "Privacy-first analytics for websites.",
        status: config.umamiWebsiteId ? "Connected" : "Not connected",
        brand: "umami",
      },
      {
        id: "plausible",
        name: "Plausible",
        description: "Simple and lightweight analytics.",
        status: config.plausibleDomain ? "Connected" : "Not connected",
        brand: "plausible",
      },
    ],
    [config.ga4MeasurementId, config.plausibleDomain, config.umamiWebsiteId]
  );

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Integrations</p>
          <h1 className="text-2xl font-semibold text-[color:var(--text-primary)]">Analytics settings</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            Connect analytics providers and manage tracking preferences.
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-xs text-[color:var(--text-muted)]">
          Locale {locale}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {providers.map((provider) => (
          <Card key={provider.id} className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
                  <ProviderLogo brand={provider.brand} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{provider.name}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">{provider.description}</p>
                </div>
              </div>
              <span
                className={[
                  "rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em]",
                  provider.status === "Connected"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-muted)]",
                ].join(" ")}
              >
                {provider.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[color:var(--text-muted)]">Provider</span>
              <button
                type="button"
                onClick={() => setActiveProvider(provider.id)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-[11px] font-semibold text-[color:var(--text-primary)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
              >
                Settings
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Integration settings</h2>
        <p className="text-sm text-[color:var(--text-muted)]">
          Configure provider credentials and enable tracking for internal dashboards.
        </p>
      </div>

      <Card className="space-y-4 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Admin tracking</p>
          <p className="text-xs text-[color:var(--text-muted)]">Optional analytics on dashboard views and CTAs.</p>
        </div>
        <form action={saveAction} className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-muted)]">
            <span>Track admin page views and CTA clicks</span>
            <input type="checkbox" name="trackAdmin" defaultChecked={Boolean(config.trackAdmin)} />
          </label>
          <HiddenConfigInputs config={config} />
          <div className="flex items-center justify-end">
            <Button type="submit" size="sm">
              Save settings
            </Button>
          </div>
        </form>
      </Card>

      {activeProvider ? (
        <ProviderModal
          provider={activeProvider}
          config={config}
          saveAction={saveAction}
          onClose={() => setActiveProvider(null)}
        />
      ) : null}
    </main>
  );
}

function ProviderModal({
  provider,
  config,
  saveAction,
  onClose,
}: {
  provider: ProviderId;
  config: AnalyticsConfig;
  saveAction: (formData: FormData) => void;
  onClose: () => void;
}) {
  const title = provider === "ga4" ? "Google Analytics 4" : provider === "umami" ? "Umami" : "Plausible";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] px-5 py-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Settings</p>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text-muted)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
          >
            Close
          </button>
        </div>
        <form action={saveAction} className="space-y-4 px-5 py-4">
          {provider === "ga4" ? (
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">GA4 Measurement ID</span>
              <input
                name="ga4MeasurementId"
                defaultValue={config.ga4MeasurementId ?? ""}
                placeholder="G-XXXXXXXXXX"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
          ) : null}
          {provider === "umami" ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">Umami Website ID</span>
                <input
                  name="umamiWebsiteId"
                  defaultValue={config.umamiWebsiteId ?? ""}
                  placeholder="UUID"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">Umami Script URL</span>
                <input
                  name="umamiScriptUrl"
                  defaultValue={config.umamiScriptUrl ?? ""}
                  placeholder="https://analytics.umami.is/script.js"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
            </>
          ) : null}
          {provider === "plausible" ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">Plausible Domain</span>
                <input
                  name="plausibleDomain"
                  defaultValue={config.plausibleDomain ?? ""}
                  placeholder="ivao-portugal.org"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">Plausible Script URL</span>
                <input
                  name="plausibleScriptUrl"
                  defaultValue={config.plausibleScriptUrl ?? ""}
                  placeholder="https://plausible.io/js/script.js"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
            </>
          ) : null}
          <HiddenConfigInputs config={config} />
          <div className="flex items-center justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HiddenConfigInputs({ config }: { config: AnalyticsConfig }) {
  return (
    <>
      <input type="hidden" name="ga4MeasurementId" value={config.ga4MeasurementId ?? ""} />
      <input type="hidden" name="umamiWebsiteId" value={config.umamiWebsiteId ?? ""} />
      <input type="hidden" name="umamiScriptUrl" value={config.umamiScriptUrl ?? ""} />
      <input type="hidden" name="plausibleDomain" value={config.plausibleDomain ?? ""} />
      <input type="hidden" name="plausibleScriptUrl" value={config.plausibleScriptUrl ?? ""} />
      <input type="hidden" name="trackAdmin" value={config.trackAdmin ? "on" : ""} />
    </>
  );
}

function ProviderLogo({ brand }: { brand: ProviderId }) {
  if (brand === "ga4") {
    return (
      <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
        <rect x="6" y="22" width="10" height="20" rx="4" fill="#fbbf24" />
        <rect x="20" y="14" width="10" height="28" rx="4" fill="#f59e0b" />
        <rect x="34" y="8" width="8" height="34" rx="4" fill="#f97316" />
      </svg>
    );
  }
  if (brand === "umami") {
    return (
      <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
        <circle cx="24" cy="24" r="18" fill="#111827" />
        <path
          d="M14 28c2 6 18 6 20 0"
          fill="none"
          stroke="#f9fafb"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="18" cy="20" r="2" fill="#f9fafb" />
        <circle cx="30" cy="20" r="2" fill="#f9fafb" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
      <rect x="8" y="8" width="32" height="32" rx="10" fill="#f97316" />
      <path
        d="M18 14h12a6 6 0 0 1 0 12H18v8"
        fill="none"
        stroke="#111827"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
