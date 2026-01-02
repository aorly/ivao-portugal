"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Department = { id: string; name: string };

type Action = (formData: FormData) => void | Promise<void>;

type Props = {
  departments: Department[];
  createAction: Action;
};

export function PositionCreateModal({ departments, createAction }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Create position</p>
        <p className="text-xs text-[color:var(--text-muted)]">Positions sit under departments and define allowances.</p>
      </div>
      <Button size="sm" onClick={() => setOpen(true)}>
        New position
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Create position</p>
                <p className="text-xs text-[color:var(--text-muted)]">Add a new role under a department.</p>
              </div>
              <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <form
              action={createAction}
              onSubmit={() => setOpen(false)}
              className="mt-4 grid gap-3 md:grid-cols-2"
            >
              <input
                name="name"
                placeholder="Position name"
                required
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="slug"
                placeholder="slug (e.g. events-lead)"
                required
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="description"
                placeholder="Short description"
                className="md:col-span-2 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <select
                name="departmentId"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <input
                name="allowances"
                placeholder="Allowances (comma separated)"
                className="md:col-span-2 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <div className="md:col-span-2 flex justify-end">
                <Button size="sm" type="submit">
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
