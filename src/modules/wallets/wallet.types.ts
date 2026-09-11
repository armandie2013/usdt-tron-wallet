export interface WalletAccount {
  id: string;
  userId: string;
  asset: "USDT";
  balance: string;
  availableBalance: string;
  lockedBalance: string;
  createdAt: Date;
  updatedAt: Date;
}
