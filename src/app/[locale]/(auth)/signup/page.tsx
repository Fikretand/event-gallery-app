import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { AuthScreen } from "@/components/auth-screen";
import { normalizeAccountType } from "@/lib/account";
import { signupAction } from "@/lib/actions";
import { getDictionary, type Locale } from "@/lib/i18n/index";

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ intent?: string; plan?: string }>;
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
      <AuthForm action={signupAction} mode="signup" intent={intent} plan={plan} strings={d} />
    </AuthScreen>
  );
}
