import {
  TronClient,
} from "@/modules/blockchain/tron/tron.client";

import {
  SweepRepository,
} from "./sweep.repository";

interface TronTransactionInfo {
  id?:
    string;

  receipt?: {
    result?:
      string;

    energy_usage_total?:
      number;

    net_usage?:
      number;
  };

  result?:
    string;

  blockNumber?:
    number;

  blockTimeStamp?:
    number;

  fee?:
    number;
}

export class SweepConfirmationService {
  private readonly sweeps =
    new SweepRepository();

  async confirmPendingSweeps(
    limit =
      50,
  ) {
    const pending =
      await this.sweeps
        .listBroadcasted(
          limit,
        );

    let checked =
      0;

    let confirmed =
      0;

    let failed =
      0;

    let pendingStill =
      0;

    const results:
      Array<{
        sweepId:
          string;

        txid:
          string;

        status:
          "CONFIRMED" |
          "FAILED" |
          "PENDING";

        blockNumber?:
          number;

        message?:
          string;
      }> = [];

    const tronWeb =
      TronClient.create();

    for (
      const sweep of
      pending
    ) {
      checked++;

      if (
        !sweep._id ||
        !sweep.txid
      ) {
        continue;
      }

      const sweepId =
        sweep._id
          .toString();

      try {
        const info =
          await tronWeb.trx
            .getTransactionInfo(
              sweep.txid,
            ) as
            TronTransactionInfo;

        /*
         * Si todavía no hay receipt ni blockNumber,
         * asumimos que aún no fue incluida/solidificada.
         */
        if (
          !info ||
          typeof info !==
            "object" ||
          !info.blockNumber
        ) {
          pendingStill++;

          results.push({
            sweepId,

            txid:
              sweep.txid,

            status:
              "PENDING",
          });

          continue;
        }

        const receiptResult =
          info.receipt
            ?.result;

        /*
         * En TRON una ejecución correcta de smart contract
         * debería terminar con SUCCESS.
         */
        if (
          receiptResult ===
          "SUCCESS"
        ) {
          await this.sweeps
            .markConfirmed(
              sweepId,
            );

          confirmed++;

          results.push({
            sweepId,

            txid:
              sweep.txid,

            status:
              "CONFIRMED",

            blockNumber:
              info.blockNumber,
          });

          continue;
        }

        /*
         * Si ya hay bloque pero el receipt devuelve
         * otro resultado, tratamos el sweep como fallido.
         */
        const failureMessage =
          receiptResult
            ? `TRON devolvió ${receiptResult}.`
            : "La transacción fue incluida pero no terminó con SUCCESS.";

        await this.sweeps
          .markFailedByTx(
            sweepId,
            failureMessage,
          );

        failed++;

        results.push({
          sweepId,

          txid:
            sweep.txid,

          status:
            "FAILED",

          blockNumber:
            info.blockNumber,

          message:
            failureMessage,
        });
      } catch (error) {
        /*
         * Un error temporal de TronGrid NO debe
         * convertir automáticamente el sweep en FAILED.
         */
        console.error(
          `[SWEEP CONFIRMATION] ${sweep.txid}`,
          error,
        );

        pendingStill++;

        results.push({
          sweepId,

          txid:
            sweep.txid,

          status:
            "PENDING",

          message:
            error instanceof
              Error
              ? error.message
              : "Error temporal consultando TRON.",
        });
      }
    }

    return {
      checked,
      confirmed,
      failed,
      pending:
        pendingStill,
      results,
    };
  }
}