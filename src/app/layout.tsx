import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Postcard",
  description: "Direct-mail operating system for real estate agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-[family-name:var(--font-body)] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
