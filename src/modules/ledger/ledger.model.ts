import type {
  Collection,
} from "mongodb";

import {
  getDb,
} from "@/lib/db/mongodb";

import type {
  LedgerTransactionDocument,
} from "./ledger.types";

export const LEDGER_TRANSACTIONS_COLLECTION =
  "ledger_transactions";

export async function getLedgerTransactionsCollection():
  Promise<
    Collection<LedgerTransactionDocument>
  > {
  const db =
    await getDb();

  return db.collection<LedgerTransactionDocument>(
    LEDGER_TRANSACTIONS_COLLECTION,
  );
}