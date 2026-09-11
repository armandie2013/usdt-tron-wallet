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
  WalletService,
} from "@/modules/wallets/wallet.service";

export const runtime =
  "nodejs";

const walletService =
  new WalletService();

export async function GET() {
  try {
    const user =
      await requireUser();

    const wallet =
      await walletService
        .getUserWallet(
          user.id,
        );

    return NextResponse.json({
      success:
        true,

      wallet,
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
      "[GET /api/v1/wallet]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "Se produjo un error interno.",
      },
      {
        status:
          500,
      },
    );
  }
}