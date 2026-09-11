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

  async runOnce():
    Promise<void> {
    if (this.running) {
      console.log(
        "[DEPOSIT WORKER] Ciclo anterior todavía en ejecución. Se omite este ciclo.",
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

      let credited =
        0;

      let alreadyProcessed =
        0;

      let errors =
        0;

      /*
       * Procesamos por pequeños grupos para no disparar
       * demasiadas consultas simultáneas contra TronGrid.
       */
      for (
        let index = 0;
        index <
        accounts.length;
        index +=
          MAX_CONCURRENCY
      ) {
        if (this.stopping) {
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
                  account.userId.toString();

                const result =
                  await this.deposits
                    .syncUserDeposits(
                      userId,
                    );

                return {
                  userId,
                  address:
                    account.addressBase58,
                  result,
                };
              },
            ),
          );

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
              "[DEPOSIT WORKER] Error sincronizando cuenta:",
              result.reason,
            );

            continue;
          }

          credited +=
            result.value.result
              .credited;

          alreadyProcessed +=
            result.value.result
              .alreadyProcessed;

          if (
            result.value.result
              .credited >
            0
          ) {
            console.log(
              `[DEPOSIT WORKER] Acreditado - ${result.value.address} - nuevos: ${result.value.result.credited}`,
            );

            for (
              const deposit of
              result.value.result
                .creditedDeposits
            ) {
              console.log(
                `[DEPOSIT WORKER] TX ${deposit.txid} - ${deposit.formattedAmount} USDT`,
              );
            }
          }
        }
      }

      const finishedAt =
        new Date();

      console.log(
        `[DEPOSIT WORKER] Fin - revisadas: ${checked} - acreditados: ${credited} - ya procesados: ${alreadyProcessed} - errores: ${errors} - duración: ${
          finishedAt.getTime() -
          startedAt.getTime()
        } ms`,
      );
    } finally {
      this.running =
        false;
    }
  }

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

  stop(): void {
    this.stopping =
      true;

    console.log(
      "[DEPOSIT WORKER] Detención solicitada...",
    );
  }

  private sleep(
    milliseconds:
      number,
  ): Promise<void> {
    return new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          milliseconds,
        );
      },
    );
  }
}