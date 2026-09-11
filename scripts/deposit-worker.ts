import {
  DepositWorker,
} from "../src/workers/deposit.worker";

const worker =
  new DepositWorker();

let shuttingDown =
  false;

async function shutdown(
  signal:
    string,
) {
  if (shuttingDown) {
    return;
  }

  shuttingDown =
    true;

  console.log(
    `[DEPOSIT WORKER] Señal ${signal} recibida.`,
  );

  worker.stop();
}

process.on(
  "SIGINT",
  () => {
    void shutdown(
      "SIGINT",
    );
  },
);

process.on(
  "SIGTERM",
  () => {
    void shutdown(
      "SIGTERM",
    );
  },
);

worker
  .start()
  .catch(
    (error) => {
      console.error(
        "[DEPOSIT WORKER] Error fatal:",
        error,
      );

      process.exitCode =
        1;
    },
  );