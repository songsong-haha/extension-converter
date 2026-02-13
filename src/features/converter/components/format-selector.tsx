"use client";

import React from "react";
import { UNIQUE_TARGET_FORMATS } from "../lib/format-registry";
import type { FormatInfo } from "../lib/format-registry";
import type { ConverterMessages } from "@/i18n/messages";

interface FormatSelectorProps {
    sourceFormat?: string;
    onSelect: (format: FormatInfo) => void;
    onGuidanceQuickSelect?: (format: FormatInfo) => void;
    selected?: string;
    messages: Pick<
        ConverterMessages,
        | "formatSelectorLabel"
        | "formatTipDefault"
        | "formatTipBySource"
        | "formatGuidanceHeadingDefault"
        | "formatGuidanceHeadingBySource"
        | "formatGuidanceQuickPickLabel"
    >;
    showGuidance?: boolean;
}

function getFormatTip(
    sourceFormat: string | undefined,
    messages: Pick<ConverterMessages, "formatTipDefault" | "formatTipBySource">
): string {
    const key = (sourceFormat || "").toLowerCase();
    return messages.formatTipBySource[key] ?? messages.formatTipDefault;
}

function getQuickPickOrder(sourceFormat?: string): string[] {
    switch ((sourceFormat || "").toLowerCase()) {
        case "png":
            return ["png", "webp"];
        case "jpg":
        case "jpeg":
            return ["jpg", "webp"];
        case "gif":
            return ["png", "webp"];
        case "ico":
            return ["ico", "png"];
        default:
            return ["png", "webp", "ico"];
    }
}

function getGuidanceHeading(
    sourceFormat: string | undefined,
    messages: Pick<
        ConverterMessages,
        "formatGuidanceHeadingDefault" | "formatGuidanceHeadingBySource"
    >
): string {
    const key = (sourceFormat || "").toLowerCase();
    return (
        messages.formatGuidanceHeadingBySource[key] ??
        messages.formatGuidanceHeadingDefault
    );
}

export default function FormatSelector({
    sourceFormat,
    onSelect,
    onGuidanceQuickSelect,
    selected,
    messages,
    showGuidance = false,
}: FormatSelectorProps) {
    const availableFormats = UNIQUE_TARGET_FORMATS.filter(
        (f) => f.extension !== sourceFormat
    );
    const quickPickFormats = getQuickPickOrder(sourceFormat)
        .map((extension) =>
            availableFormats.find((format) => format.extension === extension)
        )
        .filter((format): format is FormatInfo => Boolean(format));

    return (
        <div className="w-full">
            <p className="text-sm text-[var(--text-secondary)] mb-3 font-medium">
                {messages.formatSelectorLabel}
            </p>
            {showGuidance ? (
                <div className="mb-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-200)] px-4 py-3">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {getGuidanceHeading(sourceFormat, messages)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {getFormatTip(sourceFormat, messages)}
                    </p>
                    {quickPickFormats.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {quickPickFormats.map((format) => (
                                <button
                                    key={`quick-${format.extension}`}
                                    type="button"
                                    onClick={() => {
                                        onGuidanceQuickSelect?.(format);
                                        onSelect(format);
                                    }}
                                    className="rounded-lg border border-[var(--primary-400)] bg-[rgba(124,58,237,0.16)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[rgba(124,58,237,0.24)]"
                                >
                                    {messages.formatGuidanceQuickPickLabel}:{" "}
                                    {format.label.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <p className="mb-3 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-200)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                    {getFormatTip(sourceFormat, messages)}
                </p>
            )}
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
                                    : "border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] hover:border-[var(--glass-border-strong)]",
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
