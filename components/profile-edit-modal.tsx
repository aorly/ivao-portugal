"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { type AvatarColorKey } from "@/lib/avatar-colors";

type AvatarOption = {
  key: AvatarColorKey;
  label: string;
  bg: string;
};

type Props = {
  locale: string;
  avatarName: string;
  avatarUrl: string | null;
  avatarColor: AvatarColorKey | null;
  avatarOptions: readonly AvatarOption[];
  updateAvatarUrlAction: (formData: FormData) => Promise<void>;
  updateAvatarColorAction: (formData: FormData) => Promise<void>;
  updateStaffProfileAction: (formData: FormData) => Promise<void>;
  staffBio: string | null;
  publicStaffProfile: boolean;
  isStaff: boolean;
};

export function ProfileEditModal({
  locale,
  avatarName,
  avatarUrl,
  avatarColor,
  avatarOptions,
  updateAvatarUrlAction,
  updateAvatarColorAction,
  updateStaffProfileAction,
  staffBio,
  publicStaffProfile,
  isStaff,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
      >
        Edit profile
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-3xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Edit profile</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">Profile avatar</p>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    Choose a color for your initials or upload a photo.
                  </p>
                </div>
                <UserAvatar
                  name={avatarName}
                  src={avatarUrl}
                  colorKey={avatarColor}
                  size={72}
                  className="text-lg shadow-[var(--shadow-soft)]"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <form action="/api/avatar" method="post" encType="multipart/form-data" className="space-y-3">
                  <input type="hidden" name="locale" value={locale} />
                  <div className="relative flex min-h-[108px] items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-6 text-center text-sm text-[color:var(--text-muted)]">
                    <input
                      type="file"
                      name="avatar"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">Click to upload</p>
                      <p className="text-xs text-[color:var(--text-muted)]">or drag and drop (PNG, JPG, WEBP)</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-[color:var(--text-muted)]">Max size 2MB.</span>
                    <Button type="submit" variant="secondary">
                      Upload avatar
                    </Button>
                  </div>
                </form>
                <form action={updateAvatarUrlAction} className="space-y-3">
                  <input type="hidden" name="locale" value={locale} />
                  <label className="space-y-1 text-sm">
                    <span className="text-[color:var(--text-muted)]">Use an image URL</span>
                    <input
                      name="avatarUrl"
                      defaultValue={avatarUrl ?? ""}
                      placeholder="https://"
                      className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </label>
                  <div className="flex justify-end">
                    <Button size="sm" type="submit">
                      Save URL
                    </Button>
                  </div>
                </form>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Avatar color</p>
                <form action={updateAvatarColorAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  {avatarOptions.map((option) => {
                    const isActive = option.key === avatarColor;
                    return (
                      <button
                        key={option.key}
                        type="submit"
                        name="avatarColor"
                        value={option.key}
                        aria-pressed={isActive}
                        className={[
                          "flex h-10 w-10 items-center justify-center rounded-full border transition",
                          isActive
                            ? "border-[color:var(--primary)] ring-2 ring-[color:var(--primary)]"
                            : "border-[color:var(--border)]",
                        ].join(" ")}
                        title={option.label}
                      >
                        <span
                          className="h-7 w-7 rounded-full"
                          style={{ backgroundColor: option.bg }}
                          aria-hidden="true"
                        />
                        <span className="sr-only">{option.label}</span>
                      </button>
                    );
                  })}
                </form>
              </div>
              {isStaff ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">Staff profile</p>
                  <form action={updateStaffProfileAction} className="space-y-3 text-sm text-[color:var(--text-muted)]">
                    <input type="hidden" name="locale" value={locale} />
                    <label className="space-y-1">
                      <span className="text-[color:var(--text-muted)]">Short bio</span>
                      <textarea
                        name="staffBio"
                        defaultValue={staffBio ?? ""}
                        rows={3}
                        className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="publicStaffProfile"
                            defaultChecked={publicStaffProfile}
                            className="h-4 w-4"
                          />
                          <span>Make my staff profile public</span>
                        </label>
                        <p className="text-xs text-[color:var(--text-muted)]">Visible to visitors who are not signed in.</p>
                      </div>
                      <Button size="sm" type="submit">
                        Save
                      </Button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
