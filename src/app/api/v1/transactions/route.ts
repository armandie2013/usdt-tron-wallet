import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  requireUser,
} from "@/modules/auth/auth.guard";

import {
  TransactionService,
} from "@/modules/transactions/transaction.service";

import {
  internalTransferSchema,
} from "@/modules/transactions/transaction.validation";

export const runtime =
  "nodejs";

const transactionService =
  new TransactionService();

export async function GET(
  request: NextRequest,
) {
  try {
    const user =
      await requireUser();

    const limitParameter =
      request.nextUrl.searchParams.get(
        "limit",
      );

    let limit =
      50;

    if (limitParameter) {
      const parsed =
        Number.parseInt(
          limitParameter,
          10,
        );

      if (
        Number.isFinite(
          parsed,
        )
      ) {
        limit = parsed;
      }
    }

    const transactions =
      await transactionService
        .listUserTransactions(
          user.id,
          limit,
        );

    return NextResponse.json({
      success:
        true,

      transactions,
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
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const user =
      await requireUser();

    const body: unknown =
      await request.json();

    const validation =
      internalTransferSchema
        .safeParse(
          body,
        );

    if (!validation.success) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "VALIDATION_ERROR",

          message:
            "Los datos ingresados no son válidos.",

          details:
            validation.error.flatten(),
        },
        {
          status:
            400,
        },
      );
    }

    const result =
      await transactionService
        .internalTransfer(
          user.id,
          validation.data,
        );

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Transferencia realizada correctamente.",

        result,
      },
      {
        status:
          201,
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
        },
      );
    }

    console.error(
      "[POST /api/v1/transactions]",
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