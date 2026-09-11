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

    const account =
      await tronService
        .getOrCreateAccountForUser(
          user.id,
        );

    return NextResponse.json({
      success:
        true,

      deposit: {
        asset:
          "USDT",

        network:
          "TRC20",

        tronNetwork:
          account.network,

        address:
          account.address,

        addressHex:
          account.addressHex,

        qrDataUrl:
          account.qrDataUrl,

        createdAt:
          account.createdAt,
      },
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
      "[GET /api/v1/wallet/deposit-address]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo obtener la dirección de depósito.",
      },
      {
        status:
          500,
      },
    );
  }
}