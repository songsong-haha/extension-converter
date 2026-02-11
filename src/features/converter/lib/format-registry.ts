export interface FormatInfo {
    extension: string;
    mimeType: string;
    label: string;
    category: "image";
    canvasSupported: boolean;
    color: string;
}

export const FORMAT_REGISTRY: Record<string, FormatInfo> = {
    png: {
        extension: "png",
        mimeType: "image/png",
        label: "PNG",
        category: "image",
        canvasSupported: true,
        color: "#3b82f6",
    },
    jpg: {
        extension: "jpg",
        mimeType: "image/jpeg",
        label: "JPG",
        category: "image",
        canvasSupported: true,
        color: "#ef4444",
    },
    jpeg: {
        extension: "jpeg",
        mimeType: "image/jpeg",
        label: "JPEG",
        category: "image",
        canvasSupported: true,
        color: "#ef4444",
    },
    webp: {
        extension: "webp",
        mimeType: "image/webp",
        label: "WebP",
        category: "image",
        canvasSupported: true,
        color: "#22c55e",
    },
    gif: {
        extension: "gif",
        mimeType: "image/gif",
        label: "GIF",
        category: "image",
        canvasSupported: true,
        color: "#f59e0b",
    },
    bmp: {
        extension: "bmp",
        mimeType: "image/bmp",
        label: "BMP",
        category: "image",
        canvasSupported: true,
        color: "#8b5cf6",
    },
    avif: {
        extension: "avif",
        mimeType: "image/avif",
        label: "AVIF",
        category: "image",
        canvasSupported: true,
        color: "#06b6d4",
    },
    ico: {
        extension: "ico",
        mimeType: "image/x-icon",
        label: "ICO",
        category: "image",
        canvasSupported: false, // needs special handling
        color: "#ec4899",
    },
};

export const IMAGE_FORMATS = Object.values(FORMAT_REGISTRY).filter(
    (f) => f.category === "image"
);

// Deduplicate (jpg/jpeg)
export const UNIQUE_TARGET_FORMATS = IMAGE_FORMATS.filter(
    (f) => f.extension !== "jpeg"
);

export function getFormatFromExtension(ext: string): FormatInfo | undefined {
    return FORMAT_REGISTRY[ext.toLowerCase().replace(".", "")];
}

export function getFormatFromMime(mime: string): FormatInfo | undefined {
    return Object.values(FORMAT_REGISTRY).find((f) => f.mimeType === mime);
}

export function getFileExtension(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() || "";
}
