import type {
  ObjectId,
} from "mongodb";

export type TronNetwork =
  | "NILE"
  | "MAINNET";

export interface TronTransferResult {
  txHash: string;
}

export interface TronAccountDocument {
  _id?: ObjectId;

  userId:
    ObjectId;

  walletAccountId:
    ObjectId;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  encryptedPrivateKey:
    string;

  createdAt:
    Date;

  updatedAt:
    Date;
}

export interface PublicTronAccount {
  id: string;

  network:
    TronNetwork;

  address:
    string;

  addressHex:
    string;

  qrDataUrl:
    string;

  createdAt:
    string;
}

export interface CreateTronAccountData {
  userId:
    string;

  walletAccountId:
    string;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  encryptedPrivateKey:
    string;
}

export interface TronBlockchainStatus {
  network:
    TronNetwork;

  address:
    string;

  activated:
    boolean;

  trx: {
    balanceSun:
      string;

    formattedBalance:
      string;
  };

  usdt: {
    contract:
      string;

    balanceUnits:
      string;

    formattedBalance:
      string;
  };
}