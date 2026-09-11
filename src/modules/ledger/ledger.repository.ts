import {
  Long,
  ObjectId,
} from "mongodb";

import {
  bigintToLong,
  longToBigint,
} from "@/lib/money/amount";

import {
  getLedgerTransactionsCollection,
} from "./ledger.model";

import type {
  CreateLedgerTransaction,
  LedgerTransactionDocument,
} from "./ledger.types";

let indexesReady =
  false;

async function ensureIndexes():
  Promise<void> {
  if (indexesReady) {
    return;
  }

  const collection =
    await getLedgerTransactionsCollection();

  await collection.createIndex(
    {
      "entries.accountId":
        1,

      createdAt:
        -1,
    },
    {
      name:
        "ledger_account_created",
    },
  );

  await collection.createIndex(
    {
      idempotencyKey:
        1,
    },
    {
      unique: true,

      sparse: true,

      name:
        "ledger_idempotency_unique",
    },
  );

  await collection.createIndex(
    {
      referenceType:
        1,

      referenceId:
        1,
    },
    {
      name:
        "ledger_reference",
    },
  );

  indexesReady = true;
}

export class LedgerRepository {
  async createTransaction(
    input:
      CreateLedgerTransaction,
  ): Promise<
    LedgerTransactionDocument
  > {
    await ensureIndexes();

    const collection =
      await getLedgerTransactionsCollection();

    const document:
      LedgerTransactionDocument = {
      asset:
        input.asset,

      type:
        input.type,

      status:
        "POSTED",

      entries:
        input.entries.map(
          (entry) => ({
            accountId:
              new ObjectId(
                entry.accountId,
              ),

            amount:
              bigintToLong(
                entry.amount,
              ),

            description:
              entry.description,
          }),
        ),

      idempotencyKey:
        input.idempotencyKey,

      referenceType:
        input.referenceType,

      referenceId:
        input.referenceId,

      metadata:
        input.metadata,

      createdAt:
        new Date(),
    };

    const result =
      await collection.insertOne(
        document,
      );

    return {
      ...document,

      _id:
        result.insertedId,
    };
  }

  async getAccountBalance(
    accountId: string,
  ): Promise<bigint> {
    await ensureIndexes();

    if (
      !ObjectId.isValid(
        accountId,
      )
    ) {
      throw new Error(
        "ID de cuenta inválido.",
      );
    }

    const collection =
      await getLedgerTransactionsCollection();

    const objectId =
      new ObjectId(
        accountId,
      );

    const result =
      await collection
        .aggregate<{
          balance:
            Long | number;
        }>([
          {
            $match: {
              "entries.accountId":
                objectId,
            },
          },

          {
            $unwind:
              "$entries",
          },

          {
            $match: {
              "entries.accountId":
                objectId,
            },
          },

          {
            $group: {
              _id: null,

              balance: {
                $sum:
                  "$entries.amount",
              },
            },
          },
        ])
        .toArray();

    if (
      result.length === 0
    ) {
      return 0n;
    }

    return longToBigint(
      result[0].balance,
    );
  }

  async listAccountTransactions(
    accountId: string,
    limit = 50,
  ): Promise<
    LedgerTransactionDocument[]
  > {
    await ensureIndexes();

    if (
      !ObjectId.isValid(
        accountId,
      )
    ) {
      return [];
    }

    const collection =
      await getLedgerTransactionsCollection();

    return collection
      .find({
        "entries.accountId":
          new ObjectId(
            accountId,
          ),
      })
      .sort({
        createdAt:
          -1,
      })
      .limit(
        Math.min(
          Math.max(
            limit,
            1,
          ),
          100,
        ),
      )
      .toArray();
  }
}