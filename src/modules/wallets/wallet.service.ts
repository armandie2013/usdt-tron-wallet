// import {
//   AppError,
// } from "@/lib/errors/app-error";

// import {
//   TronAccountRepository,
// } from "@/modules/blockchain/tron/tron-account.repository";

// import {
//   TronService,
// } from "@/modules/blockchain/tron/tron.service";

// import type {
//   TronNetwork,
// } from "@/modules/blockchain/tron/tron.types";

// import type {
//   PublicWalletAccount,
// } from "./wallet.types";

// export class WalletService {
//   private readonly accounts =
//     new TronAccountRepository();

//   private readonly tron =
//     new TronService();

//   /*
//    * ==========================================================
//    * RED
//    * ==========================================================
//    */

//   private getNetwork():
//     TronNetwork {
//     const value =
//       process.env
//         .TRON_NETWORK
//         ?.trim()
//         .toLowerCase();

//     return value ===
//       "mainnet"
//       ? "MAINNET"
//       : "NILE";
//   }

//   /*
//    * ==========================================================
//    * WALLET DEL USUARIO
//    * ==========================================================
//    *
//    * Fuente de verdad:
//    *
//    * - dirección pública TRON registrada;
//    * - saldo USDT real consultado on-chain.
//    */

//   async getUserWallet(
//     userId:
//       string,
//   ): Promise<
//     PublicWalletAccount
//   > {
//     const network =
//       this.getNetwork();

//     const account =
//       await this.accounts
//         .findByUserId(
//           userId,
//           network,
//         );

//     if (
//       !account ||
//       !account._id
//     ) {
//       throw new AppError(
//         "El usuario no posee una wallet TRON registrada.",
//         "TRON_ACCOUNT_NOT_FOUND",
//         404,
//       );
//     }

//     if (
//       account.status !==
//       "ACTIVE"
//     ) {
//       throw new AppError(
//         "La wallet TRON del usuario no se encuentra activa.",
//         "TRON_ACCOUNT_DISABLED",
//         409,
//       );
//     }

//     const balance =
//       await this.tron
//         .getUsdtBalance(
//           account
//             .addressBase58,
//         );

//     /*
//      * El campo "id" corresponde al documento
//      * público TronAccount.
//      */

//     return {
//       id:
//         account._id
//           .toString(),

//       userId:
//         account.userId
//           .toString(),

//       asset:
//         "USDT",

//       status:
//         account.status,

//       balance:
//         balance.balanceUnits,

//       formattedBalance:
//         balance.formattedBalance,

//       createdAt:
//         account.createdAt
//           .toISOString(),

//       updatedAt:
//         account.updatedAt
//           .toISOString(),
//     };
//   }
// }
import {
  AppError,
} from "@/lib/errors/app-error";

import {
  TronAccountRepository,
} from "@/modules/blockchain/tron/tron-account.repository";

import {
  TronService,
} from "@/modules/blockchain/tron/tron.service";

import type {
  PublicWalletAccount,
} from "./wallet.types";

export class WalletService {
  private readonly accounts =
    new TronAccountRepository();

  private readonly tron =
    new TronService();

  /*
   * ==========================================================
   * WALLET DEL USUARIO
   * ==========================================================
   *
   * Fuente de verdad:
   *
   * - dirección pública TRON registrada;
   * - saldo USDT real consultado on-chain.
   */

  async getUserWallet(
    userId:
      string,
  ): Promise<
    PublicWalletAccount
  > {
    const network =
      this.tron
        .getNetwork();

    const account =
      await this.accounts
        .findByUserId(
          userId,
          network,
        );

    if (
      !account ||
      !account._id
    ) {
      throw new AppError(
        "El usuario no posee una wallet TRON registrada.",
        "TRON_ACCOUNT_NOT_FOUND",
        404,
      );
    }

    if (
      account.status !==
      "ACTIVE"
    ) {
      throw new AppError(
        "La wallet TRON del usuario no se encuentra activa.",
        "TRON_ACCOUNT_DISABLED",
        409,
      );
    }

    const balance =
      await this.tron
        .getUsdtBalance(
          account
            .addressBase58,
        );

    /*
     * El campo "id" corresponde al documento
     * público TronAccount.
     */

    return {
      id:
        account._id
          .toString(),

      userId:
        account.userId
          .toString(),

      asset:
        "USDT",

      status:
        account.status,

      balance:
        balance.balanceUnits,

      formattedBalance:
        balance.formattedBalance,

      createdAt:
        account.createdAt
          .toISOString(),

      updatedAt:
        account.updatedAt
          .toISOString(),
    };
  }
}
