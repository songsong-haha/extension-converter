"use client";

import React from "react";
import type { ConversionStatus } from "../types";
import { CONVERTER_TEXT, DEFAULT_LOCALE, type Locale } from "@/features/i18n/lib/messages";

interface ConversionProgressProps {
    status: ConversionStatus;
    progress: number; // 0-100
    statusText?: string;
    locale?: Locale;
}

export default function ConversionProgress({
    status,
    progress,
    statusText,
    locale = DEFAULT_LOCALE,
}: ConversionProgressProps) {
    if (status === "idle") return null;
    const text = CONVERTER_TEXT[locale];

    return (
        <div className="w-full space-y-2">
            {/* Progress bar */}
            <div className="progress-bar h-2">
                <div
                    className="progress-fill"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>

            {/* Status text */}
            <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">
                    {status === "loading" && text.statusLoading}
                    {status === "converting" && (statusText || text.statusConverting)}
                    {status === "done" && text.statusDone}
                    {status === "error" && text.statusError}
                </span>
                <span className="text-[var(--text-muted)] tabular-nums">
                    {Math.round(progress)}%
                </span>
            </div>
        </div>
    );
}
