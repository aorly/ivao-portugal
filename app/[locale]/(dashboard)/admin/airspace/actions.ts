"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { loadAirspaceSegments, saveAirspaceSegments, type AirspaceSegment, type AirspaceBand } from "@/lib/airspace";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff";

const ensureAdmin = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:airspace");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

function parseBands(raw: string): AirspaceBand[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((b) => ({
        from: String(b.from ?? "").trim(),
        to: String(b.to ?? "").trim(),
        class: String(b.class ?? "").trim(),
        note: b.note ? String(b.note).trim() : undefined,
      }))
      .filter((b) => b.from && b.to && b.class);
  } catch {
    return [];
  }
}

export async function upsertSegment(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const fir = String(formData.get("fir") ?? "").trim() || "LPPC";
  const lateralLimits = String(formData.get("lateralLimits") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "").trim() || null;
  const boundaryId = String(formData.get("boundaryId") ?? "").trim() || null;
  const bandsRaw = String(formData.get("bands") ?? "[]");
  const bands = parseBands(bandsRaw);

  if (!title || !lateralLimits || !service) throw new Error("Missing required fields.");

  let slug = slugInput || slugify(title);
  if (!slug) slug = `segment-${Date.now()}`;

  const segments = await loadAirspaceSegments();
  const existingIdx = segments.findIndex((s) => s.id === id || s.slug === slug);

  const next: AirspaceSegment = {
    id: id || slug,
    slug,
    fir,
    title,
    lateralLimits,
    service,
    remarks,
    source,
    boundaryId,
    bands,
  };

  if (existingIdx >= 0) {
    segments[existingIdx] = next;
  } else {
    // Avoid slug collision
    let uniqueSlug = slug;
    let counter = 1;
    while (segments.some((s) => s.slug === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter++}`;
    }
    next.slug = uniqueSlug;
    next.id = next.id || uniqueSlug;
    segments.push(next);
  }

  await saveAirspaceSegments(segments);
  revalidatePath("/[locale]/airspace");
  revalidatePath("/[locale]/admin/airspace");
}

export async function deleteSegment(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing id");
  const segments = await loadAirspaceSegments();
  const filtered = segments.filter((s) => s.id !== id);
  await saveAirspaceSegments(filtered);
  revalidatePath("/[locale]/airspace");
  revalidatePath("/[locale]/admin/airspace");
}

export async function saveRawSegments(formData: FormData) {
  await ensureAdmin();
  const raw = String(formData.get("raw") ?? "").trim();
  if (!raw) throw new Error("Missing JSON");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array of segments");
  }
  const normalize = (seg: any, idx: number): AirspaceSegment => {
    const title = String(seg.title ?? "").trim() || `Segment ${idx + 1}`;
    const slug = String(seg.slug ?? seg.id ?? slugify(title));
    const bands = Array.isArray(seg.bands)
      ? seg.bands
          .map((b: any) => ({
            from: String(b.from ?? "").trim(),
            to: String(b.to ?? "").trim(),
            class: String(b.class ?? "").trim(),
            note: b.note ? String(b.note).trim() : undefined,
          }))
          .filter((b) => b.from && b.to && b.class)
      : [];
    return {
      id: String(seg.id ?? slug),
      slug,
      fir,
      title,
      lateralLimits: String(seg.lateralLimits ?? "").trim(),
      service: String(seg.service ?? "").trim(),
      remarks: seg.remarks ? String(seg.remarks) : null,
      source: seg.source ? String(seg.source) : null,
      boundaryId: seg.boundaryId ? String(seg.boundaryId) : null,
      bands,
    };
  };

  const normalized = parsed.map(normalize);
  await saveAirspaceSegments(normalized);
  revalidatePath("/[locale]/airspace");
  revalidatePath("/[locale]/admin/airspace");
}
