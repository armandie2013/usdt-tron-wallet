export type WithdrawalStatus =
  | "PENDING"
  | "PROCESSING"
  | "BROADCASTED"
  | "CONFIRMED"
  | "FAILED"
  | "CANCELLED";

export interface Withdrawal {
  id: string;
  userId: string;
  network: "TRON";
  asset: "USDT";
  destinationAddress: string;
  amount: string;
  feeAmount: string;
  txHash?: string;
  status: WithdrawalStatus;
  createdAt: Date;
  updatedAt: Date;
}
