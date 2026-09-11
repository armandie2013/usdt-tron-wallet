import {
  ObjectId,
} from "mongodb";

import { getDb } from "@/lib/db/mongodb";

export interface AuthSessionDocument {
  _id?: ObjectId;

  userId: ObjectId;

  refreshTokenHash: string;

  createdAt: Date;
  expiresAt: Date;

  revokedAt: Date | null;
}

const COLLECTION =
  "auth_sessions";

let indexesReady = false;

async function getCollection() {
  const db =
    await getDb();

  const collection =
    db.collection<AuthSessionDocument>(
      COLLECTION,
    );

  if (!indexesReady) {
    await collection.createIndex(
      {
        refreshTokenHash: 1,
      },
      {
        unique: true,
        name:
          "auth_sessions_refresh_unique",
      },
    );

    await collection.createIndex(
      {
        expiresAt: 1,
      },
      {
        expireAfterSeconds: 0,
        name:
          "auth_sessions_expiration",
      },
    );

    await collection.createIndex(
      {
        userId: 1,
      },
      {
        name:
          "auth_sessions_user",
      },
    );

    indexesReady = true;
  }

  return collection;
}

export class AuthSessionRepository {
  async create(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    const collection =
      await getCollection();

    await collection.insertOne({
      userId:
        new ObjectId(
          userId,
        ),

      refreshTokenHash,

      createdAt:
        new Date(),

      expiresAt,

      revokedAt: null,
    });
  }

  async consume(
    refreshTokenHash: string,
  ): Promise<AuthSessionDocument | null> {
    const collection =
      await getCollection();

    return collection.findOneAndUpdate(
      {
        refreshTokenHash,

        revokedAt: null,

        expiresAt: {
          $gt: new Date(),
        },
      },

      {
        $set: {
          revokedAt:
            new Date(),
        },
      },

      {
        returnDocument:
          "before",
      },
    );
  }

  async revoke(
    refreshTokenHash: string,
  ): Promise<void> {
    const collection =
      await getCollection();

    await collection.updateOne(
      {
        refreshTokenHash,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt:
            new Date(),
        },
      },
    );
  }

  async revokeAllForUser(
    userId: string,
  ): Promise<void> {
    const collection =
      await getCollection();

    await collection.updateMany(
      {
        userId:
          new ObjectId(
            userId,
          ),

        revokedAt: null,
      },
      {
        $set: {
          revokedAt:
            new Date(),
        },
      },
    );
  }
}