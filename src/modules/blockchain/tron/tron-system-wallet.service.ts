import {
  encryptValue,
} from "@/lib/crypto/encryption";

import {
  formatUsdtDisplay,
} from "@/lib/money/usdt";

import {
  TronClient,
} from "./tron.client";

import {
  TronSystemWalletRepository,
} from "./tron-system-wallet.repository";

import type {
  TronNetwork,
} from "./tron.types";

import {
  getUsdtTrc20Contract,
} from "./usdt.contract";

export class TronSystemWalletService {
  private readonly repository =
    new TronSystemWalletRepository();

  private getNetwork():
    TronNetwork {
    return process.env
      .TRON_NETWORK
      ?.trim()
      .toLowerCase() ===
      "mainnet"
      ? "MAINNET"
      : "NILE";
  }

  async getOrCreateHotWallet() {
    const network =
      this.getNetwork();

    const existing =
      await this.repository
        .findHotWallet(
          network,
        );

    if (existing) {
      return this.toPublic(
        existing,
      );
    }

    /*
     * Generación completamente local.
     * La private key solamente existe en memoria
     * hasta ser cifrada.
     */
    const account =
      await TronClient
        .create()
        .createAccount();

    const encryptedPrivateKey =
  encryptValue(
    account.privateKey,
  );

    const created =
      await this.repository
        .createHotWallet({
          network,

          addressBase58:
            account.address.base58,

          addressHex:
            account.address.hex,

          encryptedPrivateKey,
        });

    return this.toPublic(
      created,
    );
  }

  async getHotWalletStatus() {
    const network =
      this.getNetwork();

    const wallet =
      await this.repository
        .findHotWallet(
          network,
        );

    if (!wallet) {
      return null;
    }

    /*
     * Instancia independiente porque setAddress()
     * modifica el estado interno de TronWeb.
     */
    const tronWeb =
      TronClient.createForAddress(
        wallet.addressBase58,
      );

    const account =
      await tronWeb.trx
        .getAccount(
          wallet.addressBase58,
        );

    const activated =
      Boolean(
        account &&
        typeof account ===
          "object" &&
        "address" in
          account,
      );

    const trxBalanceNumber =
      await tronWeb.trx
        .getBalance(
          wallet.addressBase58,
        );

    if (
      !Number.isSafeInteger(
        trxBalanceNumber,
      )
    ) {
      throw new Error(
        "El saldo TRX excede el rango entero seguro de JavaScript.",
      );
    }

    const trxBalanceSun =
      BigInt(
        trxBalanceNumber,
      );

    const contractAddress =
      getUsdtTrc20Contract();

    const contract =
      await tronWeb
        .contract()
        .at(
          contractAddress,
        );

    const usdtResult =
      await contract
        .balanceOf(
          wallet.addressBase58,
        )
        .call({
          from:
            wallet.addressBase58,
        });

    const usdtBalanceUnits =
      BigInt(
        usdtResult.toString(),
      );

    return {
      ...this.toPublic(
        wallet,
      ),

      activated,

      trx: {
        balanceSun:
          trxBalanceSun.toString(),

        formattedBalance:
          this.formatTrx(
            trxBalanceSun,
          ),
      },

      usdt: {
        contract:
          contractAddress,

        balanceUnits:
          usdtBalanceUnits.toString(),

        formattedBalance:
          formatUsdtDisplay(
            usdtBalanceUnits,
          ),
      },
    };
  }

  private toPublic(
    wallet: {
      _id?: {
        toString():
          string;
      };

      code:
        "HOT_WALLET";

      network:
        TronNetwork;

      addressBase58:
        string;

      addressHex:
        string;

      status:
        "ACTIVE" | "DISABLED";

      createdAt:
        Date;
    },
  ) {
    return {
      id:
        wallet._id
          ?.toString() ??
        "",

      code:
        wallet.code,

      network:
        wallet.network,

      addressBase58:
        wallet.addressBase58,

      addressHex:
        wallet.addressHex,

      status:
        wallet.status,

      createdAt:
        wallet.createdAt
          .toISOString(),
    };
  }

  private formatTrx(
    amountSun:
      bigint,
  ): string {
    const scale =
      1_000_000n;

    const integer =
      amountSun /
      scale;

    const decimals =
      amountSun %
      scale;

    const formattedInteger =
      new Intl.NumberFormat(
        "es-AR",
        {
          maximumFractionDigits:
            0,
        },
      ).format(
        integer,
      );

    const decimalText =
      decimals
        .toString()
        .padStart(
          6,
          "0",
        )
        .replace(
          /0+$/,
          "",
        );

    return decimalText
      ? `${formattedInteger},${decimalText}`
      : formattedInteger;
  }
}