"use client";

import React from "react";
import { formatFileSize } from "../lib/converter-engine";
import { getFileExtension } from "../lib/format-registry";
import type { ConversionResult } from "../types";
import { CONVERTER_TEXT, DEFAULT_LOCALE, type Locale } from "@/features/i18n/lib/messages";

interface FilePreviewProps {
    file: File;
    previewUrl: string;
    conversionResult?: ConversionResult;
    onRemove: () => void;
    locale?: Locale;
}

export default function FilePreview({
    file,
    previewUrl,
    conversionResult,
    onRemove,
    locale = DEFAULT_LOCALE,
}: FilePreviewProps) {
    const ext = getFileExtension(file.name).toUpperCase();
    const text = CONVERTER_TEXT[locale];

    return (
        <div className="glass-card p-4 flex items-center gap-4 group">
            {/* Thumbnail */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[var(--surface-200)] flex-shrink-0">
                <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white px-1.5 py-0.5 rounded">
                    {ext}
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {file.name}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    {formatFileSize(file.size)}
                    {conversionResult && (
                        <span className="text-[var(--success-400)] ml-2">
                            → {formatFileSize(conversionResult.convertedSize)} ({conversionResult.duration.toFixed(0)}ms)
                        </span>
                    )}
                </p>
            </div>

            {/* Remove button */}
            <button
                onClick={onRemove}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[var(--surface-300)] cursor-pointer"
                aria-label={text.removeFile}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                        d="M4 4L12 12M12 4L4 12"
                        stroke="var(--text-muted)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </svg>
            </button>
        </div>
    );
}
