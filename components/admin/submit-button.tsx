"use client";

import { useFormStatus } from "react-dom";
import type React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children?: React.ReactNode;
  pendingLabel?: string;
  label?: string;
  size?: "sm" | "md";
};

export function SubmitButton({ children, pendingLabel = "Saving...", label = "Save", size = "sm" }: Props) {
  const { pending } = useFormStatus();

  return (
    <Button size={size} type="submit" disabled={pending}>
      {pending ? pendingLabel : children ?? label}
    </Button>
  );
}
