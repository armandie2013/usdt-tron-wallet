// import {
//   NextRequest,
//   NextResponse,
// } from "next/server";

// import {
//   AppError,
// } from "@/lib/errors/app-error";

// import {
//   requireWalletUser,
// } from "@/modules/auth/auth.guard";

// import {
//   TransactionService,
// } from "@/modules/transactions/transaction.service";

// export const runtime =
//   "nodejs";

// const transactionService =
//   new TransactionService();

// /*
//  * ============================================================
//  * GET /api/v1/transactions
//  * ============================================================
//  *
//  * Devuelve el historial USDT TRC20 real de la wallet personal
//  * del usuario.
//  *
//  * Fuente de verdad:
//  * TRON / TronGrid.
//  *
//  * No utiliza ledger interno para construir el historial.
//  *
//  * Solamente USER puede consultar este historial.
//  *
//  * ADMIN:
//  *
//  * - no posee wallet personal;
//  * - no posee historial personal de transferencias;
//  * - no participa del flujo no-custodial.
//  *
//  * La PLATFORM_TREASURY se consulta mediante endpoints
//  * administrativos separados.
//  */

// export async function GET(
//   request:
//     NextRequest,
// ) {
//   try {
//     const user =
//       await requireWalletUser();

//     const limitParameter =
//       request.nextUrl
//         .searchParams
//         .get(
//           "limit",
//         );

//     let limit =
//       50;

//     if (
//       limitParameter
//     ) {
//       const parsed =
//         Number.parseInt(
//           limitParameter,
//           10,
//         );

//       if (
//         Number.isSafeInteger(
//           parsed,
//         ) &&
//         parsed >
//           0
//       ) {
//         limit =
//           Math.min(
//             parsed,
//             200,
//           );
//       }
//     }

//     const transactions =
//       await transactionService
//         .listUserTransactions(
//           user.id,
//           limit,
//         );

//     return NextResponse.json({
//       success:
//         true,

//       source:
//         "TRON",

//       transactions,
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
//       "[GET /api/v1/transactions]",
//       error,
//     );

//     return NextResponse.json(
//       {
//         success:
//           false,

//         error:
//           "INTERNAL_SERVER_ERROR",

//         message:
//           "Se produjo un error interno.",
//       },
//       {
//         status:
//           500,
//       },
//     );
//   }
// }

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  requireWalletUser,
} from "@/modules/auth/auth.guard";

import {
  TransactionService,
} from "@/modules/transactions/transaction.service";

export const runtime =
  "nodejs";

const transactionService =
  new TransactionService();

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0",

  Pragma:
    "no-cache",
} as const;

export async function GET(
  request:
    NextRequest,
) {
  try {
    const user =
      await requireWalletUser();

    const limitParameter =
      request.nextUrl
        .searchParams
        .get(
          "limit",
        );

    let limit =
      50;

    if (
      limitParameter
    ) {
      const parsed =
        Number.parseInt(
          limitParameter,
          10,
        );

      if (
        Number.isSafeInteger(
          parsed,
        ) &&
        parsed >
          0
      ) {
        limit =
          Math.min(
            parsed,
            200,
          );
      }
    }

    const transactions =
      await transactionService
        .listUserTransactions(
          user.id,
          limit,
        );

    return NextResponse.json(
      {
        success:
          true,

        source:
          "TRON",

        transactions,
      },
      {
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
      "[GET /api/v1/transactions]",
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

        headers:
          PRIVATE_NO_STORE_HEADERS,
      },
    );
  }
}