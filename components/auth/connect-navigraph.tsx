"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  disabled?: boolean;
};

export function ConnectNavigraphButton({ label, disabled }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={disabled || pending}
      onClick={() => startTransition(() => signIn("navigraph"))}
    >
      {label}
    </Button>
  );
}
