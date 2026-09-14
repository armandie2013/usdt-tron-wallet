import {
  ObjectId,
  type Collection,
} from "mongodb";

import {
  getDb,
} from "@/lib/db/mongodb";

import type {
  TronNetwork,
} from "./tron.types";

const COLLECTION_NAME =
  "tron_address_challenges";

export type TronAddressChallengePurpose =
  "REGISTER_TRON_ADDRESS";

export interface TronAddressChallengeDocument {
  _id?:
    ObjectId;

  userId:
    ObjectId;

  network:
    TronNetwork;

  purpose:
    TronAddressChallengePurpose;

  addressBase58:
    string;

  addressHex:
    string;

  message:
    string;

  nonce:
    string;

  expiresAt:
    Date;

  consumedAt?:
    Date |
    null;

  createdAt:
    Date;
}

export interface CreateTronAddressChallengeInput {
  userId:
    string;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  message:
    string;

  nonce:
    string;

  expiresAt:
    Date;
}

export class TronAddressChallengeRepository {
  private async getCollection():
    Promise<
      Collection<TronAddressChallengeDocument>
    > {
    const database =
      await getDb();

    const collection =
      database
        .collection<TronAddressChallengeDocument>(
          COLLECTION_NAME,
        );

    await collection.createIndex(
      {
        expiresAt:
          1,
      },
      {
        expireAfterSeconds:
          0,

        name:
          "ttl_expiresAt",
      },
    );

    await collection.createIndex(
      {
        userId:
          1,

        network:
          1,

        purpose:
          1,

        createdAt:
          -1,
      },
      {
        name:
          "user_network_purpose_createdAt",
      },
    );

    await collection.createIndex(
      {
        nonce:
          1,
      },
      {
        unique:
          true,

        name:
          "uniq_nonce",
      },
    );

    return collection;
  }

  async create(
    input:
      CreateTronAddressChallengeInput,
  ): Promise<
    TronAddressChallengeDocument
  > {
    if (
      !ObjectId.isValid(
        input.userId,
      )
    ) {
      throw new Error(
        "El identificador del usuario no es válido.",
      );
    }

    const addressBase58 =
      input.addressBase58
        .trim();

    const addressHex =
      input.addressHex
        .trim()
        .toUpperCase();

    const message =
      input.message
        .trim();

    const nonce =
      input.nonce
        .trim();

    if (
      !addressBase58
    ) {
      throw new Error(
        "La dirección TRON Base58 es obligatoria.",
      );
    }

    if (
      !/^41[0-9A-F]{40}$/.test(
        addressHex,
      )
    ) {
      throw new Error(
        "La dirección TRON hexadecimal no es válida.",
      );
    }

    if (
      !message
    ) {
      throw new Error(
        "El mensaje del challenge es obligatorio.",
      );
    }

    if (
      !/^[0-9a-fA-F]{64}$/.test(
        nonce,
      )
    ) {
      throw new Error(
        "El nonce del challenge no es válido.",
      );
    }

    if (
      !(
        input.expiresAt
          instanceof Date
      ) ||
      Number.isNaN(
        input.expiresAt
          .getTime(),
      ) ||
      input.expiresAt <=
        new Date()
    ) {
      throw new Error(
        "La expiración del challenge no es válida.",
      );
    }

    const collection =
      await this.getCollection();

    const userObjectId =
      new ObjectId(
        input.userId,
      );

    const now =
      new Date();

    /*
     * Invalidamos cualquier challenge anterior
     * todavía activo para este usuario/red.
     */
    await collection.updateMany(
      {
        userId:
          userObjectId,

        network:
          input.network,

        purpose:
          "REGISTER_TRON_ADDRESS",

        consumedAt:
          null,

        expiresAt: {
          $gt:
            now,
        },
      },
      {
        $set: {
          consumedAt:
            now,
        },
      },
    );

    const document:
      TronAddressChallengeDocument =
        {
          userId:
            userObjectId,

          network:
            input.network,

          purpose:
            "REGISTER_TRON_ADDRESS",

          addressBase58,

          addressHex,

          message,

          nonce,

          expiresAt:
            input.expiresAt,

          consumedAt:
            null,

          createdAt:
            now,
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

  async findActiveByIdForUser(
    challengeId:
      string,

    userId:
      string,
  ): Promise<
    TronAddressChallengeDocument |
    null
  > {
    if (
      !ObjectId.isValid(
        challengeId,
      ) ||
      !ObjectId.isValid(
        userId,
      )
    ) {
      return null;
    }

    const collection =
      await this.getCollection();

    return collection.findOne(
      {
        _id:
          new ObjectId(
            challengeId,
          ),

        userId:
          new ObjectId(
            userId,
          ),

        purpose:
          "REGISTER_TRON_ADDRESS",

        consumedAt:
          null,

        expiresAt: {
          $gt:
            new Date(),
        },
      },
    );
  }

  /*
   * Consume el challenge de manera atómica.
   *
   * Dos requests simultáneos no pueden utilizar
   * exitosamente el mismo challenge.
   */
  async consume(
    challengeId:
      string,

    userId:
      string,
  ): Promise<
    TronAddressChallengeDocument |
    null
  > {
    if (
      !ObjectId.isValid(
        challengeId,
      ) ||
      !ObjectId.isValid(
        userId,
      )
    ) {
      return null;
    }

    const collection =
      await this.getCollection();

    const now =
      new Date();

    const result =
      await collection
        .findOneAndUpdate(
          {
            _id:
              new ObjectId(
                challengeId,
              ),

            userId:
              new ObjectId(
                userId,
              ),

            purpose:
              "REGISTER_TRON_ADDRESS",

            consumedAt:
              null,

            expiresAt: {
              $gt:
                now,
            },
          },
          {
            $set: {
              consumedAt:
                now,
            },
          },
          {
            returnDocument:
              "before",
          },
        );

    return result;
  }
}