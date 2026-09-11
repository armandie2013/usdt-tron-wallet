import {
  NextRequest,
  NextResponse,
} from "next/server";

import { AppError } from "@/lib/errors/app-error";

import {
  AuthService,
} from "@/modules/auth/auth.service";

import {
  registerSchema,
} from "@/modules/auth/auth.validation";

export const runtime = "nodejs";

const authService = new AuthService();

export async function POST(
  request: NextRequest,
) {
  try {
    const body: unknown =
      await request.json();

    const bodyObject =
      typeof body === "object" &&
      body !== null
        ? body
        : {};

    const validation =
      registerSchema.safeParse({
        ...bodyObject,
        action: "register",
      });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message:
            "Los datos ingresados no son válidos.",
          details:
            validation.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await authService.register(
        validation.data,
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Usuario registrado correctamente.",
        user: result.user,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        {
          status: error.statusCode,
        },
      );
    }

    console.error(
      "[POST /api/v1/auth/register]",
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