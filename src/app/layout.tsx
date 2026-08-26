import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { productConfig } from "@/lib/govgraph/product-config";
import "./globals.css";

export const metadata: Metadata = {
  title: productConfig.name,
  description: productConfig.tagline
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <AppShell>{children}</AppShell>
    </html>
  );
}
