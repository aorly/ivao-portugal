"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { approveTestimonial, rejectTestimonial, deleteTestimonial } from "@/app/[locale]/(dashboard)/admin/testimonials/actions";

type Entry = {
  id: string;
  name: string;
  role: string | null;
  content: string;
  status: string;
  createdAt: string;
};

type Props = {
  entries: Entry[];
};

export function TestimonialsList({ entries }: Props) {
  const confirmDelete = (event: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm("Delete this testimonial?")) {
      event.preventDefault();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Testimonials</h1>
        <p className="text-xs text-[color:var(--text-muted)]">{entries.length} submissions</p>
      </div>
      <div className="space-y-3">
        {entries.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-[color:var(--text-muted)]">No testimonials submitted yet.</p>
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{entry.name}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {entry.role ? entry.role : "Member"} • {entry.createdAt}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    entry.status === "APPROVED"
                      ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                      : entry.status === "REJECTED"
                        ? "bg-[color:var(--danger)]/15 text-[color:var(--danger)]"
                        : "bg-[color:var(--warning)]/15 text-[color:var(--warning)]"
                  }`}
                >
                  {entry.status}
                </span>
              </div>
              <p className="text-sm text-[color:var(--text-primary)] whitespace-pre-wrap">{entry.content}</p>
              <div className="flex flex-wrap gap-2">
                {entry.status !== "APPROVED" ? (
                  <form action={approveTestimonial}>
                    <input type="hidden" name="id" value={entry.id} />
                    <Button size="sm">Approve</Button>
                  </form>
                ) : null}
                {entry.status !== "REJECTED" ? (
                  <form action={rejectTestimonial}>
                    <input type="hidden" name="id" value={entry.id} />
                    <Button size="sm" variant="secondary">
                      Reject
                    </Button>
                  </form>
                ) : null}
                <form action={deleteTestimonial} onSubmit={confirmDelete}>
                  <input type="hidden" name="id" value={entry.id} />
                  <Button size="sm" variant="ghost">
                    Delete
                  </Button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
