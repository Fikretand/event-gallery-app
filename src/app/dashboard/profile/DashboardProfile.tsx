import Link from "next/link";

import { ChangePasswordForm } from "@/components/change-password-form";
import { DashboardHeader } from "@/components/dashboard-header";
import { PhotographerProfileForm } from "@/components/photographer-profile-form";
import { changePasswordAction, updatePhotographerProfileAction } from "@/lib/actions";
import { getAccountTypeForUser, getRequiredUser, getUserProfile } from "@/lib/auth";
import { getPublicProfileAvatarUrl } from "@/lib/events";
import { getDictionary, localePrefix, type Locale } from "@/lib/i18n/index";

export async function DashboardProfile({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams?: { saved?: string };
}) {
  const dict = getDictionary(locale);
  const d = dict.dashboard;
  const p = d.profile;

  const { user, supabase } = await getRequiredUser();
  const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);
  const profile = await getUserProfile(supabase, user.id);

  if (!profile) {
    throw new Error("Profile not found.");
  }

  const isCouple = accountType === "couple";
  const avatarPreviewUrl = await getPublicProfileAvatarUrl(profile.avatar_url, user.id);
  const prefix = localePrefix(locale);

  return (
    <main className="pb-16">
      <DashboardHeader
        title={isCouple ? p.titleCouple : p.titlePhotographer}
        eyebrow={isCouple ? p.eyebrowCouple : p.eyebrowPhotographer}
        strings={d.header}
        profileHref={`${prefix}/dashboard/profile`}
        back={{ href: `${prefix}/dashboard`, label: p.backToDashboard }}
      />

      <div className="shell grid gap-[var(--space-xl)]">
        {searchParams?.saved === "1" && (
          <div role="status" className="notice notice-success">
            {p.savedNotice}
          </div>
        )}

        <section>
          <h2 className="app-section-title text-ink">
            {isCouple ? p.accountDetails : p.publicProfileSettings}
          </h2>
          <p className="mt-1 max-w-2xl text-ink-2">
            {isCouple ? p.accountDetailsBody : p.publicProfileBody}
          </p>
          <div className="mt-5">
            <PhotographerProfileForm
              profile={profile}
              action={updatePhotographerProfileAction}
              avatarPreviewUrl={avatarPreviewUrl}
              strings={d.profileForm}
            />
          </div>
        </section>

        <section className="border-t border-rule pt-[var(--space-xl)]">
          <h2 className="app-section-title text-ink">{p.changePassword.title}</h2>
          <p className="mt-1 max-w-2xl text-ink-2">{p.changePassword.body}</p>
          <div className="mt-5">
            <ChangePasswordForm
              action={changePasswordAction}
              strings={{
                ...p.changePassword,
                rule: dict.auth.formPasswordRule,
                rules: dict.auth.passwordRules,
                working: dict.auth.formWorking,
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
