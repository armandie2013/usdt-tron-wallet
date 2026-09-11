import {
  AppError,
} from "@/lib/errors/app-error";

import {
  LedgerRepository,
} from "./ledger.repository";

import type {
  CreateLedgerTransaction,
  LedgerTransactionDocument,
} from "./ledger.types";

export class LedgerService {
  private readonly repository =
    new LedgerRepository();

  async post(
    input:
      CreateLedgerTransaction,
  ): Promise<
    LedgerTransactionDocument
  > {
    if (
      input.entries.length <
      2
    ) {
      throw new AppError(
        "Una transacción contable debe contener al menos dos entradas.",
        "INVALID_LEDGER_TRANSACTION",
        400,
      );
    }

    for (
      const entry of
      input.entries
    ) {
      if (
        entry.amount ===
        0n
      ) {
        throw new AppError(
          "Una entrada del ledger no puede tener monto cero.",
          "INVALID_LEDGER_ENTRY",
          400,
        );
      }
    }

    const total =
      input.entries.reduce(
        (
          accumulator,
          entry,
        ) =>
          accumulator +
          entry.amount,

        0n,
      );

    if (
      total !==
      0n
    ) {
      throw new AppError(
        "La transacción contable no está balanceada.",
        "UNBALANCED_LEDGER_TRANSACTION",
        400,
      );
    }

    return this.repository
      .createTransaction(
        input,
      );
  }

  async getBalance(
    accountId: string,
  ): Promise<bigint> {
    return this.repository
      .getAccountBalance(
        accountId,
      );
  }
}