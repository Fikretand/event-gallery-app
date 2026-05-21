import { DashboardHeader } from "@/components/dashboard-header";
import { PhotographerProfileForm } from "@/components/photographer-profile-form";
import { Panel } from "@/components/ui/panel";
import { updatePhotographerProfileAction } from "@/lib/actions";
import { getAccountTypeForUser, getRequiredUser, getUserProfile } from "@/lib/auth";
import { getPublicProfileAvatarUrl } from "@/lib/events";
import Link from "next/link";

export default async function DashboardProfilePage() {
  const { user, supabase } = await getRequiredUser();
  const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);
  const profile = await getUserProfile(supabase, user.id);

  if (!profile) {
    throw new Error("Profile not found.");
  }

  const avatarPreviewUrl = await getPublicProfileAvatarUrl(profile.avatar_url);

  return (
    <main className="pb-16">
      <DashboardHeader
        title={accountType === "couple" ? "Your profile" : "Photographer profile"}
        eyebrow={
          accountType === "couple"
            ? "Manage your account details."
            : "Update your contact details and choose how you want to appear in the photographer spotlight."
        }
      />

      <section className="shell grid gap-5">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white"
          >
            Back to dashboard
          </Link>
        </div>

        <Panel className="bg-white/90">
          <h2 className="text-2xl font-semibold text-[var(--color-ink)]">
            {accountType === "couple" ? "Account details" : "Public profile settings"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">
            {accountType === "couple"
              ? "Keep your account details up to date."
              : "Your spotlight card can help couples discover you for their next wedding or event. Your phone stays private in v1, and you can choose whether your email appears publicly."}
          </p>
          <div className="mt-5">
            <PhotographerProfileForm
              profile={profile}
              action={updatePhotographerProfileAction}
              avatarPreviewUrl={avatarPreviewUrl}
            />
          </div>
        </Panel>
      </section>
    </main>
  );
}
