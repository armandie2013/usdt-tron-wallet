import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  requireAdmin,
} from "@/modules/auth/auth.guard";

import {
  AdminService,
} from "@/modules/admin/admin.service";

import {
  testCreditSchema,
} from "@/modules/admin/admin.validation";

export const runtime =
  "nodejs";

const adminService =
  new AdminService();

export async function POST(
  request: NextRequest,
) {
  try {
    await requireAdmin();

    const body: unknown =
      await request.json();

    const validation =
      testCreditSchema.safeParse(
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
      await adminService.testCredit(
        validation.data,
      );

    return NextResponse.json({
      success:
        true,

      message:
        "Saldo de prueba acreditado correctamente.",

      result,
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
      "[POST /api/v1/admin/test-credit]",
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