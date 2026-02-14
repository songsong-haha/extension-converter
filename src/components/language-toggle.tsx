"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE_NAME, type Locale } from "@/i18n/constants";

interface LanguageToggleProps {
  locale: Locale;
}

const OPTIONS: ReadonlyArray<{ locale: Locale; label: string }> = [
  { locale: "ko", label: "한국어" },
  { locale: "en", label: "English" },
];

function setLocaleCookie(nextLocale: Locale): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export default function LanguageToggle({ locale }: LanguageToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onSwitch = (nextLocale: Locale) => {
    if (nextLocale === locale) {
      return;
    }

    setLocaleCookie(nextLocale);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-1 backdrop-blur-xl">
      {OPTIONS.map((option) => {
        const active = locale === option.locale;
        return (
          <button
            key={option.locale}
            type="button"
            onClick={() => onSwitch(option.locale)}
            disabled={isPending}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-[var(--primary-500)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            ].join(" ")}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
