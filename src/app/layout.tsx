import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Confetti | Private event galleries for photographers",
  description:
    "Create private event galleries with guest uploads, QR access, and client-ready delivery.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
