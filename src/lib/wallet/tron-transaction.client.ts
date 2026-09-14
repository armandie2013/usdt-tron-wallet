"use client";

import {
  TronWeb,
} from "tronweb";

import {
  isValidTronAddress,
  privateKeyMatchesAddress,
} from "@/lib/wallet/non-custodial-wallet.client";

import type {
  WalletNetwork,
} from "@/lib/wallet/wallet-storage.client";

/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

const TRON_NILE_FULL_HOST =
  "https://nile.trongrid.io";

const TRON_MAINNET_FULL_HOST =
  "https://api.trongrid.io";

const MAX_FEE_LIMIT_SUN =
  100_000_000;

/*
 * ============================================================
 * TIPOS NATIVOS DE TRONWEB
 * ============================================================
 *
 * No redefinimos manualmente la estructura interna
 * de una Transaction.
 *
 * TronWeb 6 posee tipos propios para:
 *
 * - Transaction
 * - TriggerSmartContract
 * - SignedTransaction
 *
 * Inferimos esos tipos directamente desde la librería.
 */

type TriggerSmartContractResponse =
  Awaited<
    ReturnType<
      TronWeb["transactionBuilder"]["triggerSmartContract"]
    >
  >;

type TriggerSmartContractTransaction =
  NonNullable<
    TriggerSmartContractResponse["transaction"]
  >;

/*
 * ============================================================
 * TIPOS PÚBLICOS
 * ============================================================
 */

export interface BuildUsdtTransferInput {
  network:
    WalletNetwork;

  fromAddress:
    string;

  toAddress:
    string;

  contractAddress:
    string;

  /*
   * USDT en unidades mínimas.
   *
   * 1 USDT = 1.000.000 unidades.
   */
  amountUnits:
    string;

  /*
   * Máximo autorizado de consumo,
   * expresado en SUN.
   *
   * 1 TRX = 1.000.000 SUN.
   */
  feeLimitSun:
    number;

  /*
   * Esta clave solamente debe provenir del
   * vault local desbloqueado.
   *
   * Nunca debe provenir del servidor.
   */
  privateKey:
    string;
}

export interface PreparedUsdtTransfer {
  network:
    WalletNetwork;

  fromAddress:
    string;

  toAddress:
    string;

  contractAddress:
    string;

  amountUnits:
    string;

  feeLimitSun:
    number;

  transaction:
    TriggerSmartContractTransaction;
}

export interface SignedUsdtTransfer {
  network:
    WalletNetwork;

  fromAddress:
    string;

  toAddress:
    string;

  contractAddress:
    string;

  amountUnits:
    string;

  feeLimitSun:
    number;

  txid:
    string;

  /*
   * La transacción firmada puede salir del navegador.
   *
   * NO contiene la private key.
   */
  signedTransaction:
    unknown;
}

/*
 * ============================================================
 * BROWSER
 * ============================================================
 */

function ensureBrowser():
  void {
  if (
    typeof window ===
    "undefined"
  ) {
    throw new Error(
      "Las transacciones no-custodial solo pueden firmarse en el navegador.",
    );
  }
}

/*
 * ============================================================
 * ADDRESS
 * ============================================================
 */

function normalizeAddress(
  address:
    string,

  label:
    string,
): string {
  const normalized =
    address.trim();

  if (
    !normalized
  ) {
    throw new Error(
      `${label} es obligatoria.`,
    );
  }

  if (
    !isValidTronAddress(
      normalized,
    )
  ) {
    throw new Error(
      `${label} no es una dirección TRON válida.`,
    );
  }

  return normalized;
}

/*
 * ============================================================
 * IMPORTE
 * ============================================================
 */

function normalizeAmountUnits(
  value:
    string,
): string {
  const normalized =
    value.trim();

  /*
   * No usamos:
   *
   * parseFloat()
   * Number()
   *
   * para importes USDT.
   */
  if (
    !/^[0-9]+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "El importe USDT debe estar expresado en unidades enteras.",
    );
  }

  let amount:
    bigint;

  try {
    amount =
      BigInt(
        normalized,
      );
  } catch {
    throw new Error(
      "El importe USDT no es válido.",
    );
  }

  if (
    amount <=
    0n
  ) {
    throw new Error(
      "El importe USDT debe ser mayor que cero.",
    );
  }

  return amount.toString();
}

/*
 * ============================================================
 * FEE LIMIT
 * ============================================================
 */

function normalizeFeeLimit(
  value:
    number,
): number {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <=
      0
  ) {
    throw new Error(
      "El feeLimit de TRON no es válido.",
    );
  }

  if (
    value >
    MAX_FEE_LIMIT_SUN
  ) {
    throw new Error(
      `El feeLimit excede el máximo permitido de ${MAX_FEE_LIMIT_SUN} SUN.`,
    );
  }

  return value;
}

/*
 * ============================================================
 * PRIVATE KEY
 * ============================================================
 */

function normalizePrivateKey(
  value:
    string,
): string {
  const normalized =
    value
      .trim()
      .replace(
        /^0x/i,
        "",
      );

  if (
    !/^[0-9a-fA-F]{64}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "La private key TRON no es válida.",
    );
  }

  return normalized
    .toUpperCase();
}

/*
 * ============================================================
 * RED
 * ============================================================
 */

function getFullHost(
  network:
    WalletNetwork,
): string {
  switch (
    network
  ) {
    case "NILE":
      return TRON_NILE_FULL_HOST;

    case "MAINNET":
      return TRON_MAINNET_FULL_HOST;

    default: {
      const exhaustive:
        never =
          network;

      throw new Error(
        `Red TRON no soportada: ${String(
          exhaustive,
        )}`,
      );
    }
  }
}

/*
 * ============================================================
 * TRONWEB
 * ============================================================
 */

function createTronWeb(
  network:
    WalletNetwork,
): TronWeb {
  return new TronWeb({
    fullHost:
      getFullHost(
        network,
      ),
  });
}

/*
 * ============================================================
 * MENSAJES TRON
 * ============================================================
 */

function decodeTronMessage(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
      "string" ||
    !value
  ) {
    return null;
  }

  /*
   * Algunos mensajes de TronGrid pueden
   * venir codificados en hexadecimal.
   */
  if (
    /^[0-9a-fA-F]+$/.test(
      value,
    ) &&
    value.length %
      2 ===
      0
  ) {
    try {
      let decoded =
        "";

      for (
        let index =
          0;
        index <
        value.length;
        index +=
          2
      ) {
        decoded +=
          String.fromCharCode(
            Number.parseInt(
              value.slice(
                index,
                index +
                  2,
              ),
              16,
            ),
          );
      }

      const result =
        decoded.trim();

      if (
        result
      ) {
        return result;
      }
    } catch {
      /*
       * Si no puede decodificarse,
       * usamos el mensaje original.
       */
    }
  }

  return value;
}

/*
 * ============================================================
 * PRIVATE KEY ↔ WALLET
 * ============================================================
 */

function assertPrivateKeyMatchesSender(
  privateKey:
    string,

  fromAddress:
    string,
): void {
  if (
    !privateKeyMatchesAddress(
      privateKey,
      fromAddress,
    )
  ) {
    throw new Error(
      "La clave privada desbloqueada no corresponde a la wallet emisora.",
    );
  }
}

/*
 * ============================================================
 * PREPARAR TRANSFERENCIA USDT
 * ============================================================
 *
 * Esta operación:
 *
 * - construye transfer(address,uint256);
 * - NO firma;
 * - NO transmite;
 * - NO modifica blockchain.
 */

export async function prepareUsdtTransfer(
  input:
    Omit<
      BuildUsdtTransferInput,
      "privateKey"
    >,
): Promise<
  PreparedUsdtTransfer
> {
  ensureBrowser();

  const fromAddress =
    normalizeAddress(
      input.fromAddress,
      "La dirección de origen",
    );

  const toAddress =
    normalizeAddress(
      input.toAddress,
      "La dirección de destino",
    );

  const contractAddress =
    normalizeAddress(
      input.contractAddress,
      "El contrato USDT",
    );

  const amountUnits =
    normalizeAmountUnits(
      input.amountUnits,
    );

  const feeLimitSun =
    normalizeFeeLimit(
      input.feeLimitSun,
    );

  if (
    fromAddress ===
    toAddress
  ) {
    throw new Error(
      "La dirección de destino no puede ser igual a la dirección de origen.",
    );
  }

  const tronWeb =
    createTronWeb(
      input.network,
    );

  /*
   * ==========================================================
   * CONSTRUCCIÓN TRC20
   * ==========================================================
   */

  const triggerResult =
    await tronWeb
      .transactionBuilder
      .triggerSmartContract(
        contractAddress,

        "transfer(address,uint256)",

        {
          feeLimit:
            feeLimitSun,

          callValue:
            0,
        },

        [
          {
            type:
              "address",

            value:
              toAddress,
          },

          {
            type:
              "uint256",

            value:
              amountUnits,
          },
        ],

        fromAddress,
      );

  /*
   * TronWeb ya conoce el tipo exacto de triggerResult.
   *
   * No usamos casts manuales.
   */

  if (
    triggerResult
      .result
      ?.result !==
    true
  ) {
    const message =
      decodeTronMessage(
        triggerResult
          .result
          ?.message,
      );

    throw new Error(
      message ??
        "TRON rechazó la construcción de la transferencia USDT.",
    );
  }

  if (
    !triggerResult
      .transaction
  ) {
    throw new Error(
      "TRON no devolvió una transacción para firmar.",
    );
  }

  return {
    network:
      input.network,

    fromAddress,

    toAddress,

    contractAddress,

    amountUnits,

    feeLimitSun,

    transaction:
      triggerResult
        .transaction,
  };
}

/*
 * ============================================================
 * FIRMAR TRANSFERENCIA
 * ============================================================
 *
 * La private key existe únicamente en memoria
 * durante esta operación.
 *
 * No se incluye en el resultado.
 */

export async function signPreparedUsdtTransfer(
  prepared:
    PreparedUsdtTransfer,

  privateKey:
    string,
): Promise<
  SignedUsdtTransfer
> {
  ensureBrowser();

  const normalizedPrivateKey =
    normalizePrivateKey(
      privateKey,
    );

  const fromAddress =
    normalizeAddress(
      prepared.fromAddress,
      "La dirección de origen",
    );

  /*
   * Protección crítica:
   *
   * comprobamos que la private key desbloqueada
   * pertenezca realmente al address de origen.
   */
  assertPrivateKeyMatchesSender(
    normalizedPrivateKey,
    fromAddress,
  );

  /*
   * Validamos nuevamente los datos públicos.
   */
  normalizeAddress(
    prepared.toAddress,
    "La dirección de destino",
  );

  normalizeAddress(
    prepared.contractAddress,
    "El contrato USDT",
  );

  normalizeAmountUnits(
    prepared.amountUnits,
  );

  normalizeFeeLimit(
    prepared.feeLimitSun,
  );

  const tronWeb =
    createTronWeb(
      prepared.network,
    );

  /*
   * ==========================================================
   * FIRMA LOCAL
   * ==========================================================
   *
   * prepared.transaction conserva exactamente
   * el tipo Transaction que TronWeb espera.
   */

  const signed =
    await tronWeb
      .trx
      .sign(
        prepared.transaction,
        normalizedPrivateKey,
      );

  /*
   * TronWeb define sign() con una unión de retornos
   * porque también soporta firma de mensajes.
   *
   * En este caso estamos firmando una Transaction,
   * por lo tanto un string no sería un resultado válido.
   */
  if (
    typeof signed ===
    "string"
  ) {
    throw new Error(
      "TronWeb devolvió un resultado inesperado al firmar la transacción.",
    );
  }

  if (
    !signed ||
    typeof signed !==
      "object"
  ) {
    throw new Error(
      "No se pudo firmar la transacción.",
    );
  }

  /*
   * Una transacción realmente firmada debe
   * contener al menos una firma.
   */
  if (
    !(
      "signature" in
      signed
    ) ||
    !Array.isArray(
      signed.signature,
    ) ||
    signed.signature.length ===
      0
  ) {
    throw new Error(
      "La transacción no contiene una firma válida.",
    );
  }

  /*
   * txID pertenece tanto a la transacción original
   * como a la firmada.
   */
  const txid =
    signed.txID ??
    prepared
      .transaction
      .txID;

  if (
    !txid
  ) {
    throw new Error(
      "La transacción firmada no contiene txid.",
    );
  }

  return {
    network:
      prepared.network,

    fromAddress:
      prepared.fromAddress,

    toAddress:
      prepared.toAddress,

    contractAddress:
      prepared.contractAddress,

    amountUnits:
      prepared.amountUnits,

    feeLimitSun:
      prepared.feeLimitSun,

    txid,

    signedTransaction:
      signed,
  };
}

/*
 * ============================================================
 * PREPARAR + FIRMAR
 * ============================================================
 *
 * Helper principal para el frontend.
 *
 * Todavía NO hace broadcast.
 */

export async function buildAndSignUsdtTransfer(
  input:
    BuildUsdtTransferInput,
): Promise<
  SignedUsdtTransfer
> {
  ensureBrowser();

  const privateKey =
    normalizePrivateKey(
      input.privateKey,
    );

  const fromAddress =
    normalizeAddress(
      input.fromAddress,
      "La dirección de origen",
    );

  /*
   * Antes incluso de construir la transacción
   * comprobamos que estamos usando el vault correcto.
   */
  assertPrivateKeyMatchesSender(
    privateKey,
    fromAddress,
  );

  const prepared =
    await prepareUsdtTransfer({
      network:
        input.network,

      fromAddress,

      toAddress:
        input.toAddress,

      contractAddress:
        input.contractAddress,

      amountUnits:
        input.amountUnits,

      feeLimitSun:
        input.feeLimitSun,
    });

  return signPreparedUsdtTransfer(
    prepared,
    privateKey,
  );
}