import {
  NextResponse,
} from "next/server";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  requireWalletUser,
} from "@/modules/auth/auth.guard";

import {
  TronService,
} from "@/modules/blockchain/tron/tron.service";

import {
  getUsdtTrc20Contract,
} from "@/modules/blockchain/tron/usdt.contract";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0",

  Pragma:
    "no-cache",
} as const;

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
      await requireWalletUser();

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

          headers:
            PRIVATE_NO_STORE_HEADERS,
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

        headers:
          PRIVATE_NO_STORE_HEADERS,
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

          headers:
            PRIVATE_NO_STORE_HEADERS,
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

        headers:
          PRIVATE_NO_STORE_HEADERS,
      },
    );
  }
}
