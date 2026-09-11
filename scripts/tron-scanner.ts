import {
  TronScannerWorker,
} from "../src/workers/tron-scanner.worker";

const worker =
  new TronScannerWorker();

let stopping =
  false;

function shutdown(
  signal:
    string,
) {
  if (stopping) {
    return;
  }

  stopping =
    true;

  console.log(
    `[TRON SCANNER] ${signal} recibido`,
  );

  worker.stop();
}

process.on(
  "SIGINT",
  () =>
    shutdown(
      "SIGINT",
    ),
);

process.on(
  "SIGTERM",
  () =>
    shutdown(
      "SIGTERM",
    ),
);

worker
  .start()
  .catch(
    (error) => {
      console.error(
        "[TRON SCANNER] Error fatal:",
        error,
      );

      process.exitCode =
        1;
    },
  );