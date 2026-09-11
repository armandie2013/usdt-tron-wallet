export type LedgerEntryType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "FEE"
  | "ADJUSTMENT";

export interface LedgerEntry {
  id: string;
  transactionId: string;
  userId: string;
  asset: "USDT";
  type: LedgerEntryType;
  amount: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: Date;
}
