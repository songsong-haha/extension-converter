import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import GoogleAnalytics from "@/features/analytics/components/google-analytics";
import PageViewTracker from "@/features/analytics/components/page-view-tracker";
import WebVitalsTracker from "@/features/analytics/components/web-vitals-tracker";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExtensionConverter — 무료 이미지 포맷 변환기",
  description:
    "PNG, JPG, WebP, GIF, BMP, AVIF, ICO를 3초만에 변환하세요. 100% 무료, 서버 업로드 없이 브라우저에서 바로 변환됩니다.",
  keywords: [
    "이미지 변환",
    "파일 변환",
    "PNG to JPG",
    "WebP 변환",
    "무료 변환기",
    "image converter",
    "extension converter",
  ],
  openGraph: {
    title: "ExtensionConverter — 무료 이미지 포맷 변환기",
    description: "PNG, JPG, WebP, GIF, BMP, AVIF, ICO를 3초만에 변환하세요.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
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
