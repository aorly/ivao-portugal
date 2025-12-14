import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { RegistrationButton } from "@/components/events/registration-button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { updateEventContent } from "@/app/[locale]/(public)/events/actions";
import { InlineEditor } from "@/components/admin/inline-editor";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

type EditorBlock = { type?: string; data?: Record<string, unknown> };

export default async function EventDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  const session = await auth();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      airports: { select: { icao: true } },
      firs: { select: { slug: true } },
      registrations: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const isRegistered = Boolean(
    session?.user?.id && event.registrations.some((r) => r.userId === session.user?.id),
  );

  const start = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(event.startTime);
  const end = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(event.endTime);

  const timeframe = `${t("starts")}: ${start} | ${t("ends")}: ${end}`;

  const renderDescription = () => {
    if (!event.description) return <p className="text-sm text-[color:var(--text-muted)]">{t("detailDescription")}</p>;
    try {
      const parsed = JSON.parse(event.description) as { blocks?: EditorBlock[] };
      if (parsed?.blocks && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
        return (
          <div className="space-y-3 text-sm text-[color:var(--text-muted)]">
            {parsed.blocks.map((block, idx) => {
              if (block.type === "header") {
                const level = Number((block.data?.level as number) ?? 3);
                const text = (block.data?.text as string) ?? "";
                const Tag = (`h${level}` as keyof JSX.IntrinsicElements) || "h3";
                return (
                  <Tag key={idx} className="text-[color:var(--text-primary)]">
                    {text}
                  </Tag>
                );
              }
              if (block.type === "list") {
                const items = Array.isArray(block.data?.items) ? block.data?.items : [];
                const style = block.data?.style === "ordered" ? "ol" : "ul";
                const ListTag = style as "ul" | "ol";
                return (
                  <ListTag key={idx} className="ml-4 list-disc text-[color:var(--text-muted)]">
                    {items.map((item, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: String(item) }} />
                    ))}
                  </ListTag>
                );
              }
              const text = (block.data?.text as string) ?? "";
              return (
                <p key={idx} className="text-[color:var(--text-muted)]" dangerouslySetInnerHTML={{ __html: text }} />
              );
            })}
          </div>
        );
      }
    } catch {
      // fall back to plain text render below
    }
    // Treat as HTML if it looks like markup
    const looksLikeHtml = /<\w+[^>]*>/.test(event.description);
    if (looksLikeHtml) {
      return (
        <div
          className="prose prose-invert max-w-none prose-p:my-2 prose-li:my-1 prose-h3:text-[color:var(--text-primary)]"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      );
    }
    // If plain text, show with preserved paragraphs.
    const paragraphs = event.description.split(/\n+/).filter((p) => p.trim().length > 0);
    return (
      <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
        {paragraphs.length
          ? paragraphs.map((p, idx) => (
              <p key={idx} className="text-[color:var(--text-muted)]">
                {p}
              </p>
            ))
          : event.description}
      </div>
    );
  };

  return (
    <main className="flex flex-col gap-6">
      <div className="rounded-3xl border border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface-2)] to-[color:var(--surface-3)] p-6 shadow-lg">
        {event.bannerUrl ? (
          <div className="mb-4 overflow-hidden rounded-2xl border border-[color:var(--border)]" style={{ minHeight: "180px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.bannerUrl} alt={`${event.title} banner`} className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t("title")}</p>
            <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">{event.title}</h1>
            <p className="text-sm text-[color:var(--text-muted)]">{timeframe}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {event.airports.map((a) => (
                <span key={a.icao} className="rounded-full bg-[color:var(--surface-3)] px-3 py-1 text-[color:var(--text-primary)]">
                  {a.icao}
                </span>
              ))}
              {event.firs.map((f) => (
                <span key={f.slug} className="rounded-full bg-[color:var(--surface-3)] px-3 py-1 text-[color:var(--text-primary)]">
                  {f.slug}
                </span>
              ))}
            </div>
          </div>
          {session?.user ? (
            <RegistrationButton
              eventId={event.id}
              eventSlug={event.slug}
              locale={locale}
              isRegistered={isRegistered}
              labels={{ register: t("register"), unregister: t("unregister") }}
            />
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("starts")}</p>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{start}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("ends")}</p>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{end}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("friends")}</p>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("goingCount", { count: event.registrations.length })}</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Overview</p>
          {renderDescription()}
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("friends")}</p>
            <p className="text-xs text-[color:var(--text-muted)]">{t("goingCount", { count: event.registrations.length })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {event.registrations.map((reg) => (
              <span
                key={reg.id}
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-sm text-[color:var(--text-primary)]"
              >
                {reg.user.name ?? reg.user.id}
              </span>
            ))}
            {event.registrations.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">{t("sampleDescription")}</p>
            ) : null}
          </div>
        </Card>
      </div>

      {session?.user && session.user.role !== "USER" ? (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">CMS · Quick edit</p>
            <p className="text-[11px] text-[color:var(--text-muted)]">Update title, timeframe, and content.</p>
          </div>
          <form
            action={async (formData) => {
              "use server";
              await updateEventContent(event.id, event.slug, locale, formData);
            }}
            className="space-y-3"
          >
            <input
              name="title"
              defaultValue={event.title}
              placeholder="Title"
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="bannerUrl"
              defaultValue={event.bannerUrl ?? ""}
              placeholder="Banner image URL"
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] text-[color:var(--text-muted)]">Start (UTC)</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  defaultValue={event.startTime.toISOString().slice(0, 16)}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-[color:var(--text-muted)]">End (UTC)</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  defaultValue={event.endTime.toISOString().slice(0, 16)}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-[color:var(--text-muted)]">Description</label>
              <InlineEditor name="description" initialValue={event.description ?? ""} placeholder="Add event details..." />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Save
              </button>
            </div>
          </form>
        </Card>
      ) : null}
    </main>
  );
}
