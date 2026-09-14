import {
  NextResponse,
} from "next/server";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  requireUser,
} from "@/modules/auth/auth.guard";

import {
  DepositService,
} from "@/modules/deposits/deposit.service";

export const runtime =
  "nodejs";

const depositService =
  new DepositService();

/*
 * ============================================================
 * POST /api/v1/wallet/sync-deposits
 * ============================================================
 *
 * Compatibilidad temporal.
 *
 * Este endpoint ya NO acredita depósitos ni modifica balances.
 *
 * Únicamente consulta:
 *
 * - transferencias TRC20 confirmadas;
 * - saldo USDT real de la wallet;
 * - información on-chain.
 *
 * La fuente de verdad es TRON.
 */

export async function POST() {
  try {
    const user =
      await requireUser();

    const result =
      await depositService
        .syncUserDeposits(
          user.id,
        );

    return NextResponse.json({
      success:
        true,

      source:
        "TRON",

      message:
        result.found > 0
          ? `Se encontraron ${result.found} transferencias USDT confirmadas.`
          : "No se encontraron transferencias USDT confirmadas.",

      result,
    });
  } catch (error) {
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
      "[POST /api/v1/wallet/sync-deposits]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo consultar el estado on-chain de la wallet.",
      },
      {
        status:
          500,
      },
    );
  }
}