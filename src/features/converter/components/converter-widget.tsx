"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import FormatSelector from "./format-selector";
import FilePreview from "./file-preview";
import ConversionProgress from "./conversion-progress";
import Button from "@/components/ui/button";
import { convertFile, isValidImage } from "../lib/converter-engine";
import { getFileExtension } from "../lib/format-registry";
import type { FormatInfo } from "../lib/format-registry";
import type { ConversionStatus, ConversionResult } from "../types";
import {
    trackEvent,
    type AnalyticsEventName,
} from "@/features/analytics/lib/ga";
import { CONVERTER_MESSAGES, type Locale } from "@/i18n/messages";

function classifyConversionError(err: unknown): string {
    if (!(err instanceof Error)) {
        return "unknown";
    }

    const message = err.message.toLowerCase();
    const name = err.name.toLowerCase();

    if (message.includes("unsupported target format")) {
        return "unsupported_target_format";
    }
    if (message.includes("canvas context")) {
        return "canvas_context_unavailable";
    }
    if (message.includes("out of memory") || message.includes("memory")) {
        return "memory_limit_exceeded";
    }
    if (message.includes("createimagebitmap") || message.includes("imagebitmap")) {
        return "image_decode_failed";
    }
    if (name === "aborterror") {
        return "conversion_aborted";
    }

    return "conversion_runtime_error";
}

interface ConverterWidgetProps {
    locale: Locale;
}

type AnalyticsParams = Record<string, string | number | boolean | undefined>;
function getFailureGuide(category: string, locale: Locale): string {
    const koGuide: Record<string, string> = {
        unsupported_target_format:
            "선택한 출력 포맷이 브라우저에서 지원되지 않습니다. 다른 포맷으로 다시 시도해 주세요.",
        canvas_context_unavailable:
            "브라우저 그래픽 처리 리소스가 부족합니다. 탭을 새로고침한 뒤 다시 시도해 주세요.",
        memory_limit_exceeded:
            "이미지 크기가 너무 커서 메모리가 부족할 수 있습니다. 더 작은 파일이나 다른 포맷으로 시도해 주세요.",
        image_decode_failed:
            "파일 디코딩에 실패했습니다. 원본 파일이 손상되었는지 확인한 뒤 다른 포맷으로 시도해 주세요.",
        conversion_aborted:
            "변환이 중단되었습니다. 같은 설정으로 다시 시도하거나 다른 포맷을 선택해 주세요.",
        conversion_runtime_error:
            "브라우저 환경에서 일시적인 오류가 발생했습니다. 같은 설정으로 재시도하거나 다른 포맷을 선택해 주세요.",
        unknown:
            "브라우저 환경에서 일시적인 오류가 발생했습니다. 같은 설정으로 재시도하거나 다른 포맷을 선택해 주세요.",
    };
    const enGuide: Record<string, string> = {
        unsupported_target_format:
            "This output format is not supported in your browser. Try a different format.",
        canvas_context_unavailable:
            "Browser graphics resources are temporarily unavailable. Refresh and try again.",
        memory_limit_exceeded:
            "The image may be too large for available memory. Try a smaller file or another format.",
        image_decode_failed:
            "The file could not be decoded. Check the source file and try another format.",
        conversion_aborted:
            "Conversion was interrupted. Retry with the same settings or choose another format.",
        conversion_runtime_error:
            "A temporary browser error occurred. Retry with the same settings or choose another format.",
        unknown:
            "A temporary browser error occurred. Retry with the same settings or choose another format.",
    };
    const guideMap = locale === "en" ? enGuide : koGuide;
    return guideMap[category] || guideMap.unknown;
}

function getRecoveryFormats(sourceFormat?: string, targetFormat?: string): string[] {
    const source = (sourceFormat || "").toLowerCase();
    const currentTarget = (targetFormat || "").toLowerCase();
    const preferred = ["webp", "png", "jpg", "avif", "bmp", "gif", "ico"];

    return preferred
        .filter((format) => format !== source && format !== currentTarget)
        .slice(0, 3);
}

export default function ConverterWidget({ locale }: ConverterWidgetProps) {
    const PRE_CONVERSION_DROPOFF_SESSION_KEY = "pre_conversion_dropoff_tracked";
    const messages = CONVERTER_MESSAGES[locale];
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [targetFormat, setTargetFormat] = useState<string>("");
    const [status, setStatus] = useState<ConversionStatus>("idle");
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ConversionResult | null>(null);
    const [error, setError] = useState<string>("");
    const [failureCategory, setFailureCategory] = useState<string>("");
    const [isDragging, setIsDragging] = useState(false);
    const hasStartedConversionRef = useRef(false);
    const hasTrackedDropOffRef = useRef(false);
    const retryAttemptRef = useRef(0);
    const lastFailureCategoryRef = useRef<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const trackLocaleEvent = useCallback(
        (eventName: AnalyticsEventName, params: AnalyticsParams = {}) => {
            trackEvent(eventName, {
                locale,
                ...params,
            });
        },
        [locale]
    );

    const hasSessionDropOffMarker = useCallback((): boolean => {
        if (typeof window === "undefined") {
            return false;
        }

        try {
            return window.sessionStorage.getItem(PRE_CONVERSION_DROPOFF_SESSION_KEY) === "1";
        } catch {
            return false;
        }
    }, [PRE_CONVERSION_DROPOFF_SESSION_KEY]);

    const setSessionDropOffMarker = useCallback((): void => {
        if (typeof window === "undefined") {
            return;
        }

        try {
            window.sessionStorage.setItem(PRE_CONVERSION_DROPOFF_SESSION_KEY, "1");
        } catch {
            // Ignore storage failures (e.g. disabled storage in private mode).
        }
    }, [PRE_CONVERSION_DROPOFF_SESSION_KEY]);

    const trackPreConversionDropOff = useCallback(
        (sourceFormat: string) => {
            if (typeof window === "undefined" || hasTrackedDropOffRef.current) {
                return;
            }
            const alreadyTracked = hasSessionDropOffMarker();
            if (alreadyTracked) {
                hasTrackedDropOffRef.current = true;
                return;
            }
            trackLocaleEvent("pre_conversion_dropoff", {
                source_format: (sourceFormat || "unknown").toLowerCase(),
            });
            setSessionDropOffMarker();
            hasTrackedDropOffRef.current = true;
        },
        [hasSessionDropOffMarker, setSessionDropOffMarker, trackLocaleEvent]
    );

    const handleFile = useCallback((f: File) => {
        const extension = getFileExtension(f.name);
        if (!isValidImage(f)) {
            trackLocaleEvent("file_selected", {
                is_valid_image: false,
                source_format: extension || "unknown",
            });
            setError(messages.invalidImage);
            return;
        }
        trackLocaleEvent("file_selected", {
            is_valid_image: true,
            source_format: extension || "unknown",
            file_size_bytes: f.size,
        });
        setFile(f);
        setPreviewUrl(URL.createObjectURL(f));
        setResult(null);
        setError("");
        setStatus("idle");
        setProgress(0);
        hasStartedConversionRef.current = false;
        retryAttemptRef.current = 0;
        setFailureCategory("");
        lastFailureCategoryRef.current = "";
    }, [messages.invalidImage, trackLocaleEvent]);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
        },
        [handleFile]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
        },
        [handleFile]
    );

    const handleConvert = useCallback(async () => {
        if (!file || !targetFormat) return;

        const sourceFormat = getFileExtension(file.name) || "unknown";
        const isRetry = status === "error";

        if (isRetry) {
            retryAttemptRef.current += 1;
            trackLocaleEvent("conversion_retry_started", {
                source_format: sourceFormat,
                target_format: targetFormat,
                retry_attempt: retryAttemptRef.current,
                previous_failure_category: lastFailureCategoryRef.current || "unknown",
            });
        }

        try {
            hasStartedConversionRef.current = true;
            trackLocaleEvent("conversion_started", {
                source_format: sourceFormat,
                target_format: targetFormat,
            });
            setStatus("converting");
            setProgress(20);
            setError("");
            setFailureCategory("");

            // Simulate progress while converting
            const progressInterval = setInterval(() => {
                setProgress((p) => Math.min(p + 15, 90));
            }, 150);

            const result = await convertFile(file, targetFormat);

            clearInterval(progressInterval);
            setProgress(100);
            setResult(result);
            setStatus("done");
            trackLocaleEvent("conversion_completed", {
                source_format: sourceFormat,
                target_format: result.format,
                duration_ms: Math.round(result.duration),
                original_size_bytes: result.originalSize,
                converted_size_bytes: result.convertedSize,
            });

            if (retryAttemptRef.current > 0) {
                trackLocaleEvent("conversion_retry_result", {
                    source_format: sourceFormat,
                    target_format: result.format,
                    retry_attempt: retryAttemptRef.current,
                    retry_outcome: "success",
                    previous_failure_category: lastFailureCategoryRef.current || "unknown",
                });
                retryAttemptRef.current = 0;
                lastFailureCategoryRef.current = "";
            }
            setFailureCategory("");
        } catch (err) {
            const failureCategory = classifyConversionError(err);
            setStatus("error");
            setError(err instanceof Error ? err.message : messages.unknownConversionError);
            trackLocaleEvent("conversion_failed", {
                source_format: sourceFormat,
                target_format: targetFormat,
                failure_category: failureCategory,
                error_name: err instanceof Error ? err.name : "UnknownError",
            });
            setFailureCategory(failureCategory);

            if (retryAttemptRef.current > 0) {
                trackLocaleEvent("conversion_retry_result", {
                    source_format: sourceFormat,
                    target_format: targetFormat,
                    retry_attempt: retryAttemptRef.current,
                    retry_outcome: "failed",
                    failure_category: failureCategory,
                });
            }

            lastFailureCategoryRef.current = failureCategory;
        }
    }, [file, messages.unknownConversionError, status, targetFormat, trackLocaleEvent]);

    const handleDownload = useCallback(() => {
        if (!result) return;
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        trackLocaleEvent("file_downloaded", {
            output_format: result.format,
            output_size_bytes: result.convertedSize,
        });
    }, [result, trackLocaleEvent]);

    const handleReset = useCallback(() => {
        setFile(null);
        setPreviewUrl("");
        setTargetFormat("");
        setStatus("idle");
        setProgress(0);
        setResult(null);
        setError("");
        setFailureCategory("");
        hasStartedConversionRef.current = false;
        retryAttemptRef.current = 0;
        lastFailureCategoryRef.current = "";
    }, []);

    useEffect(() => {
        if (!file) {
            return;
        }

        const sourceFormat = getFileExtension(file.name) || "unknown";
        const maybeTrackDropOff = () => {
            if (hasStartedConversionRef.current) {
                return;
            }
            trackPreConversionDropOff(sourceFormat);
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                maybeTrackDropOff();
            }
        };
        const handleBeforeUnload = () => {
            maybeTrackDropOff();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", maybeTrackDropOff);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pagehide", maybeTrackDropOff);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [file, trackPreConversionDropOff]);

    const sourceExt = file ? getFileExtension(file.name) : undefined;
    const recoveryFormats = useMemo(
        () => getRecoveryFormats(sourceExt, targetFormat),
        [sourceExt, targetFormat]
    );

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            {/* Dropzone */}
            {!file ? (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`dropzone ${isDragging ? "active" : ""} p-12 flex flex-col items-center justify-center gap-4 text-center min-h-[240px]`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                    />

                    {/* Upload icon */}
                    <div className="w-16 h-16 rounded-2xl bg-[var(--surface-200)] flex items-center justify-center animate-float">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 16V4M12 4L8 8M12 4L16 8"
                                stroke="var(--primary-400)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M20 16V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V16"
                                stroke="var(--text-muted)"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>

                    <div>
                        <p className="text-[var(--text-primary)] font-medium">
                            {messages.dropzoneTitle}
                        </p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            {messages.dropzoneFormats}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* File preview */}
                    <FilePreview
                        file={file}
                        previewUrl={previewUrl}
                        conversionResult={result ?? undefined}
                        onRemove={handleReset}
                        removeAriaLabel={messages.removeFileAriaLabel}
                    />

                    {/* Arrow indicator */}
                    <div className="flex justify-center">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-200)] flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path
                                    d="M8 3V13M8 13L4 9M8 13L12 9"
                                    stroke="var(--primary-400)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Format selector */}
                    <FormatSelector
                        sourceFormat={sourceExt}
                        selected={targetFormat}
                        messages={messages}
                        onSelect={(f: FormatInfo) => {
                            trackLocaleEvent("format_selected", {
                                source_format: sourceExt || "unknown",
                                target_format: f.extension,
                            });
                            setTargetFormat(f.extension);
                            setResult(null);
                            setStatus("idle");
                            setProgress(0);
                            setError("");
                            setFailureCategory("");
                        }}
                    />

                    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-200)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                        파일은 브라우저 안에서만 처리되며 서버로 업로드되지 않습니다.
                    </div>

                    {/* Progress */}
                    <ConversionProgress status={status} progress={progress} messages={messages} />

                    {/* Error */}
                    {error && (
                        <div className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-4 text-sm text-red-200">
                            <p className="font-semibold text-red-100">
                                {locale === "en" ? "Conversion failed." : "변환에 실패했어요."}
                            </p>
                            <p className="mt-1">{getFailureGuide(failureCategory, locale)}</p>
                            <p className="mt-2 text-red-300/90">{error}</p>
                            <p className="mt-2 text-red-300/90">
                                {locale === "en"
                                    ? "Your file was not uploaded to any server."
                                    : "파일은 서버로 업로드되지 않았습니다."}
                            </p>
                            {recoveryFormats.length > 0 && (
                                <div className="mt-3">
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-red-200/80">
                                        {locale === "en" ? "Try another format" : "다른 포맷으로 시도"}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {recoveryFormats.map((format) => (
                                            <button
                                                key={format}
                                                type="button"
                                                className="rounded-lg border border-red-200/30 bg-red-200/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-200/20"
                                                onClick={() => {
                                                    setTargetFormat(format);
                                                    setStatus("idle");
                                                    setProgress(0);
                                                    setError("");
                                                    setFailureCategory("");
                                                    trackLocaleEvent("format_selected", {
                                                        source_format: sourceExt || "unknown",
                                                        target_format: format,
                                                        selection_context: "error_recovery",
                                                    });
                                                }}
                                            >
                                                {format}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    {status === "done" && result && (
                        <p className="text-sm text-[var(--text-secondary)]">
                            {messages.trustMessage}
                        </p>
                    )}
                    <div className="flex gap-3">
                        {status === "done" && result ? (
                            <>
                                <Button onClick={handleDownload} size="lg" className="flex-1">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M12 4V16M12 16L8 12M12 16L16 12M4 20H20"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    {messages.downloadLabel(result.filename)}
                                </Button>
                                <Button onClick={handleReset} variant="secondary" size="lg">
                                    {messages.chooseAnotherFile}
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={handleConvert}
                                size="lg"
                                className="flex-1"
                                disabled={!targetFormat || status === "converting"}
                                isLoading={status === "converting"}
                            >
                                {!targetFormat
                                    ? messages.chooseFormatLabel
                                    : status === "error"
                                      ? locale === "en"
                                          ? "Retry with same settings"
                                          : "같은 설정으로 다시 시도"
                                      : messages.convertLabel(sourceExt ?? "", targetFormat)}
                            </Button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
