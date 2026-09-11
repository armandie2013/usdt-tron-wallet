import type {
  Collection,
} from "mongodb";

import {
  getDb,
} from "@/lib/db/mongodb";

import type {
  TronScannerStateDocument,
} from "./tron-scanner-state.types";

export const TRON_SCANNER_STATE_COLLECTION =
  "blockchain_sync_state";

export async function getTronScannerStateCollection():
  Promise<
    Collection<TronScannerStateDocument>
  > {
  const db =
    await getDb();

  return db.collection<TronScannerStateDocument>(
    TRON_SCANNER_STATE_COLLECTION,
  );
}