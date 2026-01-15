"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  config: {
    faviconIcoUrl: string;
    favicon16Url: string;
    favicon32Url: string;
    favicon192Url: string;
    favicon512Url: string;
    appleTouchIconUrl: string;
    maskIconUrl: string;
    socialImageUrl: string;
  };
};

type Field = {
  key: string;
  label: string;
  urlName: keyof Props["config"];
  fileName: string;
  placeholder: string;
  accept: string;
  hint: string;
};

const FIELDS: Field[] = [
  {
    key: "favicon-ico",
    label: "Favicon (.ico)",
    urlName: "faviconIcoUrl",
    fileName: "faviconIcoFile",
    placeholder: "/icons/favicon.ico",
    accept: "image/x-icon,image/vnd.microsoft.icon",
    hint: "Multi-size icon (16/32/48 px).",
  },
  {
    key: "favicon-16",
    label: "Favicon 16x16",
    urlName: "favicon16Url",
    fileName: "favicon16File",
    placeholder: "/icons/favicon-16.png",
    accept: "image/png,image/webp",
    hint: "PNG/WebP, 16x16 px.",
  },
  {
    key: "favicon-32",
    label: "Favicon 32x32",
    urlName: "favicon32Url",
    fileName: "favicon32File",
    placeholder: "/icons/favicon-32.png",
    accept: "image/png,image/webp",
    hint: "PNG/WebP, 32x32 px.",
  },
  {
    key: "apple-touch",
    label: "Apple touch icon",
    urlName: "appleTouchIconUrl",
    fileName: "appleTouchIconFile",
    placeholder: "/icons/apple-touch.png",
    accept: "image/png,image/webp",
    hint: "PNG/WebP, 180x180 px.",
  },
  {
    key: "icon-192",
    label: "Android icon 192x192",
    urlName: "favicon192Url",
    fileName: "favicon192File",
    placeholder: "/icons/icon-192.png",
    accept: "image/png,image/webp",
    hint: "PNG/WebP, 192x192 px.",
  },
  {
    key: "icon-512",
    label: "Android icon 512x512",
    urlName: "favicon512Url",
    fileName: "favicon512File",
    placeholder: "/icons/icon-512.png",
    accept: "image/png,image/webp",
    hint: "PNG/WebP, 512x512 px.",
  },
  {
    key: "mask-icon",
    label: "Safari mask icon",
    urlName: "maskIconUrl",
    fileName: "maskIconFile",
    placeholder: "/icons/mask-icon.svg",
    accept: "image/svg+xml",
    hint: "SVG, monochrome mask.",
  },
  {
    key: "social-image",
    label: "Social preview image",
    urlName: "socialImageUrl",
    fileName: "socialImageFile",
    placeholder: "/social/og-image.png",
    accept: "image/png,image/jpeg,image/jpg,image/webp",
    hint: "Open Graph/Twitter, 1200x630 px.",
  },
];

function MetaIconsSectionInner({ config }: Props) {
  const [values, setValues] = useState<Props["config"]>(() => ({
    faviconIcoUrl: config.faviconIcoUrl ?? "",
    favicon16Url: config.favicon16Url ?? "",
    favicon32Url: config.favicon32Url ?? "",
    favicon192Url: config.favicon192Url ?? "",
    favicon512Url: config.favicon512Url ?? "",
    appleTouchIconUrl: config.appleTouchIconUrl ?? "",
    maskIconUrl: config.maskIconUrl ?? "",
    socialImageUrl: config.socialImageUrl ?? "",
  }));
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setPreview = (key: string, url: string | null) => {
    setPreviews((prev) => {
      const current = prev[key];
      if (current && current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      const next = { ...prev };
      if (url) {
        next[key] = url;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Meta icons & social</p>
        <p className="text-xs text-[color:var(--text-muted)]">
          Upload browser icons and social preview images. Files are stored under /public/icons and /public/social.
        </p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {FIELDS.map((field) => {
          const preview = previews[field.urlName] ?? values[field.urlName];
          return (
            <label key={field.key} className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">{field.label}</span>
              <div className="flex items-center gap-2">
                <input
                  name={field.urlName}
                  value={values[field.urlName] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.urlName]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-primary)]"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setValues((prev) => ({ ...prev, [field.urlName]: "" }));
                    setPreview(field.urlName, null);
                    const ref = fileRefs.current[field.fileName];
                    if (ref) ref.value = "";
                  }}
                >
                  Clear
                </Button>
              </div>
              <input
                ref={(el) => {
                  fileRefs.current[field.fileName] = el;
                }}
                name={field.fileName}
                type="file"
                accept={field.accept}
                className="w-full text-xs text-[color:var(--text-primary)]"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setPreview(field.urlName, null);
                    return;
                  }
                  const blobUrl = URL.createObjectURL(file);
                  setPreview(field.urlName, blobUrl);
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-[color:var(--text-muted)]">{field.hint}</p>
                {preview ? (
                  <div className="flex items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-1">
                    <img src={preview} alt="" className="h-10 w-10 object-contain" />
                  </div>
                ) : (
                  <p className="text-[11px] text-[color:var(--text-muted)]">No preview</p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function MetaIconsSection(props: Props) {
  const key = JSON.stringify(props.config);
  return <MetaIconsSectionInner key={key} {...props} />;
}
