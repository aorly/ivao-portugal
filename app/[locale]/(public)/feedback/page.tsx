import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { FeedbackForm } from "@/components/public/feedback-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buttonClassNames } from "@/components/ui/button";
import Link from "next/link";

type Props = { params: Promise<{ locale: string }> };

export default async function FeedbackPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "feedback" });
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } })
    : null;

  return (
    <main className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-4xl">
        <SectionHeader title={t("title")} description={t("description")} />
        <Card className="mt-6 p-6">
          {session?.user ? (
            <FeedbackForm
              initialName={session.user.name ?? ""}
              initialEmail={user?.email ?? ""}
              initialVid={session.user.vid ?? ""}
              labels={{
                name: t("name"),
                email: t("email"),
                vid: t("vid"),
                title: t("titleLabel"),
                message: t("message"),
                submit: t("submit"),
                note: t("note"),
              }}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[color:var(--text-muted)]">{t("loginRequired")}</p>
              <Link href={`/${locale}/login`} className={buttonClassNames()}>
                {t("loginCta")}
              </Link>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
