"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  permissions: string | null;
};

type Action = (formData: FormData) => void | Promise<void>;

type Props = {
  departments: Department[];
  permissions: string[];
  createAction: Action;
  updateAction: Action;
  deleteAction: Action;
  seedAction: Action;
  reorderAction: Action;
};

const formatPermissions = (value: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === "string") as string[];
  } catch {
    // fall through
  }
  return [];
};

const sortDepartments = (items: Department[]) =>
  [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name);
  });

const moveItem = (list: string[], from: string, to: string) => {
  const next = [...list];
  const fromIndex = next.indexOf(from);
  const toIndex = next.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return next;
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, from);
  return next;
};

export function DepartmentManager({
  departments,
  permissions,
  createAction,
  updateAction,
  deleteAction,
  seedAction,
  reorderAction,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  const orderedDepartments = useMemo(() => sortDepartments(departments), [departments]);
  const initialIds = useMemo(() => orderedDepartments.map((dept) => dept.id), [orderedDepartments]);

  useEffect(() => {
    setOrderedIds(initialIds);
  }, [initialIds]);

  const isDirty = orderedIds.join("|") !== initialIds.join("|");
  const departmentMap = useMemo(() => new Map(departments.map((dept) => [dept.id, dept])), [departments]);
  const active = activeId ? departmentMap.get(activeId) ?? null : null;

  return (
    <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Departments</p>
            <p className="text-xs text-[color:var(--text-muted)]">Drag to reorder. Click edit to update details.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={seedAction}>
              <Button size="sm" variant="secondary" type="submit">
                Seed departments
              </Button>
            </form>
            {isDirty ? (
              <form action={reorderAction}>
                <input type="hidden" name="orderPayload" value={JSON.stringify(orderedIds)} />
                <Button size="sm" type="submit">
                  Save order
                </Button>
              </form>
            ) : null}
          </div>
        </div>

        {orderedIds.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No departments yet.</p>
        ) : (
          <div className="space-y-2">
            {orderedIds.map((id) => {
              const dept = departmentMap.get(id);
              if (!dept) return null;
              return (
                <div
                  key={dept.id}
                  draggable
                  onDragStart={() => setDraggingId(dept.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={() => {
                    if (draggingId && draggingId !== dept.id) {
                      setOrderedIds((prev) => moveItem(prev, draggingId, dept.id));
                    }
                    setDraggingId(null);
                  }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[color:var(--text-muted)]">||</span>
                    <span className="text-sm font-semibold text-[color:var(--text-primary)]">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" type="button" onClick={() => setActiveId(dept.id)}>
                      Edit
                    </Button>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={dept.id} />
                      <Button size="sm" variant="ghost" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Create department</p>
          <p className="text-xs text-[color:var(--text-muted)]">Add a new department with access permissions.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          New department
        </Button>
      </Card>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Create department</p>
                <p className="text-xs text-[color:var(--text-muted)]">Fill out details and assign permissions.</p>
              </div>
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowCreate(false)}>
                Close
              </Button>
            </div>
            <form
              action={createAction}
              onSubmit={() => setShowCreate(false)}
              className="mt-4 grid gap-3 md:grid-cols-2"
            >
              <input
                name="name"
                placeholder="Department name"
                required
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="slug"
                placeholder="slug (e.g. operations)"
                required
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="description"
                placeholder="Short description"
                className="md:col-span-2 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="order"
                type="number"
                defaultValue={orderedIds.length}
                className="w-full max-w-[160px] rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <div className="md:col-span-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Access permissions</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {permissions.map((perm) => (
                    <label
                      key={perm}
                      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1 text-[color:var(--text-muted)]"
                    >
                      <input type="checkbox" name="permissions" value={perm} className="h-3 w-3" />
                      <span>{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button size="sm" type="submit">
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Edit department</p>
                <p className="text-xs text-[color:var(--text-muted)]">{active.name}</p>
              </div>
              <Button size="sm" variant="ghost" type="button" onClick={() => setActiveId(null)}>
                Close
              </Button>
            </div>

            <form
              action={updateAction}
              onSubmit={() => setActiveId(null)}
              className="mt-4 grid gap-3 md:grid-cols-2"
            >
              <input type="hidden" name="id" value={active.id} />
              <label className="space-y-1 text-xs text-[color:var(--text-muted)]">
                Name
                <input
                  name="name"
                  defaultValue={active.name}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-xs text-[color:var(--text-muted)]">
                Slug
                <input
                  name="slug"
                  defaultValue={active.slug}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="md:col-span-2 space-y-1 text-xs text-[color:var(--text-muted)]">
                Description
                <input
                  name="description"
                  defaultValue={active.description ?? ""}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-xs text-[color:var(--text-muted)]">
                Order
                <input
                  name="order"
                  type="number"
                  defaultValue={active.order}
                  className="w-full max-w-[160px] rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <div className="md:col-span-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Permissions</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[color:var(--text-muted)]">
                  {permissions.map((perm) => (
                    <label key={perm} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-2 py-1">
                      <input
                        type="checkbox"
                        name="permissions"
                        value={perm}
                        defaultChecked={formatPermissions(active.permissions).includes(perm)}
                        className="h-3 w-3"
                      />
                      <span>{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <Button size="sm" variant="secondary" type="submit">
                  Save changes
                </Button>
              </div>
            </form>
            <form action={deleteAction} className="mt-3 flex justify-end">
              <input type="hidden" name="id" value={active.id} />
              <Button size="sm" variant="ghost" type="submit">
                Delete
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
