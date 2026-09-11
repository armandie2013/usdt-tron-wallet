import {
  createHash,
  randomBytes,
} from "crypto";

import {
  jwtVerify,
  SignJWT,
} from "jose";

import { env } from "@/config/env";

import type {
  AccessTokenPayload,
} from "./auth.types";

export const ACCESS_TOKEN_COOKIE =
  "wallet_access";

export const REFRESH_TOKEN_COOKIE =
  "wallet_refresh";

export const ACCESS_TOKEN_TTL_SECONDS =
  15 * 60;

export const REFRESH_TOKEN_TTL_DAYS =
  30;

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(
    env.AUTH_SECRET,
  );
}

export async function createAccessToken(
  payload: Omit<
    AccessTokenPayload,
    "type"
  >,
): Promise<string> {
  return new SignJWT({
    role: payload.role,
    type: "access",
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(
      `${ACCESS_TOKEN_TTL_SECONDS}s`,
    )
    .sign(getJwtSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const {
    payload,
  } = await jwtVerify(
    token,
    getJwtSecret(),
  );

  if (
    payload.type !== "access" ||
    typeof payload.sub !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new Error(
      "Token de acceso inválido.",
    );
  }

  if (
    payload.role !== "ADMIN" &&
    payload.role !== "USER"
  ) {
    throw new Error(
      "Rol de token inválido.",
    );
  }

  return {
    sub: payload.sub,
    role: payload.role,
    type: "access",
  };
}

export function createRefreshToken():
  string {
  return randomBytes(
    48,
  ).toString("base64url");
}

export function hashRefreshToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function getRefreshExpiration():
  Date {
  const expiresAt =
    new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      REFRESH_TOKEN_TTL_DAYS,
  );

  return expiresAt;
}