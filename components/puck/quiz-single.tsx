"use client";

import { useState } from "react";
import { usePracticeMode } from "@/components/public/practice-mode";

type Option = { text?: string };

type Props = {
  question: string;
  options: Option[];
  correctIndex?: number;
  explanation?: string;
};

export function QuizSingleCard({ question, options, correctIndex = 0, explanation }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { enabled: practiceMode } = usePracticeMode();

  return (
    <section className="space-y-3 rounded-2xl border border-[color:var(--border)]/60 bg-[color:var(--surface-2)]/60 px-6 py-5">
      <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{question}</h3>
      <ol className="space-y-2 text-sm text-[color:var(--text-muted)]">
        {options.map((item, idx) => {
          const isSelected = selected === idx;
          const isCorrect = idx === correctIndex;
          const showResult = selected !== null && (!practiceMode || revealed);
          const showCorrect = showResult && isCorrect;
          const showWrong = showResult && isSelected && !isCorrect;
          const borderClass = showCorrect
            ? "border-[color:var(--success)]/60 bg-[color:var(--success)]/10"
            : showWrong
              ? "border-[color:var(--danger)]/60 bg-[color:var(--danger)]/10"
              : "border-[color:var(--border)] bg-[color:var(--surface-2)]";

          return (
            <li key={`${question}-${idx}`}>
              <button
                type="button"
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${borderClass}`}
                onClick={() => {
                  setSelected(idx);
                  if (!practiceMode) {
                    setRevealed(true);
                  }
                }}
                aria-pressed={isSelected}
              >
                <span className="mt-0.5 text-xs font-semibold text-[color:var(--text-muted)]">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{item.text}</span>
                {showCorrect ? (
                  <span className="ml-auto rounded-full bg-[color:var(--success)]/15 px-2 py-0.5 text-[10px] text-[color:var(--success)]">
                    Correct
                  </span>
                ) : null}
                {showWrong ? (
                  <span className="ml-auto rounded-full bg-[color:var(--danger)]/15 px-2 py-0.5 text-[10px] text-[color:var(--danger)]">
                    Wrong
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      {practiceMode && selected !== null && !revealed ? (
        <button
          type="button"
          className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
          onClick={() => setRevealed(true)}
        >
          Reveal answer
        </button>
      ) : null}
      {(selected !== null && revealed && explanation) || (!practiceMode && selected !== null && explanation) ? (
        <p className="text-xs text-[color:var(--text-muted)]">{explanation}</p>
      ) : null}
    </section>
  );
}
