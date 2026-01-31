"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Props = {
  locale: string;
  initialVisible: boolean;
};

const COOKIE_NAME = "cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export function CookieBanner({ locale, initialVisible }: Props) {
  const t = useTranslations("cookie");
  const searchParams = useSearchParams();
  const [accepted, setAccepted] = useState(false);
  const forced = useMemo(() => searchParams?.get("showCookie") === "1", [searchParams]);
  const visible = forced || (!accepted && initialVisible);

  const accept = () => {
    document.cookie = `${COOKIE_NAME}=accepted; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
    setAccepted(true);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
        <div className="space-y-1 text-sm text-[color:var(--text-muted)]">
          <p className="font-semibold text-[color:var(--text-primary)]">{t("title")}</p>
          <p>{t("body")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/cookie-policy`}
            className="text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
          >
            {t("learnMore")}
          </Link>
          <Button size="sm" onClick={accept}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
