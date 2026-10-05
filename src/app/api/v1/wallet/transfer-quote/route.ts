import {
  NextResponse,
} from "next/server";

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
  formatSunAsTrxDisplay,
} from "@/lib/money/trx";

import {
  requireWalletUser,
} from "@/modules/auth/auth.guard";

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

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0",

  Pragma:
    "no-cache",
} as const;

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
    number |
    string;
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
 */

export async function POST(
  request:
    Request,
) {
  try {
    const authenticatedUser =
      await requireWalletUser();

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
     * Fail closed:
     *
     * Si no pudimos estimar Energy o costo, no autorizamos
     * la firma desde la interfaz.
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
              formatSunAsTrxDisplay(
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
                ? formatSunAsTrxDisplay(
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

        headers:
          PRIVATE_NO_STORE_HEADERS,
      },
    );
  }
}