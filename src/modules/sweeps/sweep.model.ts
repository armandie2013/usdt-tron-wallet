import type {
  Collection,
  ObjectId,
} from "mongodb";

import {
  getDb,
} from "@/lib/db/mongodb";

export type SweepStatus =
  | "PLANNED"
  | "BROADCASTED"
  | "CONFIRMED"
  | "FAILED";

export interface SweepDocument {
  _id?: ObjectId;

  network:
    "NILE" | "MAINNET";

  userId:
    ObjectId;

  tronAccountId:
    ObjectId;

  fromAddress:
    string;

  toAddress:
    string;

  asset:
    "USDT";

  amountUnits:
    string;

  status:
    SweepStatus;

  txid?:
    string;

  errorMessage?:
    string;

  createdAt:
    Date;

  updatedAt:
    Date;

  broadcastedAt?:
    Date;

  confirmedAt?:
    Date;
}

export async function getSweepsCollection():
  Promise<
    Collection<SweepDocument>
  > {
  const db =
    await getDb();

  return db.collection<SweepDocument>(
    "sweeps",
  );
}