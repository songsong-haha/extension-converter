"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: [
        "bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-600)]",
        "text-white font-semibold",
        "hover:from-[var(--primary-400)] hover:to-[var(--primary-500)]",
        "shadow-lg hover:shadow-[var(--shadow-glow)]",
        "active:scale-[0.97]",
    ].join(" "),
    secondary: [
        "bg-[var(--glass-bg)] backdrop-blur-xl",
        "border border-[var(--glass-border)]",
        "text-[var(--text-primary)]",
        "hover:bg-[var(--glass-hover)] hover:border-[var(--glass-border-strong)]",
        "active:scale-[0.97]",
    ].join(" "),
    ghost: [
        "bg-transparent",
        "text-[var(--text-secondary)]",
        "hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]",
        "active:scale-[0.97]",
    ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-4 py-2 text-sm rounded-lg gap-1.5",
    md: "px-6 py-3 text-base rounded-xl gap-2",
    lg: "px-8 py-4 text-lg rounded-2xl gap-2.5",
};

export default function Button({
    variant = "primary",
    size = "md",
    isLoading = false,
    children,
    className = "",
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            className={[
                "inline-flex items-center justify-center",
                "transition-all duration-200 ease-[var(--ease-spring)]",
                "cursor-pointer select-none",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                variantStyles[variant],
                sizeStyles[size],
                className,
            ].join(" ")}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg
                    className="animate-spin -ml-1 h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
}
