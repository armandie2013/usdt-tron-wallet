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

/*
 * ============================================================
 * LÍMITES DE SEGURIDAD
 * ============================================================
 *
 * 100 TRX expresados en SUN.
 *
 * El backend NO paga este fee. Solamente impide que este relay
 * acepte una transacción construida con un fee_limit superior.
 */

const DEFAULT_MAX_FEE_LIMIT_SUN =
  100_000_000;

const USDT_TRANSFER_SELECTOR =
  "a9059cbb";

/*
 * ============================================================
 * TIPO NATIVO ESPERADO POR TRONWEB
 * ============================================================
 */

type TronClientInstance =
  ReturnType<
    typeof TronClient.create
  >;

type BroadcastTransaction =
  Parameters<
    TronClientInstance["trx"]["sendRawTransaction"]
  >[0];

/*
 * ============================================================
 * BODY
 * ============================================================
 *
 * La transacción llega YA FIRMADA.
 *
 * Nunca deben llegar:
 *
 * - privateKey
 * - mnemonic
 * - contraseña del vault
 */

const requestSchema =
  z
    .object({
      signedTransaction:
        z.unknown(),
    })
    .strict();

/*
 * ============================================================
 * ESTRUCTURA MÍNIMA QUE INSPECCIONAMOS
 * ============================================================
 *
 * Solamente describimos los campos que necesitamos validar
 * antes de retransmitir la transacción.
 */

interface TronContractValue {
  owner_address?:
    unknown;

  contract_address?:
    unknown;

  data?:
    unknown;
}

interface TronContractParameter {
  value?:
    TronContractValue;
}

interface TronRawContract {
  type?:
    unknown;

  parameter?:
    TronContractParameter;
}

interface TronRawData {
  contract?:
    unknown;

  fee_limit?:
    unknown;
}

interface SignedTransactionShape {
  txID?:
    unknown;

  signature?:
    unknown;

  raw_data?:
    TronRawData;
}

interface ValidatedSignedTransaction {
  txid:
    string;

  ownerAddress:
    string;

  contractAddress:
    string;

  recipientAddress:
    string;

  amountUnits:
    string;

  feeLimitSun:
    number;
}

/*
 * ============================================================
 * AUTH
 * ============================================================
 */

async function getAuthenticatedUserId():
  Promise<string> {
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
 * HELPERS
 * ============================================================
 */

function isObject(
  value:
    unknown,
): value is
  Record<
    string,
    unknown
  > {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function normalizeHex(
  value:
    string,
): string {
  return value
    .trim()
    .replace(
      /^0x/i,
      "",
    )
    .toLowerCase();
}

function normalizeHexAddress(
  value:
    string,
): string {
  return normalizeHex(
    value,
  ).toUpperCase();
}

function hexToBase58(
  value:
    string,
): string {
  const normalized =
    normalizeHexAddress(
      value,
    );

  if (
    !/^41[0-9A-F]{40}$/.test(
      normalized,
    )
  ) {
    throw new AppError(
      "La transacción contiene una dirección TRON hexadecimal inválida.",
      "INVALID_TRANSACTION_ADDRESS",
      400,
    );
  }

  try {
    const address =
      TronWeb
        .address
        .fromHex(
          normalized,
        );

    if (
      !TronWeb.isAddress(
        address,
      )
    ) {
      throw new Error(
        "Dirección TRON inválida.",
      );
    }

    return address;
  } catch {
    throw new AppError(
      "No se pudo interpretar una dirección TRON de la transacción.",
      "INVALID_TRANSACTION_ADDRESS",
      400,
    );
  }
}

function getTransactionShape(
  value:
    unknown,
): SignedTransactionShape {
  if (
    !isObject(
      value,
    )
  ) {
    throw new AppError(
      "La transacción firmada no es válida.",
      "INVALID_SIGNED_TRANSACTION",
      400,
    );
  }

  return value as
    SignedTransactionShape;
}

function getMaximumFeeLimitSun():
  number {
  const raw =
    process.env
      .TRON_BROADCAST_MAX_FEE_LIMIT_SUN
      ?.trim();

  if (
    !raw
  ) {
    return DEFAULT_MAX_FEE_LIMIT_SUN;
  }

  const parsed =
    Number.parseInt(
      raw,
      10,
    );

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed <=
      0
  ) {
    throw new AppError(
      "TRON_BROADCAST_MAX_FEE_LIMIT_SUN no está configurado correctamente.",
      "TRON_CONFIGURATION_ERROR",
      500,
    );
  }

  return parsed;
}

/*
 * ============================================================
 * DECODIFICAR transfer(address,uint256)
 * ============================================================
 *
 * Payload ABI:
 *
 * a9059cbb
 * + address (32 bytes)
 * + uint256 (32 bytes)
 *
 * En TRON el argumento address del ABI utiliza los 20 bytes
 * de la dirección EVM. Para reconstruir Base58 se antepone 41.
 */

function decodeUsdtTransferData(
  rawData:
    string,
): {
  recipientAddress:
    string;

  amountUnits:
    string;
} {
  const data =
    normalizeHex(
      rawData,
    );

  /*
   * selector: 8 hex
   * address:  64 hex
   * amount:   64 hex
   */
  if (
    !/^[0-9a-f]{136}$/.test(
      data,
    )
  ) {
    throw new AppError(
      "El calldata de la transferencia USDT no tiene el formato esperado.",
      "INVALID_USDT_CALLDATA",
      400,
    );
  }

  const selector =
    data.slice(
      0,
      8,
    );

  if (
    selector !==
    USDT_TRANSFER_SELECTOR
  ) {
    throw new AppError(
      "La transacción no invoca transfer(address,uint256) de USDT.",
      "INVALID_USDT_FUNCTION_SELECTOR",
      400,
    );
  }

  const recipientWord =
    data.slice(
      8,
      72,
    );

  const amountWord =
    data.slice(
      72,
      136,
    );

  /*
   * Un address ABI ocupa 20 bytes y debe venir
   * left-padded con 12 bytes cero.
   */
  if (
    !/^0{24}[0-9a-f]{40}$/.test(
      recipientWord,
    )
  ) {
    throw new AppError(
      "El destinatario codificado en la transferencia USDT no es válido.",
      "INVALID_USDT_RECIPIENT",
      400,
    );
  }

  const recipientHex =
    `41${recipientWord.slice(-40)}`;

  const recipientAddress =
    hexToBase58(
      recipientHex,
    );

  let amount:
    bigint;

  try {
    amount =
      BigInt(
        `0x${amountWord}`,
      );
  } catch {
    throw new AppError(
      "El importe codificado en la transferencia USDT no es válido.",
      "INVALID_USDT_AMOUNT",
      400,
    );
  }

  if (
    amount <=
      0n
  ) {
    throw new AppError(
      "El importe de la transferencia USDT debe ser mayor que cero.",
      "INVALID_USDT_AMOUNT",
      400,
    );
  }

  return {
    recipientAddress,

    amountUnits:
      amount.toString(),
  };
}

/*
 * ============================================================
 * VALIDAR TRANSACCIÓN
 * ============================================================
 */

function validateSignedTransaction(
  signedTransaction:
    unknown,
): ValidatedSignedTransaction {
  const transaction =
    getTransactionShape(
      signedTransaction,
    );

  /*
   * ==========================================================
   * TXID
   * ==========================================================
   */

  if (
    typeof transaction
      .txID !==
      "string" ||
    !/^[0-9a-fA-F]{64}$/.test(
      transaction.txID,
    )
  ) {
    throw new AppError(
      "La transacción firmada no contiene un txID válido.",
      "INVALID_TRANSACTION_TXID",
      400,
    );
  }

  /*
   * ==========================================================
   * FIRMA
   * ==========================================================
   *
   * Para la wallet estándar del usuario esperamos exactamente
   * una firma secp256k1 de 65 bytes = 130 caracteres hex.
   */

  if (
    !Array.isArray(
      transaction.signature,
    ) ||
    transaction.signature
      .length !==
      1
  ) {
    throw new AppError(
      "La transacción debe contener exactamente una firma.",
      "INVALID_TRANSACTION_SIGNATURE_COUNT",
      400,
    );
  }

  const signature =
    transaction.signature[0];

  if (
    typeof signature !==
      "string" ||
    !/^[0-9a-fA-F]{130}$/.test(
      signature,
    )
  ) {
    throw new AppError(
      "La transacción contiene una firma inválida.",
      "INVALID_TRANSACTION_SIGNATURE",
      400,
    );
  }

  /*
   * ==========================================================
   * RAW DATA
   * ==========================================================
   */

  const rawData =
    transaction.raw_data;

  if (
    !rawData
  ) {
    throw new AppError(
      "La transacción no contiene raw_data.",
      "INVALID_TRANSACTION_RAW_DATA",
      400,
    );
  }

  const contracts =
    rawData.contract;

  if (
    !Array.isArray(
      contracts,
    ) ||
    contracts.length !==
      1
  ) {
    throw new AppError(
      "La transacción debe contener exactamente una operación.",
      "INVALID_TRANSACTION_CONTRACT_COUNT",
      400,
    );
  }

  const rawContract =
    contracts[0];

  if (
    !isObject(
      rawContract,
    )
  ) {
    throw new AppError(
      "La operación TRON no es válida.",
      "INVALID_TRANSACTION_CONTRACT",
      400,
    );
  }

  const contract =
    rawContract as
      TronRawContract;

  /*
   * Solo aceptamos TriggerSmartContract.
   *
   * Este endpoint NO puede funcionar como relay genérico para:
   *
   * - transferencias TRX;
   * - stake/freeze;
   * - votaciones;
   * - cambios de permisos;
   * - otras llamadas a contratos.
   */

  if (
    contract.type !==
    "TriggerSmartContract"
  ) {
    throw new AppError(
      "Este endpoint solamente acepta transferencias USDT TRC20.",
      "UNSUPPORTED_TRANSACTION_TYPE",
      400,
    );
  }

  const value =
    contract
      .parameter
      ?.value;

  if (
    !value
  ) {
    throw new AppError(
      "La transacción no contiene los parámetros del contrato.",
      "INVALID_TRANSACTION_PARAMETERS",
      400,
    );
  }

  if (
    typeof value
      .owner_address !==
      "string"
  ) {
    throw new AppError(
      "La transacción no contiene una dirección de origen válida.",
      "INVALID_TRANSACTION_OWNER",
      400,
    );
  }

  if (
    typeof value
      .contract_address !==
      "string"
  ) {
    throw new AppError(
      "La transacción no contiene una dirección de contrato válida.",
      "INVALID_TRANSACTION_CONTRACT_ADDRESS",
      400,
    );
  }

  if (
    typeof value.data !==
      "string"
  ) {
    throw new AppError(
      "La transacción no contiene calldata USDT válido.",
      "INVALID_USDT_CALLDATA",
      400,
    );
  }

  /*
   * ==========================================================
   * FEE LIMIT
   * ==========================================================
   */

  const feeLimit =
    rawData.fee_limit;

  if (
    typeof feeLimit !==
      "number" ||
    !Number.isSafeInteger(
      feeLimit,
    ) ||
    feeLimit <=
      0
  ) {
    throw new AppError(
      "La transacción no contiene un fee_limit válido.",
      "INVALID_TRANSACTION_FEE_LIMIT",
      400,
    );
  }

  const maximumFeeLimit =
    getMaximumFeeLimitSun();

  if (
    feeLimit >
      maximumFeeLimit
  ) {
    throw new AppError(
      `El fee_limit de la transacción supera el máximo permitido de ${maximumFeeLimit} SUN.`,
      "TRANSACTION_FEE_LIMIT_TOO_HIGH",
      400,
    );
  }

  const ownerAddress =
    hexToBase58(
      value.owner_address,
    );

  const contractAddress =
    hexToBase58(
      value.contract_address,
    );

  const decodedTransfer =
    decodeUsdtTransferData(
      value.data,
    );

  return {
    txid:
      transaction.txID,

    ownerAddress,

    contractAddress,

    recipientAddress:
      decodedTransfer
        .recipientAddress,

    amountUnits:
      decodedTransfer
        .amountUnits,

    feeLimitSun:
      feeLimit,
  };
}

/*
 * ============================================================
 * POST /api/v1/wallet/broadcast
 * ============================================================
 */

export async function POST(
  request:
    Request,
) {
  try {
    const userId =
      await getAuthenticatedUserId();

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
          "La solicitud de broadcast no es válida.",
        "INVALID_BROADCAST_REQUEST",
        400,
      );
    }

    /*
     * ========================================================
     * WALLET PÚBLICA DEL USUARIO
     * ========================================================
     */

    const tronService =
      new TronService();

    const account =
      await tronService
        .getPublicAddress(
          userId,
        );

    if (
      !account
    ) {
      throw new AppError(
        "El usuario todavía no posee una wallet TRON registrada.",
        "SENDER_WALLET_NOT_FOUND",
        409,
      );
    }

    /*
     * ========================================================
     * INSPECCIÓN DE LA TRANSACCIÓN FIRMADA
     * ========================================================
     */

    const validated =
      validateSignedTransaction(
        parsed.data
          .signedTransaction,
      );

    /*
     * El owner_address debe ser exactamente la wallet pública
     * registrada para el usuario autenticado.
     */

    if (
      validated
        .ownerAddress !==
      account
        .addressBase58
    ) {
      throw new AppError(
        "La transacción firmada no pertenece a la wallet de este usuario.",
        "TRANSACTION_OWNER_MISMATCH",
        403,
      );
    }

    /*
     * ========================================================
     * CONTRATO USDT
     * ========================================================
     */

    const usdtContract =
      getUsdtTrc20Contract();

    if (
      validated
        .contractAddress !==
      usdtContract
    ) {
      throw new AppError(
        "La transacción no corresponde al contrato USDT configurado.",
        "INVALID_USDT_CONTRACT",
        400,
      );
    }

    /*
     * ========================================================
     * BROADCAST
     * ========================================================
     *
     * El backend:
     *
     * - NO posee private key;
     * - NO firma;
     * - NO modifica la transacción.
     *
     * Solamente retransmite una transacción ya firmada después
     * de validar estrictamente qué operación contiene.
     */

    const tronWeb =
      TronClient.create();

    const transaction =
      parsed.data
        .signedTransaction as
        BroadcastTransaction;

    const broadcast =
      await tronWeb
        .trx
        .sendRawTransaction(
          transaction,
        );

    /*
     * ========================================================
     * RESULTADO DE TRON
     * ========================================================
     */

    if (
      broadcast.result !==
        true
    ) {
      const rawMessage =
        broadcast.message;

      let message =
        "La red TRON rechazó la transacción.";

      if (
        typeof rawMessage ===
          "string" &&
        rawMessage
      ) {
        message =
          rawMessage;
      }

      throw new AppError(
        message,
        "TRON_BROADCAST_REJECTED",
        502,
      );
    }

    const broadcastTxid =
      broadcast.txid ??
      validated.txid;

    if (
      !broadcastTxid
    ) {
      throw new AppError(
        "TRON aceptó la transacción pero no devolvió txid.",
        "TRON_TXID_MISSING",
        502,
      );
    }

    /*
     * Broadcast aceptado no significa todavía confirmado.
     * La confirmación definitiva ocurrirá on-chain.
     */

    return NextResponse.json(
      {
        success:
          true,

        broadcast: {
          accepted:
            true,

          txid:
            broadcastTxid,

          network:
            account.network,

          fromAddress:
            account
              .addressBase58,

          toAddress:
            validated
              .recipientAddress,

          amountUnits:
            validated
              .amountUnits,

          contractAddress:
            usdtContract,

          feeLimitSun:
            validated
              .feeLimitSun,

          status:
            "BROADCASTED",
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
      "[WALLET BROADCAST]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo transmitir la transacción a TRON.",
      },
      {
        status:
          500,
      },
    );
  }
}
