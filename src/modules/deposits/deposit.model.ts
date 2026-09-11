import type {
  Collection,
} from "mongodb";

import {
  getDb,
} from "@/lib/db/mongodb";

import type {
  BlockchainDepositDocument,
} from "./deposit.types";

export const BLOCKCHAIN_DEPOSITS_COLLECTION =
  "blockchain_deposits";

export async function getBlockchainDepositsCollection():
  Promise<
    Collection<BlockchainDepositDocument>
  > {
  const db =
    await getDb();

  return db.collection<BlockchainDepositDocument>(
    BLOCKCHAIN_DEPOSITS_COLLECTION,
  );
}