"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  callbackUrl?: string;
};

export function IvaoSignInButton({ label, callbackUrl }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() => startTransition(() => signIn("ivao", callbackUrl ? { callbackUrl } : undefined))}
    >
      {label}
    </Button>
  );
}
