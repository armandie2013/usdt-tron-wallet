import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  ACCESS_TOKEN_COOKIE,
  verifyAccessToken,
} from "@/modules/auth/auth.tokens";

import {
  TronService,
} from "@/modules/blockchain/tron/tron.service";

import {
  getUsdtTrc20Contract,
} from "@/modules/blockchain/tron/usdt.contract";

/*
 * ============================================================
 * AUTENTICACIÓN
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

  const accessToken =
    cookieStore
      .get(
        ACCESS_TOKEN_COOKIE,
      )
      ?.value;

  if (
    !accessToken
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
        accessToken,
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
 * GET /api/v1/wallet/deposit-address
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Este endpoint ya NO:
 *
 * - crea wallets;
 * - genera private keys;
 * - cifra private keys;
 * - guarda private keys;
 *
 * Solamente devuelve la dirección pública que el usuario
 * ya registró previamente desde su navegador.
 *
 * Este flujo pertenece exclusivamente a cuentas USER.
 *
 * ADMIN:
 *
 * - no posee wallet personal;
 * - no posee dirección personal de depósito;
 * - no participa del flujo no-custodial;
 * - utiliza exclusivamente el área administrativa.
 *
 * La PLATFORM_TREASURY es independiente y se gestiona
 * mediante endpoints administrativos específicos.
 */

export async function GET() {
  try {
    const authenticatedUser =
      await getAuthenticatedUser();

    /*
     * ========================================================
     * ADMIN NO POSEE DIRECCIÓN PERSONAL DE DEPÓSITO
     * ========================================================
     */

    if (
      authenticatedUser.role ===
      "ADMIN"
    ) {
      throw new AppError(
        "Las cuentas administradoras no poseen una dirección personal de depósito.",
        "WALLET_NOT_ALLOWED_FOR_ADMIN",
        403,
      );
    }

    const userId =
      authenticatedUser.id;

    const tronService =
      new TronService();

    const account =
      await tronService
        .getPublicAddress(
          userId,
        );

    /*
     * --------------------------------------------------------
     * Usuario todavía sin wallet
     * --------------------------------------------------------
     *
     * Esto NO es un error del servidor.
     *
     * Significa que el frontend debe:
     *
     * 1. generar la wallet localmente;
     * 2. cifrarla en IndexedDB;
     * 3. pedir confirmación de backup;
     * 4. registrar la address mediante
     *    POST /api/v1/wallet/register-address
     */

    if (
      !account
    ) {
      return NextResponse.json(
        {
          success:
            true,

          wallet:
            null,

          needsWalletSetup:
            true,

          network:
            tronService
              .getNetwork(),

          asset:
            "USDT",

          tokenStandard:
            "TRC20",

          contractAddress:
            getUsdtTrc20Contract(),
        },
        {
          status:
            200,
        },
      );
    }

    /*
     * --------------------------------------------------------
     * Wallet existente
     * --------------------------------------------------------
     */

    return NextResponse.json(
      {
        success:
          true,

        needsWalletSetup:
          false,

        network:
          account.network,

        asset:
          "USDT",

        tokenStandard:
          "TRC20",

        contractAddress:
          getUsdtTrc20Contract(),

        wallet: {
          id:
            account.id,

          address:
            account.addressBase58,

          addressBase58:
            account.addressBase58,

          addressHex:
            account.addressHex,

          walletType:
            account.walletType,

          status:
            account.status,

          createdAt:
            account.createdAt,
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
    /*
     * ========================================================
     * ERRORES CONTROLADOS
     * ========================================================
     */

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

    /*
     * ========================================================
     * ERROR INESPERADO
     * ========================================================
     */

    console.error(
      "[WALLET DEPOSIT ADDRESS]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo obtener la dirección TRON.",
      },
      {
        status:
          500,
      },
    );
  }
}