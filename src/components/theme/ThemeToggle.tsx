"use client";

import {
  MoonStar,
  Sun,
} from "lucide-react";

import {
  useTheme,
} from "@/components/theme/ThemeProvider";

interface ThemeToggleProps {
  className?: string;

  compact?: boolean;
}

export default function ThemeToggle({
  className = "",
  compact = false,
}: ThemeToggleProps) {
  const {
    theme,
    mounted,
    toggleTheme,
  } =
    useTheme();

  const isDark =
    theme ===
    "dark";

  const title =
    isDark
      ? "Cambiar a modo claro"
      : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      onClick={
        toggleTheme
      }
      disabled={
        !mounted
      }
      title={
        title
      }
      aria-label={
        title
      }
      className={`
        theme-toggle
        inline-flex
        shrink-0
        items-center
        justify-center
        rounded-xl
        transition
        duration-150
        active:scale-[0.96]
        disabled:cursor-default
        disabled:opacity-70
        ${
          compact
            ? "h-9 w-9"
            : "h-10 w-10"
        }
        ${className}
      `}
    >
      {!mounted ? (
        <span className="h-[18px] w-[18px]" />
      ) : isDark ? (
        <Sun
          className="h-[18px] w-[18px]"
          strokeWidth={1.8}
        />
      ) : (
        <MoonStar
          className="h-[18px] w-[18px]"
          strokeWidth={1.8}
        />
      )}
    </button>
  );
}