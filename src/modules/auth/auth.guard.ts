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