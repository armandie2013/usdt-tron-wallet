import {
  TronAccountRepository,
} from "@/modules/blockchain/tron/tron-account.repository";

import {
  TronService,
} from "@/modules/blockchain/tron/tron.service";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

import {
  UserRepository,
} from "@/modules/users/user.repository";

export class AdminService {
  private readonly users =
    new UserRepository();

  private readonly tronAccounts =
    new TronAccountRepository();

  private readonly tron =
    new TronService();

  /*
   * ==========================================================
   * RED
   * ==========================================================
   */

  private getNetwork():
    TronNetwork {
    const value =
      process.env
        .TRON_NETWORK
        ?.trim()
        .toLowerCase();

    return value ===
      "mainnet"
      ? "MAINNET"
      : "NILE";
  }

  /*
   * ==========================================================
   * LISTADO DE USUARIOS
   * ==========================================================
   *
   * El administrador consulta solamente datos públicos
   * de la wallet TRON registrada.
   *
   * El saldo USDT proviene directamente de TRON.
   *
   * No existen:
   *
   * - cuentas contables de usuario;
   * - balances internos;
   * - acreditaciones administrativas;
   * - movimientos de ledger.
   *
   * Conservamos temporalmente la propiedad "wallet"
   * únicamente para mantener compatibilidad con la UI admin.
   */

  async listUsers() {
    const network =
      this.getNetwork();

    const users =
      await this.users
        .listAll();

    return Promise.all(
      users.map(
        async (
          user,
        ) => {
          if (
            !user._id
          ) {
            throw new Error(
              "Usuario sin identificador.",
            );
          }

          const userId =
            user._id
              .toString();

          const tronAccount =
            await this.tronAccounts
              .findByUserId(
                userId,
                network,
              );

          /*
           * Usuario todavía sin wallet TRON registrada.
           */
          if (
            !tronAccount
          ) {
            return {
              id:
                userId,

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
                  "",

                asset:
                  "USDT" as const,

                status:
                  "UNREGISTERED",

                address:
                  null,

                network,

                balance:
                  "0",

                formattedBalance:
                  "0",
              },

              createdAt:
                user.createdAt
                  .toISOString(),
            };
          }

          /*
           * Fuente de verdad:
           * contrato USDT en TRON.
           */
          const balance =
            await this.tron
              .getUsdtBalance(
                tronAccount
                  .addressBase58,
              );

          return {
            id:
              userId,

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
                tronAccount._id
                  ?.toString() ??
                "",

              asset:
                "USDT" as const,

              status:
                tronAccount.status,

              address:
                tronAccount
                  .addressBase58,

              network:
                tronAccount.network,

              balance:
                balance.balanceUnits,

              formattedBalance:
                balance.formattedBalance,
            },

            createdAt:
              user.createdAt
                .toISOString(),
          };
        },
      ),
    );
  }
}