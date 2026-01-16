import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { requireStaffPermission, STAFF_PERMISSIONS, type StaffPermission } from "@/lib/staff";
import { deleteUser, updateUserAccess } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const parsePermissions = (value: string | null | undefined) => {
  if (!value) return new Set<StaffPermission>();
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((item) => typeof item === "string") as StaffPermission[]);
    }
  } catch {
    return new Set<StaffPermission>();
  }
  return new Set<StaffPermission>();
};

export default async function AdminUsersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const queryValue = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const query = (queryValue ?? "").trim().toLowerCase();
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:staff");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      vid: true,
      name: true,
      email: true,
      role: true,
      extraPermissions: true,
      createdAt: true,
      accounts: { select: { provider: true } },
    },
  });

  const filteredUsers = query
    ? users.filter((user) => {
        const name = user.name.toLowerCase();
        const vid = user.vid.toLowerCase();
        const email = (user.email ?? "").toLowerCase();
        return name.includes(query) || vid.includes(query) || email.includes(query);
      })
    : users;

  return (
    <main className="space-y-6">
      <Card className="space-y-3 p-4 bg-[color:var(--surface-2)] border border-[color:var(--border)]">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">User access</p>
            <p className="text-xs text-[color:var(--text-muted)]">Manage roles and extra permissions.</p>
          </div>
          <form className="ml-auto flex flex-wrap items-center gap-2">
            <input
              name="q"
              defaultValue={queryValue ?? ""}
              placeholder="Search name, VID, email"
              className="w-56 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <Button type="submit" size="sm" variant="secondary">
              Search
            </Button>
          </form>
        </div>
      </Card>

      {filteredUsers.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-[color:var(--text-muted)]">No users match this search.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredUsers.map((user) => {
            const permissions = parsePermissions(user.extraPermissions);
            const providers = Array.from(new Set(user.accounts.map((acc) => acc.provider)));
            return (
              <Card key={user.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{user.name}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      VID {user.vid}
                      {user.email ? ` - ${user.email}` : ""}
                    </p>
                    <p className="text-[11px] text-[color:var(--text-muted)]">
                      Providers: {providers.length ? providers.join(", ") : "None"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[11px] text-[color:var(--text-muted)]">
                    {user.role}
                  </span>
                </div>

                <form
                  action={async (formData) => {
                    "use server";
                    await updateUserAccess(formData, locale);
                  }}
                  className="space-y-3"
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs text-[color:var(--text-muted)]">
                      Role
                      <select
                        name="role"
                        defaultValue={user.role}
                        className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-2 text-sm text-[color:var(--text-primary)]"
                      >
                        <option value="USER">USER</option>
                        <option value="STAFF">STAFF</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </label>
                    <div className="text-xs text-[color:var(--text-muted)]">
                      Permissions
                      <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
                        Admin ignores permissions. Uncheck to revoke access.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {STAFF_PERMISSIONS.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs">
                        <input type="checkbox" name="permissions" value={perm} defaultChecked={permissions.has(perm)} />
                        <span className="text-[color:var(--text-primary)]">{perm}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" type="submit">
                      Save access
                    </Button>
                  </div>
                </form>

                <form
                  action={async (formData) => {
                    "use server";
                    await deleteUser(formData, locale);
                  }}
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <Button size="sm" variant="ghost" type="submit" className="text-[color:var(--danger)]">
                    Delete user
                  </Button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
