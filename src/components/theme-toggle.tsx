"use client";

import { useCallback, useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "extension_converter_theme";

function resolvePreferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface ThemeToggleProps {
  themeLabel: string;
  lightModeLabel: string;
  darkModeLabel: string;
}

export default function ThemeToggle({
  themeLabel,
  lightModeLabel,
  darkModeLabel,
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => resolvePreferredTheme());

  const applyTheme = useCallback((nextTheme: ThemeMode) => {
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [applyTheme, theme]);

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, [applyTheme, theme]);

  const isDarkMode = theme === "dark";
  const label = isDarkMode ? darkModeLabel : lightModeLabel;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--primary-300)] hover:text-[var(--text-primary)]"
      aria-label={`${themeLabel}: ${label}`}
      aria-pressed={isDarkMode}
      data-testid="theme-toggle"
    >
      <span className="text-[var(--text-muted)]">{themeLabel}</span>
      <span className="font-medium text-[var(--text-primary)]">{label}</span>
      <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-200)]">
        {isDarkMode ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
              stroke="var(--primary-300)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" stroke="var(--accent-500)" strokeWidth="1.6" />
            <path
              d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"
              stroke="var(--accent-500)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
