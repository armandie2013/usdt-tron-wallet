import type {
  Collection,
} from "mongodb";

import {
  getDb,
} from "@/lib/db/mongodb";

import type {
  TronSystemWalletDocument,
} from "./tron-system-wallet.types";

export const TRON_SYSTEM_WALLETS_COLLECTION =
  "tron_system_wallets";

export async function getTronSystemWalletsCollection():
  Promise<
    Collection<TronSystemWalletDocument>
  > {
  const db =
    await getDb();

  return db.collection<TronSystemWalletDocument>(
    TRON_SYSTEM_WALLETS_COLLECTION,
  );
}