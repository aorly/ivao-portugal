import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { loadTlGroups } from "@/lib/transition-level";
import { saveTlJson } from "./actions";
import { TransitionLevelEditor } from "@/components/admin/transition-level-editor";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TransitionLevelsAdminPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });
  const groups = await loadTlGroups();
  const raw = JSON.stringify(groups, null, 2);

  return (
    <main className="space-y-6">
      <SectionHeader title="Transition levels" description="Edit TL bands by airport groups." />

      <Card className="border border-[color:var(--border)] p-4 space-y-3">
        <p className="text-sm text-[color:var(--text-muted)]">
          Edit TL groups with fields below. Min/Max QNH are inclusive (leave blank for open-ended).
        </p>
        <TransitionLevelEditor initial={groups} action={saveTlJson} />
      </Card>

      <Card className="border border-[color:var(--border)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Raw JSON (optional)</p>
        <p className="text-sm text-[color:var(--text-muted)]">Paste an updated dataset if needed.</p>
        <form action={saveTlJson} className="space-y-2">
          <textarea
            name="raw"
            defaultValue={raw}
            className="min-h-[260px] w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 font-mono text-xs"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-[color:var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Save JSON
            </button>
          </div>
        </form>
      </Card>
    </main>
  );
}
