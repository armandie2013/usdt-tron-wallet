export type SweepDryRunStatus =
  | "EMPTY"
  | "READY_ENERGY"
  | "READY_TRX"
  | "NEEDS_FUNDING"
  | "ESTIMATE_UNAVAILABLE"
  | "ERROR";

export interface SweepDryRunItem {
  userId:
    string;

  address:
    string;

  hotWallet:
    string;

  usdt: {
    balanceUnits:
      string;

    formattedBalance:
      string;
  };

  trx: {
    balanceSun:
      string;

    formattedBalance:
      string;
  };

  resources: {
    energyAvailable:
      string;

    estimatedEnergy:
      string | null;

    energyDeficit:
      string | null;

    energyPriceSun:
      string | null;

    estimatedEnergyCostSun:
      string | null;

    estimatedEnergyCostTrx:
      string | null;

    bandwidthAvailable:
      string;
  };

  status:
    SweepDryRunStatus;

  reason:
    string | null;
}

export interface SweepDryRunResult {
  network:
    "NILE" | "MAINNET";

  hotWallet: {
    address:
      string;

    activated:
      boolean;
  };

  pagination: {
    page:
      number;

    pageSize:
      number;

    totalAccounts:
      number;

    totalPages:
      number;
  };

  summary: {
    checked:
      number;

    empty:
      number;

    readyEnergy:
      number;

    readyTrx:
      number;

    needsFunding:
      number;

    estimateUnavailable:
      number;

    errors:
      number;
  };

  items:
    SweepDryRunItem[];
}