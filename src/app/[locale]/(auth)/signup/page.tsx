import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { AuthScreen } from "@/components/auth-screen";
import { normalizeAccountType } from "@/lib/account";
import { signupAction } from "@/lib/actions";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { normalizeEmail } from "@/lib/lead-sequence";

/** Only a plausible address is put back into the field. */
function cleanEmail(raw: string | undefined) {
  return raw ? (normalizeEmail(raw) ?? undefined) : undefined;
}

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ intent?: string; plan?: string; offer?: string; email?: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.auth;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const intent = normalizeAccountType(resolvedSearchParams?.intent);
  const plan = resolvedSearchParams?.plan === "pro" ? "pro" : "solo";
  const isCouple = intent === "couple";

  return (
    <AuthScreen
      title={isCouple ? d.signupCoupleTitle : d.signupPhotographerTitle}
      body={isCouple ? d.signupCoupleBody : d.signupPhotographerBody}
      aside={
        <p>
          {d.alreadyHaveAccess}{" "}
          <Link href={`/${locale}/login`} className="link">
            {d.logIn}
          </Link>
          .
        </p>
      }
    >
      {resolvedSearchParams?.offer === "1" && isCouple ? (
        <p role="status" className="notice notice-success mb-[var(--space-md)] max-w-md">
          {d.offerSignupNotice}
        </p>
      ) : null}
      <AuthForm
        action={signupAction}
        mode="signup"
        intent={intent}
        plan={plan}
        defaultEmail={cleanEmail(resolvedSearchParams?.email)}
        strings={d}
      />
    </AuthScreen>
  );
}
