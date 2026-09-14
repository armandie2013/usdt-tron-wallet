import {
  TronDepositScannerService,
} from "@/modules/blockchain/tron/tron-deposit-scanner.service";

const DEFAULT_INTERVAL_MS =
  15_000;

export class TronScannerWorker {
  private readonly scanner =
    new TronDepositScannerService();

  private stopping =
    false;

  /*
   * ==========================================================
   * INTERVALO
   * ==========================================================
   */

  private getInterval():
    number {
    const value =
      Number.parseInt(
        process.env
          .TRON_SCANNER_INTERVAL_MS ??
          "",
        10,
      );

    if (
      Number.isFinite(
        value,
      ) &&
      value >=
        5_000
    ) {
      return value;
    }

    return DEFAULT_INTERVAL_MS;
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
      "[TRON SCANNER] Iniciado",
    );

    console.log(
      `[TRON SCANNER] Intervalo: ${interval} ms`,
    );

    console.log(
      "[TRON SCANNER] Modo no-custodial: indexación de eventos on-chain únicamente.",
    );

    while (
      !this.stopping
    ) {
      const started =
        Date.now();

      try {
        const result =
          await this.scanner
            .scanOnce();

        /*
         * ====================================================
         * INICIALIZACIÓN
         * ====================================================
         */

        if (
          result.initialized
        ) {
          console.log(
            `[TRON SCANNER] Inicializado - red: ${result.network} - último bloque solidificado: ${result.latestSolidifiedBlock} - cursor inicial: ${result.lastProcessedBlock}`,
          );
        }

        /*
         * ====================================================
         * LOCK
         * ====================================================
         */

        else if (
          result
            .skippedBecauseLocked
        ) {
          console.log(
            `[TRON SCANNER] Ciclo omitido - otro scanner posee el lock - red: ${result.network}`,
          );
        }

        /*
         * ====================================================
         * CICLO NORMAL
         * ====================================================
         */

        else {
          console.log(
            `[TRON SCANNER] Ciclo - red: ${result.network} - bloques: ${result.blocksProcessed} - eventos encontrados: ${result.eventsFound} - observados: ${result.eventsObserved} - nuevos indexados: ${result.eventsIndexed} - ya indexados: ${result.eventsAlreadyIndexed} - ignorados: ${result.eventsIgnored} - último bloque: ${result.lastProcessedBlock}/${result.latestSolidifiedBlock}`,
          );
        }
      } catch (error) {
        console.error(
          "[TRON SCANNER] Error durante el ciclo:",
          error,
        );
      }

      /*
       * ======================================================
       * ESPERA
       * ======================================================
       *
       * El intervalo se mide desde el inicio del ciclo.
       *
       * Si el procesamiento tardó 4 segundos y el intervalo
       * es 15 segundos, esperamos aproximadamente 11.
       *
       * Si tardó más que el intervalo, esperamos al menos
       * 1 segundo antes del próximo ciclo.
       */

      const duration =
        Date.now() -
        started;

      const remaining =
        Math.max(
          interval -
            duration,
          1_000,
        );

      if (
        this.stopping
      ) {
        break;
      }

      await this.sleep(
        remaining,
      );
    }

    console.log(
      "[TRON SCANNER] Detenido",
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
      "[TRON SCANNER] Detención solicitada...",
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