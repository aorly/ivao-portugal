"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  locale: string;
};

export function EventsRangeSync({ locale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString());
    if (params.has("range")) return;
    params.set("range", "future");
    const query = params.toString();
    const target = pathname || `/${locale}/events`;
    router.replace(`${target}${query ? `?${query}` : ""}`, { scroll: false });
  }, [locale, pathname, router, searchParams]);

  return null;
}
