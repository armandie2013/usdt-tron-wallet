import {
  MongoServerError,
} from "mongodb";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  formatUsdtDisplay,
} from "@/lib/money/usdt";

import {
  LedgerService,
} from "@/modules/ledger/ledger.service";

import {
  WalletRepository,
} from "@/modules/wallets/wallet.repository";

import {
  TronAccountRepository,
} from "@/modules/blockchain/tron/tron-account.repository";

import {
  tronEventAddressToBase58,
} from "@/modules/blockchain/tron/tron-address";

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

export class DepositService {
  private readonly deposits =
    new DepositRepository();

  private readonly accounts =
    new TronAccountRepository();

  private readonly wallets =
    new WalletRepository();

  private readonly ledger =
    new LedgerService();

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
   * SINCRONIZACIÓN MANUAL LEGACY
   *
   * La mantenemos por ahora como herramienta de desarrollo.
   *
   * El scanner central nuevo NO utiliza este método.
   */
  async syncUserDeposits(
    userId: string,
  ) {
    const network =
      this.getNetwork();

    const tronAccount =
      await this.accounts
        .findByUserId(
          userId,
          network,
        );

    if (
      !tronAccount ||
      !tronAccount._id
    ) {
      throw new AppError(
        "El usuario no posee una dirección TRON.",
        "TRON_ACCOUNT_NOT_FOUND",
        404,
      );
    }

    const wallet =
      await this.wallets
        .getOrCreateUserWallet(
          userId,
          "USDT",
        );

    if (!wallet._id) {
      throw new AppError(
        "La wallet del usuario no posee un identificador válido.",
        "INVALID_WALLET_ACCOUNT",
        500,
      );
    }

    const clearingWallet =
      await this.wallets
        .getOrCreateSystemWallet(
          "EXTERNAL_CLEARING",
          "USDT",
        );

    if (!clearingWallet._id) {
      throw new AppError(
        "No se pudo obtener la cuenta contable de compensación.",
        "INVALID_CLEARING_WALLET",
        500,
      );
    }

    const contract =
      getUsdtTrc20Contract();

    const transactions =
      await this.fetchIncomingTransfers(
        tronAccount.addressBase58,
        contract,
      );

    let found =
      0;

    let credited =
      0;

    let alreadyProcessed =
      0;

    let ignored =
      0;

    const creditedDeposits:
      Array<{
        txid: string;
        from: string;
        amount: string;
        formattedAmount: string;
      }> = [];

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
        tronAccount.addressBase58
      ) {
        ignored++;
        continue;
      }

      if (
        transaction.token_info
          ?.address !==
        contract
      ) {
        ignored++;
        continue;
      }

      if (
        transaction.token_info
          ?.decimals !==
        6
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

      const amount =
        BigInt(
          transaction.value,
        );

      if (
        amount <= 0n
      ) {
        ignored++;
        continue;
      }

      found++;

      /*
       * Este endpoint viejo no devuelve eventIndex.
       *
       * Se conserva una eventKey determinista
       * únicamente para compatibilidad.
       */
      const eventKey =
        [
          "legacy",
          network,
          transaction.transaction_id,
          transaction.from,
          transaction.to,
          transaction.value,
          transaction.block_timestamp,
        ].join(":");

      const exists =
        await this.deposits
          .existsByEventKey(
            eventKey,
          );

      if (exists) {
        alreadyProcessed++;
        continue;
      }

      const idempotencyKey =
        `tron-deposit:${eventKey}`;

      try {
        const ledgerTransaction =
          await this.ledger.post({
            asset:
              "USDT",

            type:
              "DEPOSIT",

            idempotencyKey,

            referenceType:
              "TRON_TRC20_DEPOSIT",

            referenceId:
              transaction.transaction_id,

            metadata: {
              network,

              source:
                "LEGACY_MANUAL_SYNC",

              txid:
                transaction.transaction_id,

              from:
                transaction.from,

              to:
                transaction.to,

              contract,
            },

            entries: [
              {
                accountId:
                  wallet._id.toString(),

                amount,

                description:
                  "Depósito USDT TRC20 confirmado",
              },

              {
                accountId:
                  clearingWallet._id.toString(),

                amount:
                  -amount,

                description:
                  "Contrapartida depósito USDT TRC20",
              },
            ],
          });

        /*
         * eventIndex = -1 y blockNumber = 0
         * identifican documentos históricos provenientes
         * del sincronizador manual anterior.
         *
         * El scanner central utilizará eventIndex real.
         */
        await this.deposits
          .saveCreditedDeposit({
            userId,

            walletAccountId:
              wallet._id.toString(),

            network,

            contractAddress:
              contract,

            txid:
              transaction.transaction_id,

            eventIndex:
              -1,

            eventKey,

            blockNumber:
              0,

            fromAddress:
              transaction.from,

            toAddress:
              transaction.to,

            amountUnits:
              amount,

            blockTimestamp:
              new Date(
                transaction.block_timestamp,
              ),

            ledgerTransactionId:
              ledgerTransaction._id
                ?.toString(),
          });

        credited++;

        creditedDeposits.push({
          txid:
            transaction.transaction_id,

          from:
            transaction.from,

          amount:
            amount.toString(),

          formattedAmount:
            formatUsdtDisplay(
              amount,
            ),
        });
      } catch (error) {
        if (
          error instanceof
            MongoServerError &&
          error.code ===
            11000
        ) {
          alreadyProcessed++;

          continue;
        }

        throw error;
      }
    }

    const balance =
      await this.ledger
        .getBalance(
          wallet._id.toString(),
        );

    return {
      address:
        tronAccount.addressBase58,

      network,

      contract,

      found,

      credited,

      alreadyProcessed,

      ignored,

      creditedDeposits,

      balance:
        balance.toString(),

      formattedBalance:
        formatUsdtDisplay(
          balance,
        ),
    };
  }

  /*
   * NUEVO SCANNER CENTRAL
   *
   * Procesa un evento Transfer ya confirmado
   * detectado directamente en el contrato USDT.
   */
  async processConfirmedTronEvent(
    event:
      TronContractTransferEvent,

    network:
      TronNetwork,
  ): Promise<{
    matched: boolean;
    credited: boolean;
    alreadyProcessed: boolean;
  }> {
    if (
      event.event_name !==
      "Transfer"
    ) {
      return {
        matched: false,
        credited: false,
        alreadyProcessed: false,
      };
    }

    if (
      !Number.isInteger(
        event.event_index,
      ) ||
      event.event_index < 0
    ) {
      console.warn(
        "[TRON DEPOSIT] Evento sin event_index válido:",
        event.transaction_id,
      );

      return {
        matched: false,
        credited: false,
        alreadyProcessed: false,
      };
    }

    if (
      !Number.isInteger(
        event.block_number,
      ) ||
      event.block_number < 0
    ) {
      console.warn(
        "[TRON DEPOSIT] Evento sin block_number válido:",
        event.transaction_id,
      );

      return {
        matched: false,
        credited: false,
        alreadyProcessed: false,
      };
    }

    const fromRaw =
      event.result.from ??
      event.result["0"];

    const toRaw =
      event.result.to ??
      event.result["1"];

    const valueRaw =
      event.result.value ??
      event.result["2"];

    if (
      !fromRaw ||
      !toRaw ||
      !valueRaw
    ) {
      return {
        matched: false,
        credited: false,
        alreadyProcessed: false,
      };
    }

    if (
      !/^\d+$/.test(
        valueRaw,
      )
    ) {
      console.warn(
        "[TRON DEPOSIT] Valor inválido:",
        event.transaction_id,
        valueRaw,
      );

      return {
        matched: false,
        credited: false,
        alreadyProcessed: false,
      };
    }

    let fromAddress:
      string;

    let toAddress:
      string;

    try {
      fromAddress =
        tronEventAddressToBase58(
          fromRaw,
        );

      toAddress =
        tronEventAddressToBase58(
          toRaw,
        );
    } catch (error) {
      console.error(
        "[TRON DEPOSIT] Error convirtiendo dirección:",
        error,
      );

      return {
        matched: false,
        credited: false,
        alreadyProcessed: false,
      };
    }

    /*
     * Acá está la diferencia fundamental
     * respecto del worker viejo.
     *
     * No recorremos usuarios.
     *
     * MongoDB busca directamente por el índice:
     *
     * addressBase58 → usuario
     */
    const tronAccount =
      await this.accounts
        .findByAddress(
          toAddress,
        );

    if (
      !tronAccount ||
      !tronAccount._id
    ) {
      return {
        matched: false,
        credited: false,
        alreadyProcessed: false,
      };
    }

    if (
      tronAccount.network !==
      network
    ) {
      return {
        matched: false,
        credited: false,
        alreadyProcessed: false,
      };
    }

    const alreadyExists =
      await this.deposits
        .existsByBlockchainEvent(
          network,
          event.transaction_id,
          event.event_index,
        );

    if (alreadyExists) {
      return {
        matched: true,
        credited: false,
        alreadyProcessed: true,
      };
    }

    const amount =
      BigInt(
        valueRaw,
      );

    if (
      amount <= 0n
    ) {
      return {
        matched: false,
        credited: false,
        alreadyProcessed: false,
      };
    }

    const userId =
      tronAccount.userId
        .toString();

    const wallet =
      await this.wallets
        .getOrCreateUserWallet(
          userId,
          "USDT",
        );

    const clearingWallet =
      await this.wallets
        .getOrCreateSystemWallet(
          "EXTERNAL_CLEARING",
          "USDT",
        );

    if (
      !wallet._id ||
      !clearingWallet._id
    ) {
      throw new AppError(
        "No se pudieron obtener las cuentas contables del depósito.",
        "INVALID_WALLET_ACCOUNT",
        500,
      );
    }

    const eventKey =
      `${network}:${event.transaction_id}:${event.event_index}`;

    const idempotencyKey =
      `tron-deposit:${eventKey}`;

    const contract =
      getUsdtTrc20Contract();

    try {
      const ledgerTransaction =
        await this.ledger.post({
          asset:
            "USDT",

          type:
            "DEPOSIT",

          idempotencyKey,

          referenceType:
            "TRON_TRC20_DEPOSIT",

          referenceId:
            event.transaction_id,

          metadata: {
            network,

            source:
              "CENTRAL_SCANNER",

            txid:
              event.transaction_id,

            eventIndex:
              event.event_index.toString(),

            blockNumber:
              event.block_number.toString(),

            from:
              fromAddress,

            to:
              toAddress,

            contract,
          },

          entries: [
            {
              accountId:
                wallet._id.toString(),

              amount,

              description:
                "Depósito USDT TRC20 confirmado",
            },

            {
              accountId:
                clearingWallet._id.toString(),

              amount:
                -amount,

              description:
                "Contrapartida depósito USDT TRC20",
            },
          ],
        });

      await this.deposits
        .saveCreditedDeposit({
          userId,

          walletAccountId:
            wallet._id.toString(),

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

          ledgerTransactionId:
            ledgerTransaction._id
              ?.toString(),
        });

      console.log(
        `[TRON DEPOSIT] ${formatUsdtDisplay(
          amount,
        )} USDT | ${toAddress} | TX ${event.transaction_id}:${event.event_index}`,
      );

      return {
        matched: true,
        credited: true,
        alreadyProcessed: false,
      };
    } catch (error) {
      /*
       * Segunda capa de idempotencia.
       *
       * Si dos procesos llegaran simultáneamente,
       * el índice UNIQUE evita duplicar el movimiento.
       */
      if (
        error instanceof
          MongoServerError &&
        error.code ===
          11000
      ) {
        console.log(
          `[TRON DEPOSIT] Ya procesado | ${event.transaction_id}:${event.event_index}`,
        );

        return {
          matched: true,
          credited: false,
          alreadyProcessed: true,
        };
      }

      throw error;
    }
  }

  /*
   * SINCRONIZADOR MANUAL ANTIGUO
   *
   * Solo para desarrollo / diagnóstico.
   */
  private async fetchIncomingTransfers(
    address: string,
    contract: string,
  ): Promise<
    TronGridTrc20Transaction[]
  > {
    const fullHost =
      process.env
        .TRON_FULL_HOST
        ?.trim();

    if (!fullHost) {
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
          method: "GET",

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

    if (!response.ok) {
      const body =
        await response.text();

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

    const data =
      (await response.json()) as
        TronGridTrc20Response;

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

    return data.data ??
      [];
  }
}