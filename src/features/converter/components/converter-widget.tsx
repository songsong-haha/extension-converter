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
import {
    CONVERTER_MESSAGES,
    type ConverterMessages,
    type Locale,
} from "@/i18n/messages";

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

function getActiveThemeMode(): "light" | "dark" | "unknown" {
    if (typeof document === "undefined") {
        return "unknown";
    }

    const theme = document.documentElement.dataset.theme;
    if (theme === "light" || theme === "dark") {
        return theme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getFailureGuide(category: string, messages: ConverterMessages): string {
    return (
        messages.failureGuides[category] ??
        messages.failureGuides.unknown ??
        messages.unknownConversionError
    );
}

function getRecoveryFormats(
    sourceFormat?: string,
    targetFormat?: string,
    failureCategory?: string
): string[] {
    const source = (sourceFormat || "").toLowerCase();
    const currentTarget = (targetFormat || "").toLowerCase();
    const byFailure: Record<string, string[]> = {
        unsupported_target_format: ["png", "jpg", "webp", "bmp", "avif"],
        canvas_context_unavailable: ["jpg", "webp", "png", "bmp", "avif"],
        memory_limit_exceeded: ["jpg", "webp", "png", "bmp", "avif"],
        image_decode_failed: ["png", "jpg", "webp", "bmp", "avif"],
        conversion_aborted: ["webp", "png", "jpg", "avif", "bmp"],
        conversion_runtime_error: ["webp", "png", "jpg", "avif", "bmp"],
        unknown: ["webp", "png", "jpg", "avif", "bmp"],
    };
    const preferred =
        byFailure[(failureCategory || "").toLowerCase()] ??
        byFailure.unknown ??
        ["webp", "png", "jpg", "avif", "bmp"];

    return preferred
        .filter((format) => format !== source && format !== currentTarget)
        .slice(0, 3);
}

const PREVIEW_MAX_EDGE = 320;
const PREVIEW_MIN_REDUCTION_RATIO = 0.1;
const PREVIEW_QUALITY = 0.82;
type PreviewOptimizationReason =
    | "unsupported_type"
    | "original_small_enough"
    | "canvas_context_unavailable"
    | "encode_failed"
    | "insufficient_reduction"
    | "optimization_error";

interface PreviewBuildResult {
    url: string;
    optimized: boolean;
    bytes: number;
    format: string;
    reason?: PreviewOptimizationReason;
    durationMs: number;
    originalWidth?: number;
    originalHeight?: number;
    previewWidth?: number;
    previewHeight?: number;
}

function canOptimizePreview(fileType: string): boolean {
    return (
        fileType === "image/jpeg" ||
        fileType === "image/png" ||
        fileType === "image/webp" ||
        fileType === "image/avif"
    );
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
    });
}

async function buildPreviewImage(
    file: File
): Promise<PreviewBuildResult> {
    const originalUrl = URL.createObjectURL(file);
    const buildStart = performance.now();

    const withDuration = (result: Omit<PreviewBuildResult, "durationMs">): PreviewBuildResult => ({
        ...result,
        durationMs: Math.round(performance.now() - buildStart),
    });

    if (typeof window === "undefined" || !canOptimizePreview(file.type)) {
        return withDuration({
            url: originalUrl,
            optimized: false,
            bytes: file.size,
            format: file.type || "unknown",
            reason: "unsupported_type",
        });
    }

    let bitmap: ImageBitmap | null = null;
    try {
        bitmap = await createImageBitmap(file);
        const longestEdge = Math.max(bitmap.width, bitmap.height);
        const scale = Math.min(1, PREVIEW_MAX_EDGE / longestEdge);

        if (scale === 1) {
            return withDuration({
                url: originalUrl,
                optimized: false,
                bytes: file.size,
                format: file.type || "unknown",
                reason: "original_small_enough",
                originalWidth: bitmap.width,
                originalHeight: bitmap.height,
                previewWidth: bitmap.width,
                previewHeight: bitmap.height,
            });
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
            return withDuration({
                url: originalUrl,
                optimized: false,
                bytes: file.size,
                format: file.type || "unknown",
                reason: "canvas_context_unavailable",
                originalWidth: bitmap.width,
                originalHeight: bitmap.height,
                previewWidth: canvas.width,
                previewHeight: canvas.height,
            });
        }

        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const optimizedBlob = await canvasToBlob(canvas, PREVIEW_QUALITY);
        if (!optimizedBlob) {
            return withDuration({
                url: originalUrl,
                optimized: false,
                bytes: file.size,
                format: file.type || "unknown",
                reason: "encode_failed",
                originalWidth: bitmap.width,
                originalHeight: bitmap.height,
                previewWidth: canvas.width,
                previewHeight: canvas.height,
            });
        }

        const reducedRatio = file.size > 0 ? (file.size - optimizedBlob.size) / file.size : 0;
        if (reducedRatio < PREVIEW_MIN_REDUCTION_RATIO) {
            return withDuration({
                url: originalUrl,
                optimized: false,
                bytes: file.size,
                format: file.type || "unknown",
                reason: "insufficient_reduction",
                originalWidth: bitmap.width,
                originalHeight: bitmap.height,
                previewWidth: canvas.width,
                previewHeight: canvas.height,
            });
        }

        const optimizedUrl = URL.createObjectURL(optimizedBlob);
        URL.revokeObjectURL(originalUrl);
        return withDuration({
            url: optimizedUrl,
            optimized: true,
            bytes: optimizedBlob.size,
            format: optimizedBlob.type || "image/webp",
            originalWidth: bitmap.width,
            originalHeight: bitmap.height,
            previewWidth: canvas.width,
            previewHeight: canvas.height,
        });
    } catch {
        return withDuration({
            url: originalUrl,
            optimized: false,
            bytes: file.size,
            format: file.type || "unknown",
            reason: "optimization_error",
        });
    } finally {
        bitmap?.close();
    }
}

export default function ConverterWidget({ locale }: ConverterWidgetProps) {
    const PRE_CONVERSION_DROPOFF_SESSION_KEY = "pre_conversion_dropoff_tracked";
    const formatSelectionGuidanceExperiment =
        process.env.NEXT_PUBLIC_FORMAT_SELECTION_GUIDANCE_EXPERIMENT ?? "variant";
    const experimentVariant = formatSelectionGuidanceExperiment.toLowerCase();
    const isFormatGuidanceVariant = experimentVariant !== "control";
    const messages = CONVERTER_MESSAGES[locale];
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [targetFormat, setTargetFormat] = useState<string>("");
    const [status, setStatus] = useState<ConversionStatus>("idle");
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ConversionResult | null>(null);
    const [hasDownloadedResult, setHasDownloadedResult] = useState(false);
    const [isPostConversionAdReady, setIsPostConversionAdReady] = useState(false);
    const [isPostConversionAdDismissed, setIsPostConversionAdDismissed] = useState(false);
    const [error, setError] = useState<string>("");
    const [failureCategory, setFailureCategory] = useState<string>("");
    const [isDragging, setIsDragging] = useState(false);
    const hasStartedConversionRef = useRef(false);
    const hasTrackedDropOffRef = useRef(false);
    const retryAttemptRef = useRef(0);
    const lastFailureCategoryRef = useRef<string>("");
    const hasTrackedGuidanceExposureRef = useRef(false);
    const selectedFromGuidanceRef = useRef(false);
    const previewUrlRef = useRef<string>("");
    const postConversionAdImpressionTrackedRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const trackLocaleEvent = useCallback(
        (eventName: AnalyticsEventName, params: AnalyticsParams = {}) => {
            trackEvent(eventName, {
                locale,
                theme_mode: getActiveThemeMode(),
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

    const updatePreviewUrl = useCallback((url: string) => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = url;
        setPreviewUrl(url);
    }, []);

    const clearPreviewUrl = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = "";
        }
        setPreviewUrl("");
    }, []);

    const handleFile = useCallback(async (f: File) => {
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

        const preview = await buildPreviewImage(f);
        const reductionRatio = f.size > 0 ? Number(((f.size - preview.bytes) / f.size).toFixed(4)) : 0;

        trackLocaleEvent("preview_image_optimization_evaluated", {
            source_format: extension || "unknown",
            original_size_bytes: f.size,
            preview_size_bytes: preview.bytes,
            preview_format: preview.format,
            optimized: preview.optimized,
            optimization_reason: preview.reason || "optimized",
            reduction_ratio: reductionRatio,
            preview_build_ms: preview.durationMs,
            original_width: preview.originalWidth,
            original_height: preview.originalHeight,
            preview_width: preview.previewWidth,
            preview_height: preview.previewHeight,
        });

        if (preview.optimized) {
            trackLocaleEvent("preview_image_optimized", {
                source_format: extension || "unknown",
                original_size_bytes: f.size,
                preview_size_bytes: preview.bytes,
                preview_format: preview.format,
                reduction_ratio: reductionRatio,
                preview_build_ms: preview.durationMs,
            });
        }

        setFile(f);
        updatePreviewUrl(preview.url);
        setResult(null);
        setHasDownloadedResult(false);
        setIsPostConversionAdReady(false);
        setIsPostConversionAdDismissed(false);
        setError("");
        setStatus("idle");
        setProgress(0);
        hasStartedConversionRef.current = false;
        retryAttemptRef.current = 0;
        setFailureCategory("");
        lastFailureCategoryRef.current = "";
        postConversionAdImpressionTrackedRef.current = false;
        hasTrackedGuidanceExposureRef.current = false;
        selectedFromGuidanceRef.current = false;
    }, [messages.invalidImage, trackLocaleEvent, updatePreviewUrl]);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) {
                void handleFile(f);
            }
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
            if (f) {
                void handleFile(f);
            }
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
            setHasDownloadedResult(false);
            setIsPostConversionAdReady(false);
            setIsPostConversionAdDismissed(false);
            setStatus("done");
            trackLocaleEvent("conversion_completed", {
                source_format: sourceFormat,
                target_format: result.format,
                duration_ms: Math.round(result.duration),
                original_size_bytes: result.originalSize,
                converted_size_bytes: result.convertedSize,
            });
            postConversionAdImpressionTrackedRef.current = false;

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
                const previousFailureCategory = lastFailureCategoryRef.current || failureCategory;
                trackLocaleEvent("conversion_retry_result", {
                    source_format: sourceFormat,
                    target_format: targetFormat,
                    retry_attempt: retryAttemptRef.current,
                    retry_outcome: "failed",
                    previous_failure_category: previousFailureCategory,
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
        setIsPostConversionAdDismissed(false);
        setHasDownloadedResult(true);
    }, [result, trackLocaleEvent]);

    const handleReset = useCallback(() => {
        setFile(null);
        clearPreviewUrl();
        setTargetFormat("");
        setStatus("idle");
        setProgress(0);
        setResult(null);
        setHasDownloadedResult(false);
        setIsPostConversionAdReady(false);
        setIsPostConversionAdDismissed(false);
        setError("");
        setFailureCategory("");
        hasStartedConversionRef.current = false;
        retryAttemptRef.current = 0;
        lastFailureCategoryRef.current = "";
        postConversionAdImpressionTrackedRef.current = false;
        hasTrackedGuidanceExposureRef.current = false;
        selectedFromGuidanceRef.current = false;
    }, [clearPreviewUrl]);

    useEffect(() => {
        if (!file || !isFormatGuidanceVariant || hasTrackedGuidanceExposureRef.current) {
            return;
        }

        trackLocaleEvent("format_guidance_exposed", {
            source_format: (getFileExtension(file.name) || "unknown").toLowerCase(),
            experiment_variant: experimentVariant,
        });
        hasTrackedGuidanceExposureRef.current = true;
    }, [experimentVariant, file, isFormatGuidanceVariant, trackLocaleEvent]);

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
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
        () => getRecoveryFormats(sourceExt, targetFormat, failureCategory),
        [failureCategory, sourceExt, targetFormat]
    );
    const recommendedRecoveryFormat = recoveryFormats[0];
    const shouldShowPostConversionAd =
        status === "done" &&
        Boolean(result) &&
        hasDownloadedResult &&
        isPostConversionAdReady &&
        !isPostConversionAdDismissed;

    useEffect(() => {
        if (!hasDownloadedResult || status !== "done" || isPostConversionAdReady) {
            return;
        }

        const timer = window.setTimeout(() => {
            setIsPostConversionAdReady(true);
        }, 800);

        return () => {
            window.clearTimeout(timer);
        };
    }, [hasDownloadedResult, isPostConversionAdReady, status]);

    useEffect(() => {
        if (!shouldShowPostConversionAd || postConversionAdImpressionTrackedRef.current || !result) {
            return;
        }

        trackLocaleEvent("post_conversion_ad_impression", {
            source_format: sourceExt || "unknown",
            target_format: result.format,
            placement: "converter_post_conversion",
        });
        postConversionAdImpressionTrackedRef.current = true;
    }, [hasDownloadedResult, result, shouldShowPostConversionAd, sourceExt, trackLocaleEvent]);

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
                        showGuidance={isFormatGuidanceVariant}
                        selected={targetFormat}
                        messages={messages}
                        onGuidanceQuickSelect={(f: FormatInfo) => {
                            selectedFromGuidanceRef.current = true;
                            trackLocaleEvent("format_guidance_quick_selected", {
                                source_format: sourceExt || "unknown",
                                recommended_target_format: f.extension,
                                experiment_variant: experimentVariant,
                            });
                        }}
                        onSelect={(f: FormatInfo) => {
                            const selectedFromGuidance = selectedFromGuidanceRef.current;
                            if (isFormatGuidanceVariant && !selectedFromGuidance) {
                                trackLocaleEvent("format_guidance_bypassed", {
                                    source_format: sourceExt || "unknown",
                                    target_format: f.extension,
                                    experiment_variant: experimentVariant,
                                });
                            }
                            trackLocaleEvent("format_selected", {
                                source_format: sourceExt || "unknown",
                                target_format: f.extension,
                                selected_from_guidance: selectedFromGuidance,
                                experiment_variant: experimentVariant,
                            });
                            selectedFromGuidanceRef.current = false;
                            setTargetFormat(f.extension);
                            setResult(null);
                            setHasDownloadedResult(false);
                            setStatus("idle");
                            setProgress(0);
                            setError("");
                            setFailureCategory("");
                        }}
                    />

                    <div
                        className="rounded-xl border border-[var(--glass-border)] theme-surface-panel px-4 py-3 text-sm text-[var(--text-secondary)]"
                        data-testid="processing-trust-message"
                    >
                        {messages.processingTrustMessage}
                    </div>

                    {/* Progress */}
                    <ConversionProgress status={status} progress={progress} messages={messages} />

                    {/* Error */}
                    {error && (
                        <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-4 text-sm text-[var(--danger-text-secondary)]">
                            <p className="font-semibold text-[var(--danger-text-primary)]">
                                {messages.conversionFailedHeading}
                            </p>
                            <p className="mt-1">{getFailureGuide(failureCategory, messages)}</p>
                            <p className="mt-2 text-[var(--danger-text-secondary)]">{error}</p>
                            <p className="mt-2 text-[var(--danger-text-secondary)]">{messages.errorUploadSafetyMessage}</p>
                            {recoveryFormats.length > 0 && (
                                <div className="mt-3">
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--danger-text-secondary)]/90">
                                        {messages.recoveryFormatsHeading}
                                    </p>
                                    {recommendedRecoveryFormat && (
                                        <p className="mb-2 text-xs text-[var(--danger-text-secondary)]">
                                            {messages.recoveryRecommendedFormat(recommendedRecoveryFormat)}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {recoveryFormats.map((format) => (
                                            <button
                                                key={format}
                                                type="button"
                                                className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--danger-text-primary)] transition hover:bg-[var(--glass-hover)]"
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
                                                        failure_category: failureCategory || "unknown",
                                                        is_recommended_recovery:
                                                            format === recommendedRecoveryFormat,
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
                        <p className="text-sm text-[var(--text-secondary)]" data-testid="result-trust-message">
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
                                      ? messages.retrySameSettingsLabel
                                      : messages.convertLabel(sourceExt ?? "", targetFormat)}
                            </Button>
                        )}
                    </div>
                    {shouldShowPostConversionAd && (
                        <aside
                            className="rounded-xl border border-[var(--glass-border)] theme-surface-panel px-4 py-4"
                            data-testid="post-conversion-ad-slot"
                        >
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                {messages.postConversionAdBadge}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                                {messages.postConversionAdTitle}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                {messages.postConversionAdDescription}
                            </p>
                            <a
                                className="theme-surface-interactive mt-3 inline-flex items-center rounded-lg border border-[var(--primary-400)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition"
                                href={messages.postConversionAdHref}
                                target="_blank"
                                rel="sponsored noopener noreferrer"
                                onClick={() => {
                                    trackLocaleEvent("post_conversion_ad_click", {
                                        source_format: sourceExt || "unknown",
                                        target_format: result?.format || "unknown",
                                        placement: "converter_post_conversion",
                                    });
                                }}
                            >
                                {messages.postConversionAdCtaLabel}
                            </a>
                            <button
                                type="button"
                                className="mt-3 block text-xs text-[var(--text-muted)] underline-offset-2 transition hover:text-[var(--text-secondary)] hover:underline"
                                onClick={() => {
                                    setIsPostConversionAdDismissed(true);
                                    trackLocaleEvent("post_conversion_ad_dismissed", {
                                        source_format: sourceExt || "unknown",
                                        target_format: result?.format || "unknown",
                                        placement: "converter_post_conversion",
                                    });
                                }}
                            >
                                {messages.postConversionAdDismissLabel}
                            </button>
                        </aside>
                    )}
                </>
            )}
        </div>
    );
}
