"use client";

import type { Config, Data } from "@measured/puck";
import { Badge } from "@/components/ui/badge";
import { EventActions } from "@/components/events/event-actions";
import { RegistrationButton } from "@/components/events/registration-button";
import { useEventContext } from "@/components/puck/event-context";
import { type Locale } from "@/i18n";

const renderInlineMarkdown = (value: string) => {
  let next = value;
  next = next.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  next = next.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  next = next.replace(/\*(?!\s)(.+?)(?<!\s)\*/g, "<em>$1</em>");
  next = next.replace(/_(?!\s)(.+?)(?<!\s)_/g, "<em>$1</em>");
  return next;
};

const renderMarkdown = (value: string) => {
  const lines = value.split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join("<br />"))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    blocks.push(`<${listType}>${listItems.join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const text = renderInlineMarkdown(headingMatch[2]);
      blocks.push(`<h${level}>${text}</h${level}>`);
      return;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listItems.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList();
      }
      listType = "ol";
      listItems.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return blocks.join("");
};

const renderRichText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "<p></p>";
  if (trimmed.startsWith("<")) return trimmed;
  return renderMarkdown(trimmed);
};

const toBool = (value?: string) => value === "true";

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block-${Math.random().toString(36).slice(2, 10)}`;
};

type EventHeroBlockProps = {
  subtitle?: string;
  showBanner?: string;
  showStatus?: string;
  showUpdated?: string;
  showAirports?: string;
};

type PuckMeta = { isEditing?: boolean };

type EventActionsBlockProps = {
  showRegister?: string;
  showShare?: string;
  puck?: PuckMeta;
};

type EventStatsBlockProps = {
  showStart?: string;
  showEnd?: string;
  showRegistrations?: string;
};

type EventOverviewBlockProps = {
  title?: string;
  bodyOverride?: string;
};

type EventDetailsBlockProps = {
  showType?: string;
  showAward?: string;
  showBriefing?: string;
  showDivisions?: string;
  showRoutes?: string;
};

type EventRegistrationsBlockProps = {
  title?: string;
  emptyText?: string;
};

function EventHeroBlock({ subtitle, showBanner, showStatus, showUpdated, showAirports }: EventHeroBlockProps) {
  const event = useEventContext();
  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-6">
      {toBool(showBanner) && event.bannerUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[color:var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.bannerUrl} alt={`${event.title} banner`} className="h-40 w-full object-cover" />
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Event</p>
        <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">{event.title}</h1>
        <p className="text-sm text-[color:var(--text-muted)]">{subtitle || event.timeframe}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
          {toBool(showStatus) ? <Badge>{event.statusLabel}</Badge> : null}
          {toBool(showUpdated) && event.updatedLabel && event.updatedIso ? (
            <span>
              Last updated <time dateTime={event.updatedIso}>{event.updatedLabel}</time>
            </span>
          ) : null}
        </div>
        {toBool(showAirports) ? (
          <div className="flex flex-wrap gap-2 text-xs">
            {event.airports.map((airport) => (
              <span
                key={airport}
                className="rounded-full bg-[color:var(--surface-3)] px-3 py-1 text-[color:var(--text-primary)]"
              >
                {airport}
              </span>
            ))}
            {event.firs.map((fir) => (
              <span
                key={fir}
                className="rounded-full bg-[color:var(--surface-3)] px-3 py-1 text-[color:var(--text-primary)]"
              >
                {fir}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EventActionsBlock({ showRegister, showShare, puck }: EventActionsBlockProps) {
  const event = useEventContext();
  const isEditing = Boolean(puck?.isEditing);
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      {toBool(showRegister) ? (
        isEditing ? (
          <button
            type="button"
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--text-muted)]"
          >
            Register button (preview)
          </button>
        ) : (
          <RegistrationButton
            eventId={event.id}
            eventSlug={event.slug}
            locale={event.locale as Locale}
            isRegistered={event.isRegistered}
            labels={{ register: event.registerLabel, unregister: event.unregisterLabel }}
          />
        )
      ) : null}
      {toBool(showShare) ? (
        isEditing ? (
          <div className="text-xs text-[color:var(--text-muted)]">Calendar + share buttons</div>
        ) : (
          <EventActions
            title={event.title}
            startIso={event.startIso}
            endIso={event.endIso}
            url={event.eventUrl}
            location={event.eventLocation}
            description={event.description}
            layout="grid"
            showLabels={true}
          />
        )
      ) : null}
    </section>
  );
}

function EventStatsBlock({ showStart, showEnd, showRegistrations }: EventStatsBlockProps) {
  const event = useEventContext();
  const cards = [
    toBool(showStart) ? { label: "Starts", value: event.startLabel } : null,
    toBool(showEnd) ? { label: "Ends", value: event.endLabel } : null,
    toBool(showRegistrations) ? { label: "Friends", value: `${event.registrationsCount} going` } : null,
  ].filter(Boolean) as { label: string; value: string }[];
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{card.label}</p>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{card.value}</p>
        </div>
      ))}
    </section>
  );
}

function EventOverviewBlock({ title, bodyOverride }: EventOverviewBlockProps) {
  const event = useEventContext();
  const body = bodyOverride ? renderRichText(bodyOverride) : renderRichText(event.description || "");
  return (
    <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</p>
      <div
        className="text-sm leading-relaxed text-[color:var(--text-muted)]"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </section>
  );
}

function EventDetailsBlock({
  showType,
  showAward,
  showBriefing,
  showDivisions,
  showRoutes,
}: EventDetailsBlockProps) {
  const event = useEventContext();
  return (
    <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <p className="text-sm font-semibold text-[color:var(--text-primary)]">Details</p>
      <div className="space-y-3 text-sm text-[color:var(--text-muted)]">
        {toBool(showType) && event.eventType ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Type</span>
            <span className="text-[color:var(--text-primary)]">{event.eventType}</span>
          </div>
        ) : null}
        {toBool(showAward) && event.hqeAward ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Award</span>
            <span className="text-[color:var(--text-primary)]">HQE Award</span>
          </div>
        ) : null}
        {toBool(showBriefing) && event.infoUrl ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Briefing</span>
            <a href={event.infoUrl} target="_blank" rel="noreferrer" className="text-[color:var(--primary)] underline">
              Open
            </a>
          </div>
        ) : null}
        {toBool(showDivisions) && event.divisions.length ? (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Divisions</p>
            <div className="flex flex-wrap gap-2">
              {event.divisions.map((division) => (
                <span
                  key={division}
                  className="rounded-full bg-[color:var(--surface-3)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                >
                  {division}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {toBool(showRoutes) && event.routes ? (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Routes</p>
            <pre className="whitespace-pre-wrap text-xs text-[color:var(--text-muted)]">{event.routes}</pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EventRegistrationsBlock({ title, emptyText }: EventRegistrationsBlockProps) {
  const event = useEventContext();
  return (
    <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</p>
        <p className="text-xs text-[color:var(--text-muted)]">{event.registrationsCount} going</p>
      </div>
      {event.registrations.length === 0 ? (
        <p className="text-sm text-[color:var(--text-muted)]">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {event.registrations.map((reg) => (
            <span
              key={reg.id}
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-sm text-[color:var(--text-primary)]"
            >
              {reg.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export const eventPuckConfig: Config = {
  categories: {
    layout: {
      title: "Event layout",
      components: [
        "EventHero",
        "EventActions",
        "EventStats",
        "EventOverview",
        "EventDetails",
        "EventRegistrations",
      ],
      defaultExpanded: true,
    },
    content: {
      title: "Content",
      components: ["FAQ", "Stats", "Callout", "Alerts"],
    },
    media: {
      title: "Media",
      components: ["Gallery", "Video", "Map"],
    },
    data: {
      title: "Data",
      components: ["Table"],
    },
  },
  components: {
    EventHero: {
      fields: {
        subtitle: { type: "text" },
        showBanner: {
          type: "select",
          options: [
            { label: "Show banner", value: "true" },
            { label: "Hide banner", value: "false" },
          ],
        },
        showStatus: {
          type: "select",
          options: [
            { label: "Show status", value: "true" },
            { label: "Hide status", value: "false" },
          ],
        },
        showUpdated: {
          type: "select",
          options: [
            { label: "Show last updated", value: "true" },
            { label: "Hide last updated", value: "false" },
          ],
        },
        showAirports: {
          type: "select",
          options: [
            { label: "Show airports/FIRs", value: "true" },
            { label: "Hide airports/FIRs", value: "false" },
          ],
        },
      },
      defaultProps: {
        subtitle: "",
        showBanner: "true",
        showStatus: "true",
        showUpdated: "true",
        showAirports: "true",
      },
      render: (props) => <EventHeroBlock {...props} />,
    },
    EventActions: {
      fields: {
        showRegister: {
          type: "select",
          options: [
            { label: "Show register button", value: "true" },
            { label: "Hide register button", value: "false" },
          ],
        },
        showShare: {
          type: "select",
          options: [
            { label: "Show calendar/share", value: "true" },
            { label: "Hide calendar/share", value: "false" },
          ],
        },
      },
      defaultProps: {
        showRegister: "true",
        showShare: "true",
      },
      render: (props) => <EventActionsBlock {...props} />,
    },
    EventStats: {
      fields: {
        showStart: {
          type: "select",
          options: [
            { label: "Show start", value: "true" },
            { label: "Hide start", value: "false" },
          ],
        },
        showEnd: {
          type: "select",
          options: [
            { label: "Show end", value: "true" },
            { label: "Hide end", value: "false" },
          ],
        },
        showRegistrations: {
          type: "select",
          options: [
            { label: "Show registrations", value: "true" },
            { label: "Hide registrations", value: "false" },
          ],
        },
      },
      defaultProps: {
        showStart: "true",
        showEnd: "true",
        showRegistrations: "true",
      },
      render: (props) => <EventStatsBlock {...props} />,
    },
    EventOverview: {
      fields: {
        title: { type: "text" },
        bodyOverride: { type: "textarea" },
      },
      defaultProps: {
        title: "Overview",
        bodyOverride: "",
      },
      render: (props) => <EventOverviewBlock {...props} />,
    },
    EventDetails: {
      fields: {
        showType: {
          type: "select",
          options: [
            { label: "Show type", value: "true" },
            { label: "Hide type", value: "false" },
          ],
        },
        showAward: {
          type: "select",
          options: [
            { label: "Show award", value: "true" },
            { label: "Hide award", value: "false" },
          ],
        },
        showBriefing: {
          type: "select",
          options: [
            { label: "Show briefing", value: "true" },
            { label: "Hide briefing", value: "false" },
          ],
        },
        showDivisions: {
          type: "select",
          options: [
            { label: "Show divisions", value: "true" },
            { label: "Hide divisions", value: "false" },
          ],
        },
        showRoutes: {
          type: "select",
          options: [
            { label: "Show routes", value: "true" },
            { label: "Hide routes", value: "false" },
          ],
        },
      },
      defaultProps: {
        showType: "true",
        showAward: "true",
        showBriefing: "true",
        showDivisions: "true",
        showRoutes: "true",
      },
      render: (props) => <EventDetailsBlock {...props} />,
    },
    EventRegistrations: {
      fields: {
        title: { type: "text" },
        emptyText: { type: "text" },
      },
      defaultProps: {
        title: "Friends attending",
        emptyText: "No one has registered yet.",
      },
      render: (props) => <EventRegistrationsBlock {...props} />,
    },
    Gallery: {
      fields: {
        title: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            src: { type: "text" },
            alt: { type: "text" },
            caption: { type: "text" },
          },
          defaultItemProps: {
            src: "",
            alt: "",
            caption: "",
          },
          getItemSummary: (item) => item?.caption || item?.alt || item?.src || "Image",
        },
      },
      defaultProps: {
        title: "Gallery",
        items: [],
      },
      render: ({ title, items }) => (
        <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {title ? <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3> : null}
          {items.length === 0 ? (
            <p className="text-xs text-[color:var(--text-muted)]">Add images to the gallery.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, index) => (
                <figure
                  key={`${item.src}-${index}`}
                  className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]"
                >
                  {item.src ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.src} alt={item.alt || "Gallery image"} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-[color:var(--text-muted)]">
                      Missing image
                    </div>
                  )}
                  {item.caption ? (
                    <figcaption className="px-3 py-2 text-xs text-[color:var(--text-muted)]">
                      {item.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          )}
        </section>
      ),
    },
    Video: {
      fields: {
        title: { type: "text" },
        url: { type: "text" },
        caption: { type: "text" },
      },
      defaultProps: {
        title: "Video",
        url: "",
        caption: "",
      },
      render: ({ title, url, caption }) => (
        <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {title ? <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3> : null}
          {url ? (
            <div className="aspect-video overflow-hidden rounded-xl border border-[color:var(--border)] bg-black/80">
              <iframe
                src={url}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={title || "Embedded video"}
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-xs text-[color:var(--text-muted)]">
              Paste an embed URL (YouTube/Vimeo)
            </div>
          )}
          {caption ? <p className="text-xs text-[color:var(--text-muted)]">{caption}</p> : null}
        </section>
      ),
    },
    Map: {
      fields: {
        title: { type: "text" },
        embedUrl: { type: "text" },
        caption: { type: "text" },
      },
      defaultProps: {
        title: "Map",
        embedUrl: "",
        caption: "",
      },
      render: ({ title, embedUrl, caption }) => (
        <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {title ? <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3> : null}
          {embedUrl ? (
            <div className="aspect-video overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
              <iframe src={embedUrl} className="h-full w-full" loading="lazy" title={title || "Map"} />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] text-xs text-[color:var(--text-muted)]">
              Paste a map embed URL
            </div>
          )}
          {caption ? <p className="text-xs text-[color:var(--text-muted)]">{caption}</p> : null}
        </section>
      ),
    },
    FAQ: {
      fields: {
        title: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            question: { type: "text" },
            answer: { type: "textarea" },
          },
          defaultItemProps: {
            question: "",
            answer: "",
          },
          getItemSummary: (item) => item?.question || "FAQ item",
        },
      },
      defaultProps: {
        title: "Frequently asked questions",
        items: [],
      },
      render: ({ title, items }) => (
        <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {title ? <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3> : null}
          {items.length === 0 ? (
            <p className="text-xs text-[color:var(--text-muted)]">Add FAQ entries to get started.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${item.question}-${index}`} className="rounded-xl border border-[color:var(--border)] p-3">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.question}</p>
                  <div
                    className="mt-2 text-sm text-[color:var(--text-muted)]"
                    dangerouslySetInnerHTML={{ __html: renderRichText(item.answer || "") }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ),
    },
    Stats: {
      fields: {
        title: { type: "text" },
        stats: {
          type: "array",
          arrayFields: {
            label: { type: "text" },
            value: { type: "text" },
            hint: { type: "text" },
          },
          defaultItemProps: {
            label: "",
            value: "",
            hint: "",
          },
          getItemSummary: (item) => item?.label || item?.value || "Stat",
        },
      },
      defaultProps: {
        title: "Key stats",
        stats: [],
      },
      render: ({ title, stats }) => (
        <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {title ? <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3> : null}
          {stats.length === 0 ? (
            <p className="text-xs text-[color:var(--text-muted)]">Add stats to highlight.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat, index) => (
                <div key={`${stat.label}-${index}`} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
                  <p className="text-xs text-[color:var(--text-muted)]">{stat.label}</p>
                  <p className="text-lg font-semibold text-[color:var(--text-primary)]">{stat.value}</p>
                  {stat.hint ? <p className="text-xs text-[color:var(--text-muted)]">{stat.hint}</p> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ),
    },
    Table: {
      fields: {
        title: { type: "text" },
        columns: {
          type: "array",
          arrayFields: {
            label: { type: "text" },
          },
          defaultItemProps: { label: "" },
          getItemSummary: (item) => item?.label || "Column",
        },
        rows: {
          type: "array",
          arrayFields: {
            cells: { type: "textarea" },
          },
          defaultItemProps: { cells: "" },
          getItemSummary: (_item, index) => `Row ${index ? index + 1 : 1}`,
        },
      },
      defaultProps: {
        title: "Table",
        columns: [],
        rows: [],
      },
      render: ({ title, columns, rows }) => (
        <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {title ? <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3> : null}
          {columns.length === 0 ? (
            <p className="text-xs text-[color:var(--text-muted)]">Add columns and rows.</p>
          ) : (
            <div className="overflow-auto rounded-xl border border-[color:var(--border)]">
              <table className="min-w-full divide-y divide-[color:var(--border)] text-left text-xs text-[color:var(--text-muted)]">
                <thead className="bg-[color:var(--surface-2)] text-[color:var(--text-primary)]">
                  <tr>
                    {columns.map((col, index) => (
                      <th key={`${col.label}-${index}`} className="px-3 py-2 font-semibold">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {rows.map((row, rowIndex) => {
                    const cells = (row.cells || "").split("|").map((cell) => cell.trim());
                    return (
                      <tr key={`row-${rowIndex}`} className="bg-[color:var(--surface)]">
                        {columns.map((_, cellIndex) => (
                          <td key={`cell-${rowIndex}-${cellIndex}`} className="px-3 py-2">
                            {cells[cellIndex] ?? ""}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[10px] text-[color:var(--text-muted)]">Rows use | to separate cells.</p>
        </section>
      ),
    },
    Callout: {
      fields: {
        tone: {
          type: "select",
          options: [
            { label: "Neutral", value: "neutral" },
            { label: "Info", value: "info" },
            { label: "Success", value: "success" },
            { label: "Warning", value: "warning" },
          ],
        },
        title: { type: "text" },
        body: { type: "textarea" },
      },
      defaultProps: {
        tone: "neutral",
        title: "Callout title",
        body: "Add supporting copy.",
      },
      render: ({ tone, title, body }) => {
        const toneMap: Record<string, string> = {
          neutral: "border-[color:var(--border)] bg-[color:var(--surface-2)]",
          info: "border-blue-400/40 bg-blue-500/10",
          success: "border-emerald-400/40 bg-emerald-500/10",
          warning: "border-amber-400/40 bg-amber-500/10",
        };
        return (
          <section className={`rounded-2xl border px-5 py-4 ${toneMap[tone] ?? toneMap.neutral}`}>
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3>
            <div
              className="mt-2 text-sm text-[color:var(--text-muted)]"
              dangerouslySetInnerHTML={{ __html: renderRichText(body || "") }}
            />
          </section>
        );
      },
    },
    Alerts: {
      fields: {
        items: {
          type: "array",
          arrayFields: {
            tone: {
              type: "select",
              options: [
                { label: "Info", value: "info" },
                { label: "Success", value: "success" },
                { label: "Warning", value: "warning" },
                { label: "Danger", value: "danger" },
              ],
            },
            title: { type: "text" },
            body: { type: "textarea" },
          },
          defaultItemProps: {
            tone: "info",
            title: "",
            body: "",
          },
          getItemSummary: (item) => item?.title || "Alert",
        },
      },
      defaultProps: {
        items: [],
      },
      render: ({ items }) => {
        const toneMap: Record<string, string> = {
          info: "border-blue-400/40 bg-blue-500/10",
          success: "border-emerald-400/40 bg-emerald-500/10",
          warning: "border-amber-400/40 bg-amber-500/10",
          danger: "border-rose-400/40 bg-rose-500/10",
        };
        return (
          <section className="space-y-3">
            {items.length === 0 ? (
              <p className="text-xs text-[color:var(--text-muted)]">Add alert messages.</p>
            ) : (
              items.map((item, index) => (
                <div key={`${item.title}-${index}`} className={`rounded-2xl border px-4 py-3 ${toneMap[item.tone] ?? toneMap.info}`}>
                  {item.title ? <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.title}</p> : null}
                  {item.body ? (
                    <div
                      className="mt-1 text-sm text-[color:var(--text-muted)]"
                      dangerouslySetInnerHTML={{ __html: renderRichText(item.body || "") }}
                    />
                  ) : null}
                </div>
              ))
            )}
          </section>
        );
      },
    },
  },
};

export const createDefaultEventLayout = (data: {
  title: string;
  description: string;
  bannerUrl?: string | null;
}): Data => ({
  root: { props: {} },
  content: [
    { type: "EventHero", props: { id: makeId(), subtitle: "" } },
    { type: "EventActions", props: { id: makeId() } },
    { type: "EventStats", props: { id: makeId() } },
    { type: "EventOverview", props: { id: makeId(), bodyOverride: data.description || "" } },
    { type: "EventDetails", props: { id: makeId() } },
    { type: "EventRegistrations", props: { id: makeId() } },
  ],
});
