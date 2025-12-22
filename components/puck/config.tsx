import type { Config } from "@measured/puck";

const renderRichText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "<p></p>";
  if (trimmed.startsWith("<")) return trimmed;
  const paragraphs = trimmed.split(/\n{2,}/).map((block) => block.trim());
  return paragraphs
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");
};

export const puckConfig: Config = {
  categories: {
    content: {
      title: "Content",
      components: ["Hero", "Banner", "Text", "Callout", "FAQ", "Stats", "Alerts", "Columns"],
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
        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-6 py-8 text-[color:var(--text-primary)]">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold">{title}</h1>
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
        <section className="space-y-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
          {title ? <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">{title}</h2> : null}
          <div
            className="text-sm leading-relaxed text-[color:var(--text-muted)]"
            dangerouslySetInnerHTML={{ __html: renderRichText(body || "") }}
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
    Columns: {
      fields: {
        left: { type: "slot" },
        right: { type: "slot" },
      },
      render: ({ left, right }) => (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">{left}</div>
          <div className="space-y-4">{right}</div>
        </section>
      ),
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
              {items.map((item, index) => (
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
              {items.map((item, index) => (
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
