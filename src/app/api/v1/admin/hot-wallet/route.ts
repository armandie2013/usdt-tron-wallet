import {
  NextResponse,
} from "next/server";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  requireAdmin,
} from "@/modules/auth/auth.guard";

export const runtime =
  "nodejs";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0",

  Pragma:
    "no-cache",
} as const;

const RETIRED_ENDPOINT_RESPONSE = {
  success:
    false,

  error:
    "HOT_WALLET_RETIRED",

  message:
    "La hot wallet heredada fue retirada. Usá /api/v1/admin/platform-wallet.",
} as const;

async function handleRetiredEndpoint() {
  try {
    await requireAdmin();

    return NextResponse.json(
      RETIRED_ENDPOINT_RESPONSE,
      {
        status:
          410,

        headers:
          PRIVATE_NO_STORE_HEADERS,
      },
    );
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

          headers:
            PRIVATE_NO_STORE_HEADERS,
        },
      );
    }

    console.error(
      "[/api/v1/admin/hot-wallet]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo procesar la solicitud.",
      },
      {
        status:
          500,

        headers:
          PRIVATE_NO_STORE_HEADERS,
      },
    );
  }
}

export async function GET() {
  return handleRetiredEndpoint();
}

export async function POST() {
  return handleRetiredEndpoint();
}
