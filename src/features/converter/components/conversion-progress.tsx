"use client";

import React from "react";
import type { ConversionStatus } from "../types";
import type { ConverterMessages } from "@/i18n/messages";

interface ConversionProgressProps {
    status: ConversionStatus;
    progress: number; // 0-100
    statusText?: string;
    messages: Pick<
        ConverterMessages,
        "statusLoading" | "statusConverting" | "statusDone" | "statusError"
    >;
}

export default function ConversionProgress({
    status,
    progress,
    statusText,
    messages,
}: ConversionProgressProps) {
    if (status === "idle") return null;

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
                    {status === "loading" && messages.statusLoading}
                    {status === "converting" && (statusText || messages.statusConverting)}
                    {status === "done" && messages.statusDone}
                    {status === "error" && messages.statusError}
                </span>
                <span className="text-[var(--text-muted)] tabular-nums">
                    {Math.round(progress)}%
                </span>
            </div>
        </div>
    );
}
