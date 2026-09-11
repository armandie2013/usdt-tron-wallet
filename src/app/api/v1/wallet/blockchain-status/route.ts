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
  TronService,
} from "@/modules/blockchain/tron/tron.service";

export const runtime =
  "nodejs";

const tronService =
  new TronService();

export async function GET() {
  try {
    const user =
      await requireUser();

    const blockchain =
      await tronService
        .getBlockchainStatusForUser(
          user.id,
        );

    return NextResponse.json({
      success:
        true,

      blockchain,
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
      "[GET /api/v1/wallet/blockchain-status]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo consultar el estado de la blockchain.",
      },
      {
        status:
          500,
      },
    );
  }
}