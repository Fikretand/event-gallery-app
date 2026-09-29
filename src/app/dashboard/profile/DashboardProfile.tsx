import Link from "next/link";

import { ChangePasswordForm } from "@/components/change-password-form";
import { DashboardHeader } from "@/components/dashboard-header";
import { PhotographerProfileForm } from "@/components/photographer-profile-form";
import { Panel } from "@/components/ui/panel";
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
  const avatarPreviewUrl = await getPublicProfileAvatarUrl(profile.avatar_url);
  const prefix = localePrefix(locale);

  return (
    <main className="pb-16">
      <DashboardHeader
        title={isCouple ? p.titleCouple : p.titlePhotographer}
        eyebrow={isCouple ? p.eyebrowCouple : p.eyebrowPhotographer}
        strings={d.header}
        profileHref={`${prefix}/dashboard/profile`}
      />

      <section className="shell grid gap-5">
        <div>
          <Link
            href={`${prefix}/dashboard`}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white"
          >
            {p.backToDashboard}
          </Link>
        </div>

        {searchParams?.saved === "1" && (
          <div className="rounded-2xl bg-[#eef9f0] px-4 py-3 text-sm text-[#1f6b35]">
            {p.savedNotice}
          </div>
        )}

        <Panel className="bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? p.accountDetails : p.publicProfileSettings}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">
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
        </Panel>

        <Panel className="bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">{p.changePassword.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">{p.changePassword.body}</p>
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
        </Panel>
      </section>
    </main>
  );
}
