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
 * GET /api/v1/wallet/blockchain-status
 * ============================================================
 *
 * Endpoint de consulta solamente.
 *
 * Ya no crea wallet.
 * Ya no accede a private keys.
 * Ya no firma transacciones.
 */

export async function GET() {
  try {
    const userId =
      await getAuthenticatedUserId();

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
      },
    );
  }
}