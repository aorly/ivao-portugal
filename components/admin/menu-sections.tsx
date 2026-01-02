"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MenuEditor } from "@/components/admin/menu-editor";
import { type MenuItemNode } from "@/lib/menu";

type MenuKey = "public" | "admin" | "footer";

type Props = {
  locale: string;
  publicMenu: MenuItemNode[];
  adminMenu: MenuItemNode[];
  footerMenu: MenuItemNode[];
  onSave: (formData: FormData) => void;
};

export function MenuSections({ locale, publicMenu, adminMenu, footerMenu, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<MenuKey>("public");
  const tabs = useMemo(
    () => [
      { key: "public" as const, label: "Public" },
      { key: "admin" as const, label: "Admin" },
      { key: "footer" as const, label: "Footer" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeTab === tab.key ? "secondary" : "ghost"}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "public" ? (
        <MenuEditor locale={locale} menuKey="public" initialItems={publicMenu} onSave={onSave} />
      ) : null}
      {activeTab === "admin" ? (
        <MenuEditor locale={locale} menuKey="admin" initialItems={adminMenu} onSave={onSave} />
      ) : null}
      {activeTab === "footer" ? (
        <MenuEditor locale={locale} menuKey="footer" initialItems={footerMenu} onSave={onSave} />
      ) : null}
    </div>
  );
}
