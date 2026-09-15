import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  z,
} from "zod";

import {
  TronWeb,
} from "tronweb";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  formatUsdtDisplay,
} from "@/lib/money/usdt";

import {
  ACCESS_TOKEN_COOKIE,
  verifyAccessToken,
} from "@/modules/auth/auth.tokens";

import {
  TronClient,
} from "@/modules/blockchain/tron/tron.client";

import {
  TronService,
} from "@/modules/blockchain/tron/tron.service";

import {
  getUsdtTrc20Contract,
} from "@/modules/blockchain/tron/usdt.contract";

const DEFAULT_FEE_LIMIT_SUN =
  100_000_000;

const USDT_DECIMALS =
  6;

const USDT_SCALE =
  10n ** BigInt(
    USDT_DECIMALS,
  );

const requestSchema =
  z
    .object({
      toAddress:
        z
          .string()
          .trim()
          .min(
            1,
            "La dirección de destino es obligatoria.",
          )
          .max(
            64,
            "La dirección de destino no es válida.",
          ),

      amountUnits:
        z
          .string()
          .trim()
          .regex(
            /^[0-9]+$/,
            "El importe debe expresarse en unidades enteras.",
          ),
    })
    .strict();

interface TronAccountResources {
  EnergyLimit?:
    number;

  EnergyUsed?:
    number;

  freeNetLimit?:
    number;

  freeNetUsed?:
    number;

  NetLimit?:
    number;

  NetUsed?:
    number;
}

interface ConstantContractResult {
  result?: {
    result?:
      boolean;

    message?:
      string;
  };

  energy_used?:
    number;

  energy_used_total?:
    number;
}

interface TronChainParameter {
  key:
    string;

  value?:
    number | string;
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

function formatSunAsTrx(
  amountSun:
    bigint,
): string {
  const scale =
    1_000_000n;

  const negative =
    amountSun <
    0n;

  const absolute =
    negative
      ? -amountSun
      : amountSun;

  const integer =
    absolute /
    scale;

  const decimals =
    absolute %
    scale;

  const integerText =
    new Intl.NumberFormat(
      "es-AR",
      {
        maximumFractionDigits:
          0,
      },
    ).format(
      integer,
    );

  const decimalText =
    decimals
      .toString()
      .padStart(
        6,
        "0",
      )
      .replace(
        /0+$/,
        "",
      );

  const formatted =
    decimalText
      ? `${integerText},${decimalText}`
      : integerText;

  return negative
    ? `-${formatted}`
    : formatted;
}

function normalizeAmountUnits(
  value:
    string,
): bigint {
  let amount:
    bigint;

  try {
    amount =
      BigInt(
        value,
      );
  } catch {
    throw new AppError(
      "El importe USDT no es válido.",
      "INVALID_TRANSFER_AMOUNT",
      400,
    );
  }

  if (
    amount <=
    0n
  ) {
    throw new AppError(
      "El importe USDT debe ser mayor que cero.",
      "INVALID_TRANSFER_AMOUNT",
      400,
    );
  }

  return amount;
}

async function estimateTransferEnergy(
  tronWeb:
    ReturnType<
      typeof TronClient.create
    >,

  contractAddress:
    string,

  ownerAddress:
    string,

  destinationAddress:
    string,

  amount:
    bigint,
): Promise<
  number |
  null
> {
  try {
    const response =
      (
        await tronWeb
          .transactionBuilder
          .triggerConstantContract(
            contractAddress,

            "transfer(address,uint256)",

            {},

            [
              {
                type:
                  "address",

                value:
                  destinationAddress,
              },

              {
                type:
                  "uint256",

                value:
                  amount.toString(),
              },
            ],

            ownerAddress,
          )
      ) as unknown as
        ConstantContractResult;

    if (
      response
        .result
        ?.result !==
      true
    ) {
      return null;
    }

    const energy =
      response
        .energy_used_total ??
      response
        .energy_used;

    if (
      typeof energy !==
        "number" ||
      !Number.isSafeInteger(
        energy,
      ) ||
      energy <=
        0
    ) {
      return null;
    }

    return Math.ceil(
      energy,
    );
  } catch (
    error
  ) {
    console.warn(
      "[TRANSFER QUOTE ENERGY]",
      error,
    );

    return null;
  }
}

async function getEnergyPriceSun(
  tronWeb:
    ReturnType<
      typeof TronClient.create
    >,
): Promise<bigint> {
  const parameters =
    (
      await tronWeb
        .trx
        .getChainParameters()
    ) as
      TronChainParameter[];

  const energyFee =
    parameters.find(
      (
        parameter,
      ) =>
        parameter.key ===
        "getEnergyFee",
    );

  if (
    energyFee?.value ===
      undefined ||
    energyFee.value ===
      null
  ) {
    throw new AppError(
      "No se pudo obtener el precio actual de Energy.",
      "TRON_ENERGY_FEE_UNAVAILABLE",
      502,
    );
  }

  let value:
    bigint;

  try {
    value =
      BigInt(
        energyFee.value,
      );
  } catch {
    throw new AppError(
      "TRON devolvió un precio de Energy inválido.",
      "TRON_ENERGY_FEE_INVALID",
      502,
    );
  }

  if (
    value <=
    0n
  ) {
    throw new AppError(
      "TRON devolvió un precio de Energy inválido.",
      "TRON_ENERGY_FEE_INVALID",
      502,
    );
  }

  return value;
}

/*
 * ============================================================
 * POST /api/v1/wallet/transfer-quote
 * ============================================================
 *
 * Solamente USER puede preparar una transferencia desde
 * su wallet personal.
 *
 * ADMIN:
 *
 * - no posee wallet personal;
 * - no puede cotizar transferencias personales;
 * - no puede preparar operaciones desde una dirección
 *   asociada históricamente a su usuario.
 *
 * La PLATFORM_TREASURY es independiente y tendrá su propio
 * flujo administrativo cuando corresponda.
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
     * ADMIN NO PUEDE COTIZAR TRANSFERENCIA PERSONAL
     * ========================================================
     */

    if (
      authenticatedUser.role ===
      "ADMIN"
    ) {
      throw new AppError(
        "Las cuentas administradoras no pueden preparar transferencias desde una wallet personal.",
        "WALLET_NOT_ALLOWED_FOR_ADMIN",
        403,
      );
    }

    const userId =
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
          "Los datos de la transferencia no son válidos.",
        "INVALID_TRANSFER_REQUEST",
        400,
      );
    }

    const toAddress =
      parsed.data
        .toAddress
        .trim();

    if (
      !isTronAddress(
        toAddress,
      )
    ) {
      throw new AppError(
        "La dirección de destino no es una dirección TRON válida.",
        "INVALID_DESTINATION_ADDRESS",
        400,
      );
    }

    const amount =
      normalizeAmountUnits(
        parsed.data
          .amountUnits,
      );

    const tronService =
      new TronService();

    const sender =
      await tronService
        .getPublicAddress(
          userId,
        );

    if (
      !sender
    ) {
      throw new AppError(
        "El usuario todavía no posee una wallet TRON registrada.",
        "SENDER_WALLET_NOT_FOUND",
        409,
      );
    }

    if (
      sender
        .addressBase58 ===
      toAddress
    ) {
      throw new AppError(
        "No podés transferir USDT a tu propia wallet.",
        "SELF_TRANSFER_NOT_ALLOWED",
        409,
      );
    }

    const contractAddress =
      getUsdtTrc20Contract();

    const walletStatus =
      await tronService
        .getWalletStatus(
          userId,
        );

    if (
      !walletStatus
    ) {
      throw new AppError(
        "No se pudo obtener el estado actual de la wallet.",
        "WALLET_STATUS_UNAVAILABLE",
        502,
      );
    }

    const usdtBalance =
      BigInt(
        walletStatus
          .usdt
          .balanceUnits,
      );

    if (
      amount >
      usdtBalance
    ) {
      throw new AppError(
        "El saldo USDT disponible es insuficiente.",
        "INSUFFICIENT_USDT_BALANCE",
        409,
      );
    }

    const tronWeb =
      TronClient
        .createForAddress(
          sender.addressBase58,
        );

    const [
      resourcesRaw,
      trxBalanceNumber,
      estimatedEnergy,
      energyPriceSun,
    ] =
      await Promise.all([
        tronWeb.trx
          .getAccountResources(
            sender.addressBase58,
          ),

        tronWeb.trx
          .getBalance(
            sender.addressBase58,
          ),

        estimateTransferEnergy(
          tronWeb,
          contractAddress,
          sender.addressBase58,
          toAddress,
          amount,
        ),

        getEnergyPriceSun(
          tronWeb,
        ),
      ]);

    if (
      !Number.isSafeInteger(
        trxBalanceNumber,
      )
    ) {
      throw new AppError(
        "El saldo TRX se encuentra fuera del rango esperado.",
        "INVALID_TRX_BALANCE",
        500,
      );
    }

    const trxBalance =
      BigInt(
        trxBalanceNumber,
      );

    const resources =
      resourcesRaw as
        TronAccountResources;

    const energyAvailable =
      Math.max(
        0,

        (
          resources
            .EnergyLimit ??
          0
        ) -
          (
            resources
              .EnergyUsed ??
            0
          ),
      );

    const freeBandwidth =
      Math.max(
        0,

        (
          resources
            .freeNetLimit ??
          0
        ) -
          (
            resources
              .freeNetUsed ??
            0
          ),
      );

    const stakedBandwidth =
      Math.max(
        0,

        (
          resources
            .NetLimit ??
          0
        ) -
          (
            resources
              .NetUsed ??
            0
          ),
      );

    const bandwidthAvailable =
      freeBandwidth +
      stakedBandwidth;

    let energyDeficit:
      number |
      null =
      null;

    let estimatedNetworkCostSun:
      bigint |
      null =
      null;

    if (
      estimatedEnergy !==
      null
    ) {
      energyDeficit =
        Math.max(
          0,

          estimatedEnergy -
            energyAvailable,
        );

      estimatedNetworkCostSun =
        BigInt(
          energyDeficit,
        ) *
        energyPriceSun;
    }

    const hasEnoughTrxForEstimatedCost =
      estimatedNetworkCostSun ===
        null
        ? null
        : trxBalance >=
          estimatedNetworkCostSun;

    const feeLimitSun =
      DEFAULT_FEE_LIMIT_SUN;

    /*
     * ========================================================
     * AUTORIZACIÓN PARA CONTINUAR
     * ========================================================
     *
     * Fail closed:
     *
     * si no pudimos estimar Energy/costo, NO autorizamos
     * la firma desde la UI.
     *
     * También rechazamos la operación cuando el costo estimado
     * supera el fee_limit que finalmente se firmará.
     */

    const estimatedCostFitsFeeLimit =
      estimatedNetworkCostSun ===
        null
        ? null
        : estimatedNetworkCostSun <=
          BigInt(
            feeLimitSun,
          );

    const canProceed =
      estimatedNetworkCostSun !==
        null &&
      hasEnoughTrxForEstimatedCost ===
        true &&
      estimatedCostFitsFeeLimit ===
        true;

    return NextResponse.json(
      {
        success:
          true,

        quote: {
          network:
            sender.network,

          asset:
            "USDT",

          tokenStandard:
            "TRC20",

          contractAddress,

          fromAddress:
            sender
              .addressBase58,

          toAddress,

          amount: {
            units:
              amount
                .toString(),

            formatted:
              formatUsdtDisplay(
                amount,
              ),

            decimals:
              USDT_DECIMALS,

            scale:
              USDT_SCALE
                .toString(),
          },

          balance: {
            usdtUnits:
              usdtBalance
                .toString(),

            formattedUsdt:
              walletStatus
                .usdt
                .formattedBalance,

            trxSun:
              trxBalance
                .toString(),

            formattedTrx:
              formatSunAsTrx(
                trxBalance,
              ),
          },

          resources: {
            energyAvailable:
              energyAvailable
                .toString(),

            bandwidthAvailable:
              bandwidthAvailable
                .toString(),

            estimatedEnergy:
              estimatedEnergy !==
                null
                ? String(
                    estimatedEnergy,
                  )
                : null,

            energyDeficit:
              energyDeficit !==
                null
                ? String(
                    energyDeficit,
                  )
                : null,

            energyPriceSun:
              energyPriceSun
                .toString(),
          },

          networkCost: {
            estimatedSun:
              estimatedNetworkCostSun
                ?.toString() ??
              null,

            estimatedTrx:
              estimatedNetworkCostSun !==
                null
                ? formatSunAsTrx(
                    estimatedNetworkCostSun,
                  )
                : null,

            enoughTrx:
              hasEnoughTrxForEstimatedCost,
          },

          feeLimitSun,

          platformFee: {
            enabled:
              false,

            usdtUnits:
              "0",

            formattedUsdt:
              "0",
          },

          canProceed,
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
      "[TRANSFER QUOTE]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo calcular la cotización de la transferencia.",
      },
      {
        status:
          500,
      },
    );
  }
}