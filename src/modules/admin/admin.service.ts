import {
  randomUUID,
} from "crypto";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  formatUsdt,
  parseUsdt,
} from "@/lib/money/usdt";

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
  TestCreditInput,
} from "./admin.validation";

export class AdminService {
  private readonly users =
    new UserRepository();

  private readonly wallets =
    new WalletRepository();

  private readonly ledger =
    new LedgerService();

  async listUsers() {
    const users =
      await this.users.listAll();

    return Promise.all(
      users.map(
        async (user) => {
          if (!user._id) {
            throw new Error(
              "Usuario sin identificador.",
            );
          }

          const wallet =
            await this.wallets
              .getOrCreateUserWallet(
                user._id.toString(),
                "USDT",
              );

          if (!wallet._id) {
            throw new Error(
              "Wallet sin identificador.",
            );
          }

          const balance =
            await this.ledger
              .getBalance(
                wallet._id.toString(),
              );

          return {
            id:
              user._id.toString(),

            name:
              user.name,

            email:
              user.email,

            role:
              user.role,

            status:
              user.status,

            emailVerified:
              user.emailVerified,

            wallet: {
              id:
                wallet._id.toString(),

              asset:
                wallet.asset,

              status:
                wallet.status,

              balance:
                balance.toString(),

              formattedBalance:
                formatUsdt(
                  balance,
                ),
            },

            createdAt:
              user.createdAt.toISOString(),
          };
        },
      ),
    );
  }

  async testCredit(
    input: TestCreditInput,
  ) {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      throw new AppError(
        "La acreditación de prueba está deshabilitada en producción.",
        "TEST_CREDIT_DISABLED",
        403,
      );
    }

    const user =
      await this.users
        .findByEmail(
          input.email,
        );

    if (
      !user ||
      !user._id
    ) {
      throw new AppError(
        "No se encontró el usuario.",
        "USER_NOT_FOUND",
        404,
      );
    }

    if (
      user.status !==
      "ACTIVE"
    ) {
      throw new AppError(
        "El usuario no se encuentra activo.",
        "USER_NOT_ACTIVE",
        409,
      );
    }

    let amount:
      bigint;

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

    const userWallet =
      await this.wallets
        .getOrCreateUserWallet(
          user._id.toString(),
          "USDT",
        );

    const clearingWallet =
      await this.wallets
        .getOrCreateSystemWallet(
          "EXTERNAL_CLEARING",
          "USDT",
        );

    if (
      !userWallet._id ||
      !clearingWallet._id
    ) {
      throw new AppError(
        "No se pudieron obtener las cuentas contables.",
        "INVALID_WALLET_ACCOUNT",
        500,
      );
    }

    const transaction =
      await this.ledger.post({
        asset:
          "USDT",

        type:
          "ADJUSTMENT",

        idempotencyKey:
          `test-credit:${randomUUID()}`,

        referenceType:
          "TEST_CREDIT",

        referenceId:
          user._id.toString(),

        metadata: {
          userEmail:
            user.email,
        },

        entries: [
          {
            accountId:
              userWallet._id.toString(),

            amount,

            description:
              "Acreditación administrativa de prueba",
          },

          {
            accountId:
              clearingWallet._id.toString(),

            amount:
              -amount,

            description:
              "Contrapartida de acreditación de prueba",
          },
        ],
      });

    const balance =
      await this.ledger
        .getBalance(
          userWallet._id.toString(),
        );

    return {
      transactionId:
        transaction._id
          ?.toString(),

      user: {
        id:
          user._id.toString(),

        name:
          user.name,

        email:
          user.email,
      },

      amount:
        amount.toString(),

      formattedAmount:
        formatUsdt(
          amount,
        ),

      balance:
        balance.toString(),

      formattedBalance:
        formatUsdt(
          balance,
        ),
    };
  }
}