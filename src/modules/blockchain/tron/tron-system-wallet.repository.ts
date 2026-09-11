import {
  MongoServerError,
} from "mongodb";

import {
  getTronSystemWalletsCollection,
} from "./tron-system-wallet.model";

import type {
  TronNetwork,
} from "./tron.types";

import type {
  TronSystemWalletDocument,
} from "./tron-system-wallet.types";

let indexesReady =
  false;

async function ensureIndexes():
  Promise<void> {
  if (indexesReady) {
    return;
  }

  const collection =
    await getTronSystemWalletsCollection();

  await collection.createIndex(
    {
      code: 1,
      network: 1,
    },
    {
      unique: true,

      name:
        "tron_system_wallet_code_network_unique",
    },
  );

  await collection.createIndex(
    {
      addressBase58: 1,
    },
    {
      unique: true,

      name:
        "tron_system_wallet_address_unique",
    },
  );

  indexesReady =
    true;
}

export class TronSystemWalletRepository {
  async findHotWallet(
    network:
      TronNetwork,
  ): Promise<
    TronSystemWalletDocument | null
  > {
    await ensureIndexes();

    const collection =
      await getTronSystemWalletsCollection();

    return collection.findOne({
      code:
        "HOT_WALLET",

      network,
    });
  }

  async createHotWallet(
    input: {
      network:
        TronNetwork;

      addressBase58:
        string;

      addressHex:
        string;

      encryptedPrivateKey:
        string;
    },
  ): Promise<
    TronSystemWalletDocument
  > {
    await ensureIndexes();

    const collection =
      await getTronSystemWalletsCollection();

    const now =
      new Date();

    const document:
      TronSystemWalletDocument = {
      code:
        "HOT_WALLET",

      network:
        input.network,

      addressBase58:
        input.addressBase58,

      addressHex:
        input.addressHex,

      encryptedPrivateKey:
        input.encryptedPrivateKey,

      status:
        "ACTIVE",

      createdAt:
        now,

      updatedAt:
        now,
    };

    try {
      const result =
        await collection.insertOne(
          document,
        );

      return {
        ...document,

        _id:
          result.insertedId,
      };
    } catch (error) {
      if (
        error instanceof
          MongoServerError &&
        error.code ===
          11000
      ) {
        const existing =
          await this.findHotWallet(
            input.network,
          );

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }
}