"use client";

import { PuckEditor } from "@/components/admin/puck-editor";
import { createPagePuckConfig } from "@/components/puck/page-config";

type CategoryOption = {
  id: string;
  label: string;
};

type Props = {
  name: string;
  formId: string;
  defaultValue: string;
  label: string;
  helperText: string;
  categoryOptions: CategoryOption[];
  rootDefaults: Record<string, string>;
  deleteFormId?: string;
  backHref?: string;
  showDelete?: boolean;
  showBack?: boolean;
};

export function PagePuckEditor({
  name,
  formId,
  defaultValue,
  label,
  helperText,
  categoryOptions,
  rootDefaults,
  deleteFormId,
  backHref,
  showDelete,
  showBack,
}: Props) {
  const puckConfig = createPagePuckConfig(categoryOptions, {
    formId,
    deleteFormId,
    backHref,
    showDelete,
    showBack,
  });

  return (
    <PuckEditor
      name={name}
      formId={formId}
      label={label}
      helperText={helperText}
      defaultValue={defaultValue}
      config={puckConfig}
      rootDefaults={rootDefaults}
      showRawJsonEditor
      rootFields={[
        { name: "slug" },
        { name: "title" },
        { name: "summary" },
        { name: "translationKey" },
        { name: "categoryId" },
        { name: "tags" },
        { name: "section" },
        { name: "order" },
        { name: "featured" },
      ]}
    />
  );
}
