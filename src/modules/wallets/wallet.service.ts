import {
  AppError,
} from "@/lib/errors/app-error";

import {
  formatUsdtDisplay,
} from "@/lib/money/usdt";

import {
  LedgerService,
} from "@/modules/ledger/ledger.service";

import {
  WalletRepository,
} from "./wallet.repository";

import type {
  PublicWalletAccount,
} from "./wallet.types";

export class WalletService {
  private readonly repository =
    new WalletRepository();

  private readonly ledger =
    new LedgerService();

  async getUserWallet(
    userId: string,
  ): Promise<PublicWalletAccount> {
    const wallet =
      await this.repository
        .getOrCreateUserWallet(
          userId,
          "USDT",
        );

    if (
      !wallet._id ||
      !wallet.userId
    ) {
      throw new AppError(
        "La cuenta de billetera no posee un identificador válido.",
        "INVALID_WALLET_ACCOUNT",
        500,
      );
    }

    const balance =
      await this.ledger
        .getBalance(
          wallet._id.toString(),
        );

    return {
      id:
        wallet._id.toString(),

      userId:
        wallet.userId.toString(),

      asset:
        wallet.asset,

      status:
        wallet.status,

      balance:
        balance.toString(),

      formattedBalance:
        formatUsdtDisplay(
          balance,
        ),

      createdAt:
        wallet.createdAt.toISOString(),

      updatedAt:
        wallet.updatedAt.toISOString(),
    };
  }
}