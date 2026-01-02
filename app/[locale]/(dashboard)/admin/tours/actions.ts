"use server";

import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

type ActionState = { success?: boolean; error?: string };

type ValidationRule = {
  key: "aircraft" | "maxSpeed" | "maxLevel" | "callsign" | "remarks" | "flightRules" | "military";
  value?: string | null;
  public?: boolean;
  publicLabel?: string | null;
};

const ensureAdminTours = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:tours");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const toDate = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toInt = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTourForm = (formData: FormData) => {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const rules = String(formData.get("rules") ?? "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const forumUrl = String(formData.get("forumUrl") ?? "").trim() || null;
  const awardImageUrl = String(formData.get("awardImageUrl") ?? "").trim() || null;
  const startDate = toDate(formData.get("startDate"));
  const endDate = toDate(formData.get("endDate"));
  const maxFlightsPerDay = toInt(formData.get("maxFlightsPerDay"));
  const enforceLegOrder = formData.get("enforceLegOrder") === "on";
  const ruleAircraftValue = String(formData.get("ruleAircraftValue") ?? "").trim();
  const allowAnyAircraft = formData.get("allowAnyAircraft") === "on";
  const allowedAircraft = String(formData.get("allowedAircraft") ?? "").trim() || null;
  const minOnlinePercent = toInt(formData.get("minOnlinePercent"));
  const totalLegsRequired = toInt(formData.get("totalLegsRequired"));
  const isPublished = formData.get("isPublished") === "on";
  const locale = String(formData.get("locale") ?? "en");
  const validationRules = (() => {
    const rules: ValidationRule[] = [];
    const on = (name: string) => formData.get(name) === "on";
    const text = (name: string) => String(formData.get(name) ?? "").trim();
    const add = (rule: ValidationRule) => {
      if (!rule.value && rule.key !== "military") return;
      rules.push(rule);
    };

    if (on("ruleAircraftEnabled") && ruleAircraftValue && !allowAnyAircraft) {
      add({ key: "aircraft", value: text("ruleAircraftValue"), public: true });
    }
    if (on("ruleMaxSpeedEnabled")) {
      rules.push({
        key: "maxSpeed",
        value: text("ruleMaxSpeedValue"),
        public: true,
        publicLabel: text("ruleMaxSpeedPublicLabel") || null,
      });
    }
    if (on("ruleMaxLevelEnabled")) {
      rules.push({
        key: "maxLevel",
        value: text("ruleMaxLevelValue"),
        public: true,
        publicLabel: text("ruleMaxLevelPublicLabel") || null,
      });
    }
    if (on("ruleCallsignEnabled")) {
      add({ key: "callsign", value: text("ruleCallsignValue"), public: true });
    }
    if (on("ruleRemarksEnabled")) {
      add({ key: "remarks", value: text("ruleRemarksValue"), public: true });
    }
    if (on("ruleFlightRulesEnabled")) {
      add({ key: "flightRules", value: text("ruleFlightRulesValue"), public: true });
    }
    const militaryAllowed = formData.get("ruleMilitaryAllowed") === "on";
    rules.push({
      key: "military",
      value: militaryAllowed ? "allowed" : "forbidden",
      public: true,
    });

    return rules.length ? JSON.stringify(rules) : null;
  })();

  return {
    title,
    slugInput,
    code,
    description,
    rules,
    imageUrl,
    forumUrl,
    awardImageUrl,
    startDate,
    endDate,
    maxFlightsPerDay,
    enforceLegOrder,
    allowAnyAircraft: allowAnyAircraft || ruleAircraftValue === "",
    allowedAircraft,
    minOnlinePercent,
    totalLegsRequired,
    isPublished,
    validationRules,
    locale,
  };
};

const parseLegForm = (formData: FormData) => {
  const tourId = String(formData.get("tourId") ?? "");
  const legNumber = toInt(formData.get("legNumber"));
  const departureCode = String(formData.get("departureCode") ?? "").trim().toUpperCase();
  const arrivalCode = String(formData.get("arrivalCode") ?? "").trim().toUpperCase();
  const distanceNm = toInt(formData.get("distanceNm"));
  const eteMinutes = toInt(formData.get("eteMinutes"));
  const maxSpeed = String(formData.get("maxSpeed") ?? "").trim() || null;
  const maxAltitudeFt = toInt(formData.get("maxAltitudeFt"));
  const briefing = String(formData.get("briefing") ?? "").trim() || null;
  const scheduledDate = toDate(formData.get("scheduledDate"));
  const locale = String(formData.get("locale") ?? "en");

  return {
    tourId,
    legNumber,
    departureCode,
    arrivalCode,
    distanceNm,
    eteMinutes,
    maxSpeed,
    maxAltitudeFt,
    briefing,
    scheduledDate,
    locale,
  };
};

export async function createTour(_prevState: ActionState, formData: FormData): Promise<ActionState & { tourId?: string; locale: string; slug: string }> {
  const session = await ensureAdminTours();
  const data = parseTourForm(formData);

  if (!data.title) return { success: false, error: "Title is required", locale: data.locale, slug: "" };
  const slug = data.slugInput ? slugify(data.slugInput) : slugify(data.title);

  const created = await prisma.tour.create({
    data: {
      slug,
      code: data.code,
      title: data.title,
      description: data.description,
      rules: data.rules,
      imageUrl: data.imageUrl,
      forumUrl: data.forumUrl,
      awardImageUrl: data.awardImageUrl,
      startDate: data.startDate,
      endDate: data.endDate,
      maxFlightsPerDay: data.maxFlightsPerDay,
      enforceLegOrder: data.enforceLegOrder,
      allowAnyAircraft: data.allowAnyAircraft,
      allowedAircraft: data.allowedAircraft,
      minOnlinePercent: data.minOnlinePercent,
      totalLegsRequired: data.totalLegsRequired,
      isPublished: data.isPublished,
      validationRules: data.validationRules,
    },
  });

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "create",
    entityType: "tour",
    entityId: created.id,
    before: null,
    after: created,
  });

  revalidatePath(`/${data.locale}/admin/tours`);
  revalidatePath(`/${data.locale}/tours`);
  return { success: true, tourId: created.id, locale: data.locale, slug };
}

export async function updateTour(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await ensureAdminTours();
  const tourId = String(formData.get("tourId") ?? "");
  const data = parseTourForm(formData);
  if (!tourId || !data.title) return { success: false, error: "Invalid tour data" };

  const existing = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!existing) return { success: false, error: "Tour not found" };

  const slug = data.slugInput ? slugify(data.slugInput) : slugify(data.title);

  const updated = await prisma.tour.update({
    where: { id: tourId },
    data: {
      slug,
      code: data.code,
      title: data.title,
      description: data.description ?? existing.description,
      rules: data.rules ?? existing.rules,
      imageUrl: data.imageUrl,
      forumUrl: data.forumUrl,
      awardImageUrl: data.awardImageUrl,
      startDate: data.startDate,
      endDate: data.endDate,
      maxFlightsPerDay: data.maxFlightsPerDay,
      enforceLegOrder: data.enforceLegOrder,
      allowAnyAircraft: data.allowAnyAircraft,
      allowedAircraft: data.allowedAircraft,
      minOnlinePercent: data.minOnlinePercent,
      totalLegsRequired: data.totalLegsRequired,
      isPublished: data.isPublished,
      validationRules: data.validationRules,
    },
  });

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "tour",
    entityId: tourId,
    before: existing,
    after: updated,
  });

  revalidatePath(`/${data.locale}/admin/tours`);
  revalidatePath(`/${data.locale}/admin/tours/${tourId}`);
  revalidatePath(`/${data.locale}/tours`);
  revalidatePath(`/${data.locale}/tours/${slug}`);
  return { success: true };
}

export async function createTourAction(formData: FormData) {
  const result = await createTour({}, formData);
  if (result.success && result.tourId) {
    redirect(`/${result.locale}/admin/tours/${result.tourId}?saved=1`);
  }
}

export async function updateTourAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const tourId = String(formData.get("tourId") ?? "");
  await updateTour({}, formData);
  if (tourId) {
    redirect(`/${locale}/admin/tours/${tourId}?saved=1`);
  }
}

export async function refreshToursReportsAction(formData: FormData) {
  await ensureAdminTours();
  const locale = String(formData.get("locale") ?? "en");
  const status = String(formData.get("status") ?? "").trim();

  revalidatePath(`/${locale}/admin/tours`);
  revalidatePath(`/${locale}/admin/tours/reports`);
  revalidatePath(`/${locale}/tours`);

  const query = status ? `?status=${encodeURIComponent(status)}&saved=1` : "?saved=1";
  redirect(`/${locale}/admin/tours/reports${query}`);
}

export async function deleteTour(formData: FormData) {
  const session = await ensureAdminTours();
  const tourId = String(formData.get("tourId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (!tourId) throw new Error("Invalid tour id");

  const before = await prisma.tour.findUnique({ where: { id: tourId } });

  await prisma.$transaction([
    prisma.tourLegReport.deleteMany({ where: { tourLeg: { tourId } } }),
    prisma.tourEnrollment.deleteMany({ where: { tourId } }),
    prisma.tourLeg.deleteMany({ where: { tourId } }),
    prisma.tour.delete({ where: { id: tourId } }),
  ]);

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "tour",
    entityId: tourId,
    before,
    after: null,
  });

  revalidatePath(`/${locale}/admin/tours`);
  revalidatePath(`/${locale}/tours`);
}

export async function createLeg(formData: FormData) {
  const session = await ensureAdminTours();
  const data = parseLegForm(formData);
  if (!data.tourId || !data.legNumber || !data.departureCode || !data.arrivalCode) {
    throw new Error("Invalid leg data");
  }

  const created = await prisma.tourLeg.create({
    data: {
      tourId: data.tourId,
      legNumber: data.legNumber,
      departureCode: data.departureCode,
      arrivalCode: data.arrivalCode,
      distanceNm: data.distanceNm,
      eteMinutes: data.eteMinutes,
      maxSpeed: data.maxSpeed,
      maxAltitudeFt: data.maxAltitudeFt,
      briefing: data.briefing,
      scheduledDate: data.scheduledDate,
    },
  });

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "create",
    entityType: "tourLeg",
    entityId: created.id,
    before: null,
    after: created,
  });

  revalidatePath(`/${data.locale}/admin/tours/${data.tourId}`);
  revalidatePath(`/${data.locale}/tours`);
}

export async function updateLeg(formData: FormData) {
  const session = await ensureAdminTours();
  const legId = String(formData.get("legId") ?? "");
  const data = parseLegForm(formData);
  if (!legId || !data.legNumber || !data.departureCode || !data.arrivalCode) {
    throw new Error("Invalid leg data");
  }

  const before = await prisma.tourLeg.findUnique({ where: { id: legId } });
  const updated = await prisma.tourLeg.update({
    where: { id: legId },
    data: {
      legNumber: data.legNumber,
      departureCode: data.departureCode,
      arrivalCode: data.arrivalCode,
      distanceNm: data.distanceNm,
      eteMinutes: data.eteMinutes,
      maxSpeed: data.maxSpeed,
      maxAltitudeFt: data.maxAltitudeFt,
      briefing: data.briefing,
      scheduledDate: data.scheduledDate,
    },
  });

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "tourLeg",
    entityId: legId,
    before,
    after: updated,
  });

  revalidatePath(`/${data.locale}/admin/tours/${data.tourId}`);
  revalidatePath(`/${data.locale}/tours`);
}

export async function deleteLeg(formData: FormData) {
  const session = await ensureAdminTours();
  const legId = String(formData.get("legId") ?? "");
  const tourId = String(formData.get("tourId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (!legId || !tourId) throw new Error("Invalid leg id");

  const before = await prisma.tourLeg.findUnique({ where: { id: legId } });
  await prisma.$transaction([
    prisma.tourLegReport.deleteMany({ where: { tourLegId: legId } }),
    prisma.tourLeg.delete({ where: { id: legId } }),
  ]);

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "tourLeg",
    entityId: legId,
    before,
    after: null,
  });

  revalidatePath(`/${locale}/admin/tours/${tourId}`);
  revalidatePath(`/${locale}/tours`);
}

export async function reviewTourLegReport(formData: FormData) {
  const session = await ensureAdminTours();
  const reportId = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "").toUpperCase();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim() || null;
  const locale = String(formData.get("locale") ?? "en");
  const tourId = String(formData.get("tourId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  if (!reportId || !tourId) throw new Error("Invalid report");
  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) throw new Error("Invalid status");

  const before = await prisma.tourLegReport.findUnique({ where: { id: reportId } });
  const updated = await prisma.tourLegReport.update({
    where: { id: reportId },
    data: {
      status,
      reviewNote,
      reviewedAt: new Date(),
      reviewedById: session?.user?.id ?? null,
    },
  });

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "tourLegReport",
    entityId: reportId,
    before,
    after: updated,
  });

  revalidatePath(`/${locale}/admin/tours/${tourId}`);
  revalidatePath(`/${locale}/tours`);
  if (redirectTo) {
    redirect(redirectTo);
  }
}

type TourImport = {
  slug?: string;
  code?: string;
  title: string;
  description?: string | null;
  rules?: string | null;
  imageUrl?: string | null;
  forumUrl?: string | null;
  awardImageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  maxFlightsPerDay?: number | null;
  enforceLegOrder?: boolean;
  allowAnyAircraft?: boolean;
  allowedAircraft?: string | null;
  minOnlinePercent?: number | null;
  totalLegsRequired?: number | null;
  isPublished?: boolean;
  legs?: LegImport[];
};

type LegImport = {
  legNumber: number;
  departureCode: string;
  arrivalCode: string;
  distanceNm?: number | null;
  eteMinutes?: number | null;
  maxSpeed?: string | null;
  maxAltitudeFt?: number | null;
  briefing?: string | null;
  scheduledDate?: string | null;
};

const parseJson = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeTourImport = (input: unknown): TourImport[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter((item) => item && typeof item === "object") as TourImport[];
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.tours)) {
      return obj.tours.filter((item) => item && typeof item === "object") as TourImport[];
    }
    return [input as TourImport];
  }
  return [];
};

const normalizeLegImport = (input: unknown): LegImport[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter((item) => item && typeof item === "object") as LegImport[];
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.legs)) {
      return obj.legs.filter((item) => item && typeof item === "object") as LegImport[];
    }
    return [input as LegImport];
  }
  return [];
};

const toNullableDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNullableInt = (value: unknown) => {
  if (value == null) return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function importToursFromJson(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await ensureAdminTours();
  const payload = String(formData.get("payload") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en");
  if (!payload) return { success: false, error: "JSON payload is required" };

  const parsed = parseJson(payload);
  const tours = normalizeTourImport(parsed);
  if (tours.length === 0) return { success: false, error: "No tours found in JSON" };

  const created: string[] = [];
  for (const tour of tours) {
    if (!tour.title) continue;
    const slug = tour.slug ? slugify(tour.slug) : slugify(tour.title);
    const rulesPayload =
      (tour as any).validationRules ??
      (tour as any).rulesConfig ??
      (tour as any).validation;
    const validationRules =
      rulesPayload && typeof rulesPayload === "string"
        ? rulesPayload
        : rulesPayload
          ? JSON.stringify(rulesPayload)
          : null;
    const createdTour = await prisma.tour.create({
      data: {
        slug,
        code: tour.code ?? null,
        title: tour.title,
        description: tour.description ?? null,
        rules: tour.rules ?? null,
        validationRules,
        imageUrl: tour.imageUrl ?? null,
        forumUrl: tour.forumUrl ?? null,
        awardImageUrl: tour.awardImageUrl ?? null,
        startDate: toNullableDate(tour.startDate ?? null),
        endDate: toNullableDate(tour.endDate ?? null),
        maxFlightsPerDay: toNullableInt(tour.maxFlightsPerDay),
        enforceLegOrder: tour.enforceLegOrder ?? false,
        allowAnyAircraft: tour.allowAnyAircraft ?? true,
        allowedAircraft: tour.allowedAircraft ?? null,
        minOnlinePercent: toNullableInt(tour.minOnlinePercent),
        totalLegsRequired: toNullableInt(tour.totalLegsRequired),
        isPublished: tour.isPublished ?? false,
      },
    });
    created.push(createdTour.id);

    const legs = normalizeLegImport(tour.legs ?? null);
    if (legs.length) {
      await prisma.tourLeg.createMany({
        data: legs
          .filter((leg) => leg && leg.legNumber && leg.departureCode && leg.arrivalCode)
          .map((leg) => ({
            tourId: createdTour.id,
            legNumber: Number(leg.legNumber),
            departureCode: String(leg.departureCode).trim().toUpperCase(),
            arrivalCode: String(leg.arrivalCode).trim().toUpperCase(),
            distanceNm: toNullableInt(leg.distanceNm),
            eteMinutes: toNullableInt(leg.eteMinutes),
            maxSpeed: leg.maxSpeed ?? null,
            maxAltitudeFt: toNullableInt(leg.maxAltitudeFt),
            briefing: leg.briefing ?? null,
            scheduledDate: toNullableDate(leg.scheduledDate ?? null),
          })),
      });
    }

    await logAudit({
      actorId: session?.user?.id ?? null,
      action: "create",
      entityType: "tour",
      entityId: createdTour.id,
      before: null,
      after: createdTour,
    });
  }

  revalidatePath(`/${locale}/admin/tours`);
  revalidatePath(`/${locale}/tours`);
  return { success: true };
}

export async function importLegsFromJson(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await ensureAdminTours();
  const payload = String(formData.get("payload") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en");
  const tourId = String(formData.get("tourId") ?? "");
  if (!payload || !tourId) return { success: false, error: "Tour id and JSON payload are required" };

  const parsed = parseJson(payload);
  const legs = normalizeLegImport(parsed);
  if (legs.length === 0) return { success: false, error: "No legs found in JSON" };

  await prisma.tourLeg.createMany({
    data: legs
      .filter((leg) => leg && leg.legNumber && leg.departureCode && leg.arrivalCode)
      .map((leg) => ({
        tourId,
        legNumber: Number(leg.legNumber),
        departureCode: String(leg.departureCode).trim().toUpperCase(),
        arrivalCode: String(leg.arrivalCode).trim().toUpperCase(),
        distanceNm: toNullableInt(leg.distanceNm),
        eteMinutes: toNullableInt(leg.eteMinutes),
        maxSpeed: leg.maxSpeed ?? null,
        maxAltitudeFt: toNullableInt(leg.maxAltitudeFt),
        briefing: leg.briefing ?? null,
        scheduledDate: toNullableDate(leg.scheduledDate ?? null),
      })),
  });

  revalidatePath(`/${locale}/admin/tours/${tourId}`);
  revalidatePath(`/${locale}/tours`);
  return { success: true };
}

export async function importToursFromJsonAction(formData: FormData) {
  await importToursFromJson({}, formData);
}

export async function importLegsFromJsonAction(formData: FormData) {
  await importLegsFromJson({}, formData);
}
