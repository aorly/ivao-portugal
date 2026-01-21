import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ivaoClient } from "@/lib/ivaoClient";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff";
import { type Locale } from "@/i18n";
import { updateCreatorBannerAdminAction, clearCreatorBannerAdminAction } from "./actions";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const obj = value as { items?: unknown; data?: unknown; result?: unknown };
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.result)) return obj.result;
  }
  return [];
};

export default async function AdminCreatorsPage({ params }: Props) {
  const { locale } = await params;
  const allowed = await requireStaffPermission("admin:staff");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">You do not have access to this page.</p>
        </Card>
      </main>
    );
  }

  const creatorsRaw = await ivaoClient.getCreators("pt").catch(() => ({ items: [] }));
  const creators = asArray(creatorsRaw)
    .map((item) => {
      const creator = item as {
        userId?: number | string;
        tier?: number;
        user?: { id?: number | string; firstName?: string; lastName?: string };
        links?: unknown;
      };
      const user = creator.user ?? {};
      const firstName = user.firstName ?? "";
      const lastName = user.lastName ?? "";
      const name = [firstName, lastName].filter(Boolean).join(" ").trim();
      const vid = String(creator.userId ?? user.id ?? "");
      const links = asArray(creator.links)
        .map((link) => {
          const entry = link as { type?: string; url?: string };
          const type = (entry.type ?? "").trim().toLowerCase();
          const url = (entry.url ?? "").trim();
          if (!type || !url) return null;
          return { type, url };
        })
        .filter(Boolean) as { type: string; url: string }[];
      if (!vid || !name) return null;
      return { vid, name, tier: creator.tier ?? null, links };
    })
    .filter(Boolean) as { vid: string; name: string; tier: number | null; links: { type: string; url: string }[] }[];

  const creatorVids = creators.map((creator) => creator.vid);
  const users = creatorVids.length
    ? await prisma.user.findMany({
        where: { vid: { in: creatorVids } },
        select: { id: true, vid: true, name: true, creatorBannerUrl: true },
      })
    : [];
  const userMap = new Map(users.map((user) => [user.vid, user]));

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Creators</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Upload or remove creator banners that appear on the home slider.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {creators.map((creator) => {
          const user = userMap.get(creator.vid);
          return (
            <Card key={creator.vid} className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{creator.name}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">VID {creator.vid}</p>
                </div>
                {creator.tier ? (
                  <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
                    Tier {creator.tier}
                  </span>
                ) : null}
              </div>
              {user?.creatorBannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.creatorBannerUrl}
                  alt=""
                  className="h-28 w-full rounded-2xl border border-[color:var(--border)] object-cover"
                />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] text-xs text-[color:var(--text-muted)]">
                  No banner uploaded
                </div>
              )}
              <form action={updateCreatorBannerAdminAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="userId" value={user?.id ?? ""} />
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="file"
                  name="creatorBanner"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="w-full text-xs text-[color:var(--text-muted)]"
                />
                <Button size="sm" type="submit" disabled={!user?.id}>
                  Upload
                </Button>
              </form>
              <form action={clearCreatorBannerAdminAction}>
                <input type="hidden" name="userId" value={user?.id ?? ""} />
                <input type="hidden" name="locale" value={locale} />
                <Button size="sm" variant="ghost" type="submit" disabled={!user?.id}>
                  Remove banner
                </Button>
              </form>
              {creator.links.length > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs text-[color:var(--text-muted)]">
                  {creator.links.map((link) => (
                    <a key={`${creator.vid}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                      {link.type}
                    </a>
                  ))}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
