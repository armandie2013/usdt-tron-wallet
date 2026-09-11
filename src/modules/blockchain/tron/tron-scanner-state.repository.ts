import {
  randomUUID,
} from "crypto";

import {
  getTronScannerStateCollection,
} from "./tron-scanner-state.model";

import type {
  TronNetwork,
} from "./tron.types";

let indexesReady =
  false;

async function ensureIndexes():
  Promise<void> {
  if (indexesReady) {
    return;
  }

  const collection =
    await getTronScannerStateCollection();

  await collection.createIndex(
    {
      scanner:
        1,

      network:
        1,
    },
    {
      unique:
        true,

      name:
        "blockchain_sync_scanner_network_unique",
    },
  );

  indexesReady =
    true;
}

export class TronScannerStateRepository {
  readonly workerId =
    randomUUID();

  async getLastProcessedBlock(
    network:
      TronNetwork,
  ): Promise<number | null> {
    await ensureIndexes();

    const collection =
      await getTronScannerStateCollection();

    const state =
      await collection.findOne({
        scanner:
          "USDT_TRC20",

        network,
      });

    return state
      ?.lastProcessedBlock ??
      null;
  }

  async initialize(
    network:
      TronNetwork,

    lastProcessedBlock:
      number,
  ): Promise<void> {
    await ensureIndexes();

    const collection =
      await getTronScannerStateCollection();

    const now =
      new Date();

    await collection.updateOne(
      {
        scanner:
          "USDT_TRC20",

        network,
      },

      {
        $setOnInsert: {
          scanner:
            "USDT_TRC20",

          network,

          lastProcessedBlock,

          createdAt:
            now,

          updatedAt:
            now,
        },
      },

      {
        upsert:
          true,
      },
    );
  }

  async updateLastProcessedBlock(
    network:
      TronNetwork,

    blockNumber:
      number,
  ): Promise<void> {
    await ensureIndexes();

    const collection =
      await getTronScannerStateCollection();

    await collection.updateOne(
      {
        scanner:
          "USDT_TRC20",

        network,
      },

      {
        $set: {
          lastProcessedBlock:
            blockNumber,

          updatedAt:
            new Date(),
        },
      },
    );
  }

  async acquireLock(
    network:
      TronNetwork,

    leaseMilliseconds =
      60_000,
  ): Promise<boolean> {
    await ensureIndexes();

    const collection =
      await getTronScannerStateCollection();

    const now =
      new Date();

    const lockUntil =
      new Date(
        now.getTime() +
          leaseMilliseconds,
      );

    const result =
      await collection.findOneAndUpdate(
        {
          scanner:
            "USDT_TRC20",

          network,

          $or: [
            {
              lockUntil: {
                $exists:
                  false,
              },
            },

            {
              lockUntil: {
                $lte:
                  now,
              },
            },

            {
              lockOwner:
                this.workerId,
            },
          ],
        },

        {
          $set: {
            lockOwner:
              this.workerId,

            lockUntil,

            updatedAt:
              now,
          },
        },

        {
          returnDocument:
            "after",
        },
      );

    return Boolean(
      result &&
      result.lockOwner ===
        this.workerId,
    );
  }

  async releaseLock(
    network:
      TronNetwork,
  ): Promise<void> {
    await ensureIndexes();

    const collection =
      await getTronScannerStateCollection();

    await collection.updateOne(
      {
        scanner:
          "USDT_TRC20",

        network,

        lockOwner:
          this.workerId,
      },

      {
        $unset: {
          lockOwner:
            "",

          lockUntil:
            "",
        },

        $set: {
          updatedAt:
            new Date(),
        },
      },
    );
  }
}