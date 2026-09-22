// import {
//   NextResponse,
// } from "next/server";

// export const runtime = "nodejs";

// export async function GET() {
//   return NextResponse.json(
//     {
//       success: false,
//       error: "NOT_IMPLEMENTED",
//       message:
//         "La administración de retiros todavía no fue implementada.",
//     },
//     {
//       status: 501,
//     },
//   );
// }

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

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json(
      {
        success:
          false,

        error:
          "NON_CUSTODIAL_WITHDRAWAL_DISABLED",

        message:
          "La administración de retiros custodiales fue retirada del modelo no-custodial.",
      },
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
      "[GET /api/v1/admin/withdrawals]",
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
