import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  z,
} from "zod";

import type {
  ObjectId,
} from "mongodb";

import {
  TronWeb,
} from "tronweb";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  getDb,
} from "@/lib/db/mongodb";

import {
  ACCESS_TOKEN_COOKIE,
  verifyAccessToken,
} from "@/modules/auth/auth.tokens";

import {
  TronService,
} from "@/modules/blockchain/tron/tron.service";

/*
 * ============================================================
 * BODY
 * ============================================================
 *
 * El usuario puede ingresar:
 *
 * - dirección TRON;
 * - email de otro usuario;
 * - username, si el modelo de usuarios lo posee.
 *
 * Este endpoint solamente resuelve información pública.
 *
 * Nunca recibe:
 *
 * - privateKey
 * - mnemonic
 * - contraseña del vault
 */

const requestSchema =
  z
    .object({
      recipient:
        z
          .string()
          .trim()
          .min(
            1,
            "El destinatario es obligatorio.",
          )
          .max(
            320,
            "El destinatario es demasiado largo.",
          ),
    })
    .strict();

/*
 * ============================================================
 * USUARIO
 * ============================================================
 *
 * Definimos únicamente los campos necesarios.
 *
 * username queda opcional porque la aplicación puede
 * actualmente trabajar solamente con email.
 */

interface UserLookupDocument {
  _id:
    ObjectId;

  name?:
    string;

  email:
    string;

  username?:
    string;

  status?:
    string;
}

/*
 * ============================================================
 * AUTH
 * ============================================================
 */

interface AuthenticatedUser {
  id:
    string;

  role:
    "ADMIN"
    | "USER";
}

async function getAuthenticatedUser():
  Promise<AuthenticatedUser> {
  const cookieStore =
    await cookies();

  const token =
    cookieStore
      .get(
        ACCESS_TOKEN_COOKIE,
      )
      ?.value;

  if (
    !token
  ) {
    throw new AppError(
      "No autenticado.",
      "UNAUTHORIZED",
      401,
    );
  }

  try {
    const payload =
      await verifyAccessToken(
        token,
      );

    if (
      !payload.sub
    ) {
      throw new Error(
        "Token sin identificador de usuario.",
      );
    }

    return {
      id:
        payload.sub,

      role:
        payload.role,
    };
  } catch {
    throw new AppError(
      "La sesión no es válida o ha expirado.",
      "INVALID_ACCESS_TOKEN",
      401,
    );
  }
}

/*
 * ============================================================
 * TRON ADDRESS
 * ============================================================
 */

function isTronAddress(
  value:
    string,
): boolean {
  try {
    return TronWeb.isAddress(
      value,
    );
  } catch {
    return false;
  }
}

/*
 * ============================================================
 * POST /api/v1/wallet/resolve-recipient
 * ============================================================
 *
 * Solamente USER puede resolver destinatarios dentro
 * del flujo de envío de una wallet personal.
 *
 * ADMIN:
 *
 * - no posee wallet personal;
 * - no envía fondos;
 * - no necesita resolver destinatarios para transferencias.
 *
 * Ejemplos:
 *
 * {
 *   "recipient": "T..."
 * }
 *
 * {
 *   "recipient": "usuario@email.com"
 * }
 *
 * Flujo interno:
 *
 * email / username
 *       ↓
 * usuario MongoDB
 *       ↓
 * tron_accounts
 *       ↓
 * address pública
 *
 * Una transferencia entre usuarios de la plataforma
 * continúa siendo una transferencia REAL on-chain.
 */

export async function POST(
  request:
    Request,
) {
  try {
    const authenticatedUser =
      await getAuthenticatedUser();

    /*
     * ========================================================
     * ADMIN NO PUEDE RESOLVER DESTINATARIOS DE WALLET PERSONAL
     * ========================================================
     */

    if (
      authenticatedUser.role ===
      "ADMIN"
    ) {
      throw new AppError(
        "Las cuentas administradoras no pueden utilizar el flujo de transferencias personales.",
        "WALLET_NOT_ALLOWED_FOR_ADMIN",
        403,
      );
    }

    const currentUserId =
      authenticatedUser.id;

    let rawBody:
      unknown;

    try {
      rawBody =
        await request.json();
    } catch {
      throw new AppError(
        "El cuerpo de la solicitud no es válido.",
        "INVALID_JSON_BODY",
        400,
      );
    }

    const parsed =
      requestSchema
        .safeParse(
          rawBody,
        );

    if (
      !parsed.success
    ) {
      throw new AppError(
        parsed.error
          .issues[0]
          ?.message ??
          "El destinatario no es válido.",
        "INVALID_RECIPIENT",
        400,
      );
    }

    const recipient =
      parsed.data
        .recipient
        .trim();

    const tronService =
      new TronService();

    /*
     * ========================================================
     * WALLET DEL EMISOR
     * ========================================================
     *
     * Necesitamos conocerla para impedir que el usuario
     * se envíe fondos a sí mismo accidentalmente.
     */

    const senderWallet =
      await tronService
        .getPublicAddress(
          currentUserId,
        );

    if (
      !senderWallet
    ) {
      throw new AppError(
        "El usuario todavía no posee una wallet registrada.",
        "SENDER_WALLET_NOT_FOUND",
        409,
      );
    }

    /*
     * ========================================================
     * CASO 1: DIRECCIÓN TRON DIRECTA
     * ========================================================
     */

    if (
      isTronAddress(
        recipient,
      )
    ) {
      if (
        recipient ===
        senderWallet
          .addressBase58
      ) {
        throw new AppError(
          "No podés transferir USDT a tu propia dirección.",
          "SELF_TRANSFER_NOT_ALLOWED",
          409,
        );
      }

      return NextResponse.json(
        {
          success:
            true,

          recipient: {
            type:
              "TRON_ADDRESS",

            address:
              recipient,

            addressBase58:
              recipient,

            network:
              senderWallet
                .network,

            internal:
              false,

            user:
              null,
          },
        },
        {
          status:
            200,
        },
      );
    }

    /*
     * ========================================================
     * CASO 2: USUARIO INTERNO
     * ========================================================
     *
     * Normalizamos email/username porque ambos deben
     * tratarse sin diferencias de mayúsculas.
     */

    const normalizedIdentifier =
      recipient
        .toLowerCase();

    const database =
      await getDb();

    const users =
      database
        .collection<UserLookupDocument>(
          "users",
        );

    /*
     * Buscamos únicamente coincidencia exacta.
     *
     * No hacemos búsquedas parciales para evitar:
     *
     * - enumeración innecesaria de usuarios;
     * - resultados ambiguos;
     * - filtración de información.
     */

    const recipientUser =
      await users
        .findOne({
          $or: [
            {
              email:
                normalizedIdentifier,
            },
            {
              username:
                normalizedIdentifier,
            },
          ],
        });

    if (
      !recipientUser
    ) {
      throw new AppError(
        "No se encontró un usuario ni una dirección TRON con ese identificador.",
        "RECIPIENT_NOT_FOUND",
        404,
      );
    }

    const recipientUserId =
      recipientUser
        ._id
        .toString();

    /*
     * Impedimos transferencia a la propia cuenta
     * incluso antes de resolver la wallet.
     */

    if (
      recipientUserId ===
      currentUserId
    ) {
      throw new AppError(
        "No podés transferir USDT a tu propia cuenta.",
        "SELF_TRANSFER_NOT_ALLOWED",
        409,
      );
    }

    /*
     * ========================================================
     * WALLET PÚBLICA DEL DESTINATARIO
     * ========================================================
     */

    const recipientWallet =
      await tronService
        .getPublicAddress(
          recipientUserId,
        );

    if (
      !recipientWallet
    ) {
      throw new AppError(
        "El usuario destinatario todavía no posee una wallet TRON registrada.",
        "RECIPIENT_WALLET_NOT_FOUND",
        409,
      );
    }

    /*
     * No permitimos mezclar redes.
     *
     * Durante desarrollo esto evita, por ejemplo:
     *
     * NILE → MAINNET
     */

    if (
      recipientWallet
        .network !==
      senderWallet.network
    ) {
      throw new AppError(
        "La wallet del destinatario pertenece a otra red TRON.",
        "RECIPIENT_NETWORK_MISMATCH",
        409,
      );
    }

    if (
      recipientWallet
        .addressBase58 ===
      senderWallet
        .addressBase58
    ) {
      throw new AppError(
        "La dirección del destinatario coincide con tu propia wallet.",
        "SELF_TRANSFER_NOT_ALLOWED",
        409,
      );
    }

    /*
     * ========================================================
     * RESULTADO
     * ========================================================
     *
     * No devolvemos información sensible del usuario.
     *
     * Solo:
     *
     * - identificador público mínimo;
     * - nombre;
     * - dirección TRON.
     */

    return NextResponse.json(
      {
        success:
          true,

        recipient: {
          type:
            "INTERNAL_USER",

          address:
            recipientWallet
              .addressBase58,

          addressBase58:
            recipientWallet
              .addressBase58,

          network:
            recipientWallet
              .network,

          internal:
            true,

          user: {
            id:
              recipientUserId,

            name:
              recipientUser
                .name ??
              null,

            username:
              recipientUser
                .username ??
              null,
          },
        },
      },
      {
        status:
          200,
      },
    );
  } catch (
    error
  ) {
    if (
      error instanceof
      AppError
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
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
      "[RESOLVE RECIPIENT]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo resolver el destinatario.",
      },
      {
        status:
          500,
      },
    );
  }
}