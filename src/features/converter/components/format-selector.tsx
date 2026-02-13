"use client";

import React from "react";
import { UNIQUE_TARGET_FORMATS } from "../lib/format-registry";
import type { FormatInfo } from "../lib/format-registry";
import { CONVERTER_TEXT, DEFAULT_LOCALE, type Locale } from "@/features/i18n/lib/messages";

interface FormatSelectorProps {
    sourceFormat?: string;
    onSelect: (format: FormatInfo) => void;
    selected?: string;
    locale?: Locale;
}

function getFormatTip(sourceFormat: string | undefined, locale: Locale): string {
    const tips = CONVERTER_TEXT[locale].formatTips;
    switch ((sourceFormat || "").toLowerCase()) {
        case "png":
            return tips.png;
        case "jpg":
        case "jpeg":
            return tips.jpg;
        case "gif":
            return tips.gif;
        case "ico":
            return tips.ico;
        default:
            return tips.default;
    }
}

export default function FormatSelector({
    sourceFormat,
    onSelect,
    selected,
    locale = DEFAULT_LOCALE,
}: FormatSelectorProps) {
    const availableFormats = UNIQUE_TARGET_FORMATS.filter(
        (f) => f.extension !== sourceFormat
    );
    const text = CONVERTER_TEXT[locale];

    return (
        <div className="w-full">
            <p className="text-sm text-[var(--text-secondary)] mb-3 font-medium">
                {text.selectTargetFormat}
            </p>
            <p className="mb-3 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-200)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                {getFormatTip(sourceFormat, locale)}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {availableFormats.map((format) => {
                    const isSelected = selected === format.extension;
                    return (
                        <button
                            key={format.extension}
                            onClick={() => onSelect(format)}
                            className={[
                                "flex flex-col items-center justify-center gap-1",
                                "py-3 px-2 rounded-xl transition-all duration-200",
                                "cursor-pointer select-none",
                                "border",
                                isSelected
                                    ? "border-[var(--primary-400)] bg-[rgba(124,58,237,0.15)] shadow-[0_0_20px_rgba(124,58,237,0.2)]"
                                    : "border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] hover:border-[rgba(255,255,255,0.12)]",
                                "active:scale-95",
                            ].join(" ")}
                        >
                            <span
                                className="text-xs font-bold tracking-wider uppercase"
                                style={{ color: isSelected ? format.color : "var(--text-secondary)" }}
                            >
                                {format.label}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                                .{format.extension}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
