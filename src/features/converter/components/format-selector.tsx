"use client";

import React from "react";
import { UNIQUE_TARGET_FORMATS } from "../lib/format-registry";
import type { FormatInfo } from "../lib/format-registry";

interface FormatSelectorProps {
    sourceFormat?: string;
    onSelect: (format: FormatInfo) => void;
    selected?: string;
}

function getFormatTip(sourceFormat?: string): string {
    switch ((sourceFormat || "").toLowerCase()) {
        case "png":
            return "팁: 투명 배경 유지가 필요하면 PNG, 용량을 줄이려면 WebP를 선택하세요.";
        case "jpg":
        case "jpeg":
            return "팁: 사진 선명도 우선이면 JPG, 더 작은 파일이 필요하면 WebP를 선택하세요.";
        case "gif":
            return "팁: GIF를 정지 이미지로 바꿀 때는 PNG, 웹 업로드 용량 최적화는 WebP가 유리합니다.";
        case "ico":
            return "팁: 웹 사이트 파비콘으로 쓸 파일이면 ICO를 유지하고, 일반 이미지 용도면 PNG를 권장합니다.";
        default:
            return "팁: 투명 배경은 PNG, 웹 업로드 용량 최적화는 WebP, 파비콘 제작은 ICO를 권장합니다.";
    }
}

export default function FormatSelector({
    sourceFormat,
    onSelect,
    selected,
}: FormatSelectorProps) {
    const availableFormats = UNIQUE_TARGET_FORMATS.filter(
        (f) => f.extension !== sourceFormat
    );

    return (
        <div className="w-full">
            <p className="text-sm text-[var(--text-secondary)] mb-3 font-medium">
                변환할 포맷을 선택하세요
            </p>
            <p className="mb-3 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-200)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                {getFormatTip(sourceFormat)}
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
