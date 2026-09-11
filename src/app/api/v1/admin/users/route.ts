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
  AdminService,
} from "@/modules/admin/admin.service";

export const runtime =
  "nodejs";

const adminService =
  new AdminService();

export async function GET() {
  try {
    await requireAdmin();

    const users =
      await adminService
        .listUsers();

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    if (
      error instanceof
      AppError
    ) {
      return NextResponse.json(
        {
          success: false,
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
      "[GET /api/v1/admin/users]",
      error,
    );

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