import {
  MongoServerError,
  ObjectId,
} from "mongodb";

import {
  getWalletAccountsCollection,
} from "./wallet.model";

import type {
  SystemWalletCode,
  WalletAccountDocument,
  WalletAsset,
} from "./wallet.types";

let indexesReady =
  false;

async function ensureIndexes():
  Promise<void> {
  if (indexesReady) {
    return;
  }

  const collection =
    await getWalletAccountsCollection();

  await collection.createIndex(
    {
      userId: 1,
      asset: 1,
    },
    {
      unique: true,

      name:
        "wallet_user_asset_unique",

      partialFilterExpression: {
        ownerType:
          "USER",
      },
    },
  );

  await collection.createIndex(
    {
      systemCode: 1,
      asset: 1,
    },
    {
      unique: true,

      name:
        "wallet_system_asset_unique",

      partialFilterExpression: {
        ownerType:
          "SYSTEM",
      },
    },
  );

  indexesReady = true;
}

export class WalletRepository {
  async findUserWallet(
    userId: string,
    asset:
      WalletAsset = "USDT",
  ): Promise<
    WalletAccountDocument | null
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
      await getWalletAccountsCollection();

    return collection.findOne({
      ownerType:
        "USER",

      userId:
        new ObjectId(
          userId,
        ),

      asset,
    });
  }

  async createUserWallet(
    userId: string,
    asset:
      WalletAsset = "USDT",
  ): Promise<
    WalletAccountDocument
  > {
    await ensureIndexes();

    if (
      !ObjectId.isValid(
        userId,
      )
    ) {
      throw new Error(
        "ID de usuario inválido.",
      );
    }

    const collection =
      await getWalletAccountsCollection();

    const now =
      new Date();

    const document:
      WalletAccountDocument = {
      ownerType:
        "USER",

      userId:
        new ObjectId(
          userId,
        ),

      asset,

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
        error.code === 11000
      ) {
        const existing =
          await this.findUserWallet(
            userId,
            asset,
          );

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async getOrCreateUserWallet(
    userId: string,
    asset:
      WalletAsset = "USDT",
  ): Promise<
    WalletAccountDocument
  > {
    const existing =
      await this.findUserWallet(
        userId,
        asset,
      );

    if (existing) {
      return existing;
    }

    return this.createUserWallet(
      userId,
      asset,
    );
  }

  async findSystemWallet(
    systemCode:
      SystemWalletCode,
    asset:
      WalletAsset = "USDT",
  ): Promise<
    WalletAccountDocument | null
  > {
    await ensureIndexes();

    const collection =
      await getWalletAccountsCollection();

    return collection.findOne({
      ownerType:
        "SYSTEM",

      systemCode,

      asset,
    });
  }

  async getOrCreateSystemWallet(
    systemCode:
      SystemWalletCode,
    asset:
      WalletAsset = "USDT",
  ): Promise<
    WalletAccountDocument
  > {
    const existing =
      await this.findSystemWallet(
        systemCode,
        asset,
      );

    if (existing) {
      return existing;
    }

    await ensureIndexes();

    const collection =
      await getWalletAccountsCollection();

    const now =
      new Date();

    const document:
      WalletAccountDocument = {
      ownerType:
        "SYSTEM",

      systemCode,

      asset,

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
        error.code === 11000
      ) {
        const wallet =
          await this.findSystemWallet(
            systemCode,
            asset,
          );

        if (wallet) {
          return wallet;
        }
      }

      throw error;
    }
  }
}