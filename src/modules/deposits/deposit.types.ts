import type {
  Long,
  ObjectId,
} from "mongodb";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

export type BlockchainDepositStatus =
  | "DETECTED"
  | "CREDITED"
  | "FAILED";

export interface BlockchainDepositDocument {
  _id?: ObjectId;

  userId:
    ObjectId;

  walletAccountId:
    ObjectId;

  network:
    TronNetwork;

  asset:
    "USDT";

  contractAddress:
    string;

  txid:
    string;

  eventIndex:
    number;

  eventKey:
    string;

  blockNumber:
    number;

  fromAddress:
    string;

  toAddress:
    string;

  amountUnits:
    Long;

  blockTimestamp:
    Date;

  status:
    BlockchainDepositStatus;

  ledgerTransactionId?:
    ObjectId;

  errorMessage?:
    string;

  createdAt:
    Date;

  updatedAt:
    Date;
}

export interface TronContractTransferEvent {
  block_number:
    number;

  block_timestamp:
    number;

  contract_address:
    string;

  event_index:
    number;

  event_name:
    string;

  transaction_id:
    string;

  result: {
    from?: string;
    to?: string;
    value?: string;

    "0"?: string;
    "1"?: string;
    "2"?: string;
  };
}

export interface TronContractEventsResponse {
  success:
    boolean;

  data?:
    TronContractTransferEvent[];

  meta?: {
    at?: number;
    page_size?: number;
    fingerprint?: string;
  };
}

/*
 * Lo conservamos temporalmente porque todavía
 * existe el sincronizador manual por usuario.
 */
export interface TronGridTrc20Transaction {
  transaction_id:
    string;

  token_info?: {
    symbol?: string;
    address?: string;
    decimals?: number;
    name?: string;
  };

  block_timestamp:
    number;

  from:
    string;

  to:
    string;

  type:
    string;

  value:
    string;
}

export interface TronGridTrc20Response {
  success:
    boolean;

  data?:
    TronGridTrc20Transaction[];

  meta?: {
    at?: number;
    page_size?: number;
    fingerprint?: string;
  };
}