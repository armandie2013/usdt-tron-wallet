import {
  DepositService,
} from "@/modules/deposits/deposit.service";

import {
  TronAccountRepository,
} from "@/modules/blockchain/tron/tron-account.repository";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

const DEFAULT_INTERVAL_MS =
  60_000;

const MAX_CONCURRENCY =
  3;

export class DepositWorker {
  private readonly accounts =
    new TronAccountRepository();

  private readonly deposits =
    new DepositService();

  private running =
    false;

  private stopping =
    false;

  /*
   * ==========================================================
   * RED
   * ==========================================================
   */

  private getNetwork():
    TronNetwork {
    const network =
      process.env
        .TRON_NETWORK
        ?.trim()
        .toLowerCase();

    return network ===
      "mainnet"
      ? "MAINNET"
      : "NILE";
  }

  /*
   * ==========================================================
   * INTERVALO
   * ==========================================================
   */

  private getInterval():
    number {
    const configured =
      Number.parseInt(
        process.env
          .DEPOSIT_WORKER_INTERVAL_MS ??
          "",
        10,
      );

    if (
      Number.isFinite(
        configured,
      ) &&
      configured >=
        10_000
    ) {
      return configured;
    }

    return DEFAULT_INTERVAL_MS;
  }

  /*
   * ==========================================================
   * CICLO
   * ==========================================================
   *
   * IMPORTANTE:
   *
   * Este worker ya NO acredita depósitos.
   *
   * El dinero permanece siempre en TRON.
   *
   * El scanner central:
   *
   * TronDepositScannerService
   *
   * es el responsable de indexar eventos confirmados
   * pertenecientes a wallets registradas.
   *
   * Este worker solamente realiza una observación adicional
   * por cuenta:
   *
   * - consulta historial TRC20 confirmado;
   * - consulta saldo USDT on-chain;
   * - registra métricas/logs;
   * - NO modifica balances;
   * - NO crea ledger;
   * - NO mueve fondos.
   */

  async runOnce():
    Promise<void> {
    if (
      this.running
    ) {
      console.log(
        "[DEPOSIT WORKER] El ciclo anterior todavía está en ejecución. Se omite este ciclo.",
      );

      return;
    }

    this.running =
      true;

    const startedAt =
      new Date();

    try {
      const network =
        this.getNetwork();

      /*
       * Solamente direcciones públicas registradas.
       */
      const accounts =
        await this.accounts
          .listByNetwork(
            network,
          );

      console.log(
        `[DEPOSIT WORKER] ${startedAt.toISOString()} - Inicio - Red ${network} - ${accounts.length} cuentas`,
      );

      let checked =
        0;

      let observedTransfers =
        0;

      let ignoredTransfers =
        0;

      let accountsWithTransfers =
        0;

      let errors =
        0;

      /*
       * Procesamos en grupos pequeños para no realizar
       * demasiadas consultas simultáneas contra TronGrid.
       */
      for (
        let index = 0;

        index <
        accounts.length;

        index +=
          MAX_CONCURRENCY
      ) {
        if (
          this.stopping
        ) {
          break;
        }

        const batch =
          accounts.slice(
            index,
            index +
              MAX_CONCURRENCY,
          );

        const results =
          await Promise.allSettled(
            batch.map(
              async (
                account,
              ) => {
                const userId =
                  account
                    .userId
                    .toString();

                const result =
                  await this.deposits
                    .syncUserDeposits(
                      userId,
                    );

                return {
                  userId,

                  address:
                    account
                      .addressBase58,

                  result,
                };
              },
            ),
          );

        /*
         * ====================================================
         * RESULTADOS DEL LOTE
         * ====================================================
         */

        for (
          const result of
          results
        ) {
          checked++;

          if (
            result.status ===
            "rejected"
          ) {
            errors++;

            console.error(
              "[DEPOSIT WORKER] Error observando cuenta:",
              result.reason,
            );

            continue;
          }

          const syncResult =
            result.value
              .result;

          observedTransfers +=
            syncResult.found;

          ignoredTransfers +=
            syncResult.ignored;

          if (
            syncResult.found >
            0
          ) {
            accountsWithTransfers++;

            console.log(
              `[DEPOSIT WORKER] Observada - ${result.value.address} - transferencias confirmadas: ${syncResult.found} - saldo on-chain: ${syncResult.formattedBalance} USDT`,
            );

            /*
             * Mostramos los eventos obtenidos del historial.
             *
             * Esto es únicamente informativo.
             *
             * NO significa "acreditado".
             */
            for (
              const transfer of
              syncResult
                .observedTransfers
            ) {
              console.log(
                `[DEPOSIT WORKER] TX ${transfer.txid} - ${transfer.formattedAmount} USDT - desde ${transfer.fromAddress}`,
              );
            }
          }
        }
      }

      /*
       * ======================================================
       * RESUMEN
       * ======================================================
       */

      const finishedAt =
        new Date();

      const durationMs =
        finishedAt.getTime() -
        startedAt.getTime();

      console.log(
        `[DEPOSIT WORKER] Fin - cuentas revisadas: ${checked} - cuentas con transferencias: ${accountsWithTransfers} - transferencias observadas: ${observedTransfers} - ignoradas: ${ignoredTransfers} - errores: ${errors} - duración: ${durationMs} ms`,
      );
    } finally {
      this.running =
        false;
    }
  }

  /*
   * ==========================================================
   * START
   * ==========================================================
   */

  async start():
    Promise<void> {
    const interval =
      this.getInterval();

    console.log(
      "[DEPOSIT WORKER] Iniciado",
    );

    console.log(
      `[DEPOSIT WORKER] Intervalo: ${interval} ms`,
    );

    console.log(
      `[DEPOSIT WORKER] Concurrencia máxima: ${MAX_CONCURRENCY}`,
    );

    console.log(
      "[DEPOSIT WORKER] Modo no-custodial: observación on-chain únicamente.",
    );

    /*
     * Ejecutamos inmediatamente al arrancar.
     */
    await this.runOnce();

    while (
      !this.stopping
    ) {
      await this.sleep(
        interval,
      );

      if (
        this.stopping
      ) {
        break;
      }

      await this.runOnce();
    }

    console.log(
      "[DEPOSIT WORKER] Detenido",
    );
  }

  /*
   * ==========================================================
   * STOP
   * ==========================================================
   */

  stop():
    void {
    this.stopping =
      true;

    console.log(
      "[DEPOSIT WORKER] Detención solicitada...",
    );
  }

  /*
   * ==========================================================
   * SLEEP
   * ==========================================================
   */

  private sleep(
    milliseconds:
      number,
  ): Promise<void> {
    return new Promise(
      (
        resolve,
      ) => {
        setTimeout(
          resolve,
          milliseconds,
        );
      },
    );
  }
}