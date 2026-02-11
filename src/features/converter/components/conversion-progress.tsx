"use client";

import React from "react";
import type { ConversionStatus } from "../types";

interface ConversionProgressProps {
    status: ConversionStatus;
    progress: number; // 0-100
    statusText?: string;
}

export default function ConversionProgress({
    status,
    progress,
    statusText,
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
                    {status === "loading" && "파일 로딩 중..."}
                    {status === "converting" && (statusText || "변환 중...")}
                    {status === "done" && "✨ 변환 완료!"}
                    {status === "error" && "❌ 변환 실패"}
                </span>
                <span className="text-[var(--text-muted)] tabular-nums">
                    {Math.round(progress)}%
                </span>
            </div>
        </div>
    );
}
