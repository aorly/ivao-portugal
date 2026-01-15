"use client";

/* eslint-disable @next/next/no-img-element */
import type { Config } from "@measured/puck";
import { useState, type ComponentType, type JSX } from "react";
import { QuizSingleCard } from "@/components/puck/quiz-single";

const GLOSSARY: Array<{ term: string; definition: string }> = [
  { term: "NAT", definition: "North Atlantic Tracks, organized oceanic routes." },
  { term: "FIR", definition: "Flight Information Region, an ATC airspace area." },
  { term: "Mach", definition: "Speed ratio to the speed of sound (e.g., Mach 0.78)." },
];

const applyGlossary = (value: string) => {
  let next = value;
  GLOSSARY.forEach(({ term, definition }) => {
    const pattern = new RegExp(`\\b${term}\\b`, "g");
    next = next.replace(
      pattern,
      `<span class="glossary-term" title="${definition}">${term}</span>`,
    );
  });
  return next;
};

const renderInlineMarkdown = (value: string) => {
  let next = value;
  next = next.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  next = next.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  next = next.replace(/\*(?!\s)(.+?)(?<!\s)\*/g, "<em>$1</em>");
  next = next.replace(/_(?!\s)(.+?)(?<!\s)_/g, "<em>$1</em>");
  return applyGlossary(next);
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

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
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

const richTextClass =
  "text-[15px] leading-7 text-[color:var(--text-muted)] " +
  "[&_p]:mt-5 [&_p:first-child]:mt-0 " +
  "[&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[color:var(--text-primary)] " +
  "[&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[color:var(--text-primary)] " +
  "[&_h4]:mt-5 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-[color:var(--text-primary)] " +
  "[&_ul]:mt-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-3 " +
  "[&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-3 " +
  "[&_li]:leading-6 " +
  "[&_a]:text-[color:var(--info)] [&_a]:underline [&_a]:underline-offset-4 " +
  "[&_.glossary-term]:underline [&_.glossary-term]:decoration-dotted [&_.glossary-term]:underline-offset-4";

type PhaseCardBlockProps = {
  title?: string;
  subtitle?: string;
  body?: ComponentType | null;
  anchorId?: string;
  nextAnchor?: string;
  nextTitle?: string;
  collapsible?: string;
  defaultOpen?: string;
};

function PhaseCardBlock({
  title,
  subtitle,
  body,
  anchorId,
  nextAnchor,
  nextTitle,
  collapsible,
  defaultOpen,
}: PhaseCardBlockProps) {
  const Body = body;
  const isCollapsible = collapsible === "true";
  const [open, setOpen] = useState(defaultOpen !== "false");
  return (
    <section
      id={anchorId || undefined}
      data-phase-anchor={anchorId ? "true" : undefined}
      className="rounded-3xl border border-[color:var(--border)]/70 bg-[color:var(--surface-2)]/70 px-6 py-6 shadow-[var(--shadow-soft)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">{title}</h2>
          {subtitle ? <p className="text-sm text-[color:var(--text-muted)]">{subtitle}</p> : null}
        </div>
        {isCollapsible ? (
          <button
            type="button"
            className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? "Collapse" : "Expand"}
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="mt-6 space-y-10">
          <div className="max-w-2xl space-y-10">{Body ? <Body /> : null}</div>
          {nextAnchor ? (
            <div className="rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Next phase
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                  {nextTitle || "Continue"}
                </span>
                <a
                  href={`#${nextAnchor}`}
                  className="rounded-full bg-[color:var(--primary)] px-3 py-1 text-xs font-semibold text-white"
                >
                  Continue
                </a>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export const puckConfig: Config = {
  categories: {
    content: {
      title: "Content",
      components: [
        "Hero",
        "Banner",
        "PhaseHeader",
        "SectionIntro",
        "PhaseIntro",
        "PhaseOverview",
        "PhaseCard",
        "KeyTakeaway",
        "Text",
        "Spacer",
        "Markdown",
        "Checklist",
        "Summary",
        "CodeBlock",
        "QuizSingle",
        "Callout",
        "FAQ",
        "Stats",
        "Alerts",
        "Columns",
      ],
      defaultExpanded: true,
    },
    media: {
      title: "Media",
      components: ["Image", "Gallery", "Video", "Map"],
    },
    data: {
      title: "Data",
      components: ["StackedList", "Table", "CheckboxGroup"],
    },
  },
  components: {
    Hero: {
      fields: {
        title: { type: "text" },
        subtitle: { type: "textarea" },
        ctaLabel: { type: "text" },
        ctaHref: { type: "text" },
        imageUrl: { type: "text" },
      },
      defaultProps: {
        title: "Headline",
        subtitle: "Add a clear, short description for this page.",
        ctaLabel: "Learn more",
        ctaHref: "/",
        imageUrl: "",
      },
      render: ({ title, subtitle, ctaLabel, ctaHref, imageUrl }) => (
        <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-7 py-9 text-[color:var(--text-primary)]">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold">{title}</h1>
              <p className="text-sm text-[color:var(--text-muted)]">{subtitle}</p>
              {ctaLabel ? (
                <a
                  href={ctaHref || "#"}
                  className="inline-flex items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white"
                >
                  {ctaLabel}
                </a>
              ) : null}
            </div>
            {imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
                <img src={imageUrl} alt={title} className="h-40 w-full object-cover" />
              </div>
            ) : null}
          </div>
        </section>
      ),
    },
    Banner: {
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
        ctaLabel: { type: "text" },
        ctaHref: { type: "text" },
      },
      defaultProps: {
        tone: "info",
        title: "Banner title",
        body: "Add short supporting copy.",
        ctaLabel: "Learn more",
        ctaHref: "/",
      },
      render: ({ tone, title, body, ctaLabel, ctaHref }) => {
        const toneMap: Record<string, string> = {
          neutral: "border-[color:var(--border)] bg-[color:var(--surface-2)]",
          info: "border-blue-400/40 bg-blue-500/10",
          success: "border-emerald-400/40 bg-emerald-500/10",
          warning: "border-amber-400/40 bg-amber-500/10",
        };
        return (
          <section className={`rounded-2xl border px-5 py-4 ${toneMap[tone] ?? toneMap.info}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</p>
                <p className="text-sm text-[color:var(--text-muted)]">{body}</p>
              </div>
              {ctaLabel ? (
                <a
                  href={ctaHref || "#"}
                  className="inline-flex items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white"
                >
                  {ctaLabel}
                </a>
              ) : null}
            </div>
          </section>
        );
      },
    },
    Text: {
      fields: {
        title: { type: "text" },
        body: { type: "textarea" },
      },
      defaultProps: {
        title: "Section title",
        body: "Add your content here.",
      },
      render: ({ title, body }) => (
        <section className="space-y-4">
          {title ? <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">{title}</h2> : null}
          <div
            className={`${richTextClass} max-w-2xl`}
            dangerouslySetInnerHTML={{ __html: renderRichText(body || "") }}
          />
        </section>
      ),
    },
    SectionIntro: {
      fields: {
        title: { type: "text" },
        body: { type: "textarea" },
      },
      defaultProps: {
        title: "How to use this guide",
        body: "Introduce the section with a short overview.",
      },
      render: ({ title, body }) => (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)]">{title}</h2>
          <div
            className={`${richTextClass} max-w-2xl`}
            dangerouslySetInnerHTML={{ __html: renderRichText(body || "") }}
          />
        </section>
      ),
    },
    PhaseIntro: {
      fields: {
        title: { type: "text" },
        body: { type: "textarea" },
      },
      defaultProps: {
        title: "Phase focus",
        body: "Key objective for this phase.",
      },
      render: ({ title, body }) => (
        <section className="rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[color:var(--primary)]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {title}
              </p>
              <div
                className="mt-2 text-sm text-[color:var(--text-primary)]"
                dangerouslySetInnerHTML={{ __html: renderRichText(body || "") }}
              />
            </div>
          </div>
        </section>
      ),
    },
    PhaseHeader: {
      fields: {
        phase: { type: "text" },
        title: { type: "text" },
        subtitle: { type: "textarea" },
        showDivider: {
          type: "select",
          options: [
            { label: "Show divider", value: "true" },
            { label: "No divider", value: "false" },
          ],
        },
      },
      defaultProps: {
        phase: "Phase 1",
        title: "Before the flight",
        subtitle: "",
        showDivider: "true",
      },
      render: ({ phase, title, subtitle, showDivider }) => (
        <section
          className={`space-y-3 ${showDivider === "true" ? "border-t border-[color:var(--border)]/60 pt-8" : ""}`}
        >
          {phase ? (
            <span className="inline-flex items-center rounded-full border border-[color:var(--border)]/70 bg-[color:var(--surface-2)]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              {phase}
            </span>
          ) : null}
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)]">{title}</h2>
          {subtitle ? <p className="text-sm text-[color:var(--text-muted)]">{subtitle}</p> : null}
        </section>
      ),
    },
    PhaseCard: {
      fields: {
        phase: { type: "text" },
        title: { type: "text" },
        subtitle: { type: "textarea" },
        anchorId: { type: "text" },
        nextAnchor: { type: "text" },
        nextTitle: { type: "text" },
        collapsible: {
          type: "select",
          options: [
            { label: "Static", value: "false" },
            { label: "Collapsible", value: "true" },
          ],
        },
        defaultOpen: {
          type: "select",
          options: [
            { label: "Open", value: "true" },
            { label: "Closed", value: "false" },
          ],
        },
        body: { type: "slot" },
      },
      defaultProps: {
        phase: "Phase 1",
        title: "Before the flight",
        subtitle: "",
        anchorId: "",
        nextAnchor: "",
        nextTitle: "",
        collapsible: "false",
        defaultOpen: "true",
        body: [],
      },
      render: ({ title, subtitle, body, anchorId, nextAnchor, nextTitle, collapsible, defaultOpen }) => (
        <PhaseCardBlock
          title={title}
          subtitle={subtitle}
          body={body}
          anchorId={anchorId}
          nextAnchor={nextAnchor}
          nextTitle={nextTitle}
          collapsible={collapsible}
          defaultOpen={defaultOpen}
        />
      ),
    },
    PhaseOverview: {
      fields: {
        title: { type: "text" },
        subtitle: { type: "textarea" },
        readingTime: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            label: { type: "text" },
            title: { type: "text" },
            anchor: { type: "text" },
          },
          getItemSummary: (item: { label?: string; title?: string }) =>
            [item.label, item.title].filter(Boolean).join(" ") || "Phase",
        },
      },
      defaultProps: {
        title: "Phases overview",
        subtitle: "",
        readingTime: "",
        items: [],
      },
      render: ({ title, subtitle, readingTime, items }) => (
        <section className="rounded-3xl border border-[color:var(--border)]/70 bg-[color:var(--surface-2)]/70 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">{title}</h2>
              {subtitle ? <p className="text-sm text-[color:var(--text-muted)]">{subtitle}</p> : null}
            </div>
            {readingTime ? (
              <span className="rounded-full border border-[color:var(--border)]/70 bg-[color:var(--surface-2)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)]">
                {readingTime}
              </span>
            ) : null}
          </div>
          {items && items.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {items.map((item: { label?: string; title?: string; anchor?: string }, index: number) => (
                <a
                  key={`${item.label}-${index}-dot`}
                  href={item.anchor ? `#${item.anchor}` : "#"}
                  className="flex items-center gap-2 rounded-full border border-[color:var(--border)]/70 bg-[color:var(--surface)] px-3 py-1 text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" />
                  {item.label || `Phase ${index + 1}`}
                </a>
              ))}
            </div>
          ) : null}
          {items && items.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {items.map((item: { label?: string; title?: string; anchor?: string }, index: number) => (
                <a
                  key={`${item.label}-${index}`}
                  href={item.anchor ? `#${item.anchor}` : "#"}
                  className="rounded-xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] px-4 py-3 transition hover:border-[color:var(--primary)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    {item.label || `Phase ${index + 1}`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--text-primary)]">
                    {item.title}
                  </p>
                </a>
              ))}
            </div>
          ) : null}
        </section>
      ),
    },
    KeyTakeaway: {
      fields: {
        title: { type: "text" },
        body: { type: "textarea" },
        tone: {
          type: "select",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Info", value: "info" },
            { label: "Success", value: "success" },
          ],
        },
      },
      defaultProps: {
        title: "Key takeaway",
        body: "Summarize the most important action.",
        tone: "primary",
      },
      render: ({ title, body, tone }) => {
        const toneMap: Record<string, string> = {
          primary: "border-[color:var(--primary)]/40 bg-[color:var(--primary)]/10",
          info: "border-blue-400/40 bg-blue-500/10",
          success: "border-emerald-400/40 bg-emerald-500/10",
        };
        return (
          <section className={`rounded-2xl border px-5 py-4 ${toneMap[tone] ?? toneMap.primary}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              {title}
            </p>
            <div
              className="mt-2 text-sm text-[color:var(--text-primary)]"
              dangerouslySetInnerHTML={{ __html: renderRichText(body || "") }}
            />
          </section>
        );
      },
    },
    Spacer: {
      fields: {
        size: {
          type: "select",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
      },
      defaultProps: {
        size: "md",
      },
      render: ({ size }) => {
        const sizeMap: Record<string, string> = {
          sm: "h-6",
          md: "h-10",
          lg: "h-16",
          xl: "h-24",
        };
        return <div className={sizeMap[size] ?? sizeMap.md} aria-hidden="true" />;
      },
    },
    Markdown: {
      fields: {
        title: { type: "text" },
        body: { type: "textarea" },
      },
      defaultProps: {
        title: "Markdown",
        body: "## Heading\n\nWrite **bold** or _italic_, add lists:\n- Item 1\n- Item 2\n\n[Link](https://example.com)",
      },
      render: ({ title, body }) => (
        <section className="space-y-4">
          {title ? <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">{title}</h2> : null}
          <div
            className={`${richTextClass} max-w-2xl`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body || "") }}
          />
        </section>
      ),
    },
    Image: {
      fields: {
        src: { type: "text" },
        alt: { type: "text" },
        caption: { type: "text" },
      },
      defaultProps: {
        src: "",
        alt: "",
        caption: "",
      },
      render: ({ src, alt, caption }) => (
        <figure className="space-y-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {src ? <img src={src} alt={alt || "Image"} className="w-full rounded-lg object-cover" /> : null}
          {caption ? <figcaption className="text-xs text-[color:var(--text-muted)]">{caption}</figcaption> : null}
        </figure>
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
      render: ({ tone, title, body, variant }) => {
        const resolvedTone = tone ?? variant ?? "neutral";
        const toneMap: Record<string, string> = {
          neutral: "border-[color:var(--border)] bg-[color:var(--surface-2)]",
          info: "border-blue-400/40 bg-blue-500/10",
          success: "border-emerald-400/40 bg-emerald-500/10",
          warning: "border-amber-400/40 bg-amber-500/10",
        };
        const iconMap: Record<string, JSX.Element> = {
          info: (
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--info)]" aria-hidden="true">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <line x1="10" y1="8" x2="10" y2="14" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="6" r="1" fill="currentColor" />
            </svg>
          ),
          success: (
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--success)]" aria-hidden="true">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M6 10.5l2.3 2.3L14 7" stroke="currentColor" strokeWidth="1.7" fill="none" />
            </svg>
          ),
          warning: (
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--warning)]" aria-hidden="true">
              <path d="M10 2.5l8 14H2l8-14z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <line x1="10" y1="7" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="14.5" r="1" fill="currentColor" />
            </svg>
          ),
          neutral: (
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--text-muted)]" aria-hidden="true">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="10" cy="10" r="1.5" fill="currentColor" />
            </svg>
          ),
        };
        return (
          <section className={`rounded-2xl border px-5 py-4 ${toneMap[resolvedTone] ?? toneMap.neutral}`}>
            <div className="flex items-start gap-2">
              {iconMap[resolvedTone] ?? iconMap.neutral}
              <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3>
            </div>
            <div
              className="mt-2 text-sm text-[color:var(--text-muted)]"
              dangerouslySetInnerHTML={{ __html: renderRichText(body || "") }}
            />
          </section>
        );
      },
    },
    Checklist: {
      fields: {
        title: { type: "text" },
        hint: { type: "textarea" },
        items: {
          type: "array",
          arrayFields: {
            text: { type: "text" },
          },
          getItemSummary: (item: { text?: string }) => item.text ?? "Checklist item",
        },
      },
      defaultProps: {
        title: "Checklist",
        hint: "",
        items: [{ text: "Item 1" }, { text: "Item 2" }],
      },
      render: ({ title, hint, items }) => {
        const normalizedItems = (items ?? []).map((item: { text?: string } | string) =>
          typeof item === "string" ? { text: item } : item,
        ) as Array<{ text?: string }>;
        return (
        <section className="space-y-3 rounded-2xl bg-[color:var(--surface)]/30 px-4 py-4">
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[color:var(--primary)]" />
              <h3 className="text-base font-semibold text-[color:var(--text-primary)]">{title}</h3>
            </div>
            {hint ? <p className="text-xs text-[color:var(--text-muted)]">{hint}</p> : null}
          </div>
          <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
            {normalizedItems.map((item: { text?: string }, idx: number) => (
              <li key={`${title}-${idx}`} className="flex items-start gap-2">
                <span className="mt-1 h-2.5 w-2.5 rounded-full border border-[color:var(--border)]" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      );
      },
    },
    Summary: {
      fields: {
        title: { type: "text" },
        bullets: {
          type: "array",
          arrayFields: {
            text: { type: "text" },
          },
          getItemSummary: (item: { text?: string }) => item.text ?? "Bullet",
        },
      },
      defaultProps: {
        title: "Summary",
        bullets: [{ text: "Key point 1" }, { text: "Key point 2" }],
      },
      render: ({ title, bullets }) => {
        const normalizedBullets = (bullets ?? []).map((item: { text?: string } | string) =>
          typeof item === "string" ? { text: item } : item,
        ) as Array<{ text?: string }>;
        return (
        <section className="space-y-2 rounded-2xl bg-[color:var(--surface)]/30 px-4 py-4">
          <div className="flex items-start gap-2">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[color:var(--primary)]" />
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3>
          </div>
          <ul className="space-y-1 text-sm text-[color:var(--text-muted)]">
            {normalizedBullets.map((item: { text?: string }, idx: number) => (
              <li key={`${title}-bullet-${idx}`} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      );
      },
    },
    CodeBlock: {
      fields: {
        title: { type: "text" },
        language: { type: "text" },
        code: { type: "textarea" },
      },
      defaultProps: {
        title: "Example",
        language: "text",
        code: "Line 1\nLine 2",
      },
      render: ({ title, language, code }) => (
        <section className="space-y-2 rounded-2xl bg-[color:var(--surface)]/30 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3>
            {language ? (
              <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-0.5 text-[11px] text-[color:var(--text-muted)]">
                {language}
              </span>
            ) : null}
          </div>
          <pre className="overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-xs text-[color:var(--text-primary)]">
            <code>{code}</code>
          </pre>
        </section>
      ),
    },
    QuizSingle: {
      fields: {
        question: { type: "text" },
        options: {
          type: "array",
          arrayFields: {
            text: { type: "text" },
          },
          getItemSummary: (item: { text?: string }) => item.text ?? "Option",
        },
        correctIndex: { type: "number" },
        explanation: { type: "textarea" },
      },
      defaultProps: {
        question: "Question",
        options: [{ text: "Option A" }, { text: "Option B" }],
        correctIndex: 0,
        explanation: "",
      },
      render: ({ question, options, correctIndex, explanation }) => {
        const normalizedOptions = (options ?? []).map((item: { text?: string } | string) =>
          typeof item === "string" ? { text: item } : item,
        ) as Array<{ text?: string }>;
        return (
        <QuizSingleCard
          question={question}
          options={normalizedOptions}
          correctIndex={correctIndex}
          explanation={explanation}
        />
      );
      },
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
              {stats.map((stat: { label?: string; value?: string; hint?: string }, index: number) => (
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
              items.map(
                (
                  item: {
                    title?: string;
                    body?: string;
                    tone?: string;
                    ctaLabel?: string;
                    ctaHref?: string;
                  },
                  index: number,
                ) => (
                <div
                  key={`${item.title}-${index}`}
                  className={`rounded-2xl border px-4 py-3 ${toneMap[item.tone ?? "info"] ?? toneMap.info}`}
                >
                  {item.title ? <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.title}</p> : null}
                  {item.body ? (
                    <div
                      className="mt-1 text-sm text-[color:var(--text-muted)]"
                      dangerouslySetInnerHTML={{ __html: renderRichText(item.body || "") }}
                    />
                  ) : null}
                </div>
              ),
              )
            )}
          </section>
        );
      },
    },
    Columns: {
      fields: {
        left: { type: "slot" },
        right: { type: "slot" },
      },
      render: ({ left, right }) => {
        const Left = left;
        const Right = right;
        return (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">{Left ? <Left /> : null}</div>
          <div className="space-y-4">{Right ? <Right /> : null}</div>
        </section>
        );
      },
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
              {items.map((item: { src?: string; alt?: string; caption?: string }, index: number) => (
                <figure
                  key={`${item.src}-${index}`}
                  className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]"
                >
                  {item.src ? (
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
              {items.map((item: { question?: string; answer?: string }, index: number) => (
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
    StackedList: {
      fields: {
        title: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            title: { type: "text" },
            subtitle: { type: "text" },
            meta: { type: "text" },
          },
          defaultItemProps: {
            title: "",
            subtitle: "",
            meta: "",
          },
          getItemSummary: (item) => item?.title || "List item",
        },
      },
      defaultProps: {
        title: "Stacked list",
        items: [],
      },
      render: ({ title, items }) => (
        <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {title ? <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3> : null}
          {items.length === 0 ? (
            <p className="text-xs text-[color:var(--text-muted)]">Add list rows.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {items.map((item: { title?: string; subtitle?: string; meta?: string }, index: number) => (
                <li key={`${item.title}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.title}</p>
                    {item.subtitle ? <p className="text-xs text-[color:var(--text-muted)]">{item.subtitle}</p> : null}
                  </div>
                  {item.meta ? <span className="text-xs text-[color:var(--text-muted)]">{item.meta}</span> : null}
                </li>
              ))}
            </ul>
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
                    {columns.map((col: { label?: string }, index: number) => (
                      <th key={`${col.label}-${index}`} className="px-3 py-2 font-semibold">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {rows.map((row: { cells?: string }, rowIndex: number) => {
                    const cells = (row.cells || "").split("|").map((cell: string) => cell.trim());
                    return (
                      <tr key={`row-${rowIndex}`} className="bg-[color:var(--surface)]">
                        {columns.map((_: { label?: string }, cellIndex: number) => (
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
    CheckboxGroup: {
      fields: {
        title: { type: "text" },
        items: {
          type: "array",
          arrayFields: {
            label: { type: "text" },
            checked: { type: "select", options: [{ label: "Unchecked", value: "false" }, { label: "Checked", value: "true" }] },
            helper: { type: "text" },
          },
          defaultItemProps: {
            label: "",
            checked: "false",
            helper: "",
          },
          getItemSummary: (item) => item?.label || "Checkbox",
        },
      },
      defaultProps: {
        title: "Checklist",
        items: [],
      },
      render: ({ title, items }) => (
        <section className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {title ? <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h3> : null}
          {items.length === 0 ? (
            <p className="text-xs text-[color:var(--text-muted)]">Add checklist items.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item: { label?: string; checked?: string; helper?: string }, index: number) => (
                <label key={`${item.label}-${index}`} className="flex items-start gap-3 text-sm text-[color:var(--text-primary)]">
                  <input type="checkbox" checked={item.checked === "true"} readOnly className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    {item.helper ? <p className="text-xs text-[color:var(--text-muted)]">{item.helper}</p> : null}
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>
      ),
    },
  },
};
