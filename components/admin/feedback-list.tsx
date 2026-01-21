"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteAllFeedback, deleteFeedback } from "@/app/[locale]/(dashboard)/admin/feedback/actions";

type Entry = {
  id: string;
  title: string | null;
  name: string;
  email: string | null;
  vid: string | null;
  message: string;
  createdAt: string;
};

type Props = {
  locale: string;
  entries: Entry[];
};

export function FeedbackList({ entries }: Props) {
  const confirmAll = (event: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm("Delete all feedback submissions?")) {
      event.preventDefault();
    }
  };
  const confirmOne = (event: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm("Delete this feedback submission?")) {
      event.preventDefault();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Feedback</h1>
          <p className="text-xs text-[color:var(--text-muted)]">{entries.length} submissions</p>
        </div>
        {entries.length ? (
          <form action={deleteAllFeedback} onSubmit={confirmAll}>
            <Button type="submit" variant="ghost" size="sm">
              Delete all
            </Button>
          </form>
        ) : null}
      </div>
      <div className="space-y-3">
        {entries.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-[color:var(--text-muted)]">No feedback submitted yet.</p>
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {entry.title || "Feedback"}
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {entry.name} {entry.vid ? `• ${entry.vid}` : ""} {entry.email ? `• ${entry.email}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[color:var(--text-muted)]">{entry.createdAt}</p>
                  <form action={deleteFeedback} onSubmit={confirmOne}>
                    <input type="hidden" name="id" value={entry.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
              <p className="text-sm text-[color:var(--text-primary)] whitespace-pre-wrap">{entry.message}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
