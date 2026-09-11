import type { Collection } from "mongodb";

import { getDb } from "@/lib/db/mongodb";

import type { UserDocument } from "./user.types";

export const USER_COLLECTION = "users";

export async function getUsersCollection(): Promise<
  Collection<UserDocument>
> {
  const db = await getDb();

  return db.collection<UserDocument>(
    USER_COLLECTION,
  );
}