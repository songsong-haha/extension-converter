"use client";

import React from "react";
import { UNIQUE_TARGET_FORMATS } from "../lib/format-registry";
import type { FormatInfo } from "../lib/format-registry";
import type { ConverterMessages } from "@/i18n/messages";

interface FormatSelectorProps {
    sourceFormat?: string;
    onSelect: (format: FormatInfo) => void;
    selected?: string;
    messages: Pick<
        ConverterMessages,
        "formatSelectorLabel" | "formatTipDefault" | "formatTipBySource"
    >;
}

function getFormatTip(
    sourceFormat: string | undefined,
    messages: Pick<ConverterMessages, "formatTipDefault" | "formatTipBySource">
): string {
    const key = (sourceFormat || "").toLowerCase();
    return messages.formatTipBySource[key] ?? messages.formatTipDefault;
}

export default function FormatSelector({
    sourceFormat,
    onSelect,
    selected,
    messages,
}: FormatSelectorProps) {
    const availableFormats = UNIQUE_TARGET_FORMATS.filter(
        (f) => f.extension !== sourceFormat
    );

    return (
        <div className="w-full">
            <p className="text-sm text-[var(--text-secondary)] mb-3 font-medium">
                {messages.formatSelectorLabel}
            </p>
            <p className="mb-3 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-200)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                {getFormatTip(sourceFormat, messages)}
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
