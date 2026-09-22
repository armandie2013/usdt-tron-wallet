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
//   SweepConfirmationService,
// } from "@/modules/sweeps/sweep-confirmation.service";

// export const runtime =
//   "nodejs";

// const service =
//   new SweepConfirmationService();

// export async function POST() {
//   try {
//     await requireAdmin();

//     const result =
//       await service
//         .confirmPendingSweeps(
//           50,
//         );

//     return NextResponse.json({
//       success:
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
//       "[POST /api/v1/admin/sweeps/confirm]",
//       error,
//     );

//     return NextResponse.json(
//       {
//         success:
//           false,

//         error:
//           "INTERNAL_SERVER_ERROR",

//         message:
//           "No se pudieron confirmar los sweeps.",
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

export async function POST() {
  try {
    await requireAdmin();

    return NextResponse.json(
      {
        success:
          false,

        error:
          "NON_CUSTODIAL_SWEEP_DISABLED",

        message:
          "La confirmación de sweeps heredados fue retirada del modelo no-custodial.",
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
      "[POST /api/v1/admin/sweeps/confirm]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudieron confirmar los sweeps.",
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
