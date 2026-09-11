import type {
  Collection,
} from "mongodb";

import {
  getDb,
} from "@/lib/db/mongodb";

import type {
  TronAccountDocument,
} from "./tron.types";

export const TRON_ACCOUNTS_COLLECTION =
  "tron_accounts";

export async function getTronAccountsCollection():
  Promise<
    Collection<TronAccountDocument>
  > {
  const db =
    await getDb();

  return db.collection<TronAccountDocument>(
    TRON_ACCOUNTS_COLLECTION,
  );
}