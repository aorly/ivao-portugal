"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { registerForEvent, unregisterFromEvent } from "@/app/[locale]/(public)/events/actions";
import { type Locale } from "@/i18n";

type Props = {
  eventId: string;
  eventSlug: string;
  locale: Locale;
  isRegistered: boolean;
  labels: { register: string; unregister: string };
};

export function RegistrationButton({ eventId, eventSlug, locale, isRegistered, labels }: Props) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      if (isRegistered) {
        await unregisterFromEvent(eventId, eventSlug, locale);
      } else {
        await registerForEvent(eventId, eventSlug, locale);
      }
    });
  };

  return (
    <Button size="sm" variant={isRegistered ? "secondary" : "primary"} disabled={pending} onClick={onClick}>
      {isRegistered ? labels.unregister : labels.register}
    </Button>
  );
}
