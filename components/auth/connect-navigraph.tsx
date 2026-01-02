"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  disabled?: boolean;
};

export function ConnectNavigraphButton({ label, disabled }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      disabled={disabled || pending}
      onClick={() => startTransition(() => router.push("/api/navigraph/login"))}
    >
      {label}
    </Button>
  );
}
