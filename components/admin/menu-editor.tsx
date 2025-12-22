"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type MenuItemNode } from "@/lib/menu";

type MenuEditorItem = {
  id: string;
  label: string;
  labelPt?: string | null;
  description?: string | null;
  descriptionPt?: string | null;
  href?: string | null;
  icon?: string | null;
  layout?: string | null;
  enabled: boolean;
  permission?: string | null;
  children: MenuEditorItem[];
};

type Props = {
  locale: string;
  menuKey: "public" | "admin";
  initialItems: MenuItemNode[];
  onSave: (formData: FormData) => void;
};

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `item-${Math.random().toString(36).slice(2, 10)}`;
};

const toEditorItems = (items: MenuItemNode[]): MenuEditorItem[] =>
  items.map((item) => ({
    id: item.id ?? makeId(),
    label: item.label,
    labelPt: item.labelPt ?? null,
    description: item.description ?? null,
    descriptionPt: item.descriptionPt ?? null,
    href: item.href ?? null,
    icon: item.icon ?? null,
    layout: item.layout ?? null,
    enabled: item.enabled !== false,
    permission: item.permission ?? null,
    children: toEditorItems(item.children ?? []),
  }));

const cloneTree = (items: MenuEditorItem[]) => JSON.parse(JSON.stringify(items)) as MenuEditorItem[];

const findItemWithPath = (
  items: MenuEditorItem[],
  id: string,
  path: MenuEditorItem[] = [],
): { item: MenuEditorItem; parentList: MenuEditorItem[]; index: number; path: MenuEditorItem[] } | null => {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.id === id) {
      return { item, parentList: items, index: i, path };
    }
    const childResult = findItemWithPath(item.children, id, [...path, item]);
    if (childResult) return childResult;
  }
  return null;
};

const isDescendant = (item: MenuEditorItem, targetId: string): boolean => {
  if (item.id === targetId) return true;
  return item.children.some((child) => isDescendant(child, targetId));
};

const moveItemBefore = (items: MenuEditorItem[], draggedId: string, targetId: string) => {
  const next = cloneTree(items);
  const dragged = findItemWithPath(next, draggedId);
  const target = findItemWithPath(next, targetId);
  if (!dragged || !target) return items;
  if (isDescendant(dragged.item, targetId)) return items;

  dragged.parentList.splice(dragged.index, 1);
  const insertIndex = target.parentList.findIndex((item) => item.id === targetId);
  target.parentList.splice(insertIndex, 0, dragged.item);
  return next;
};

const moveItemToEnd = (items: MenuEditorItem[], draggedId: string, parentId: string | null) => {
  const next = cloneTree(items);
  const dragged = findItemWithPath(next, draggedId);
  if (!dragged) return items;
  if (parentId && isDescendant(dragged.item, parentId)) return items;

  dragged.parentList.splice(dragged.index, 1);

  if (!parentId) {
    next.push(dragged.item);
    return next;
  }

  const parent = findItemWithPath(next, parentId);
  if (!parent) return items;
  parent.item.children.push(dragged.item);
  return next;
};

const indentItem = (items: MenuEditorItem[], id: string) => {
  const next = cloneTree(items);
  const found = findItemWithPath(next, id);
  if (!found || found.index === 0) return items;
  const prevSibling = found.parentList[found.index - 1];
  found.parentList.splice(found.index, 1);
  prevSibling.children.push(found.item);
  return next;
};

const outdentItem = (items: MenuEditorItem[], id: string) => {
  const next = cloneTree(items);
  const found = findItemWithPath(next, id);
  if (!found || found.path.length === 0) return items;
  const parentItem = found.path[found.path.length - 1];
  const grandParent = found.path.length > 1 ? found.path[found.path.length - 2] : null;
  const grandParentList = grandParent ? grandParent.children : next;
  const parentIndex = grandParentList.findIndex((item) => item.id === parentItem.id);

  found.parentList.splice(found.index, 1);
  grandParentList.splice(parentIndex + 1, 0, found.item);
  return next;
};

const updateItemField = (
  items: MenuEditorItem[],
  id: string,
  field: keyof MenuEditorItem,
  value: string | boolean | null,
) => {
  const next = cloneTree(items);
  const found = findItemWithPath(next, id);
  if (!found) return items;
  (found.item as any)[field] = value;
  return next;
};

const removeItem = (items: MenuEditorItem[], id: string) => {
  const next = cloneTree(items);
  const found = findItemWithPath(next, id);
  if (!found) return items;
  found.parentList.splice(found.index, 1);
  return next;
};

const addItem = (items: MenuEditorItem[], parentId: string | null) => {
  const next = cloneTree(items);
  const newItem: MenuEditorItem = {
    id: makeId(),
    label: "New item",
    labelPt: "",
    description: "",
    descriptionPt: "",
    href: "",
    icon: "",
    layout: null,
    enabled: true,
    permission: "",
    children: [],
  };
  if (!parentId) {
    next.push(newItem);
    return next;
  }
  const parent = findItemWithPath(next, parentId);
  if (!parent) return items;
  parent.item.children.push(newItem);
  return next;
};

const toPayload = (items: MenuEditorItem[]): MenuItemNode[] =>
  items.map((item, index) => ({
    label: item.label,
    labelPt: item.labelPt ?? null,
    description: item.description ?? null,
    descriptionPt: item.descriptionPt ?? null,
    href: item.href ?? null,
    icon: item.icon ?? null,
    layout: item.layout ?? null,
    enabled: item.enabled,
    permission: item.permission ?? null,
    order: index,
    children: toPayload(item.children),
  }));

const normalizeQuery = (value: string) => value.toLowerCase();

const matchesItem = (item: MenuEditorItem, needle: string) => {
  const haystack = [
    item.label,
    item.labelPt ?? "",
    item.description ?? "",
    item.descriptionPt ?? "",
    item.href ?? "",
    item.permission ?? "",
    item.icon ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
};

const filterTree = (list: MenuEditorItem[], needle: string): MenuEditorItem[] => {
  if (!needle) return list;
  return list
    .map((item) => {
      const nextChildren = filterTree(item.children, needle);
      if (matchesItem(item, needle) || nextChildren.length > 0) {
        return { ...item, children: nextChildren };
      }
      return null;
    })
    .filter(Boolean) as MenuEditorItem[];
};

const IconDots = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <circle cx="9" cy="6" r="1.5" fill="currentColor" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" />
    <circle cx="9" cy="18" r="1.5" fill="currentColor" />
    <circle cx="15" cy="6" r="1.5" fill="currentColor" />
    <circle cx="15" cy="12" r="1.5" fill="currentColor" />
    <circle cx="15" cy="18" r="1.5" fill="currentColor" />
  </svg>
);

const IconCaret = ({ expanded }: { expanded: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className={["h-3 w-3 transition-transform", expanded ? "rotate-90" : ""].join(" ")}
    aria-hidden="true"
  >
    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconFile = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path
      d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconGrid = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path
      d="M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path
      d="M4 7h16M9 7v11m6-11v11M8 7l1-2h6l1 2M6 7l1 13h10l1-13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconIndent = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path d="M4 6h16M4 12h8M4 18h16" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M14 12h6m0 0-2-2m2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconOutdent = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path d="M4 6h16M12 12h8M4 18h16" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 12H4m0 0 2-2m-2 2 2 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const NAV_ICONS: Record<string, JSX.Element> = {
  calendar: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M8 3v3M16 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M9 5 3 7v12l6-2 6 2 6-2V5l-6 2-6-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 5v12M15 7v12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 6v6l4 2M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.5 12h17M12 3a12 12 0 0 1 0 18M12 3a12 12 0 0 0 0 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  ),
  training: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 10.5v5l4 2 4-2v-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M8 13a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 20a5 5 0 0 1 10 0M16 11a3 3 0 1 0-3-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M4 19h16M7 16V9m5 7V6m5 10v-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="m12 3 1.2 2.4 2.6.6-.8 2.4 1.8 2-1.8 2 .8 2.4-2.6.6L12 21l-1.2-2.4-2.6-.6.8-2.4-1.8-2 1.8-2-.8-2.4 2.6-.6L12 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  radio: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M4 10h16v8H4zM8 10l8-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="14" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="m12 4 8 4-8 4-8-4 8-4Zm0 8 8 4-8 4-8-4 8-4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  ),
  levels: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M4 7h10M4 12h16M4 17h12" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  "map-pin": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 21s6-6.3 6-11a6 6 0 1 0-12 0c0 4.7 6 11 6 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  certificate: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M6 4h12v10H6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 18l3-2 3 2v2l-3-1.5L9 20z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M4 11 12 4l8 7v9H4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  dot: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  ),
};

export function MenuEditor({ locale, menuKey, initialItems, onSave }: Props) {
  const [items, setItems] = useState<MenuEditorItem[]>(() => toEditorItems(initialItems));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [iconQuery, setIconQuery] = useState("");
  const payloadRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = () => {
    const payload = JSON.stringify(toPayload(items));
    if (payloadRef.current) {
      payloadRef.current.value = payload;
    }
  };

  const setAllCollapsed = (value: boolean) => {
    const next: Record<string, boolean> = {};
    const walk = (list: MenuEditorItem[]) => {
      list.forEach((item) => {
        next[item.id] = value;
        walk(item.children);
      });
    };
    walk(items);
    setCollapsed(next);
  };

  useEffect(() => {
    setAllCollapsed(true);
    setActiveId(null);
  }, [menuKey]);

  const isFiltering = query.trim().length > 0;
  const visibleItems = filterTree(items, normalizeQuery(query));
  const activeItem = activeId ? findItemWithPath(items, activeId)?.item ?? null : null;
  const iconEntries = Object.entries(NAV_ICONS).filter(([name]) =>
    name.toLowerCase().includes(iconQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    if (activeId || items.length === 0) return;
    setActiveId(items[0].id);
  }, [activeId, items]);

  const renderTree = (list: MenuEditorItem[], parentId: string | null) => (
    <div
      className="space-y-1"
      onDragOver={(event) => {
        if (isFiltering) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (isFiltering) return;
        event.preventDefault();
        const draggedId = event.dataTransfer.getData("text/plain");
        if (!draggedId) return;
        setItems((prev) => moveItemToEnd(prev, draggedId, parentId));
      }}
    >
      {list.map((item) => {
        const isExpanded = !(collapsed[item.id] ?? false);
        const isActive = activeId === item.id;
        const hasChildren = item.children.length > 0;
        return (
          <div
            key={item.id}
            onDragOver={(event) => {
              if (isFiltering) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              if (isFiltering) return;
              event.preventDefault();
              const draggedId = event.dataTransfer.getData("text/plain");
              if (!draggedId || draggedId === item.id) return;
              setItems((prev) => moveItemBefore(prev, draggedId, item.id));
            }}
          >
            <div
              className={[
                "group flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition",
                isActive
                  ? "bg-[color:var(--surface-3)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)]",
              ].join(" ")}
              onClick={() => {
                setActiveId(item.id);
                if (hasChildren) {
                  setCollapsed((prev) => ({ ...prev, [item.id]: false }));
                }
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  draggable
                  disabled={isFiltering}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", item.id);
                  }}
                  className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-[color:var(--text-muted)] opacity-0 transition group-hover:opacity-100"
                  title="Drag to reorder"
                >
                  <IconDots />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!hasChildren) return;
                    setCollapsed((prev) => ({ ...prev, [item.id]: !isExpanded }));
                  }}
                  className="text-[color:var(--text-muted)]"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {hasChildren ? <IconCaret expanded={isExpanded} /> : <span className="w-3"></span>}
                </button>
                <span className="shrink-0 text-[color:var(--text-muted)]">
                  {hasChildren ? <IconGrid /> : <IconFile />}
                </span>
                <span className="truncate font-semibold">{item.label || "Untitled"}</span>
                {item.children.length > 0 ? (
                  <span className="rounded-full bg-[color:var(--surface)] px-2 py-0.5 text-[10px] text-[color:var(--text-muted)]">
                    {item.children.length}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-1"
                  title="Indent"
                  onClick={(event) => {
                    event.stopPropagation();
                    setItems((prev) => indentItem(prev, item.id));
                  }}
                >
                  <IconIndent />
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-1"
                  title="Outdent"
                  onClick={(event) => {
                    event.stopPropagation();
                    setItems((prev) => outdentItem(prev, item.id));
                  }}
                >
                  <IconOutdent />
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-1"
                  title="Add child"
                  onClick={(event) => {
                    event.stopPropagation();
                    setItems((prev) => addItem(prev, item.id));
                  }}
                >
                  <IconPlus />
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-[color:var(--danger)]"
                  title="Remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    setItems((prev) => removeItem(prev, item.id));
                  }}
                >
                  <IconTrash />
                </button>
              </div>
            </div>
            {hasChildren && isExpanded ? (
              <div className="ml-3 border-l border-[color:var(--border)] pl-3">{renderTree(item.children, item.id)}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Site map</p>
            <Button size="sm" type="button" variant="secondary" onClick={() => setItems((prev) => addItem(prev, null))}>
              Add item
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs">
            <span className="text-[color:var(--text-muted)]">Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter items"
              className="w-full bg-transparent text-xs text-[color:var(--text-primary)] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Button size="sm" variant="secondary" type="button" onClick={() => setAllCollapsed(true)}>
              Collapse all
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => setAllCollapsed(false)}>
              Expand all
            </Button>
          </div>
          {isFiltering ? (
            <p className="text-[11px] text-[color:var(--text-muted)]">
              Filtering is active. Drag and drop is disabled while searching.
            </p>
          ) : null}
          {visibleItems.length === 0 ? (
            <p className="text-xs text-[color:var(--text-muted)]">No items match the filter.</p>
          ) : (
            renderTree(visibleItems, null)
          )}
        </aside>

        <aside className="space-y-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Item settings</p>
            <p className="text-[11px] text-[color:var(--text-muted)]">
              {activeItem ? `Editing: ${activeItem.label || "Untitled"}` : "Select a menu item to edit."}
            </p>
          </div>
          {!activeItem ? (
            <p className="text-xs text-[color:var(--text-muted)]">
              Choose an item from the site map to edit labels, links, and permissions.
            </p>
          ) : (
            <div className="space-y-3">
              <label className="space-y-1 text-xs">
                <span className="text-[color:var(--text-muted)]">Label</span>
                <input
                  value={activeItem.label}
                  onChange={(event) => setItems((prev) => updateItemField(prev, activeItem.id, "label", event.target.value))}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-[color:var(--text-muted)]">Label (PT)</span>
                <input
                  value={activeItem.labelPt ?? ""}
                  onChange={(event) => setItems((prev) => updateItemField(prev, activeItem.id, "labelPt", event.target.value))}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-[color:var(--text-muted)]">Href</span>
                <input
                  value={activeItem.href ?? ""}
                  onChange={(event) => setItems((prev) => updateItemField(prev, activeItem.id, "href", event.target.value))}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-[color:var(--text-muted)]">Permission</span>
                <input
                  value={activeItem.permission ?? ""}
                  onChange={(event) =>
                    setItems((prev) => updateItemField(prev, activeItem.id, "permission", event.target.value))
                  }
                  placeholder={menuKey === "public" ? "staff-only" : "admin:events"}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-[color:var(--text-muted)]">Description</span>
                <input
                  value={activeItem.description ?? ""}
                  onChange={(event) =>
                    setItems((prev) => updateItemField(prev, activeItem.id, "description", event.target.value))
                  }
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-[color:var(--text-muted)]">Description (PT)</span>
                <input
                  value={activeItem.descriptionPt ?? ""}
                  onChange={(event) =>
                    setItems((prev) => updateItemField(prev, activeItem.id, "descriptionPt", event.target.value))
                  }
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-[color:var(--text-muted)]">Icon</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]">
                      {NAV_ICONS[activeItem.icon ?? ""] ?? NAV_ICONS.dot}
                    </div>
                    <input
                      value={iconQuery}
                      onChange={(event) => setIconQuery(event.target.value)}
                      placeholder="Search icons"
                      className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="grid max-h-40 grid-cols-4 gap-2 overflow-auto">
                    {iconEntries.map(([name, icon]) => {
                      const isSelected = activeItem.icon === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setItems((prev) => updateItemField(prev, activeItem.id, "icon", name))}
                          className={[
                            "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[10px] text-[color:var(--text-muted)] transition",
                            isSelected
                              ? "border-[color:var(--primary)] text-[color:var(--text-primary)]"
                              : "border-[color:var(--border)] hover:border-[color:var(--text-primary)]",
                          ].join(" ")}
                        >
                          <span className="text-[color:var(--text-primary)]">{icon}</span>
                          <span className="truncate">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={activeItem.enabled}
                  onChange={(event) =>
                    setItems((prev) => updateItemField(prev, activeItem.id, "enabled", event.target.checked))
                  }
                />
                Enabled
              </label>
            </div>
          )}
        </aside>
      </div>

      <form
        action={onSave}
        onSubmit={handleSubmit}
        className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border)] bg-[color:var(--surface)] pt-3"
      >
        <input type="hidden" name="menuKey" value={menuKey} />
        <input type="hidden" name="locale" value={locale} />
        <input ref={payloadRef} type="hidden" name="payload" value="" />
        <p className="text-xs text-[color:var(--text-muted)]">Drag to reorder. Use indent/outdent to nest items.</p>
        <Button size="sm" type="submit">
          Save menu
        </Button>
      </form>
    </div>
  );
}
