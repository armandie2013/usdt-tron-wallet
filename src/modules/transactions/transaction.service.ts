import {
  TronWeb,
} from "tronweb";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  formatUsdt,
} from "@/lib/money/usdt";

import {
  TronAccountRepository,
} from "@/modules/blockchain/tron/tron-account.repository";

import {
  getUsdtTrc20Contract,
} from "@/modules/blockchain/tron/usdt.contract";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

import type {
  TronGridTrc20Response,
  TronGridTrc20Transaction,
} from "@/modules/deposits/deposit.types";

import type {
  PublicTransaction,
} from "./transaction.types";

const MAX_HISTORY_LIMIT =
  200;

const DEFAULT_HISTORY_LIMIT =
  50;

const MAX_PAGES_PER_DIRECTION =
  20;

type TransactionDirection =
  | "CREDIT"
  | "DEBIT";

interface NormalizedTronTransaction {
  txid:
    string;

  fromAddress:
    string;

  toAddress:
    string;

  amountUnits:
    bigint;

  blockTimestamp:
    number;

  direction:
    TransactionDirection;
}

export class TransactionService {
  private readonly accounts =
    new TronAccountRepository();

  /*
   * ==========================================================
   * RED
   * ==========================================================
   */

  private getNetwork():
    TronNetwork {
    const value =
      process.env
        .TRON_NETWORK
        ?.trim()
        .toLowerCase();

    return value ===
      "mainnet"
      ? "MAINNET"
      : "NILE";
  }

  /*
   * ==========================================================
   * HISTORIAL DEL USUARIO
   * ==========================================================
   *
   * Fuente de verdad:
   *
   * TRON / TronGrid
   *
   * MongoDB y el ledger interno NO participan.
   */

  async listUserTransactions(
    userId:
      string,

    requestedLimit =
      DEFAULT_HISTORY_LIMIT,
  ): Promise<
    PublicTransaction[]
  > {
    const network =
      this.getNetwork();

    const account =
      await this.accounts
        .findByUserId(
          userId,
          network,
        );

    /*
     * Un usuario que todavía no registró wallet
     * simplemente no tiene historial blockchain.
     */
    if (
      !account
    ) {
      return [];
    }

    if (
      account.status !==
      "ACTIVE"
    ) {
      throw new AppError(
        "La wallet TRON del usuario no está activa.",
        "TRON_ACCOUNT_DISABLED",
        409,
      );
    }

    const address =
      account
        .addressBase58;

    const limit =
      this.normalizeLimit(
        requestedLimit,
      );

    /*
     * Consultamos entradas y salidas en paralelo.
     */
    const [
      incoming,
      outgoing,
    ] =
      await Promise.all([
        this.fetchTransfers({
          address,

          direction:
            "CREDIT",

          limit,
        }),

        this.fetchTransfers({
          address,

          direction:
            "DEBIT",

          limit,
        }),
      ]);

    /*
     * ========================================================
     * COMBINAR / DEDUPLICAR
     * ========================================================
     */

    const unique =
      new Map<
        string,
        NormalizedTronTransaction
      >();

    for (
      const transaction of
      [
        ...incoming,
        ...outgoing,
      ]
    ) {
      const key =
        [
          transaction.txid,
          transaction.fromAddress,
          transaction.toAddress,
          transaction.amountUnits
            .toString(),
          transaction.blockTimestamp,
          transaction.direction,
        ].join(
          ":",
        );

      if (
        !unique.has(
          key,
        )
      ) {
        unique.set(
          key,
          transaction,
        );
      }
    }

    /*
     * Más recientes primero.
     */
    const transactions =
      Array.from(
        unique.values(),
      )
        .sort(
          (
            a,
            b,
          ) =>
            b.blockTimestamp -
            a.blockTimestamp,
        )
        .slice(
          0,
          limit,
        );

    /*
     * ========================================================
     * PUBLIC TRANSACTION
     * ========================================================
     *
     * Conservamos por ahora la interfaz actual
     * que consume el frontend.
     *
     * CREDIT => amount positivo
     * DEBIT  => amount negativo
     */

    return transactions.map(
      (
        transaction,
      ) => {
        const signedAmount =
          transaction.direction ===
          "CREDIT"
            ? transaction
                .amountUnits
            : -transaction
                .amountUnits;

        return {
          id:
            transaction.txid,

          type:
            "TRC20_TRANSFER",

          asset:
            "USDT" as const,

          amount:
            signedAmount
              .toString(),

          formattedAmount:
            formatUsdt(
              signedAmount,
            ),

          direction:
            transaction.direction,

          referenceType:
            "TRON_TRC20_TRANSACTION",

          referenceId:
            transaction.txid,

          createdAt:
            new Date(
              transaction
                .blockTimestamp,
            ).toISOString(),
        };
      },
    );
  }

  /*
   * ==========================================================
   * CONSULTAR TRANSFERENCIAS TRC20
   * ==========================================================
   */

  private async fetchTransfers(
    input: {
      address:
        string;

      direction:
        TransactionDirection;

      limit:
        number;
    },
  ): Promise<
    NormalizedTronTransaction[]
  > {
    const fullHost =
      process.env
        .TRON_FULL_HOST
        ?.trim();

    if (
      !fullHost
    ) {
      throw new AppError(
        "TRON_FULL_HOST no está configurado.",
        "TRON_CONFIGURATION_ERROR",
        500,
      );
    }

    const contract =
      getUsdtTrc20Contract();

    const results:
      NormalizedTronTransaction[] =
      [];

    let fingerprint:
      string |
      null =
      null;

    let page =
      0;

    const seenFingerprints =
      new Set<string>();

    /*
     * Seguimos paginando hasta reunir suficiente historial
     * o hasta que TronGrid no entregue más páginas.
     */
    do {
      page++;

      if (
        page >
        MAX_PAGES_PER_DIRECTION
      ) {
        break;
      }

      const url =
        new URL(
          `/v1/accounts/${input.address}/transactions/trc20`,
          fullHost,
        );

      url.searchParams.set(
        "only_confirmed",
        "true",
      );

      url.searchParams.set(
        "contract_address",
        contract,
      );

      url.searchParams.set(
        "limit",
        "200",
      );

      url.searchParams.set(
        "order_by",
        "block_timestamp,desc",
      );

      if (
        input.direction ===
        "CREDIT"
      ) {
        url.searchParams.set(
          "only_to",
          "true",
        );
      } else {
        url.searchParams.set(
          "only_from",
          "true",
        );
      }

      if (
        fingerprint
      ) {
        url.searchParams.set(
          "fingerprint",
          fingerprint,
        );
      }

      const apiKey =
        process.env
          .TRON_API_KEY
          ?.trim();

      const response =
        await fetch(
          url,
          {
            method:
              "GET",

            headers:
              apiKey
                ? {
                    "TRON-PRO-API-KEY":
                      apiKey,
                  }
                : undefined,

            cache:
              "no-store",
          },
        );

      if (
        !response.ok
      ) {
        const body =
          await response
            .text();

        console.error(
          "[TRON TRANSACTION HISTORY]",
          {
            address:
              input.address,

            direction:
              input.direction,

            status:
              response.status,

            body,
          },
        );

        throw new AppError(
          "No se pudo consultar el historial TRC20.",
          "TRON_TRANSACTION_HISTORY_ERROR",
          502,
        );
      }

      let data:
        TronGridTrc20Response;

      try {
        data =
          (
            await response
              .json()
          ) as
            TronGridTrc20Response;
      } catch {
        throw new AppError(
          "TronGrid devolvió una respuesta que no pudo interpretarse.",
          "TRON_TRANSACTION_HISTORY_ERROR",
          502,
        );
      }

      if (
        data.success !==
        true
      ) {
        throw new AppError(
          "TronGrid devolvió una respuesta inválida.",
          "TRON_TRANSACTION_HISTORY_ERROR",
          502,
        );
      }

      const pageTransactions =
        Array.isArray(
          data.data,
        )
          ? data.data
          : [];

      for (
        const transaction of
        pageTransactions
      ) {
        const normalized =
          this.normalizeTransaction(
            transaction,
            input.address,
            input.direction,
            contract,
          );

        if (
          !normalized
        ) {
          continue;
        }

        results.push(
          normalized,
        );

        if (
          results.length >=
          input.limit
        ) {
          break;
        }
      }

      if (
        results.length >=
        input.limit
      ) {
        break;
      }

      const nextFingerprint =
        data.meta
          ?.fingerprint
          ?.trim() ||
        null;

      if (
        !nextFingerprint
      ) {
        fingerprint =
          null;

        break;
      }

      if (
        seenFingerprints.has(
          nextFingerprint,
        )
      ) {
        throw new AppError(
          "TronGrid devolvió una paginación inválida.",
          "TRON_TRANSACTION_PAGINATION_ERROR",
          502,
        );
      }

      seenFingerprints.add(
        nextFingerprint,
      );

      fingerprint =
        nextFingerprint;
    } while (
      fingerprint
    );

    return results;
  }

  /*
   * ==========================================================
   * NORMALIZAR TRANSFERENCIA
   * ==========================================================
   */

  private normalizeTransaction(
    transaction:
      TronGridTrc20Transaction,

    userAddress:
      string,

    direction:
      TransactionDirection,

    contract:
      string,
  ): NormalizedTronTransaction |
    null {
    if (
      transaction.type !==
      "Transfer"
    ) {
      return null;
    }

    if (
      transaction
        .token_info
        ?.address !==
      contract
    ) {
      return null;
    }

    if (
      transaction
        .token_info
        ?.decimals !==
      6
    ) {
      return null;
    }

    if (
      !transaction
        .transaction_id
    ) {
      return null;
    }

    const fromAddress =
      this.normalizeAddress(
        transaction.from,
      );

    const toAddress =
      this.normalizeAddress(
        transaction.to,
      );

    const normalizedUserAddress =
      this.normalizeAddress(
        userAddress,
      );

    if (
      !fromAddress ||
      !toAddress ||
      !normalizedUserAddress
    ) {
      return null;
    }

    if (
      direction ===
        "CREDIT" &&
      toAddress !==
        normalizedUserAddress
    ) {
      return null;
    }

    if (
      direction ===
        "DEBIT" &&
      fromAddress !==
        normalizedUserAddress
    ) {
      return null;
    }

    if (
      !/^\d+$/.test(
        transaction.value,
      )
    ) {
      return null;
    }

    let amount:
      bigint;

    try {
      amount =
        BigInt(
          transaction.value,
        );
    } catch {
      return null;
    }

    if (
      amount <=
      0n
    ) {
      return null;
    }

    if (
      !Number.isFinite(
        transaction
          .block_timestamp,
      ) ||
      transaction
        .block_timestamp <=
        0
    ) {
      return null;
    }

    return {
      txid:
        transaction
          .transaction_id,

      fromAddress,

      toAddress,

      amountUnits:
        amount,

      blockTimestamp:
        transaction
          .block_timestamp,

      direction,
    };
  }

  /*
   * ==========================================================
   * NORMALIZAR DIRECCIÓN TRON
   * ==========================================================
   */

  private normalizeAddress(
    value:
      string,
  ): string |
    null {
    const normalized =
      value
        ?.trim();

    if (
      !normalized
    ) {
      return null;
    }

    /*
     * Base58.
     */
    if (
      normalized.startsWith(
        "T",
      ) &&
      TronWeb.isAddress(
        normalized,
      )
    ) {
      return normalized;
    }

    /*
     * Hex TRON completo:
     * 41 + 20 bytes.
     */
    if (
      /^41[0-9a-fA-F]{40}$/.test(
        normalized,
      )
    ) {
      try {
        const base58 =
          TronWeb.address
            .fromHex(
              normalized,
            );

        return TronWeb.isAddress(
          base58,
        )
          ? base58
          : null;
      } catch {
        return null;
      }
    }

    /*
     * Dirección de evento EVM-style:
     * 20 bytes sin prefijo 41.
     */
    if (
      /^[0-9a-fA-F]{40}$/.test(
        normalized,
      )
    ) {
      try {
        const base58 =
          TronWeb.address
            .fromHex(
              `41${normalized}`,
            );

        return TronWeb.isAddress(
          base58,
        )
          ? base58
          : null;
      } catch {
        return null;
      }
    }

    return null;
  }

  /*
   * ==========================================================
   * LIMIT
   * ==========================================================
   */

  private normalizeLimit(
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
      return DEFAULT_HISTORY_LIMIT;
    }

    return Math.min(
      value,
      MAX_HISTORY_LIMIT,
    );
  }
}