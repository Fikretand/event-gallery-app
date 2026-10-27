import Link from "next/link";

import { ResetPasswordForm } from "@/components/reset-password-form";
import { AuthScreen } from "@/components/auth-screen";
import { resetPasswordAction } from "@/lib/actions";
import { getDictionary, type Locale } from "@/lib/i18n/index";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.auth;

  return (
    <AuthScreen
      title={d.resetTitle}
      body={d.resetBody}
      aside={
        <p>
          {d.resetNeedLink}{" "}
          <Link href={`/${locale}/forgot-password`} className="link">
            {d.resetRequestAnother}
          </Link>
          .
        </p>
      }
    >
      <ResetPasswordForm action={resetPasswordAction} strings={d} loginHref={`/${locale}/login`} />
    </AuthScreen>
  );
}
