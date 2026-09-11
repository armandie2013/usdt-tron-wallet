export interface PublicTransaction {
  id: string;

  type: string;

  asset: "USDT";

  amount: string;

  formattedAmount: string;

  direction:
    | "CREDIT"
    | "DEBIT";

  referenceType?:
    string;

  referenceId?:
    string;

  createdAt:
    string;
}