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
 * GET /api/v1/wallet
 * ============================================================
 *
 * Solamente los usuarios normales poseen wallet personal.
 *
 * ADMIN:
 *
 * - no tiene wallet personal;
 * - no tiene dirección TRON;
 * - no recibe fondos;
 * - no envía fondos;
 * - no participa del flujo no-custodial.
 *
 * La wallet de la plataforma es independiente:
 *
 * PLATFORM_TREASURY
 *
 * y se administra exclusivamente desde los endpoints ADMIN.
 *
 * ============================================================
 *
 * USER:
 *
 * Este endpoint representa la wallet real del usuario.
 *
 * Fuente de verdad del saldo:
 *
 * TRON
 *   ↓
 * contrato USDT
 *   ↓
 * balanceOf(address)
 *
 * MongoDB solamente conserva:
 *
 * - asociación usuario/address;
 * - metadata pública.
 *
 * El ledger deja de ser la fuente de saldo disponible.
 */

export async function GET() {
  try {
    const authenticatedUser =
      await getAuthenticatedUser();

    /*
     * ========================================================
     * ADMIN NO PUEDE TENER WALLET PERSONAL
     * ========================================================
     */

    if (
      authenticatedUser.role ===
      "ADMIN"
    ) {
      throw new AppError(
        "Las cuentas administradoras no poseen una wallet personal.",
        "WALLET_NOT_ALLOWED_FOR_ADMIN",
        403,
      );
    }

    const userId =
      authenticatedUser.id;

    const tronService =
      new TronService();

    /*
     * --------------------------------------------------------
     * Comprobamos si el usuario ya registró una wallet.
     * --------------------------------------------------------
     */

    const account =
      await tronService
        .getPublicAddress(
          userId,
        );

    /*
     * --------------------------------------------------------
     * Usuario nuevo sin wallet
     * --------------------------------------------------------
     */

    if (
      !account
    ) {
      return NextResponse.json(
        {
          success:
            true,

          needsWalletSetup:
            true,

          wallet:
            null,

          blockchain: {
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
        },
        {
          status:
            200,
        },
      );
    }

    /*
     * --------------------------------------------------------
     * Estado real de blockchain
     * --------------------------------------------------------
     *
     * Consultamos:
     *
     * - USDT
     * - TRX
     * - Energy
     * - Bandwidth
     *
     * Todo utilizando la dirección pública.
     */

    const status =
      await tronService
        .getWalletStatus(
          userId,
        );

    if (
      !status
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
          status.account
            .addressBase58,
        );

    /*
     * --------------------------------------------------------
     * Compatibilidad temporal con el frontend actual
     * --------------------------------------------------------
     *
     * El dashboard actual espera algo como:
     *
     * wallet.balance
     * wallet.formattedBalance
     *
     * Por eso dejamos esos campos mientras migramos
     * la interfaz.
     *
     * Pero ahora provienen directamente de TRON.
     */

    return NextResponse.json(
      {
        success:
          true,

        needsWalletSetup:
          false,

        wallet: {
          id:
            status.account.id,

          asset:
            "USDT",

          status:
            status.account
              .status,

          walletType:
            status.account
              .walletType,

          network:
            status.account
              .network,

          address:
            status.account
              .addressBase58,

          addressBase58:
            status.account
              .addressBase58,

          addressHex:
            status.account
              .addressHex,

          /*
           * Compatibilidad con frontend viejo.
           *
           * Estos valores YA NO salen del ledger.
           */
          balance:
            status.usdt
              .balanceUnits,

          formattedBalance:
            status.usdt
              .formattedBalance,

          usdt: {
            balanceUnits:
              status.usdt
                .balanceUnits,

            formattedBalance:
              status.usdt
                .formattedBalance,

            contractAddress:
              getUsdtTrc20Contract(),
          },

          trx: {
            balanceSun:
              status.trx
                .balanceSun,

            formattedBalance:
              status.trx
                .formattedBalance,
          },

          resources: {
            energyAvailable:
              status.resources
                .energyAvailable,

            bandwidthAvailable:
              status.resources
                .bandwidthAvailable,
          },

          activated,

          createdAt:
            status.account
              .createdAt,

          updatedAt:
            status.account
              .updatedAt,
        },

        blockchain: {
          network:
            status.account
              .network,

          asset:
            "USDT",

          tokenStandard:
            "TRC20",

          contractAddress:
            getUsdtTrc20Contract(),
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
      "[WALLET GET]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo obtener la wallet.",
      },
      {
        status:
          500,
      },
    );
  }
}