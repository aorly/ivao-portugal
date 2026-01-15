"use client";

import { useMemo, useState, useActionState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n";
import { saveTranslations, type SaveTranslationsState } from "@/app/[locale]/(dashboard)/admin/settings/translations/actions";

type Labels = {
  locale: string;
  namespace: string;
  jsonLabel: string;
  helper: string;
  save: string;
};

type Props = {
  targetLocale: Locale;
  namespace: string;
  namespaces: string[];
  locales: Locale[];
  initialJson: string;
  labels: Labels;
};

const initialState: SaveTranslationsState = { status: "idle" };

function TranslationsEditorInner({
  targetLocale,
  namespace,
  namespaces,
  locales,
  initialJson,
  labels,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [jsonValue, setJsonValue] = useState(initialJson);
  const [state, formAction, isPending] = useActionState(saveTranslations, initialState);
  const localeOptions = useMemo(() => locales.slice().sort(), [locales]);
  const namespaceOptions = useMemo(() => namespaces.slice().sort(), [namespaces]);

  const updateQuery = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleLocaleChange = (value: string) => {
    updateQuery({ locale: value, ns: null });
  };

  const handleNamespaceChange = (value: string) => {
    updateQuery({ ns: value, locale: targetLocale });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
          <span>{labels.locale}</span>
          <select
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--text-primary)]"
            value={targetLocale}
            onChange={(event) => handleLocaleChange(event.target.value)}
          >
            {localeOptions.map((entry) => (
              <option key={entry} value={entry}>
                {entry.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
          <span>{labels.namespace}</span>
          <select
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--text-primary)]"
            value={namespace}
            onChange={(event) => handleNamespaceChange(event.target.value)}
          >
            {namespaceOptions.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="locale" value={targetLocale} />
        <input type="hidden" name="namespace" value={namespace} />
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
          <span>{labels.jsonLabel}</span>
          <textarea
            name="payload"
            className="min-h-[320px] w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 font-mono text-xs text-[color:var(--text-primary)] shadow-sm focus:border-[color:var(--primary)] focus:outline-none"
            value={jsonValue}
            onChange={(event) => setJsonValue(event.target.value)}
            spellCheck={false}
          />
        </label>
        <p className="text-xs text-[color:var(--text-muted)]">{labels.helper}</p>
        {state.status === "error" ? (
          <p className="text-xs font-semibold text-[color:var(--danger)]">{state.message}</p>
        ) : state.status === "ok" ? (
          <p className="text-xs font-semibold text-[color:var(--success)]">{state.message}</p>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : labels.save}
        </Button>
      </form>
    </div>
  );
}

export function TranslationsEditor(props: Props) {
  const key = `${props.targetLocale}:${props.namespace}:${props.initialJson}`;
  return <TranslationsEditorInner key={key} {...props} />;
}
