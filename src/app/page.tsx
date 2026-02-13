import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import ConverterWidget from "@/features/converter/components/converter-widget";
import { UNIQUE_TARGET_FORMATS } from "@/features/converter/lib/format-registry";
import { HOME_MESSAGES, SEO_MESSAGES, type Locale } from "@/i18n/messages";
import { resolveLocale } from "@/i18n/resolve-locale";

type SearchParams = Record<string, string | string[] | undefined>;

interface HomeProps {
  searchParams?: SearchParams | Promise<SearchParams>;
}

async function getSearchParams(
  searchParams: HomeProps["searchParams"]
): Promise<SearchParams> {
  if (!searchParams) {
    return {};
  }

  if (typeof (searchParams as Promise<SearchParams>).then === "function") {
    return await (searchParams as Promise<SearchParams>);
  }

  return searchParams as SearchParams;
}

const SUPPORTED_FORMAT_LABELS = UNIQUE_TARGET_FORMATS.map((format) => format.label);
const SUPPORTED_FORMAT_COUNT = SUPPORTED_FORMAT_LABELS.length;
const HERO_FORMAT_LIST = SUPPORTED_FORMAT_LABELS.join(", ");

async function resolveRequestLocale(searchParams: HomeProps["searchParams"]): Promise<Locale> {
  const resolvedSearchParams = await getSearchParams(searchParams);
  const requestHeaders = await headers();
  return resolveLocale({
    langParam: resolvedSearchParams.lang,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
}

export async function generateMetadata({
  searchParams,
}: HomeProps): Promise<Metadata> {
  const locale = await resolveRequestLocale(searchParams);
  const seo = SEO_MESSAGES[locale];

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: "website",
      locale: seo.openGraphLocale,
      alternateLocale: [seo.openGraphAlternateLocale],
    },
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const locale = await resolveRequestLocale(searchParams);
  const messages = HOME_MESSAGES[locale];

  const heroSupportCopy = messages.heroSupportCopy(
    HERO_FORMAT_LIST,
    SUPPORTED_FORMAT_COUNT
  );
  const faqItems = [
    {
      question: messages.faq.freeQuestion,
      answer: messages.faq.freeAnswer,
    },
    {
      question: messages.faq.uploadQuestion,
      answer: messages.faq.uploadAnswer,
    },
    {
      question: messages.faq.formatQuestion,
      answer: messages.faq.formatAnswer(HERO_FORMAT_LIST),
    },
  ] as const;

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
        </svg>
      ),
      title: messages.features.freeTitle,
      desc: messages.features.freeDesc,
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
            stroke="var(--accent-400)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      title: messages.features.fastTitle,
      desc: messages.features.fastDesc,
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
        </svg>
      ),
      title: messages.features.privacyTitle,
      desc: messages.features.privacyDesc,
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
        </svg>
      ),
      title: messages.features.formatTitle(SUPPORTED_FORMAT_COUNT),
      desc: messages.features.formatDesc(HERO_FORMAT_LIST),
    },
  ];

  const faqSchema = {
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
  };

  const languageLinkClass =
    "text-xs rounded-full border px-3 py-1 transition hover:border-[var(--primary-300)]";

  return (
    <div className="bg-gradient-animated min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--primary-500)] rounded-full opacity-[0.04] blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[var(--accent-500)] rounded-full opacity-[0.04] blur-[100px]" />
      </div>

      <main className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <section className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] mb-4 backdrop-blur-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-400)] animate-pulse" />
            {messages.badge}
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">{messages.languageLabel}</span>
              <Link
                href="/?lang=ko"
                className={`${languageLinkClass} ${
                  locale === "ko"
                    ? "border-[var(--primary-400)] text-[var(--text-primary)]"
                    : "border-[var(--glass-border)] text-[var(--text-muted)]"
                }`}
              >
                {messages.languageKo}
              </Link>
              <Link
                href="/?lang=en"
                className={`${languageLinkClass} ${
                  locale === "en"
                    ? "border-[var(--primary-400)] text-[var(--text-primary)]"
                    : "border-[var(--glass-border)] text-[var(--text-muted)]"
                }`}
              >
                {messages.languageEn}
              </Link>
            </div>
            <ThemeToggle
              themeLabel={messages.themeLabel}
              lightModeLabel={messages.lightModeLabel}
              darkModeLabel={messages.darkModeLabel}
            />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-4">
            {messages.heroPrefix}
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient">{messages.heroHighlight}</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            {heroSupportCopy}
            <br className="sm:hidden" /> {messages.heroSubCopy}
          </p>

          <a
            href="#converter-widget"
            className="inline-flex mt-8 items-center justify-center rounded-xl bg-[var(--primary-500)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-100)]"
          >
            {messages.primaryCtaLabel}
          </a>
        </section>

        <section
          id="converter-widget"
          className="glass p-6 sm:p-8 mb-20 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <ConverterWidget locale={locale} />
        </section>

        <section className="animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <h2 className="text-center text-sm font-medium text-[var(--text-muted)] uppercase tracking-widest mb-8">
            {messages.featuresHeading}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-5 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-200)] flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="mt-20 animate-fade-up"
          style={{ animationDelay: "0.5s" }}
        >
          <h2 className="text-center text-sm font-medium text-[var(--text-muted)] uppercase tracking-widest mb-8">
            {messages.faqHeading}
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
                <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t border-[var(--glass-border)] text-center">
          <p className="text-xs text-[var(--text-muted)]">{messages.footer}</p>
        </footer>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </div>
  );
}
