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

export async function GET() {
  try {
    await requireAdmin();

    const wallet =
      await service
        .getHotWalletStatus();

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
      "[GET /api/v1/admin/hot-wallet]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo consultar la hot wallet.",
      },
      {
        status:
          500,
      },
    );
  }
}

export async function POST() {
  try {
    await requireAdmin();

    const wallet =
      await service
        .getOrCreateHotWallet();

    return NextResponse.json({
      success:
        true,

      message:
        "Hot wallet disponible.",

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
      "[POST /api/v1/admin/hot-wallet]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo crear la hot wallet.",
      },
      {
        status:
          500,
      },
    );
  }
}