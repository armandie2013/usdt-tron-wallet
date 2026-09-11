import QRCode from "qrcode";

import {
  TronWeb,
} from "tronweb";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  encryptValue,
} from "@/lib/crypto/encryption";

import {
  formatUsdtDisplay,
} from "@/lib/money/usdt";

import {
  WalletRepository,
} from "@/modules/wallets/wallet.repository";

import {
  TronAccountRepository,
} from "./tron-account.repository";

import {
  TronClient,
} from "./tron.client";

import {
  getUsdtTrc20Contract,
} from "./usdt.contract";

import type {
  PublicTronAccount,
  TronAccountDocument,
  TronBlockchainStatus,
  TronNetwork,
} from "./tron.types";

const TRX_SCALE =
  1_000_000n;

export class TronService {
  private readonly accounts =
    new TronAccountRepository();

  private readonly wallets =
    new WalletRepository();

  private getNetwork():
    TronNetwork {
    const network =
      process.env
        .TRON_NETWORK
        ?.trim()
        .toLowerCase();

    if (
      network ===
      "mainnet"
    ) {
      return "MAINNET";
    }

    return "NILE";
  }

  async getOrCreateAccountForUser(
    userId: string,
  ): Promise<
    PublicTronAccount
  > {
    const network =
      this.getNetwork();

    let account =
      await this.accounts
        .findByUserId(
          userId,
          network,
        );

    if (!account) {
      account =
        await this.createAccountForUser(
          userId,
          network,
        );
    }

    return this.toPublicAccount(
      account,
    );
  }

  async getBlockchainStatusForUser(
    userId: string,
  ): Promise<
    TronBlockchainStatus
  > {
    const network =
      this.getNetwork();

    const account =
      await this.accounts
        .findByUserId(
          userId,
          network,
        );

    if (!account) {
      throw new AppError(
        "El usuario todavía no posee una dirección TRON.",
        "TRON_ACCOUNT_NOT_FOUND",
        404,
      );
    }

    const tronWeb =
      TronClient.getInstance();

    const address =
      account.addressBase58;

    /*
     * TronWeb necesita una dirección por defecto
     * para algunas llamadas constantes a contratos.
     *
     * No estamos firmando nada ni cargando la private key.
     * Solo establecemos la dirección pública del usuario.
     */
    tronWeb.setAddress(
      address,
    );

    /*
     * ESTADO DE ACTIVACIÓN
     */
    let activated =
      false;

    try {
      const accountInfo =
        await tronWeb.trx
          .getAccount(
            address,
          );

      activated =
        Boolean(
          accountInfo &&
          typeof accountInfo ===
            "object" &&
          Object.keys(
            accountInfo,
          ).length > 0 &&
          "address" in
            accountInfo,
        );
    } catch (error) {
      console.error(
        "[TRON ACCOUNT STATUS]",
        error,
      );

      activated =
        false;
    }

    /*
     * SALDO TRX
     *
     * TronWeb devuelve SUN.
     */
    let trxBalanceSun =
      0n;

    try {
      const rawBalance =
        await tronWeb.trx
          .getBalance(
            address,
          );

      if (
        !Number.isSafeInteger(
          rawBalance,
        )
      ) {
        throw new Error(
          "El saldo TRX recibido excede el rango seguro de JavaScript.",
        );
      }

      trxBalanceSun =
        BigInt(
          rawBalance,
        );
    } catch (error) {
      console.error(
        "[TRON TRX BALANCE]",
        error,
      );

      if (activated) {
        throw new AppError(
          "No se pudo consultar el saldo TRX en TRON.",
          "TRON_TRX_BALANCE_ERROR",
          502,
        );
      }

      trxBalanceSun =
        0n;
    }

    /*
     * SALDO USDT TRC20
     */
    const usdtContract =
      getUsdtTrc20Contract();

    let usdtBalanceUnits =
      0n;

    try {
      const contract =
        await tronWeb
          .contract()
          .at(
            usdtContract,
          );

      const result =
        await contract
          .balanceOf(
            address,
          )
          .call({
            from:
              address,
          });

      if (
        result === null ||
        result === undefined
      ) {
        throw new Error(
          "El contrato USDT no devolvió saldo.",
        );
      }

      usdtBalanceUnits =
        BigInt(
          result.toString(),
        );
    } catch (error) {
      console.error(
        "[TRON USDT BALANCE]",
        error,
      );

      throw new AppError(
        "No se pudo consultar el saldo USDT en TRON.",
        "TRON_USDT_BALANCE_ERROR",
        502,
      );
    }

    return {
      network,

      address,

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
          usdtContract,

        balanceUnits:
          usdtBalanceUnits.toString(),

        formattedBalance:
          formatUsdtDisplay(
            usdtBalanceUnits,
          ),
      },
    };
  }

  private async createAccountForUser(
    userId: string,
    network:
      TronNetwork,
  ): Promise<
    TronAccountDocument
  > {
    const wallet =
      await this.wallets
        .getOrCreateUserWallet(
          userId,
          "USDT",
        );

    if (!wallet._id) {
      throw new AppError(
        "La wallet no posee un identificador válido.",
        "INVALID_WALLET_ACCOUNT",
        500,
      );
    }

    const generated =
      await TronWeb.createAccount();

    const privateKey =
      generated.privateKey;

    const addressBase58 =
      generated.address
        .base58;

    const addressHex =
      generated.address
        .hex;

    if (
      !privateKey ||
      !addressBase58 ||
      !addressHex
    ) {
      throw new AppError(
        "No se pudo generar la cuenta TRON.",
        "TRON_ACCOUNT_GENERATION_FAILED",
        500,
      );
    }

    const encryptedPrivateKey =
      encryptValue(
        privateKey,
      );

    return this.accounts.create({
      userId,

      walletAccountId:
        wallet._id.toString(),

      network,

      addressBase58,

      addressHex,

      encryptedPrivateKey,
    });
  }

  private async toPublicAccount(
    account:
      TronAccountDocument,
  ): Promise<
    PublicTronAccount
  > {
    if (!account._id) {
      throw new AppError(
        "La cuenta TRON no posee identificador.",
        "INVALID_TRON_ACCOUNT",
        500,
      );
    }

    const qrDataUrl =
      await QRCode.toDataURL(
        account.addressBase58,
        {
          errorCorrectionLevel:
            "M",

          margin:
            1,

          width:
            320,
        },
      );

    return {
      id:
        account._id.toString(),

      network:
        account.network,

      address:
        account.addressBase58,

      addressHex:
        account.addressHex,

      qrDataUrl,

      createdAt:
        account.createdAt
          .toISOString(),
    };
  }

  private formatTrx(
    sun: bigint,
  ): string {
    const negative =
      sun < 0n;

    const absolute =
      negative
        ? -sun
        : sun;

    const integerPart =
      absolute /
      TRX_SCALE;

    const decimalPart =
      absolute %
      TRX_SCALE;

    const formattedInteger =
      new Intl.NumberFormat(
        "es-AR",
        {
          maximumFractionDigits:
            0,
        },
      ).format(
        integerPart,
      );

    const decimals =
      decimalPart
        .toString()
        .padStart(
          6,
          "0",
        )
        .replace(
          /0+$/,
          "",
        );

    const formatted =
      decimals
        ? `${formattedInteger},${decimals}`
        : formattedInteger;

    return negative
      ? `-${formatted}`
      : formatted;
  }
}