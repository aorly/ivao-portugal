"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  initialValue?: string | null;
  placeholder?: string;
};

export function InlineEditor({ name, initialValue, placeholder }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = useState(initialValue ?? "");
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = initialValue ?? "";
    }
  }, [initialValue]);

  const handleInput = () => {
    if (!ref.current) return;
    setHtml(ref.current.innerHTML);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedRange && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  };

  const exec = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    handleInput();
  };

  const insertLink = () => {
    restoreSelection();
    const url = window.prompt("Enter URL");
    if (url) {
      document.execCommand("createLink", false, url);
      handleInput();
    }
  };

  const applyHeading = (level: 2 | 3 | 4) => exec("formatBlock", `h${level}`);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" onMouseDown={saveSelection} onClick={() => applyHeading(2)} className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)] hover:border-[color:var(--primary)]">
          H2
        </button>
        <button type="button" onMouseDown={saveSelection} onClick={() => applyHeading(3)} className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)] hover:border-[color:var(--primary)]">
          H3
        </button>
        <button type="button" onMouseDown={saveSelection} onClick={() => exec("formatBlock", "p")} className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)] hover:border-[color:var(--primary)]">
          Paragraph
        </button>
        <button type="button" onMouseDown={saveSelection} onClick={() => exec("bold")} className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)] hover:border-[color:var(--primary)]">
          Bold
        </button>
        <button type="button" onMouseDown={saveSelection} onClick={() => exec("italic")} className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)] hover:border-[color:var(--primary)]">
          Italic
        </button>
        <button type="button" onMouseDown={saveSelection} onClick={() => exec("insertUnorderedList")} className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)] hover:border-[color:var(--primary)]">
          Bullets
        </button>
        <button type="button" onMouseDown={saveSelection} onClick={() => exec("insertOrderedList")} className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)] hover:border-[color:var(--primary)]">
          Numbered
        </button>
        <button type="button" onMouseDown={saveSelection} onClick={insertLink} className="rounded border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)] hover:border-[color:var(--primary)]">
          Link
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={handleInput}
        onClick={saveSelection}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        className="min-h-[160px] w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none"
        data-placeholder={placeholder ?? "Write event details..."}
        suppressContentEditableWarning
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
