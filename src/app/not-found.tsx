import Link from "next/link";

import { ErrorScreen } from "@/components/error-screen";

// Branded 404 for any unknown route.
export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      titleBs="Stranica nije pronađena"
      titleEn="Page not found"
      bodyBs="Ova stranica ne postoji ili je premještena."
      bodyEn="This page doesn’t exist or has moved."
      actions={
        <Link href="/" className="btn btn-primary">
          Nazad na početnu (Back home)
        </Link>
      }
    />
  );
}
