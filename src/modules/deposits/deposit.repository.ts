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

/*
 * ============================================================
 * ÍNDICES
 * ============================================================
 */

let indexesReady =
  false;

async function ensureIndexes():
  Promise<void> {
  if (indexesReady) {
    return;
  }

  const collection =
    await getBlockchainDepositsCollection();

  /*
   * Un evento concreto del contrato solamente puede
   * registrarse una vez.
   */
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
   * Se conserva eventKey único.
   *
   * Además de servir para el sincronizador manual,
   * mantiene compatibilidad con documentos previamente
   * indexados durante el desarrollo.
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

  /*
   * Historial del usuario.
   */
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

  /*
   * Útil para consultas y auditoría por bloque.
   */
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

/*
 * ============================================================
 * INPUT DE EVENTO OBSERVADO
 * ============================================================
 */

export interface SaveObservedDepositInput {
  userId:
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
}

/*
 * ============================================================
 * REPOSITORY
 * ============================================================
 *
 * Este repositorio ya NO representa dinero interno.
 *
 * Su única función es indexar eventos reales de TRON.
 */

export class DepositRepository {
  /*
   * ==========================================================
   * EXISTE POR EVENT KEY
   * ==========================================================
   */

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
            _id:
              1,
          },
        },
      );

    return Boolean(
      existing,
    );
  }

  /*
   * ==========================================================
   * EXISTE POR EVENTO BLOCKCHAIN
   * ==========================================================
   */

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
            _id:
              1,
          },
        },
      );

    return Boolean(
      existing,
    );
  }

  /*
   * ==========================================================
   * GUARDAR EVENTO CONFIRMADO
   * ==========================================================
   *
   * Importante:
   *
   * guardar este documento NO acredita fondos.
   *
   * El USDT ya se encuentra en la dirección del usuario
   * porque la transferencia ocurrió realmente en TRON.
   *
   * MongoDB solamente mantiene un índice/cache del evento.
   */

  async saveObservedDeposit(
    input:
      SaveObservedDepositInput,
  ): Promise<void> {
    await ensureIndexes();

    const collection =
      await getBlockchainDepositsCollection();

    /*
     * Validaciones defensivas antes de tocar MongoDB.
     */

    if (
      !ObjectId.isValid(
        input.userId,
      )
    ) {
      throw new Error(
        "Invalid userId while indexing blockchain deposit.",
      );
    }

    if (
      !input.txid.trim()
    ) {
      throw new Error(
        "Invalid transaction id while indexing blockchain deposit.",
      );
    }

    if (
      !input.eventKey.trim()
    ) {
      throw new Error(
        "Invalid event key while indexing blockchain deposit.",
      );
    }

    if (
      !Number.isSafeInteger(
        input.eventIndex,
      ) ||
      input.eventIndex <
        0
    ) {
      throw new Error(
        "Invalid event index while indexing blockchain deposit.",
      );
    }

    if (
      !Number.isSafeInteger(
        input.blockNumber,
      ) ||
      input.blockNumber <
        0
    ) {
      throw new Error(
        "Invalid block number while indexing blockchain deposit.",
      );
    }

    if (
      input.amountUnits <=
      0n
    ) {
      throw new Error(
        "Invalid USDT amount while indexing blockchain deposit.",
      );
    }

    if (
      Number.isNaN(
        input.blockTimestamp
          .getTime(),
      )
    ) {
      throw new Error(
        "Invalid block timestamp while indexing blockchain deposit.",
      );
    }

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
              "CONFIRMED",

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
      /*
       * Dos procesos pueden descubrir simultáneamente
       * el mismo evento.
       *
       * Los índices únicos son la última protección
       * de idempotencia.
       *
       * Si otro proceso lo insertó primero, el resultado
       * deseado ya fue alcanzado.
       */
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