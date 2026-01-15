"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SyncState = {
  success?: boolean;
  error?: string;
  createdDepartments?: number;
  createdPositions?: number;
  createdAssignments?: number;
  updatedAssignments?: number;
  deactivatedAssignments?: number;
  totalItems?: number;
  details?: string[];
};

type Props = {
  action: (prevState: SyncState, formData: FormData) => Promise<SyncState>;
};

function SyncStatus() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[color:var(--text-primary)]">Syncing staff from IVAO...</p>
      <p className="text-[11px] text-[color:var(--text-muted)]">Loading staff positions and assignments.</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--border)]">
        <div className="h-full w-1/2 animate-pulse bg-[color:var(--primary)]" />
      </div>
    </div>
  );
}

export function StaffIvaoSync({ action }: Props) {
  const [state, formAction] = useActionState(action, { success: false });

  return (
    <div className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Sync staff</p>
          <p className="text-xs text-[color:var(--text-muted)]">Imports division staff positions from IVAO.</p>
        </div>
        <form action={formAction}>
          <Button type="submit" size="sm" variant="secondary">
            Sync now
          </Button>
          <div className="mt-2">
            <SyncStatus />
          </div>
        </form>
      </div>
      {state.error ? <p className="text-xs text-[color:var(--danger)]">{state.error}</p> : null}
      {state.success ? (
        <div className="space-y-1 text-xs text-[color:var(--text-muted)]">
          <p>
            Items: <span className="font-semibold text-[color:var(--text-primary)]">{state.totalItems ?? 0}</span>
          </p>
          <p>
            Departments: <span className="font-semibold text-[color:var(--text-primary)]">{state.createdDepartments ?? 0}</span> · Positions:{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{state.createdPositions ?? 0}</span>
          </p>
          <p>
            Assignments created:{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{state.createdAssignments ?? 0}</span>{" "}
            / updated:{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{state.updatedAssignments ?? 0}</span>{" "}
            / deactivated:{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{state.deactivatedAssignments ?? 0}</span>
          </p>
          {state.details?.length ? (
            <ul className="list-disc pl-4">
              {state.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
