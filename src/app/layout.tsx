import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GovGraph",
  description: "Continuous source-code-level compliance for sensitive data flows."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
