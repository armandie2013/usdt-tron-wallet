import {
  MongoServerError,
  ObjectId,
} from "mongodb";

import {
  bigintToLong,
} from "@/lib/money/amount";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

import {
  getBlockchainDepositsCollection,
} from "./deposit.model";

let indexesReady =
  false;

async function ensureIndexes():
  Promise<void> {
  if (indexesReady) {
    return;
  }

  const collection =
    await getBlockchainDepositsCollection();

  await collection.createIndex(
    {
      network:
        1,

      txid:
        1,

      eventIndex:
        1,
    },
    {
      unique:
        true,

      name:
        "blockchain_deposit_network_tx_event_unique",

      partialFilterExpression: {
        eventIndex: {
          $exists:
            true,
        },
      },
    },
  );

  /*
   * Mantenemos eventKey único para compatibilidad
   * con los depósitos que ya procesamos durante
   * las pruebas anteriores.
   */
  await collection.createIndex(
    {
      eventKey:
        1,
    },
    {
      unique:
        true,

      name:
        "blockchain_deposit_event_unique",
    },
  );

  await collection.createIndex(
    {
      userId:
        1,

      blockTimestamp:
        -1,
    },
    {
      name:
        "blockchain_deposit_user_date",
    },
  );

  await collection.createIndex(
    {
      blockNumber:
        1,
    },
    {
      name:
        "blockchain_deposit_block",
    },
  );

  indexesReady =
    true;
}

export interface SaveCreditedDepositInput {
  userId:
    string;

  walletAccountId:
    string;

  network:
    TronNetwork;

  contractAddress:
    string;

  txid:
    string;

  eventIndex:
    number;

  eventKey:
    string;

  blockNumber:
    number;

  fromAddress:
    string;

  toAddress:
    string;

  amountUnits:
    bigint;

  blockTimestamp:
    Date;

  ledgerTransactionId?:
    string;
}

export class DepositRepository {
  async existsByEventKey(
    eventKey:
      string,
  ): Promise<boolean> {
    await ensureIndexes();

    const collection =
      await getBlockchainDepositsCollection();

    const existing =
      await collection.findOne(
        {
          eventKey,
        },
        {
          projection: {
            _id: 1,
          },
        },
      );

    return Boolean(
      existing,
    );
  }

  async existsByBlockchainEvent(
    network:
      TronNetwork,

    txid:
      string,

    eventIndex:
      number,
  ): Promise<boolean> {
    await ensureIndexes();

    const collection =
      await getBlockchainDepositsCollection();

    const existing =
      await collection.findOne(
        {
          network,
          txid,
          eventIndex,
        },
        {
          projection: {
            _id: 1,
          },
        },
      );

    return Boolean(
      existing,
    );
  }

  async saveCreditedDeposit(
    input:
      SaveCreditedDepositInput,
  ): Promise<void> {
    await ensureIndexes();

    const collection =
      await getBlockchainDepositsCollection();

    const now =
      new Date();

    try {
      await collection.updateOne(
        {
          network:
            input.network,

          txid:
            input.txid,

          eventIndex:
            input.eventIndex,
        },

        {
          $setOnInsert: {
            userId:
              new ObjectId(
                input.userId,
              ),

            walletAccountId:
              new ObjectId(
                input.walletAccountId,
              ),

            network:
              input.network,

            asset:
              "USDT",

            contractAddress:
              input.contractAddress,

            txid:
              input.txid,

            eventIndex:
              input.eventIndex,

            eventKey:
              input.eventKey,

            blockNumber:
              input.blockNumber,

            fromAddress:
              input.fromAddress,

            toAddress:
              input.toAddress,

            amountUnits:
              bigintToLong(
                input.amountUnits,
              ),

            blockTimestamp:
              input.blockTimestamp,

            status:
              "CREDITED",

            ledgerTransactionId:
              input.ledgerTransactionId
                ? new ObjectId(
                    input.ledgerTransactionId,
                  )
                : undefined,

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
    } catch (error) {
      if (
        error instanceof
          MongoServerError &&
        error.code ===
          11000
      ) {
        return;
      }

      throw error;
    }
  }
}