import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  AuthService,
} from "@/modules/auth/auth.service";

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_DAYS,
} from "@/modules/auth/auth.tokens";

import {
  refreshSchema,
} from "@/modules/auth/auth.validation";

export const runtime =
  "nodejs";

const authService =
  new AuthService();

export async function POST(
  request: NextRequest,
) {
  try {
    const body: unknown =
      await request
        .json()
        .catch(() => ({}));

    const validation =
      refreshSchema.safeParse(
        body,
      );

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "VALIDATION_ERROR",
          message:
            "Solicitud inválida.",
        },
        {
          status: 400,
        },
      );
    }

    const client =
      validation.data.client;

    const refreshToken =
      client === "mobile"
        ? validation.data
            .refreshToken
        : request.cookies.get(
            REFRESH_TOKEN_COOKIE,
          )?.value;

    if (!refreshToken) {
      throw new AppError(
        "No se encontró una sesión válida.",
        "REFRESH_TOKEN_REQUIRED",
        401,
      );
    }

    const result =
      await authService.refresh(
        refreshToken,
      );

    if (
      client === "mobile"
    ) {
      return NextResponse.json({
        success: true,

        accessToken:
          result.accessToken,

        refreshToken:
          result.refreshToken,

        accessTokenExpiresIn:
          result.accessTokenExpiresIn,
      });
    }

    const response =
      NextResponse.json({
        success: true,
      });

    const secure =
      process.env.NODE_ENV ===
      "production";

    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      result.accessToken,
      {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge:
          ACCESS_TOKEN_TTL_SECONDS,
      },
    );

    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge:
          REFRESH_TOKEN_TTL_DAYS *
          24 *
          60 *
          60,
      },
    );

    return response;
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

    console.error(
      "[POST /api/v1/auth/refresh]",
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