import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthScreen } from "@/components/auth-screen";
import { requestPasswordResetAction } from "@/lib/actions";
import { getDictionary, type Locale } from "@/lib/i18n/index";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.auth;

  return (
    <AuthScreen
      title={d.forgotTitle}
      body={d.forgotBody}
      aside={
        <p>
          {d.forgotRemembered}{" "}
          <Link href={`/${locale}/login`} className="link">
            {d.forgotBackLogin}
          </Link>
          .
        </p>
      }
    >
      <ForgotPasswordForm action={requestPasswordResetAction} strings={d} />
    </AuthScreen>
  );
}
