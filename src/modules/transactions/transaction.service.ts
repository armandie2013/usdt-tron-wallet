import {
  randomUUID,
} from "crypto";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  longToBigint,
} from "@/lib/money/amount";

import {
  formatUsdt,
  parseUsdt,
} from "@/lib/money/usdt";

import {
  LedgerRepository,
} from "@/modules/ledger/ledger.repository";

import {
  LedgerService,
} from "@/modules/ledger/ledger.service";

import {
  UserRepository,
} from "@/modules/users/user.repository";

import {
  WalletRepository,
} from "@/modules/wallets/wallet.repository";

import type {
  PublicTransaction,
} from "./transaction.types";

import type {
  InternalTransferInput,
} from "./transaction.validation";

export class TransactionService {
  private readonly users =
    new UserRepository();

  private readonly wallets =
    new WalletRepository();

  private readonly ledger =
    new LedgerService();

  private readonly ledgerRepository =
    new LedgerRepository();

  async internalTransfer(
    senderUserId: string,
    input:
      InternalTransferInput,
  ) {
    const sender =
      await this.users.findById(
        senderUserId,
      );

    if (
      !sender ||
      !sender._id
    ) {
      throw new AppError(
        "Usuario remitente no encontrado.",
        "SENDER_NOT_FOUND",
        404,
      );
    }

    const recipient =
      await this.users.findByEmail(
        input.recipientEmail,
      );

    if (
      !recipient ||
      !recipient._id
    ) {
      throw new AppError(
        "No se encontró el usuario destinatario.",
        "RECIPIENT_NOT_FOUND",
        404,
      );
    }

    if (
      recipient.status !==
      "ACTIVE"
    ) {
      throw new AppError(
        "El usuario destinatario no se encuentra activo.",
        "RECIPIENT_NOT_ACTIVE",
        409,
      );
    }

    if (
      sender._id.equals(
        recipient._id,
      )
    ) {
      throw new AppError(
        "No puede transferirse USDT a su propia cuenta.",
        "SELF_TRANSFER_NOT_ALLOWED",
        400,
      );
    }

    let amount: bigint;

    try {
      amount =
        parseUsdt(
          input.amount,
        );
    } catch {
      throw new AppError(
        "El monto USDT no es válido.",
        "INVALID_AMOUNT",
        400,
      );
    }

    if (
      amount <= 0n
    ) {
      throw new AppError(
        "El monto debe ser mayor a cero.",
        "INVALID_AMOUNT",
        400,
      );
    }

    const senderWallet =
      await this.wallets
        .getOrCreateUserWallet(
          sender._id.toString(),
          "USDT",
        );

    const recipientWallet =
      await this.wallets
        .getOrCreateUserWallet(
          recipient._id.toString(),
          "USDT",
        );

    if (
      !senderWallet._id ||
      !recipientWallet._id
    ) {
      throw new AppError(
        "No se pudieron obtener las billeteras.",
        "INVALID_WALLET_ACCOUNT",
        500,
      );
    }

    if (
      senderWallet.status !==
        "ACTIVE" ||
      recipientWallet.status !==
        "ACTIVE"
    ) {
      throw new AppError(
        "Una de las billeteras no se encuentra activa.",
        "WALLET_NOT_ACTIVE",
        409,
      );
    }

    const senderBalance =
      await this.ledger
        .getBalance(
          senderWallet._id.toString(),
        );

    if (
      senderBalance <
      amount
    ) {
      throw new AppError(
        "Saldo insuficiente.",
        "INSUFFICIENT_BALANCE",
        409,
      );
    }

    const transferId =
      randomUUID();

    const transaction =
      await this.ledger.post({
        asset:
          "USDT",

        type:
          "INTERNAL_TRANSFER",

        idempotencyKey:
          `internal-transfer:${transferId}`,

        referenceType:
          "INTERNAL_TRANSFER",

        referenceId:
          transferId,

        metadata: {
          senderUserId:
            sender._id.toString(),

          recipientUserId:
            recipient._id.toString(),

          recipientEmail:
            recipient.email,
        },

        entries: [
          {
            accountId:
              senderWallet._id.toString(),

            amount:
              -amount,

            description:
              `Transferencia a ${recipient.email}`,
          },

          {
            accountId:
              recipientWallet._id.toString(),

            amount,

            description:
              `Transferencia de ${sender.email}`,
          },
        ],
      });

    const newBalance =
      await this.ledger
        .getBalance(
          senderWallet._id.toString(),
        );

    return {
      transactionId:
        transaction._id?.toString(),

      transferId,

      recipient: {
        id:
          recipient._id.toString(),

        name:
          recipient.name,

        email:
          recipient.email,
      },

      amount:
        amount.toString(),

      formattedAmount:
        formatUsdt(
          amount,
        ),

      balance:
        newBalance.toString(),

      formattedBalance:
        formatUsdt(
          newBalance,
        ),
    };
  }

  async listUserTransactions(
    userId: string,
    limit = 50,
  ): Promise<
    PublicTransaction[]
  > {
    const wallet =
      await this.wallets
        .getOrCreateUserWallet(
          userId,
          "USDT",
        );

    if (!wallet._id) {
      throw new AppError(
        "La billetera no posee un identificador válido.",
        "INVALID_WALLET_ACCOUNT",
        500,
      );
    }

    const accountId =
      wallet._id.toString();

    const transactions =
      await this.ledgerRepository
        .listAccountTransactions(
          accountId,
          limit,
        );

    return transactions.map(
      (transaction) => {
        const entry =
          transaction.entries.find(
            (item) =>
              item.accountId.toString() ===
              accountId,
          );

        if (!entry) {
          throw new Error(
            "La transacción no contiene la cuenta solicitada.",
          );
        }

        const amount =
          longToBigint(
            entry.amount,
          );

        return {
          id:
            transaction._id?.toString() ??
            "",

          type:
            transaction.type,

          asset:
            transaction.asset,

          amount:
            amount.toString(),

          formattedAmount:
            formatUsdt(
              amount,
            ),

          direction:
            amount >= 0n
              ? "CREDIT"
              : "DEBIT",

          referenceType:
            transaction.referenceType,

          referenceId:
            transaction.referenceId,

          createdAt:
            transaction.createdAt.toISOString(),
        };
      },
    );
  }
}