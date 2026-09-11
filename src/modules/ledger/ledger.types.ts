import type {
  Long,
  ObjectId,
} from "mongodb";

import type {
  WalletAsset,
} from "@/modules/wallets/wallet.types";

export type LedgerTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "INTERNAL_TRANSFER"
  | "FEE"
  | "ADJUSTMENT";

export type LedgerTransactionStatus =
  "POSTED";

export interface LedgerEntryDocument {
  accountId:
    ObjectId;

  amount:
    Long;

  description?:
    string;
}

export interface LedgerTransactionDocument {
  _id?: ObjectId;

  asset:
    WalletAsset;

  type:
    LedgerTransactionType;

  status:
    LedgerTransactionStatus;

  entries:
    LedgerEntryDocument[];

  idempotencyKey?:
    string;

  referenceType?:
    string;

  referenceId?:
    string;

  metadata?:
    Record<
      string,
      string
    >;

  createdAt:
    Date;
}

export interface CreateLedgerEntry {
  accountId:
    string;

  amount:
    bigint;

  description?:
    string;
}

export interface CreateLedgerTransaction {
  asset:
    WalletAsset;

  type:
    LedgerTransactionType;

  entries:
    CreateLedgerEntry[];

  idempotencyKey?:
    string;

  referenceType?:
    string;

  referenceId?:
    string;

  metadata?:
    Record<
      string,
      string
    >;
}