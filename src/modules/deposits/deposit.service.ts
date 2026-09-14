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
  TronAccountRepository,
} from "@/modules/blockchain/tron/tron-account.repository";

import {
  TronService,
} from "@/modules/blockchain/tron/tron.service";

import {
  getUsdtTrc20Contract,
} from "@/modules/blockchain/tron/usdt.contract";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

import {
  DepositRepository,
} from "./deposit.repository";

import type {
  TronContractTransferEvent,
  TronGridTrc20Response,
  TronGridTrc20Transaction,
} from "./deposit.types";

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

export interface ObservedDeposit {
  txid:
    string;

  eventKey:
    string;

  fromAddress:
    string;

  toAddress:
    string;

  amountUnits:
    string;

  formattedAmount:
    string;

  blockTimestamp:
    string;
}

export interface SyncUserDepositsResult {
  address:
    string;

  network:
    TronNetwork;

  contract:
    string;

  found:
    number;

  ignored:
    number;

  observedTransfers:
    ObservedDeposit[];

  balance:
    string;

  formattedBalance:
    string;

  source:
    "TRON";
}

export interface ProcessConfirmedTronEventResult {
  /*
   * true = evento válido perteneciente
   * a una wallet registrada.
   */
  observed:
    boolean;

  /*
   * true = el evento no pertenece al
   * universo que necesitamos indexar.
   */
  ignored:
    boolean;

  reason:
    string |
    null;

  txid:
    string |
    null;
}

/*
 * ============================================================
 * SERVICIO
 * ============================================================
 */

export class DepositService {
  private readonly accounts =
    new TronAccountRepository();

  private readonly deposits =
    new DepositRepository();

  private readonly tron =
    new TronService();

  /*
   * ==========================================================
   * RED ACTUAL
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
   * NORMALIZAR DIRECCIÓN TRON
   * ==========================================================
   *
   * TronGrid puede entregar los argumentos de eventos
   * en Base58 o en hexadecimal 41...
   *
   * Internamente nosotros registramos Base58.
   */

  private normalizeTronAddress(
    value:
      string,
  ): string | null {
    const normalized =
      value.trim();

    if (!normalized) {
      return null;
    }

    /*
     * Ya es Base58.
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
     * Dirección TRON hexadecimal:
     *
     * 41 + 20 bytes
     * = 42 caracteres hex.
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

        if (
          TronWeb.isAddress(
            base58,
          )
        ) {
          return base58;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  /*
   * ==========================================================
   * EVENTO CONFIRMADO DEL SCANNER CENTRAL
   * ==========================================================
   *
   * Este método recibe eventos Transfer del contrato
   * USDT obtenidos bloque por bloque.
   *
   * En el modelo no-custodial:
   *
   * - detecta;
   * - valida;
   * - relaciona con una dirección registrada;
   * - indexa en MongoDB;
   *
   * PERO:
   *
   * - no acredita saldo;
   * - no crea ledger;
   * - no crea clearing;
   * - no firma;
   * - no mueve fondos.
   */

  async processConfirmedTronEvent(
    event:
      TronContractTransferEvent,

    network:
      TronNetwork,
  ): Promise<
    ProcessConfirmedTronEventResult
  > {
    /*
     * ========================================================
     * RED
     * ========================================================
     */

    if (
      network !==
      this.getNetwork()
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "NETWORK_MISMATCH",

        txid:
          event
            .transaction_id ||
          null,
      };
    }

    /*
     * ========================================================
     * CONTRATO
     * ========================================================
     */

    const contract =
      getUsdtTrc20Contract();

    if (
      event
        .contract_address !==
      contract
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "CONTRACT_MISMATCH",

        txid:
          event
            .transaction_id ||
          null,
      };
    }

    /*
     * ========================================================
     * EVENTO TRANSFER
     * ========================================================
     */

    if (
      event.event_name !==
      "Transfer"
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "NOT_TRANSFER",

        txid:
          event
            .transaction_id ||
          null,
      };
    }

    /*
     * TronGrid puede devolver:
     *
     * result.from
     * result.to
     * result.value
     *
     * o:
     *
     * result["0"]
     * result["1"]
     * result["2"]
     */

    const rawFromAddress =
      event
        .result
        .from ??
      event
        .result["0"];

    const rawToAddress =
      event
        .result
        .to ??
      event
        .result["1"];

    const value =
      event
        .result
        .value ??
      event
        .result["2"];

    if (
      !event
        .transaction_id ||
      !rawFromAddress ||
      !rawToAddress ||
      !value
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "INVALID_EVENT",

        txid:
          event
            .transaction_id ||
          null,
      };
    }

    /*
     * ========================================================
     * DIRECCIONES
     * ========================================================
     */

    const fromAddress =
      this.normalizeTronAddress(
        rawFromAddress,
      );

    const toAddress =
      this.normalizeTronAddress(
        rawToAddress,
      );

    if (
      !fromAddress ||
      !toAddress
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "INVALID_ADDRESS",

        txid:
          event
            .transaction_id,
      };
    }

    /*
     * ========================================================
     * IMPORTE
     * ========================================================
     */

    if (
      !/^\d+$/.test(
        value,
      )
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "INVALID_AMOUNT",

        txid:
          event
            .transaction_id,
      };
    }

    let amount:
      bigint;

    try {
      amount =
        BigInt(
          value,
        );
    } catch {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "INVALID_AMOUNT",

        txid:
          event
            .transaction_id,
      };
    }

    if (
      amount <=
      0n
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "INVALID_AMOUNT",

        txid:
          event
            .transaction_id,
      };
    }

    /*
     * ========================================================
     * BLOQUE / EVENT INDEX
     * ========================================================
     */

    if (
      !Number.isSafeInteger(
        event.block_number,
      ) ||
      event.block_number <
        0
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "INVALID_BLOCK_NUMBER",

        txid:
          event
            .transaction_id,
      };
    }

    if (
      !Number.isSafeInteger(
        event.event_index,
      ) ||
      event.event_index <
        0
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "INVALID_EVENT_INDEX",

        txid:
          event
            .transaction_id,
      };
    }

    if (
      !Number.isFinite(
        event.block_timestamp,
      ) ||
      event.block_timestamp <=
        0
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "INVALID_BLOCK_TIMESTAMP",

        txid:
          event
            .transaction_id,
      };
    }

    /*
     * ========================================================
     * ¿LA DIRECCIÓN RECEPTORA PERTENECE A LA PLATAFORMA?
     * ========================================================
     *
     * Importante:
     *
     * findByAddress() solamente trabaja con información
     * pública del usuario.
     *
     * No hay private keys involucradas.
     */

    const account =
      await this.accounts
        .findByAddress(
          toAddress,
        );

    if (
      !account
    ) {
      /*
       * El evento existe realmente en TRON,
       * pero no pertenece a ninguna wallet
       * registrada en nuestra aplicación.
       */
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "UNREGISTERED_RECIPIENT",

        txid:
          event
            .transaction_id,
      };
    }

    if (
      account.network !==
      network
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "ACCOUNT_NETWORK_MISMATCH",

        txid:
          event
            .transaction_id,
      };
    }

    if (
      account.status !==
      "ACTIVE"
    ) {
      return {

        observed:
          false,

        ignored:
          true,

        reason:
          "ACCOUNT_DISABLED",

        txid:
          event
            .transaction_id,
      };
    }

    /*
     * ========================================================
     * EVENT KEY
     * ========================================================
     *
     * Para eventos provenientes del scanner de bloques
     * tenemos el event_index real.
     *
     * Por eso la clave puede ser mucho más limpia que
     * la utilizada por el sincronizador manual.
     */

    const eventKey =
      [
        network,
        event.transaction_id,
        event.event_index,
      ].join(
        ":",
      );

    /*
     * ========================================================
     * INDEXACIÓN
     * ========================================================
     *
     * Primero podemos verificar rápidamente si ya existe.
     *
     * Incluso si dos workers llegan simultáneamente,
     * DepositRepository tiene índices UNIQUE y tolera
     * duplicate key 11000.
     */

    const alreadyIndexed =
      await this.deposits
        .existsByBlockchainEvent(
          network,
          event.transaction_id,
          event.event_index,
        );

    if (
      alreadyIndexed
    ) {
      return {

        observed:
          true,

        ignored:
          false,

        reason:
          "ALREADY_INDEXED",

        txid:
          event
            .transaction_id,
      };
    }

    /*
     * MongoDB guarda solamente metadata/index.
     *
     * El saldo NO sale de esta colección.
     */

    await this.deposits
      .saveObservedDeposit({
        userId:
          account.userId
            .toString(),

        network,

        contractAddress:
          contract,

        txid:
          event.transaction_id,

        eventIndex:
          event.event_index,

        eventKey,

        blockNumber:
          event.block_number,

        fromAddress,

        toAddress,

        amountUnits:
          amount,

        blockTimestamp:
          new Date(
            event.block_timestamp,
          ),
      });

    /*
     * ========================================================
     * RESULTADO
     * ========================================================
     *
     * observed = true:
     *
     * el evento pertenece a una wallet conocida
     * y quedó indexado.
     */

    return {

      observed:
        true,

      ignored:
        false,

      reason:
        null,

      txid:
        event
          .transaction_id,
    };
  }

  /*
   * ==========================================================
   * SINCRONIZACIÓN MANUAL POR USUARIO
   * ==========================================================
   *
   * Se conserva temporalmente porque todavía existe
   * deposit.worker.ts y /sync-deposits.
   *
   * Este flujo solamente consulta.
   *
   * No genera saldo.
   */

  async syncUserDeposits(
    userId:
      string,
  ): Promise<
    SyncUserDepositsResult
  > {
    const network =
      this.getNetwork();

    const tronAccount =
      await this.accounts
        .findByUserId(
          userId,
          network,
        );

    if (
      !tronAccount
    ) {
      throw new AppError(
        "El usuario no posee una dirección TRON.",
        "TRON_ACCOUNT_NOT_FOUND",
        404,
      );
    }

    if (
      tronAccount.status !==
      "ACTIVE"
    ) {
      throw new AppError(
        "La wallet TRON del usuario no está activa.",
        "TRON_ACCOUNT_DISABLED",
        409,
      );
    }

    const address =
      tronAccount
        .addressBase58;

    const contract =
      getUsdtTrc20Contract();

    const transactions =
      await this
        .fetchIncomingTransfers(
          address,
          contract,
        );

    let found =
      0;

    let ignored =
      0;

    const observedTransfers:
      ObservedDeposit[] =
      [];

    for (
      const transaction of
      transactions
    ) {
      if (
        transaction.type !==
        "Transfer"
      ) {
        ignored++;
        continue;
      }

      if (
        transaction.to !==
        address
      ) {
        ignored++;
        continue;
      }

      if (
        transaction
          .token_info
          ?.address !==
        contract
      ) {
        ignored++;
        continue;
      }

      if (
        transaction
          .token_info
          ?.decimals !==
        6
      ) {
        ignored++;
        continue;
      }

      if (
        !transaction
          .transaction_id ||
        !transaction.from ||
        !transaction.to
      ) {
        ignored++;
        continue;
      }

      if (
        !/^\d+$/.test(
          transaction.value,
        )
      ) {
        ignored++;
        continue;
      }

      let amount:
        bigint;

      try {
        amount =
          BigInt(
            transaction.value,
          );
      } catch {
        ignored++;
        continue;
      }

      if (
        amount <=
        0n
      ) {
        ignored++;
        continue;
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
        ignored++;
        continue;
      }

      found++;

      /*
       * El endpoint TRC20 por cuenta no devuelve
       * event_index.
       *
       * Esta clave solamente sirve para la vista
       * temporal del sincronizador manual.
       */

      const eventKey =
        [
          network,
          transaction
            .transaction_id,
          transaction.from,
          transaction.to,
          transaction.value,
          transaction
            .block_timestamp,
        ].join(
          ":",
        );

      observedTransfers.push({
        txid:
          transaction
            .transaction_id,

        eventKey,

        fromAddress:
          transaction.from,

        toAddress:
          transaction.to,

        amountUnits:
          amount
            .toString(),

        formattedAmount:
          formatUsdtDisplay(
            amount,
          ),

        blockTimestamp:
          new Date(
            transaction
              .block_timestamp,
          ).toISOString(),
      });
    }

    /*
     * ========================================================
     * SALDO REAL
     * ========================================================
     */

    const onChainBalance =
      await this.tron
        .getUsdtBalance(
          address,
        );

    return {
      address,

      network,

      contract,

      found,

      ignored,

      observedTransfers,

      balance:
        onChainBalance
          .balanceUnits,

      formattedBalance:
        onChainBalance
          .formattedBalance,

      source:
        "TRON",
    };
  }

  /*
   * ==========================================================
   * HISTORIAL TRC20 ENTRANTE
   * ==========================================================
   */

  private async fetchIncomingTransfers(
    address:
      string,

    contract:
      string,
  ): Promise<
    TronGridTrc20Transaction[]
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

    const url =
      new URL(
        `/v1/accounts/${address}/transactions/trc20`,
        fullHost,
      );

    url.searchParams.set(
      "only_confirmed",
      "true",
    );

    url.searchParams.set(
      "only_to",
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
        "[TRON TRC20 HISTORY]",
        response.status,
        body,
      );

      throw new AppError(
        "No se pudo consultar el historial TRC20.",
        "TRON_TRC20_HISTORY_ERROR",
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
        "TRON_TRC20_HISTORY_ERROR",
        502,
      );
    }

    if (
      data.success !==
      true
    ) {
      throw new AppError(
        "TronGrid devolvió una respuesta inválida.",
        "TRON_TRC20_HISTORY_ERROR",
        502,
      );
    }

    if (
      !Array.isArray(
        data.data,
      )
    ) {
      return [];
    }

    return data.data;
  }
}