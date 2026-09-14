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

async function getAuthenticatedUserId():
  Promise<string> {
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

    return payload.sub;
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
 */

export async function GET() {
  try {
    const userId =
      await getAuthenticatedUserId();

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