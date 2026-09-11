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

      message:
        result.credited > 0
          ? "Depósitos sincronizados correctamente."
          : "No se encontraron depósitos nuevos.",

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
          "No se pudieron sincronizar los depósitos.",
      },
      {
        status:
          500,
      },
    );
  }
}