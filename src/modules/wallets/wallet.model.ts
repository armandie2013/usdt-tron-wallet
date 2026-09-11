import type {
  Collection,
} from "mongodb";

import {
  getDb,
} from "@/lib/db/mongodb";

import type {
  WalletAccountDocument,
} from "./wallet.types";

export const WALLET_ACCOUNTS_COLLECTION =
  "wallet_accounts";

export async function getWalletAccountsCollection():
  Promise<
    Collection<WalletAccountDocument>
  > {
  const db =
    await getDb();

  return db.collection<WalletAccountDocument>(
    WALLET_ACCOUNTS_COLLECTION,
  );
}