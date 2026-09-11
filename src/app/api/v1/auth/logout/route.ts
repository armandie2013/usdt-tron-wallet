import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AuthService,
} from "@/modules/auth/auth.service";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/modules/auth/auth.tokens";

export const runtime =
  "nodejs";

const authService =
  new AuthService();

export async function POST(
  request: NextRequest,
) {
  const refreshToken =
    request.cookies.get(
      REFRESH_TOKEN_COOKIE,
    )?.value;

  await authService.logout(
    refreshToken,
  );

  const response =
    NextResponse.json({
      success: true,
      message:
        "Sesión cerrada correctamente.",
    });

  response.cookies.delete(
    ACCESS_TOKEN_COOKIE,
  );

  response.cookies.delete(
    REFRESH_TOKEN_COOKIE,
  );

  return response;
}