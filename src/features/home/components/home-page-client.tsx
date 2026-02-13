"use client";

import { useEffect, useMemo, useState } from "react";
import ConverterWidget from "@/features/converter/components/converter-widget";
import { UNIQUE_TARGET_FORMATS } from "@/features/converter/lib/format-registry";
import {
  CONVERTER_TEXT,
  DEFAULT_LOCALE,
  HOME_TEXT,
  type Locale,
} from "@/features/i18n/lib/messages";

type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "ec_theme";
const LOCALE_STORAGE_KEY = "ec_locale";

const SUPPORTED_FORMAT_LABELS = UNIQUE_TARGET_FORMATS.map((format) => format.label);
const SUPPORTED_FORMAT_COUNT = SUPPORTED_FORMAT_LABELS.length;

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const rawQueryLocale = searchParams.get("lang");
  if (rawQueryLocale === "ko" || rawQueryLocale === "en") {
    return rawQueryLocale;
  }

  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "ko" || saved === "en") {
    return saved;
  }
  return DEFAULT_LOCALE;
}

const FEATURE_ICONS = [
  <svg key="free" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke="var(--primary-400)"
      strokeWidth="1.5"
    />
    <path
      d="M8 12L11 15L16 9"
      stroke="var(--primary-400)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>,
  <svg key="fast" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
      stroke="var(--accent-400)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>,
  <svg key="privacy" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="11"
      width="18"
      height="11"
      rx="2"
      stroke="var(--success-400)"
      strokeWidth="1.5"
    />
    <path
      d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
      stroke="var(--success-400)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="16" r="1.5" fill="var(--success-400)" />
  </svg>,
  <svg key="formats" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 16L4 8C4 5.79086 5.79086 4 8 4L16 4C18.2091 4 20 5.79086 20 8L20 16C20 18.2091 18.2091 20 16 20L8 20C5.79086 20 4 18.2091 4 16Z"
      stroke="var(--primary-300)"
      strokeWidth="1.5"
    />
    <path
      d="M9 12H15M12 9V15"
      stroke="var(--primary-300)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>,
] as const;

export default function HomePageClient() {
  const [locale, setLocale] = useState<Locale>(() => getInitialLocale());
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const t = HOME_TEXT[locale];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const heroSupportCopy = useMemo(() => {
    const list = SUPPORTED_FORMAT_LABELS.join(", ");
    if (locale === "en") {
      return `${list} are supported (${SUPPORTED_FORMAT_COUNT} total) and converted instantly in your browser.`;
    }

    return `${list} 지원 포맷 ${SUPPORTED_FORMAT_COUNT}종을 브라우저에서 바로 변환할 수 있어요.`;
  }, [locale]);

  const features = useMemo(
    () => [
      ...t.features,
      {
        title: locale === "en" ? `${UNIQUE_TARGET_FORMATS.length} formats` : `${UNIQUE_TARGET_FORMATS.length}가지 포맷`,
        desc:
          locale === "en"
            ? `Freely convert between ${SUPPORTED_FORMAT_LABELS.join(", ")}.`
            : `${SUPPORTED_FORMAT_LABELS.join(", ")} 간 자유로운 변환.`,
      },
    ],
    [locale, t.features]
  );

  const faqItems = useMemo(
    () =>
      t.faq.map((item) => {
        if (item.question === "어떤 포맷을 지원하나요?" || item.question === "Which formats are supported?") {
          return {
            question: item.question,
            answer:
              locale === "en"
                ? `${SUPPORTED_FORMAT_LABELS.join(", ")} and other major image formats are supported.`
                : `${SUPPORTED_FORMAT_LABELS.join(", ")} 등 주요 이미지 포맷 간 변환을 지원합니다.`,
          };
        }
        return item;
      }),
    [locale, t.faq]
  );

  const faqSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    }),
    [faqItems]
  );

  const converterText = CONVERTER_TEXT[locale];

  return (
    <div className="bg-gradient-animated min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--primary-500)] rounded-full opacity-[0.04] blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[var(--accent-500)] rounded-full opacity-[0.04] blur-[100px]" />
      </div>

      <main className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <div className="mb-8 flex flex-wrap items-center justify-end gap-3 text-xs">
          <div className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-[var(--text-secondary)]">
            <span className="mr-2">{t.langLabel}</span>
            <button
              type="button"
              onClick={() => setLocale("ko")}
              className={`rounded-full px-2 py-0.5 ${locale === "ko" ? "bg-[var(--surface-200)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
            >
              KO
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`ml-1 rounded-full px-2 py-0.5 ${locale === "en" ? "bg-[var(--surface-200)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
            >
              EN
            </button>
          </div>
          <div className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-[var(--text-secondary)]">
            <span className="mr-2">{t.themeLabel}</span>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-full px-2 py-0.5 ${theme === "light" ? "bg-[var(--surface-200)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
            >
              {t.themeLight}
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`ml-1 rounded-full px-2 py-0.5 ${theme === "dark" ? "bg-[var(--surface-200)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
            >
              {t.themeDark}
            </button>
          </div>
        </div>

        <section className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] mb-6 backdrop-blur-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-400)] animate-pulse" />
            {t.badge}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-4">
            {t.heroTitleLine1}
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient">{t.heroTitleLine2}</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            {heroSupportCopy}
            <br className="sm:hidden" /> {t.heroTrailing}
          </p>

          <a
            href="#converter-widget"
            className="inline-flex mt-8 items-center justify-center rounded-xl bg-[var(--primary-500)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-100)]"
          >
            {t.primaryCta}
          </a>
        </section>

        <section
          id="converter-widget"
          className="glass p-6 sm:p-8 mb-20 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <ConverterWidget locale={locale} text={converterText} />
        </section>

        <section className="animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <h2 className="text-center text-sm font-medium text-[var(--text-muted)] uppercase tracking-widest mb-8">
            {t.converterWhy}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={f.title} className="glass-card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-200)] flex items-center justify-center flex-shrink-0">
                  {FEATURE_ICONS[i]}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{f.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 animate-fade-up" style={{ animationDelay: "0.5s" }}>
          <h2 className="text-center text-sm font-medium text-[var(--text-muted)] uppercase tracking-widest mb-8">
            {t.faqHeading}
          </h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="glass-card p-5 group open:bg-[var(--surface-200)]/50"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">
                  {item.question}
                </summary>
                <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t border-[var(--glass-border)] text-center">
          <p className="text-xs text-[var(--text-muted)]">{t.footer}</p>
        </footer>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </div>
  );
}
