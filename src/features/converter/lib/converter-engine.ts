import { FORMAT_REGISTRY, getFileExtension } from "./format-registry";
import type { ConversionOptions, ConversionResult } from "../types";

/**
 * Core image conversion engine using Canvas API.
 * Runs 100% client-side — no server needed.
 */
export async function convertFile(
    file: File,
    targetFormat: string,
    options: ConversionOptions = {}
): Promise<ConversionResult> {
    const startTime = performance.now();
    const format = FORMAT_REGISTRY[targetFormat];

    if (!format) {
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }

    // Load image
    const imageBitmap = await createImageBitmap(file);

    // Determine dimensions
    let width = options.width || imageBitmap.width;
    let height = options.height || imageBitmap.height;

    if (options.width && options.maintainAspectRatio !== false && !options.height) {
        height = Math.round(
            (options.width / imageBitmap.width) * imageBitmap.height
        );
    }
    if (options.height && options.maintainAspectRatio !== false && !options.width) {
        width = Math.round(
            (options.height / imageBitmap.height) * imageBitmap.width
        );
    }

    // Create off-screen canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Failed to create canvas context");
    }

    // For JPEG, fill white background (no transparency)
    if (format.mimeType === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
    }

    // Draw image
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    // Special handling for ICO
    if (targetFormat === "ico") {
        const icoBlob = await createIco(canvas, ctx);
        const duration = performance.now() - startTime;
        const baseName = file.name.replace(/\.[^.]+$/, "");
        return {
            blob: icoBlob,
            filename: `${baseName}.ico`,
            originalSize: file.size,
            convertedSize: icoBlob.size,
            format: "ico",
            duration,
        };
    }

    // Convert using Canvas API
    const quality = options.quality ?? 0.92;
    const blob = await canvas.convertToBlob({
        type: format.mimeType,
        quality: format.mimeType === "image/png" ? undefined : quality,
    });

    const duration = performance.now() - startTime;
    const baseName = file.name.replace(/\.[^.]+$/, "");

    return {
        blob,
        filename: `${baseName}.${format.extension}`,
        originalSize: file.size,
        convertedSize: blob.size,
        format: targetFormat,
        duration,
    };
}

/**
 * Create a minimal ICO file from a canvas.
 * ICO requires specific binary format with BMP or PNG data inside.
 */
async function createIco(
    canvas: OffscreenCanvas,
    ctx: OffscreenCanvasRenderingContext2D
): Promise<Blob> {
    // Resize to common ICO sizes (use 32x32)
    const icoSize = 32;
    const icoCanvas = new OffscreenCanvas(icoSize, icoSize);
    const icoCtx = icoCanvas.getContext("2d")!;

    // Get image data from original canvas
    const sourceData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const tempCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(sourceData, 0, 0);

    icoCtx.drawImage(tempCanvas, 0, 0, icoSize, icoSize);

    // Encode as PNG inside ICO container
    const pngBlob = await icoCanvas.convertToBlob({ type: "image/png" });
    const pngArrayBuffer = await pngBlob.arrayBuffer();
    const pngData = new Uint8Array(pngArrayBuffer);

    // Build ICO container
    const headerSize = 6;
    const entrySize = 16;
    const icoBuffer = new ArrayBuffer(headerSize + entrySize + pngData.length);
    const view = new DataView(icoBuffer);

    // ICO Header
    view.setUint16(0, 0, true); // reserved
    view.setUint16(2, 1, true); // type: ICO
    view.setUint16(4, 1, true); // count: 1 image

    // ICO Entry
    view.setUint8(6, icoSize); // width
    view.setUint8(7, icoSize); // height
    view.setUint8(8, 0); // color palette
    view.setUint8(9, 0); // reserved
    view.setUint16(10, 1, true); // color planes
    view.setUint16(12, 32, true); // bits per pixel
    view.setUint32(14, pngData.length, true); // size of PNG data
    view.setUint32(18, headerSize + entrySize, true); // offset to PNG data

    // Write PNG data
    const icoArray = new Uint8Array(icoBuffer);
    icoArray.set(pngData, headerSize + entrySize);

    return new Blob([icoBuffer], { type: "image/x-icon" });
}

/**
 * Detect the format of a file from its extension.
 */
export function detectFormat(file: File): string {
    return getFileExtension(file.name);
}

/**
 * Check if a file is a valid image.
 */
export function isValidImage(file: File): boolean {
    return file.type.startsWith("image/");
}

/**
 * Format file size in human-readable form.
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
