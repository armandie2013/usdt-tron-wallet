import type {
  ObjectId,
} from "mongodb";

import type {
  TronNetwork,
} from "./tron.types";

export interface TronScannerStateDocument {
  _id?: ObjectId;

  scanner:
    "USDT_TRC20";

  network:
    TronNetwork;

  lastProcessedBlock:
    number;

  lockOwner?:
    string;

  lockUntil?:
    Date;

  createdAt:
    Date;

  updatedAt:
    Date;
}