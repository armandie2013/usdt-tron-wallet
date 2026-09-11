export type DepositStatus = "DETECTED" | "CONFIRMING" | "CONFIRMED" | "REJECTED";

export interface Deposit {
  id: string;
  userId: string;
  network: "TRON";
  asset: "USDT";
  address: string;
  amount: string;
  txHash: string;
  status: DepositStatus;
  createdAt: Date;
  confirmedAt?: Date;
}
