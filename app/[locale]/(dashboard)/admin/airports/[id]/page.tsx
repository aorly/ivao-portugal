import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  deleteAirport,
  updateAirport,
  deleteStand,
  updateStand,
  importSids,
  importStars,
  updateSid,
  updateSidPath,
  deleteSid,
  updateStar,
  updateStarPath,
  deleteStar,
  syncAirportIvao,
  updateAirportTrainingImage,
} from "@/app/[locale]/(dashboard)/admin/airports/actions";
import { RunwayEditor } from "@/components/admin/runway-editor";
import { LinkListInput } from "@/components/admin/link-list-input";
import { SubmitButton } from "@/components/admin/submit-button";
import { AirportPuckEditor } from "@/components/admin/airport-puck-editor";
import { AirportTabs } from "@/components/admin/airport-tabs";
import { AirportIvaoSync } from "@/components/admin/airport-ivao-sync";
import { ProcedureMap } from "@/components/map/procedure-map";
import { ProcedureFilePicker } from "@/components/admin/procedure-file-picker";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";
import { type AirportLayoutData } from "@/components/puck/airport-context";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export default async function AirportDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const tAirports = await getTranslations({ locale, namespace: "airports" });
  const allowed = await requireStaffPermission("admin:airports");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }
  const airport = await prisma.airport.findUnique({
    where: { id },
    include: {
      fir: { select: { id: true, slug: true } },
      stands: true,
      atcFrequencies: { select: { id: true, station: true, frequency: true } },
      sids: { include: { waypoints: { orderBy: { order: "asc" } } } },
      stars: { include: { waypoints: { orderBy: { order: "asc" } } } },
    },
  });
  const firs = await prisma.fir.findMany({ orderBy: { slug: "asc" }, select: { id: true, slug: true, name: true } });

  if (!airport) {
    notFound();
  }

  const availableFreqs = await prisma.atcFrequency.findMany({
    where: { airportId: airport.id },
    orderBy: { station: "asc" },
    select: { id: true, station: true, frequency: true },
  });

  const parseJsonArray = (value: string | null | undefined) => {
    try {
      const parsed = JSON.parse(value ?? "[]");
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
    return [];
  };

  const normalizeLinks = (input: unknown[]) =>
    input
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") return { url: item, simulator: undefined };
        if (typeof item === "object" && "url" in item) {
          const url = String((item as { url: unknown }).url ?? "").trim();
          if (!url) return null;
          const simulator =
            "simulator" in item && (item as { simulator?: unknown }).simulator != null
              ? String((item as { simulator?: unknown }).simulator ?? "").trim()
              : undefined;
          return { url, simulator };
        }
        return null;
      })
      .filter((item): item is { url: string; simulator: string | undefined } => Boolean(item));

  const runways = parseJsonArray(airport.runways);
  const runwayOptions = runways
    .map((r) => (r && typeof r === "object" && "id" in r ? String((r as { id: unknown }).id ?? "") : ""))
    .filter(Boolean);
  const chartLinks = normalizeLinks(parseJsonArray(airport.charts));
  const sceneryLinks = normalizeLinks(parseJsonArray(airport.scenery));
  const sids = airport.sids;
  const stars = airport.stars;
  const puckContext: AirportLayoutData = {
    locale,
    icao: airport.icao,
    name: airport.name,
    labels: {
      choose: tAirports("timetableChoose"),
      button: tAirports("timetableButton"),
      inbound: tAirports("timetableInbound"),
      outbound: tAirports("timetableOutbound"),
      empty: tAirports("timetableEmpty"),
      loading: tAirports("timetableLoading"),
      error: tAirports("timetableError"),
      updated: tAirports("timetableUpdated"),
    },
  };
  return (
    <main className="space-y-4">
      <AirportTabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <Card className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Airport</p>
                    <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
                      {airport.icao} - {airport.name}
                    </h1>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await deleteAirport(airport.id, locale);
                    }}
                  >
                    <Button variant="ghost" size="sm" type="submit">
                      Delete
                    </Button>
                  </form>
                </div>

                <AirportIvaoSync
                  airportId={airport.id}
                  locale={locale}
                  action={syncAirportIvao}
                  lastUpdated={airport.ivaoSyncedAt?.toISOString() ?? null}
                />

                <form
                  id="airport-form"
                  action={async (formData) => {
                    "use server";
                    await updateAirport(airport.id, formData, locale);
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      name="icao"
                      defaultValue={airport.icao}
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                    <input
                      name="iata"
                      defaultValue={airport.iata ?? ""}
                      placeholder="IATA"
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                    <input
                      name="name"
                      defaultValue={airport.name}
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[color:var(--text-primary)]">
                    <input
                      type="checkbox"
                      name="featured"
                      defaultChecked={airport.featured}
                      className="h-4 w-4 rounded border border-[color:var(--border)]"
                    />
                    Feature this airport (pin to top)
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      name="lat"
                      defaultValue={airport.latitude}
                      placeholder="Latitude"
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                    <input
                      name="lon"
                      defaultValue={airport.longitude}
                      placeholder="Longitude"
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </div>
                  <select
                    name="firId"
                    defaultValue={airport.fir?.id ?? ""}
                    className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  >
                    <option value="">Select FIR</option>
                    {firs.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.slug} - {f.name}
                      </option>
                    ))}
                  </select>

                  <RunwayEditor name="runways" label="Runways" initial={runways} />
                  <LinkListInput
                    label="Charts"
                    namePrefix="chart"
                    initial={chartLinks}
                    placeholder="https://charts.example.com"
                    withSimulator={false}
                  />
                  <LinkListInput
                    label="Sceneries"
                    namePrefix="scenery"
                    initial={sceneryLinks}
                    placeholder="https://scenery.example.com"
                  />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">ATC Frequencies (assigned)</p>
                    <div className="space-y-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
                      {availableFreqs.length === 0 ? (
                        <p className="text-xs text-[color:var(--text-muted)]">No frequencies linked to this airport.</p>
                      ) : (
                        availableFreqs.map((f) => (
                          <div key={f.id} className="flex items-center justify-between rounded bg-[color:var(--surface-3)] px-2 py-1 text-xs">
                            <span className="text-[color:var(--text-primary)]">
                              {f.station} - {f.frequency}
                            </span>
                            <input type="hidden" name="frequencyIds" value={f.id} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <SubmitButton />
                  </div>
                </form>

                <div className="space-y-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">Training/Exam background</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Used on the home &quot;What&apos;s next&quot; slider for training and exams at this airport.
                    </p>
                  </div>
                  {airport.trainingImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={airport.trainingImageUrl}
                      alt={`${airport.icao} background`}
                      className="h-40 w-full rounded-xl border border-[color:var(--border)] object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-xs text-[color:var(--text-muted)]">
                      No background uploaded
                    </div>
                  )}
                  <form
                    action={async (formData) => {
                      "use server";
                      await updateAirportTrainingImage(airport.id, formData, locale);
                    }}
                    className="space-y-2"
                  >
                    <input
                      type="file"
                      name="trainingImage"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="w-full text-xs text-[color:var(--text-muted)]"
                    />
                    <input
                      type="text"
                      name="trainingImageUrl"
                      defaultValue={airport.trainingImageUrl ?? ""}
                      placeholder="Or paste an image URL"
                      className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" type="submit">
                        Save image
                      </Button>
                      {airport.trainingImageUrl ? (
                        <button
                          type="submit"
                          name="remove"
                          value="true"
                          className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </form>
                </div>
              </Card>
            ),
          },
          {
            id: "layout",
            label: "Layout",
            content: (
              <Card className="space-y-3 p-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">Airport page layout</p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    Use the layout editor to manage the timetable placement and extra content blocks.
                  </p>
                </div>
                <AirportPuckEditor
                  name="puckLayout"
                  defaultValue={airport.puckLayout}
                  context={puckContext}
                  formId="airport-form"
                />
                <div className="flex justify-end">
                  <Button size="sm" type="submit" form="airport-form">
                    Save layout
                  </Button>
                </div>
              </Card>
            ),
          },
          {
            id: "procedures",
            label: "Procedures",
            content: (
              <Card className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">SIDs & STARs</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <form
                      action={async (formData) => {
                        "use server";
                        await importSids(formData, airport.id, locale);
                      }}
                      className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2"
                    >
                      <ProcedureFilePicker airportIcao={airport.icao} accept=".sid,.txt" />
                      <Button size="sm" variant="secondary" type="submit">
                        Import selected SIDs
                      </Button>
                    </form>
                    <form
                      action={async (formData) => {
                        "use server";
                        await importStars(formData, airport.id, locale);
                      }}
                      className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2"
                    >
                      <ProcedureFilePicker airportIcao={airport.icao} accept=".str,.txt" />
                      <Button size="sm" variant="secondary" type="submit">
                        Import selected STARs
                      </Button>
                    </form>
                  </div>
                </div>
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  Upload a file to preview SIDs/STARs and tick only the ones you want to import.
                </p>
                <ProcedureMap
                  paths={[
                    ...sids.map((sid) => ({
                      id: sid.id,
                      name: sid.name,
                      type: "SID" as const,
                      points: sid.waypoints.map((p) => ({ lat: Number(p.lat), lon: Number(p.lon) })),
                    })),
                    ...stars.map((star) => ({
                      id: star.id,
                      name: star.name,
                      type: "STAR" as const,
                      points: star.waypoints.map((p) => ({ lat: Number(p.lat), lon: Number(p.lon) })),
                    })),
                  ]}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[color:var(--text-primary)]">SIDs</p>
                    {sids.length === 0 ? (
                      <p className="text-xs text-[color:var(--text-muted)]">No SIDs loaded.</p>
                    ) : (
                      <ul className="space-y-2">
                        {sids.map((sid) => (
                          <li
                            key={sid.id}
                            className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <form
                                action={async (formData) => {
                                  "use server";
                                  await updateSid(sid.id, airport.id, formData, locale);
                                }}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <input
                                  name="name"
                                  defaultValue={sid.name}
                                  className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1"
                                />
                                <select
                                  name="runway"
                                  defaultValue={sid.runway}
                                  className="w-20 rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1"
                                >
                                  <option value="">Runway</option>
                                  {runwayOptions.map((rwy) => (
                                    <option key={rwy} value={rwy}>
                                      {rwy}
                                    </option>
                                  ))}
                                </select>
                                <Button size="sm" variant="secondary" type="submit">
                                  Save
                                </Button>
                              </form>
                              <form
                                action={async () => {
                                  "use server";
                                  await deleteSid(sid.id, airport.id, locale);
                                }}
                              >
                                <Button size="sm" variant="ghost" type="submit" className="text-[color:var(--danger)]">
                                  Delete
                                </Button>
                              </form>
                            </div>
                            <form
                              action={async (formData) => {
                                "use server";
                                await updateSidPath(sid.id, airport.id, formData, locale);
                              }}
                              className="space-y-1"
                            >
                              <div className="grid grid-cols-5 gap-1 text-[10px] text-[color:var(--text-muted)]">
                                <span>Name</span>
                                <span>Lat</span>
                                <span>Lon</span>
                                <span>Alt</span>
                                <span>Speed</span>
                              </div>
                              {sid.waypoints.length === 0 ? (
                                <div className="grid grid-cols-5 gap-1">
                                  <input
                                    name="wpName"
                                    placeholder="Name"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                  <input
                                    name="wpLat"
                                    placeholder="Lat"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                  <input
                                    name="wpLon"
                                    placeholder="Lon"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                  <input
                                    name="wpAlt"
                                    placeholder="Alt"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                  <input
                                    name="wpSpeed"
                                    placeholder="Speed"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                </div>
                              ) : (
                                sid.waypoints.map((wp) => (
                                  <div key={wp.id} className="grid grid-cols-5 gap-1">
                                    <input
                                      name="wpName"
                                      defaultValue={wp.name ?? ""}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                    <input
                                      name="wpLat"
                                      defaultValue={wp.lat}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                    <input
                                      name="wpLon"
                                      defaultValue={wp.lon}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                    <input
                                      name="wpAlt"
                                      defaultValue={wp.altitudeRestriction ?? ""}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                    <input
                                      name="wpSpeed"
                                      defaultValue={wp.speedRestriction ?? ""}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                  </div>
                                ))
                              )}
                              <div className="flex justify-end">
                                <Button size="sm" type="submit">
                                  Save path
                                </Button>
                              </div>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[color:var(--text-primary)]">STARs</p>
                    {stars.length === 0 ? (
                      <p className="text-xs text-[color:var(--text-muted)]">No STARs loaded.</p>
                    ) : (
                      <ul className="space-y-2">
                        {stars.map((star) => (
                          <li
                            key={star.id}
                            className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <form
                                action={async (formData) => {
                                  "use server";
                                  await updateStar(star.id, airport.id, formData, locale);
                                }}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <input
                                  name="name"
                                  defaultValue={star.name}
                                  className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1"
                                />
                                <select
                                  name="runway"
                                  defaultValue={star.runway}
                                  className="w-20 rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1"
                                >
                                  <option value="">Runway</option>
                                  {runwayOptions.map((rwy) => (
                                    <option key={rwy} value={rwy}>
                                      {rwy}
                                    </option>
                                  ))}
                                </select>
                                <Button size="sm" variant="secondary" type="submit">
                                  Save
                                </Button>
                              </form>
                              <form
                                action={async () => {
                                  "use server";
                                  await deleteStar(star.id, airport.id, locale);
                                }}
                              >
                                <Button size="sm" variant="ghost" type="submit" className="text-[color:var(--danger)]">
                                  Delete
                                </Button>
                              </form>
                            </div>
                            <form
                              action={async (formData) => {
                                "use server";
                                await updateStarPath(star.id, airport.id, formData, locale);
                              }}
                              className="space-y-1"
                            >
                              <div className="grid grid-cols-5 gap-1 text-[10px] text-[color:var(--text-muted)]">
                                <span>Name</span>
                                <span>Lat</span>
                                <span>Lon</span>
                                <span>Alt</span>
                                <span>Speed</span>
                              </div>
                              {star.waypoints.length === 0 ? (
                                <div className="grid grid-cols-5 gap-1">
                                  <input
                                    name="wpName"
                                    placeholder="Name"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                  <input
                                    name="wpLat"
                                    placeholder="Lat"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                  <input
                                    name="wpLon"
                                    placeholder="Lon"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                  <input
                                    name="wpAlt"
                                    placeholder="Alt"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                  <input
                                    name="wpSpeed"
                                    placeholder="Speed"
                                    className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                  />
                                </div>
                              ) : (
                                star.waypoints.map((wp) => (
                                  <div key={wp.id} className="grid grid-cols-5 gap-1">
                                    <input
                                      name="wpName"
                                      defaultValue={wp.name ?? ""}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                    <input
                                      name="wpLat"
                                      defaultValue={wp.lat}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                    <input
                                      name="wpLon"
                                      defaultValue={wp.lon}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                    <input
                                      name="wpAlt"
                                      defaultValue={wp.altitudeRestriction ?? ""}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                    <input
                                      name="wpSpeed"
                                      defaultValue={wp.speedRestriction ?? ""}
                                      className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-1 py-0.5 text-[10px] text-[color:var(--text-primary)]"
                                    />
                                  </div>
                                ))
                              )}
                              <div className="flex justify-end">
                                <Button size="sm" type="submit">
                                  Save path
                                </Button>
                              </div>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </Card>
            ),
          },
          {
            id: "stands",
            label: "Stands",
            content: (
              <Card className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    Stands - {airport.stands.length} loaded
                  </p>
                  <div className="flex gap-2">
                    <Link href={`/${locale}/admin/airports/${airport.id}/stands`}>
                      <Button size="sm" variant="secondary">
                        Import stands
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="max-h-80 overflow-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    {airport.stands.map((stand) => (
                      <div
                        key={stand.id}
                        className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                      >
                        <form
                          action={async (formData) => {
                            "use server";
                            await updateStand(stand.id, airport.id, formData, locale);
                          }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">{stand.name}</p>
                            <button
                              type="submit"
                              className="rounded bg-[color:var(--primary)] px-2 py-1 text-[10px] font-semibold text-white hover:opacity-90"
                            >
                              Save
                            </button>
                          </div>
                          <input
                            name="name"
                            defaultValue={stand.name}
                            className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              name="lat"
                              defaultValue={stand.lat}
                              className="rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                            />
                            <input
                              name="lon"
                              defaultValue={stand.lon}
                              className="rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                            />
                          </div>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await deleteStand(stand.id, airport.id, locale);
                          }}
                        >
                          <button
                            type="submit"
                            className="w-full rounded border border-[color:var(--danger)] px-2 py-1 text-xs font-semibold text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
                          >
                            Delete stand
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                  {airport.stands.length === 0 ? (
                    <p className="text-sm text-[color:var(--text-muted)]">No stands imported yet.</p>
                  ) : null}
                </div>
              </Card>
            ),
          },
        ]}
      />
    </main>
  );
}
