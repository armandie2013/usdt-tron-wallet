import {
  NextResponse,
} from "next/server";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  requireUser,
} from "@/modules/auth/auth.guard";

export const runtime =
  "nodejs";

export async function GET() {
  try {
    const user =
      await requireUser();

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    if (
      error instanceof
      AppError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message:
            error.message,
        },
        {
          status:
            error.statusCode,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "INTERNAL_SERVER_ERROR",
        message:
          "Se produjo un error interno.",
      },
      {
        status: 500,
      },
    );
  }
}