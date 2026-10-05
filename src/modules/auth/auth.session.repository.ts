import {
  MongoServerError,
  ObjectId,
} from "mongodb";

import { getDb } from "@/lib/db/mongodb";

import type {
  AuthClient,
} from "./auth.types";

export interface AuthSessionDocument {
  _id: ObjectId;
  userId: ObjectId;
  refreshTokenHash: string;
  client: AuthClient;
  active: boolean;
  createdAt: Date;
  lastSeenAt: Date;
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
    const migrationDate =
      new Date();

    /*
     * Las sesiones anteriores no incluyen el identificador de sesión
     * dentro del access token. Se invalidan una sola vez durante la
     * migración para no conservar sesiones que no pueden verificarse.
     */
    await collection.updateMany(
      {
        active: {
          $exists: false,
        },
      },
      {
        $set: {
          active: false,
          revokedAt:
            migrationDate,
        },
      },
    );

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

    await collection.createIndex(
      {
        userId: 1,
      },
      {
        unique: true,
        partialFilterExpression: {
          active: true,
        },
        name:
          "auth_sessions_one_active_per_user",
      },
    );

    indexesReady = true;
  }

  return collection;
}

function toObjectId(
  value: string,
): ObjectId | null {
  if (
    !ObjectId.isValid(
      value,
    )
  ) {
    return null;
  }

  return new ObjectId(
    value,
  );
}

export class AuthSessionRepository {
  async expireInactiveForUser(
    userId: string,
  ): Promise<void> {
    const objectUserId =
      toObjectId(
        userId,
      );

    if (!objectUserId) {
      return;
    }

    const collection =
      await getCollection();

    const now =
      new Date();

    await collection.updateMany(
      {
        userId:
          objectUserId,
        active: true,
        expiresAt: {
          $lte: now,
        },
      },
      {
        $set: {
          active: false,
          revokedAt:
            now,
        },
      },
    );
  }

  async findActiveForUser(
    userId: string,
  ): Promise<AuthSessionDocument | null> {
    const objectUserId =
      toObjectId(
        userId,
      );

    if (!objectUserId) {
      return null;
    }

    await this.expireInactiveForUser(
      userId,
    );

    const collection =
      await getCollection();

    return collection.findOne({
      userId:
        objectUserId,
      active: true,
      revokedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    });
  }

  async create(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    client: AuthClient,
  ): Promise<AuthSessionDocument | null> {
    const objectUserId =
      toObjectId(
        userId,
      );

    if (!objectUserId) {
      return null;
    }

    const collection =
      await getCollection();

    const now =
      new Date();

    const session:
      AuthSessionDocument = {
      _id:
        new ObjectId(),
      userId:
        objectUserId,
      refreshTokenHash,
      client,
      active: true,
      createdAt:
        now,
      lastSeenAt:
        now,
      expiresAt,
      revokedAt: null,
    };

    try {
      await collection.insertOne(
        session,
      );

      return session;
    } catch (error) {
      if (
        error instanceof
          MongoServerError &&
        error.code ===
          11000
      ) {
        return null;
      }

      throw error;
    }
  }

  async rotate(
    refreshTokenHash: string,
    nextRefreshTokenHash: string,
    expiresAt: Date,
  ): Promise<AuthSessionDocument | null> {
    const collection =
      await getCollection();

    const now =
      new Date();

    return collection.findOneAndUpdate(
      {
        refreshTokenHash,
        active: true,
        revokedAt: null,
        expiresAt: {
          $gt: now,
        },
      },
      {
        $set: {
          refreshTokenHash:
            nextRefreshTokenHash,
          lastSeenAt:
            now,
          expiresAt,
        },
      },
      {
        returnDocument:
          "after",
      },
    );
  }

  async touchActive(
    sessionId: string,
    userId: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const objectSessionId =
      toObjectId(
        sessionId,
      );

    const objectUserId =
      toObjectId(
        userId,
      );

    if (
      !objectSessionId ||
      !objectUserId
    ) {
      return false;
    }

    const collection =
      await getCollection();

    const now =
      new Date();

    const session =
      await collection.findOneAndUpdate(
        {
          _id:
            objectSessionId,
          userId:
            objectUserId,
          active: true,
          revokedAt: null,
          expiresAt: {
            $gt: now,
          },
        },
        {
          $set: {
            lastSeenAt:
              now,
            expiresAt,
          },
        },
        {
          returnDocument:
            "after",
          projection: {
            _id: 1,
          },
        },
      );

    return Boolean(
      session,
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
        active: true,
      },
      {
        $set: {
          active: false,
          revokedAt:
            new Date(),
        },
      },
    );
  }

  async revokeAllForUser(
    userId: string,
  ): Promise<void> {
    const objectUserId =
      toObjectId(
        userId,
      );

    if (!objectUserId) {
      return;
    }

    const collection =
      await getCollection();

    await collection.updateMany(
      {
        userId:
          objectUserId,
        active: true,
      },
      {
        $set: {
          active: false,
          revokedAt:
            new Date(),
        },
      },
    );
  }
}