import {
  MongoServerError,
  ObjectId,
} from "mongodb";

import {
  getTronAccountsCollection,
} from "./tron-account.model";

import type {
  CreateTronAccountData,
  TronAccountDocument,
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
    await getTronAccountsCollection();

  await collection.createIndex(
    {
      userId: 1,
      network: 1,
    },
    {
      unique: true,
      name:
        "tron_account_user_network_unique",
    },
  );

  await collection.createIndex(
    {
      addressBase58: 1,
    },
    {
      unique: true,
      name:
        "tron_account_address_unique",
    },
  );

  await collection.createIndex(
    {
      walletAccountId: 1,
    },
    {
      name:
        "tron_account_wallet",
    },
  );

  await collection.createIndex(
    {
      network: 1,
      createdAt: 1,
    },
    {
      name:
        "tron_account_network_created",
    },
  );

  indexesReady =
    true;
}

export class TronAccountRepository {
  async findByUserId(
    userId: string,
    network:
      TronNetwork,
  ): Promise<
    TronAccountDocument | null
  > {
    await ensureIndexes();

    if (
      !ObjectId.isValid(
        userId,
      )
    ) {
      return null;
    }

    const collection =
      await getTronAccountsCollection();

    return collection.findOne({
      userId:
        new ObjectId(
          userId,
        ),

      network,
    });
  }

  async findDocumentByUserId(
    userId: string,
    network:
      TronNetwork,
  ): Promise<
    TronAccountDocument | null
  > {
    return this.findByUserId(
      userId,
      network,
    );
  }

  async findByAddress(
    addressBase58:
      string,
  ): Promise<
    TronAccountDocument | null
  > {
    await ensureIndexes();

    const collection =
      await getTronAccountsCollection();

    return collection.findOne({
      addressBase58,
    });
  }

  async listByNetwork(
    network:
      TronNetwork,
  ): Promise<
    TronAccountDocument[]
  > {
    await ensureIndexes();

    const collection =
      await getTronAccountsCollection();

    return collection
      .find({
        network,
      })
      .sort({
        createdAt: 1,
      })
      .toArray();
  }

  async countByNetwork(
    network:
      TronNetwork,
  ): Promise<number> {
    await ensureIndexes();

    const collection =
      await getTronAccountsCollection();

    return collection.countDocuments({
      network,
    });
  }

  async listByNetworkPaginated(
    network:
      TronNetwork,

    skip:
      number,

    limit:
      number,
  ): Promise<
    TronAccountDocument[]
  > {
    await ensureIndexes();

    const collection =
      await getTronAccountsCollection();

    return collection
      .find({
        network,
      })
      .sort({
        createdAt: 1,
        _id: 1,
      })
      .skip(
        skip,
      )
      .limit(
        limit,
      )
      .toArray();
  }

  async create(
    data:
      CreateTronAccountData,
  ): Promise<
    TronAccountDocument
  > {
    await ensureIndexes();

    if (
      !ObjectId.isValid(
        data.userId,
      )
    ) {
      throw new Error(
        "ID de usuario inválido.",
      );
    }

    if (
      !ObjectId.isValid(
        data.walletAccountId,
      )
    ) {
      throw new Error(
        "ID de wallet inválido.",
      );
    }

    const collection =
      await getTronAccountsCollection();

    const now =
      new Date();

    const document:
      TronAccountDocument = {
      userId:
        new ObjectId(
          data.userId,
        ),

      walletAccountId:
        new ObjectId(
          data.walletAccountId,
        ),

      network:
        data.network,

      addressBase58:
        data.addressBase58,

      addressHex:
        data.addressHex,

      encryptedPrivateKey:
        data.encryptedPrivateKey,

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
          await this.findByUserId(
            data.userId,
            data.network,
          );

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }
}