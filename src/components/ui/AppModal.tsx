"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  X,
} from "lucide-react";

export type AppModalVariant =
  | "error"
  | "warning"
  | "success"
  | "info";

interface AppModalProps {
  open:
    boolean;

  title:
    string;

  message:
    string;

  variant?:
    AppModalVariant;

  confirmLabel?:
    string;

  onClose:
    () => void;

  closeOnBackdrop?:
    boolean;
}

/*
 * ============================================================
 * ESTILOS POR VARIANTE
 * ============================================================
 */

function getVariantStyles(
  variant:
    AppModalVariant,
) {
  switch (
    variant
  ) {
    case "error":
      return {
        icon:
          ShieldAlert,

        iconWrapper:
          "border-red-400/20 bg-red-400/10",

        iconColor:
          "text-red-300",

        glow:
          "bg-red-400/10",

        button:
          "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_8px_26px_-8px_rgba(244,63,94,0.55)] hover:brightness-110",
      };

    case "warning":
      return {
        icon:
          AlertTriangle,

        iconWrapper:
          "border-amber-400/20 bg-amber-400/10",

        iconColor:
          "text-amber-300",

        glow:
          "bg-amber-400/10",

        button:
          "bg-gradient-to-r from-amber-400 to-orange-400 text-[#2a1700] shadow-[0_8px_26px_-8px_rgba(251,191,36,0.5)] hover:brightness-105",
      };

    case "success":
      return {
        icon:
          CheckCircle2,

        iconWrapper:
          "border-emerald-400/20 bg-emerald-400/10",

        iconColor:
          "text-emerald-300",

        glow:
          "bg-emerald-400/10",

        button:
          "bg-gradient-to-r from-emerald-400 to-teal-400 text-[#00251c] shadow-[0_8px_26px_-8px_rgba(52,211,153,0.5)] hover:brightness-105",
      };

    case "info":
    default:
      return {
        icon:
          Info,

        iconWrapper:
          "border-cyan-400/20 bg-cyan-400/10",

        iconColor:
          "text-cyan-300",

        glow:
          "bg-cyan-400/10",

        button:
          "bg-gradient-to-r from-[#00a9d9] to-[#00dce6] text-[#002022] shadow-[0_8px_26px_-8px_rgba(0,220,230,0.45)] hover:brightness-110",
      };
  }
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function AppModal({
  open,
  title,
  message,
  variant =
    "info",
  confirmLabel =
    "Entendido",
  onClose,
  closeOnBackdrop =
    true,
}: AppModalProps) {
  if (
    !open
  ) {
    return null;
  }

  const styles =
    getVariantStyles(
      variant,
    );

  const Icon =
    styles.icon;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
      aria-describedby="app-modal-message"
      onMouseDown={(
        event,
      ) => {
        if (
          !closeOnBackdrop
        ) {
          return;
        }

        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section className="relative w-full max-w-[390px] overflow-hidden rounded-[26px] border border-white/[0.08] bg-[rgba(14,25,45,0.96)] shadow-[0_30px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        {/*
         * ======================================================
         * GLOW
         * ======================================================
         */}

        <div
          className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl ${styles.glow}`}
        />

        <div className="relative p-5 sm:p-6">
          {/*
           * ====================================================
           * CERRAR
           * ====================================================
           */}

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-[#849495] transition hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/*
           * ====================================================
           * ICONO
           * ====================================================
           */}

          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${styles.iconWrapper}`}
          >
            <Icon
              className={`h-6 w-6 ${styles.iconColor}`}
            />
          </div>

          {/*
           * ====================================================
           * TEXTO
           * ====================================================
           */}

          <div className="mt-5 pr-4">
            <h2
              id="app-modal-title"
              className="text-[18px] font-semibold leading-6 text-[#dee2f6]"
            >
              {title}
            </h2>

            <p
              id="app-modal-message"
              className="mt-2 whitespace-pre-line text-[13px] leading-6 text-[#b9cacb]"
            >
              {message}
            </p>
          </div>

          {/*
           * ====================================================
           * BOTÓN
           * ====================================================
           */}

          <button
            type="button"
            onClick={
              onClose
            }
            className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}