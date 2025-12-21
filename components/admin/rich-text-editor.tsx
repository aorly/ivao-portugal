'use client';

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  defaultValue?: string;
  label?: string;
  helperText?: string;
};

type Command = { label: string; command: string; value?: string };

const commands: Command[] = [
  { label: "H2", command: "formatBlock", value: "h2" },
  { label: "H3", command: "formatBlock", value: "h3" },
  { label: "Bold", command: "bold" },
  { label: "Italic", command: "italic" },
  { label: "Underline", command: "underline" },
  { label: "List", command: "insertUnorderedList" },
  { label: "Numbered", command: "insertOrderedList" },
  { label: "Link", command: "createLink", value: "https://" },
  { label: "Image", command: "insertImage", value: "https://" },
  { label: "Clear", command: "removeFormat" },
];

export function RichTextEditor({ name, defaultValue = "", label, helperText }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = useState(defaultValue);

  useEffect(() => {
    setHtml(defaultValue);
    if (editorRef.current) {
      editorRef.current.innerHTML = defaultValue || "<p></p>";
    }
  }, [defaultValue]);

  const apply = (cmd: Command) => {
    if (typeof document === "undefined") return;
    if (cmd.command === "createLink" || cmd.command === "insertImage") {
      const url = prompt("Enter URL", cmd.value ?? "https://");
      if (!url) return;
      document.execCommand(cmd.command, false, url);
    } else if (cmd.value) {
      document.execCommand(cmd.command, false, cmd.value);
    } else {
      document.execCommand(cmd.command);
    }
    sync();
  };

  const sync = () => {
    const next = editorRef.current?.innerHTML ?? "";
    setHtml(next);
  };

  return (
    <div className="space-y-1 text-sm">
      {label ? <span className="text-[color:var(--text-muted)]">{label}</span> : null}
      <div className="flex flex-wrap gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
        {commands.map((cmd) => (
          <Button
            key={cmd.label}
            type="button"
            size="sm"
            variant="secondary"
            className="px-2 py-1 text-xs"
            onClick={() => apply(cmd)}
          >
            {cmd.label}
          </Button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        className={cn(
          "min-h-[200px] w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-3 text-sm leading-relaxed text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]",
          "focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-offset-2 focus:ring-offset-[color:var(--surface-2)]",
        )}
        dangerouslySetInnerHTML={{ __html: html || "<p></p>" }}
      />
      {helperText ? <p className="text-xs text-[color:var(--text-muted)]">{helperText}</p> : null}
      <textarea name={name} value={html} readOnly hidden />
    </div>
  );
}
