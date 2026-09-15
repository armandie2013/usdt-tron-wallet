import {
  cookies,
  headers,
} from "next/headers";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  UserRepository,
} from "@/modules/users/user.repository";

import type {
  PublicUser,
} from "@/modules/users/user.types";

import {
  ACCESS_TOKEN_COOKIE,
  verifyAccessToken,
} from "./auth.tokens";

import {
  UserService,
} from "@/modules/users/user.service";

/*
 * ============================================================
 * BEARER TOKEN
 * ============================================================
 */

async function getBearerToken():
  Promise<string | null> {
  const headersList =
    await headers();

  const authorization =
    headersList.get(
      "authorization",
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  return authorization
    .slice(7)
    .trim();
}

/*
 * ============================================================
 * USUARIO ACTUAL
 * ============================================================
 *
 * Devuelve cualquier usuario autenticado y ACTIVE:
 *
 * - USER
 * - ADMIN
 *
 * No realiza autorización por rol.
 */

export async function getCurrentUser():
  Promise<PublicUser | null> {
  let token =
    await getBearerToken();

  if (!token) {
    const cookieStore =
      await cookies();

    token =
      cookieStore.get(
        ACCESS_TOKEN_COOKIE,
      )?.value ?? null;
  }

  if (!token) {
    return null;
  }

  try {
    const payload =
      await verifyAccessToken(
        token,
      );

    const repository =
      new UserRepository();

    const user =
      await repository.findById(
        payload.sub,
      );

    if (
      !user ||
      user.status !==
        "ACTIVE"
    ) {
      return null;
    }

    return UserService.toPublicUser(
      user,
    );
  } catch {
    return null;
  }
}

/*
 * ============================================================
 * USUARIO AUTENTICADO
 * ============================================================
 *
 * Acepta:
 *
 * - USER
 * - ADMIN
 *
 * Utilizar cuando solamente importa que exista
 * una sesión válida y activa.
 */

export async function requireUser():
  Promise<PublicUser> {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new AppError(
      "Debe iniciar sesión.",
      "UNAUTHORIZED",
      401,
    );
  }

  return user;
}

/*
 * ============================================================
 * USUARIO DE WALLET PERSONAL
 * ============================================================
 *
 * Exclusivo para rol USER.
 *
 * Las cuentas ADMIN:
 *
 * - no poseen wallet personal;
 * - no poseen dirección personal de depósito;
 * - no envían fondos desde una wallet personal;
 * - no participan del flujo no-custodial.
 *
 * La PLATFORM_TREASURY es independiente y se administra
 * mediante rutas específicas para ADMIN.
 */

export async function requireWalletUser():
  Promise<PublicUser> {
  const user =
    await requireUser();

  if (
    user.role !==
    "USER"
  ) {
    throw new AppError(
      "Las cuentas administradoras no pueden utilizar una wallet personal.",
      "WALLET_NOT_ALLOWED_FOR_ADMIN",
      403,
    );
  }

  return user;
}

/*
 * ============================================================
 * ADMINISTRADOR
 * ============================================================
 */

export async function requireAdmin():
  Promise<PublicUser> {
  const user =
    await requireUser();

  if (
    user.role !==
    "ADMIN"
  ) {
    throw new AppError(
      "No posee permisos de administrador.",
      "FORBIDDEN",
      403,
    );
  }

  return user;
}