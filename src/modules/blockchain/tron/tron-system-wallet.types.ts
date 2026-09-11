import type {
  ObjectId,
} from "mongodb";

import type {
  TronNetwork,
} from "./tron.types";

export type TronSystemWalletCode =
  "HOT_WALLET";

export type TronSystemWalletStatus =
  | "ACTIVE"
  | "DISABLED";

export interface TronSystemWalletDocument {
  _id?: ObjectId;

  code:
    TronSystemWalletCode;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  encryptedPrivateKey:
    string;

  status:
    TronSystemWalletStatus;

  createdAt:
    Date;

  updatedAt:
    Date;
}

export interface PublicTronSystemWallet {
  id:
    string;

  code:
    TronSystemWalletCode;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  status:
    TronSystemWalletStatus;

  createdAt:
    string;
}