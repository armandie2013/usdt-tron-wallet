import {
  MongoServerError,
  ObjectId,
} from "mongodb";

import {
  getUsersCollection,
} from "./user.model";

import type {
  CreateUserData,
  UserDocument,
} from "./user.types";

let indexesInitialized = false;

export class DuplicateUserEmailError extends Error {
  constructor() {
    super(
      "Ya existe un usuario registrado con ese correo electrónico.",
    );

    this.name =
      "DuplicateUserEmailError";
  }
}

export class UserRepository {
  private async ensureIndexes(): Promise<void> {
    if (indexesInitialized) {
      return;
    }

    const collection =
      await getUsersCollection();

    await collection.createIndex(
      {
        email: 1,
      },
      {
        unique: true,
        name: "users_email_unique",
      },
    );

    indexesInitialized = true;
  }

  async findByEmail(
    email: string,
  ): Promise<UserDocument | null> {
    await this.ensureIndexes();

    const collection =
      await getUsersCollection();

    return collection.findOne({
      email:
        email
          .trim()
          .toLowerCase(),
    });
  }

  async findById(
    id: string,
  ): Promise<UserDocument | null> {
    await this.ensureIndexes();

    if (!ObjectId.isValid(id)) {
      return null;
    }

    const collection =
      await getUsersCollection();

    return collection.findOne({
      _id:
        new ObjectId(id),
    });
  }

  async listAll(): Promise<
    UserDocument[]
  > {
    await this.ensureIndexes();

    const collection =
      await getUsersCollection();

    return collection
      .find({})
      .sort({
        createdAt: -1,
      })
      .toArray();
  }

  async create(
    data: CreateUserData,
  ): Promise<UserDocument> {
    await this.ensureIndexes();

    const collection =
      await getUsersCollection();

    const now =
      new Date();

    const document:
      UserDocument = {
      name:
        data.name.trim(),

      email:
        data.email
          .trim()
          .toLowerCase(),

      passwordHash:
        data.passwordHash,

      role:
        data.role ??
        "USER",

      status:
        data.status ??
        "ACTIVE",

      emailVerified:
        data.emailVerified ??
        false,

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
        throw new DuplicateUserEmailError();
      }

      throw error;
    }
  }
}