import {
  NextResponse,
} from "next/server";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  requireAdmin,
} from "@/modules/auth/auth.guard";

import {
  TronSystemWalletService,
} from "@/modules/blockchain/tron/tron-system-wallet.service";

export const runtime =
  "nodejs";

const service =
  new TronSystemWalletService();

/*
 * ============================================================
 * GET /api/v1/admin/platform-wallet
 * ============================================================
 *
 * Devuelve el estado actual de la wallet propia
 * de la plataforma.
 *
 * IMPORTANTE:
 *
 * GET nunca devuelve:
 *
 * - mnemonic
 * - private key
 * - encryptedPrivateKey
 *
 * Si todavía no existe:
 *
 * wallet = null
 */

export async function GET() {
  try {
    await requireAdmin();

    const wallet =
      await service
        .getPlatformTreasuryStatus();

    return NextResponse.json({
      success:
        true,

      wallet,
    });
  } catch (
    error
  ) {
    if (
      error instanceof
        AppError
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            error.code,

          message:
            error.message,
        },
        {
          status:
            error.statusCode,
        },
      );
    }

    console.error(
      "[GET /api/v1/admin/platform-wallet]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo consultar la wallet de la plataforma.",
      },
      {
        status:
          500,
      },
    );
  }
}

/*
 * ============================================================
 * POST /api/v1/admin/platform-wallet
 * ============================================================
 *
 * Crea la wallet propia de la plataforma si todavía
 * no existe.
 *
 * Es idempotente:
 *
 * - si no existe:
 *   crea la wallet;
 *   devuelve createdNow = true;
 *   devuelve recovery.mnemonic UNA SOLA VEZ.
 *
 * - si ya existe:
 *   devuelve createdNow = false;
 *   devuelve recovery = null.
 *
 * IMPORTANTE:
 *
 * La mnemonic no se persiste.
 * La private key no se devuelve.
 */

export async function POST() {
  try {
    await requireAdmin();

    const wallet =
      await service
        .getOrCreatePlatformTreasury();

    const createdNow =
      wallet.createdNow ===
      true;

    return NextResponse.json({
      success:
        true,

      message:
        createdNow
          ? "Wallet de plataforma creada correctamente. Guardá ahora la frase de recuperación."
          : "La wallet de plataforma ya existía.",

      wallet,
    });
  } catch (
    error
  ) {
    if (
      error instanceof
        AppError
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            error.code,

          message:
            error.message,
        },
        {
          status:
            error.statusCode,
        },
      );
    }

    console.error(
      "[POST /api/v1/admin/platform-wallet]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo crear la wallet de la plataforma.",
      },
      {
        status:
          500,
      },
    );
  }
}