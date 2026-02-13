"use client";

import React from "react";
import { UNIQUE_TARGET_FORMATS } from "../lib/format-registry";
import type { FormatInfo } from "../lib/format-registry";

interface FormatSelectorProps {
    sourceFormat?: string;
    onSelect: (format: FormatInfo) => void;
    onGuidanceQuickSelect?: (format: FormatInfo) => void;
    selected?: string;
    showGuidance?: boolean;
}

interface FormatGuidance {
    title: string;
    description: string;
    quickPickOrder: string[];
}

function getFormatGuidance(sourceFormat?: string): FormatGuidance {
    switch ((sourceFormat || "").toLowerCase()) {
        case "png":
            return {
                title: "PNG 파일을 올렸어요",
                description: "투명 배경을 유지하려면 PNG, 용량을 줄이려면 WebP가 적합합니다.",
                quickPickOrder: ["png", "webp"],
            };
        case "jpg":
        case "jpeg":
            return {
                title: "JPG 사진 최적화 가이드",
                description: "선명도를 유지하려면 JPG, 웹 업로드 용량 최적화는 WebP를 권장합니다.",
                quickPickOrder: ["jpg", "webp"],
            };
        case "gif":
            return {
                title: "GIF 변환 추천",
                description: "정지 이미지는 PNG, 가벼운 웹 이미지는 WebP가 일반적으로 유리합니다.",
                quickPickOrder: ["png", "webp"],
            };
        case "ico":
            return {
                title: "ICO 파일 활용 가이드",
                description: "파비콘 용도면 ICO, 일반 이미지 편집은 PNG로 변환하는 경우가 많습니다.",
                quickPickOrder: ["ico", "png"],
            };
        default:
            return {
                title: "빠른 포맷 선택 가이드",
                description: "투명 배경은 PNG, 웹 업로드 최적화는 WebP, 파비콘 용도는 ICO를 권장합니다.",
                quickPickOrder: ["png", "webp", "ico"],
            };
    }
}

export default function FormatSelector({
    sourceFormat,
    onSelect,
    onGuidanceQuickSelect,
    selected,
    showGuidance = false,
}: FormatSelectorProps) {
    const availableFormats = UNIQUE_TARGET_FORMATS.filter(
        (f) => f.extension !== sourceFormat
    );
    const guidance = getFormatGuidance(sourceFormat);
    const quickPickFormats = guidance.quickPickOrder
        .map((extension) =>
            availableFormats.find((format) => format.extension === extension)
        )
        .filter((format): format is FormatInfo => Boolean(format));

    return (
        <div className="w-full">
            <p className="text-sm text-[var(--text-secondary)] mb-3 font-medium">
                변환할 포맷을 선택하세요
            </p>
            {showGuidance && (
                <div className="mb-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-200)] px-4 py-3">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {guidance.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {guidance.description}
                    </p>
                    {quickPickFormats.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {quickPickFormats.map((format) => (
                                <button
                                    key={`quick-${format.extension}`}
                                    onClick={() => {
                                        onGuidanceQuickSelect?.(format);
                                        onSelect(format);
                                    }}
                                    className="rounded-lg border border-[var(--primary-400)] bg-[rgba(124,58,237,0.16)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[rgba(124,58,237,0.24)]"
                                >
                                    빠른 선택: {format.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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
