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

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0",

  Pragma:
    "no-cache",
} as const;

/*
 * ============================================================
 * GET /api/v1/wallet/blockchain-status
 * ============================================================
 *
 * Endpoint de consulta solamente.
 *
 * Ya no crea wallet.
 * Ya no accede a private keys.
 * Ya no firma transacciones.
 *
 * Solamente USER puede consultar el estado de su wallet
 * personal.
 *
 * ADMIN:
 *
 * - no posee wallet personal;
 * - no consulta saldo personal;
 * - no consulta recursos personales;
 * - no participa del flujo no-custodial.
 *
 * La PLATFORM_TREASURY se consulta mediante endpoints
 * administrativos separados.
 */

export async function GET() {
  try {
    const authenticatedUser =
      await requireWalletUser();

    const userId =
      authenticatedUser.id;

    const tronService =
      new TronService();

    /*
     * Primero obtenemos la cuenta pública.
     */
    const account =
      await tronService
        .getPublicAddress(
          userId,
        );

    /*
     * Usuario todavía sin wallet registrada.
     */
    if (
      !account
    ) {
      return NextResponse.json(
        {
          success:
            true,

          hasWallet:
            false,

          network:
            tronService
              .getNetwork(),

          status:
            null,
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
     * Consultamos estado real directamente
     * desde TRON.
     */
    const walletStatus =
      await tronService
        .getWalletStatus(
          userId,
        );

    if (
      !walletStatus
    ) {
      throw new AppError(
        "No se pudo obtener el estado de la wallet.",
        "TRON_WALLET_STATUS_NOT_FOUND",
        404,
      );
    }

    const activated =
      await tronService
        .isAccountActivated(
          walletStatus
            .account
            .addressBase58,
        );

    return NextResponse.json(
      {
        success:
          true,

        hasWallet:
          true,

        network:
          walletStatus
            .account
            .network,

        status: {
          address:
            walletStatus
              .account
              .addressBase58,

          addressBase58:
            walletStatus
              .account
              .addressBase58,

          addressHex:
            walletStatus
              .account
              .addressHex,

          walletType:
            walletStatus
              .account
              .walletType,

          accountStatus:
            walletStatus
              .account
              .status,

          activated,

          usdt: {
            balanceUnits:
              walletStatus
                .usdt
                .balanceUnits,

            formattedBalance:
              walletStatus
                .usdt
                .formattedBalance,
          },

          trx: {
            balanceSun:
              walletStatus
                .trx
                .balanceSun,

            formattedBalance:
              walletStatus
                .trx
                .formattedBalance,
          },

          resources: {
            energyAvailable:
              walletStatus
                .resources
                .energyAvailable,

            bandwidthAvailable:
              walletStatus
                .resources
                .bandwidthAvailable,
          },
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

    console.error(
      "[WALLET BLOCKCHAIN STATUS]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo consultar el estado de la wallet en TRON.",
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
