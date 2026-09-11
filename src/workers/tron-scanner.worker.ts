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

  async start():
    Promise<void> {
    const interval =
      this.getInterval();

    console.log(
      "[TRON SCANNER] Iniciado",
    );

    console.log(
      `[TRON SCANNER] Intervalo ${interval} ms`,
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

        console.log(
          "[TRON SCANNER]",
          result,
        );
      } catch (error) {
        console.error(
          "[TRON SCANNER] Error:",
          error,
        );
      }

      const duration =
        Date.now() -
        started;

      const remaining =
        Math.max(
          interval -
            duration,
          1_000,
        );

      await new Promise<void>(
        (resolve) => {
          setTimeout(
            resolve,
            remaining,
          );
        },
      );
    }

    console.log(
      "[TRON SCANNER] Detenido",
    );
  }

  stop(): void {
    this.stopping =
      true;
  }
}