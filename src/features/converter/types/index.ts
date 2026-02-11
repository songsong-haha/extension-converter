export interface ConversionOptions {
    quality?: number; // 0-1, for lossy formats
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
}

export interface ConversionResult {
    blob: Blob;
    filename: string;
    originalSize: number;
    convertedSize: number;
    format: string;
    duration: number; // ms
}

export type ConversionStatus = "idle" | "loading" | "converting" | "done" | "error";

export interface FileWithPreview {
    file: File;
    preview: string;
    id: string;
}
