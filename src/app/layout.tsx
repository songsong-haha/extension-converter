import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import GoogleAnalytics from "@/features/analytics/components/google-analytics";
import PageViewTracker from "@/features/analytics/components/page-view-tracker";
import WebVitalsTracker from "@/features/analytics/components/web-vitals-tracker";
import { LOCALE_HEADER_NAME } from "@/i18n/constants";
import { resolveLocale } from "@/i18n/resolve-locale";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const locale = resolveLocale({
    persistedLocale: requestHeaders.get(LOCALE_HEADER_NAME),
    acceptLanguage: requestHeaders.get("accept-language"),
  });

  return (
    <html lang={locale}>
      <body className={`${inter.variable} antialiased`}>
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <PageViewTracker />
          <WebVitalsTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
