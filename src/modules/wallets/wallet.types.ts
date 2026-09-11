import type {
  ObjectId,
} from "mongodb";

export type WalletAsset =
  "USDT";

export type WalletStatus =
  | "ACTIVE"
  | "FROZEN"
  | "DISABLED";

export type WalletOwnerType =
  | "USER"
  | "SYSTEM";

export type SystemWalletCode =
  | "EXTERNAL_CLEARING"
  | "TREASURY"
  | "FEES";

export interface WalletAccountDocument {
  _id?: ObjectId;

  ownerType:
    WalletOwnerType;

  userId?: ObjectId;

  systemCode?:
    SystemWalletCode;

  asset:
    WalletAsset;

  status:
    WalletStatus;

  createdAt:
    Date;

  updatedAt:
    Date;
}

export interface PublicWalletAccount {
  id: string;

  userId: string;

  asset:
    WalletAsset;

  status:
    WalletStatus;

  balance:
    string;

  formattedBalance:
    string;

  createdAt:
    string;

  updatedAt:
    string;
}