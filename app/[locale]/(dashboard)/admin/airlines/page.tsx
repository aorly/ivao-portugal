import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/admin/submit-button";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff";
import { type Locale } from "@/i18n";
import { importAirlinesAction, deleteAirlineAction, updateAirlineLogoAction, syncAirlineAction } from "./actions";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminAirlinesPage({ params }: Props) {
  const { locale } = await params;
  const allowed = await requireStaffPermission("admin:airlines");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">You do not have access to this page.</p>
        </Card>
      </main>
    );
  }

  const airlines = await prisma.airline.findMany({
    orderBy: [{ countryId: "asc" }, { name: "asc" }],
  });

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Airlines</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Import virtual airlines from the IVAO API using ICAO codes.
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <form action={importAirlinesAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <label className="space-y-1 text-xs text-[color:var(--text-muted)]">
            ICAO codes
            <textarea
              name="icao"
              rows={3}
              placeholder="JGO, TAP"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[color:var(--text-muted)]">
              Separate ICAO codes with commas, spaces, or new lines.
            </p>
            <SubmitButton label="Import airlines" pendingLabel="Importing..." />
          </div>
        </form>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Saved airlines</p>
          <span className="text-xs text-[color:var(--text-muted)]">{airlines.length} total</span>
        </div>
        {airlines.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No airlines imported yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[color:var(--border)]">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-[color:var(--surface-2)] text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2 text-left">ICAO</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Callsign</th>
                  <th className="px-3 py-2 text-left">Country</th>
                  <th className="px-3 py-2 text-left">Website</th>
                  <th className="px-3 py-2 text-left">CEO</th>
                  <th className="px-3 py-2 text-left">Logos</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {airlines.map((airline) => (
                  <tr key={airline.icao}>
                    <td className="px-3 py-2 font-mono text-xs">{airline.icao}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {airline.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={airline.logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[10px] text-[color:var(--text-muted)]">
                            N/A
                          </span>
                        )}
                        <span className="font-semibold text-[color:var(--text-primary)]">{airline.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[color:var(--text-muted)]">{airline.callsign ?? "-"}</td>
                    <td className="px-3 py-2 text-[color:var(--text-muted)]">{airline.countryId ?? "-"}</td>
                    <td className="px-3 py-2">
                      {airline.website ? (
                        <a
                          href={airline.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[color:var(--primary)] underline"
                        >
                          Website
                        </a>
                      ) : (
                        <span className="text-[color:var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--text-muted)]">
                      {airline.ceoName ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{airline.ceoName}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">{airline.ceoVid ?? "-"}</p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-2">
                        <form action={updateAirlineLogoAction} className="flex items-center gap-2">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="icao" value={airline.icao} />
                          <input type="hidden" name="variant" value="light" />
                          <input
                            type="file"
                            name="logo"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                            className="w-full text-xs text-[color:var(--text-muted)]"
                          />
                          <SubmitButton label="Light" pendingLabel="Saving..." />
                        </form>
                        <form action={updateAirlineLogoAction} className="flex items-center gap-2">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="icao" value={airline.icao} />
                          <input type="hidden" name="variant" value="dark" />
                          <input
                            type="file"
                            name="logo"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                            className="w-full text-xs text-[color:var(--text-muted)]"
                          />
                          <SubmitButton label="Dark" pendingLabel="Saving..." />
                        </form>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <form action={syncAirlineAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="icao" value={airline.icao} />
                          <SubmitButton label="Sync" pendingLabel="Syncing..." />
                        </form>
                        <form action={deleteAirlineAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="icao" value={airline.icao} />
                          <SubmitButton label="Delete" pendingLabel="Deleting..." />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
