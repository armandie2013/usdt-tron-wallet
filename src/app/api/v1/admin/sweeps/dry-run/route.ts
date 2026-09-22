// import {
//   NextResponse,
// } from "next/server";

// import {
//   AppError,
// } from "@/lib/errors/app-error";

// import {
//   requireAdmin,
// } from "@/modules/auth/auth.guard";

// import {
//   SweepService,
// } from "@/modules/sweeps/sweep.service";

// export const runtime =
//   "nodejs";

// const service =
//   new SweepService();

// export async function GET(
//   request:
//     Request,
// ) {
//   try {
//     await requireAdmin();

//     const url =
//       new URL(
//         request.url,
//       );

//     const rawPage =
//       Number.parseInt(
//         url.searchParams.get(
//           "page",
//         ) ??
//           "1",
//         10,
//       );

//     const rawPageSize =
//       Number.parseInt(
//         url.searchParams.get(
//           "pageSize",
//         ) ??
//           "50",
//         10,
//       );

//     const page =
//       Number.isFinite(
//         rawPage,
//       ) &&
//       rawPage > 0
//         ? rawPage
//         : 1;

//     const pageSize =
//       Math.min(
//         Math.max(
//           Number.isFinite(
//             rawPageSize,
//           )
//             ? rawPageSize
//             : 50,

//           1,
//         ),

//         100,
//       );

//     const result =
//       await service.dryRun(
//         page,
//         pageSize,
//       );

//     return NextResponse.json({
//       success:
//         true,

//       dryRun:
//         true,

//       result,
//     });
//   } catch (error) {
//     if (
//       error instanceof
//       AppError
//     ) {
//       return NextResponse.json(
//         {
//           success:
//             false,

//           error:
//             error.code,

//           message:
//             error.message,
//         },
//         {
//           status:
//             error.statusCode,
//         },
//       );
//     }

//     console.error(
//       "[GET /api/v1/admin/sweeps/dry-run]",
//       error,
//     );

//     return NextResponse.json(
//       {
//         success:
//           false,

//         error:
//           "INTERNAL_SERVER_ERROR",

//         message:
//           "No se pudo ejecutar la simulación de sweep.",
//       },
//       {
//         status:
//           500,
//       },
//     );
//   }
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
          "NON_CUSTODIAL_SWEEP_DISABLED",

        message:
          "La simulación de sweeps fue retirada: el servidor no administra ni mueve fondos de las wallets de usuarios.",
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
      "[GET /api/v1/admin/sweeps/dry-run]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo ejecutar la simulación de sweep.",
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
