// import {
//   NextResponse,
// } from "next/server";

// import {
//   z,
// } from "zod";

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

// const schema =
//   z.object({
//     address:
//       z.string()
//         .trim()
//         .min(
//           1,
//           "La dirección es obligatoria.",
//         ),
//   });

// export async function POST(
//   request:
//     Request,
// ) {
//   try {
//     await requireAdmin();

//     const body =
//       await request.json();

//     const parsed =
//       schema.safeParse(
//         body,
//       );

//     if (
//       !parsed.success
//     ) {
//       return NextResponse.json(
//         {
//           success:
//             false,

//           error:
//             "VALIDATION_ERROR",

//           message:
//             parsed.error.issues[0]
//               ?.message ??
//             "Datos inválidos.",
//         },
//         {
//           status:
//             400,
//         },
//       );
//     }

//     const result =
//       await service
//         .executeSweep(
//           parsed.data.address,
//         );

//     return NextResponse.json({
//       success:
//         true,

//       message:
//         "Sweep transmitido a la red TRON.",

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
//       "[POST /api/v1/admin/sweeps/execute]",
//       error,
//     );

//     return NextResponse.json(
//       {
//         success:
//           false,

//         error:
//           "INTERNAL_SERVER_ERROR",

//         message:
//           "No se pudo ejecutar el sweep.",
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
          "La ejecución de sweeps fue retirada: el servidor no puede firmar ni mover fondos de las wallets de usuarios.",
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
      "[POST /api/v1/admin/sweeps/execute]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo ejecutar el sweep.",
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
