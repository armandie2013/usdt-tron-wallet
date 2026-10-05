import {
  encryptValue,
} from "@/lib/crypto/encryption";

import {
  formatUsdtDisplay,
} from "@/lib/money/usdt";

import {
  formatSunAsTrxDisplay,
} from "@/lib/money/trx";

import {
  generatePlatformWallet,
} from "@/lib/wallet/tron-platform-wallet.server";

import {
  getConfiguredTronNetwork,
} from "./tron.config";

import {
  TronClient,
} from "./tron.client";

import {
  TronSystemWalletRepository,
} from "./tron-system-wallet.repository";

import type {
  TronSystemWalletDocument,
} from "./tron-system-wallet.types";

import type {
  TronNetwork,
} from "./tron.types";

import {
  getUsdtTrc20ContractForNetwork,
} from "./usdt.contract";

/*
 * ============================================================
 * SYSTEM WALLET SERVICE
 * ============================================================
 *
 * Este servicio administra exclusivamente wallets
 * pertenecientes a la plataforma.
 *
 * No representa las wallets personales no-custodial
 * de los usuarios.
 *
 * Las private keys administradas aquí pertenecen solamente
 * a wallets propias de infraestructura de la plataforma.
 */

export class TronSystemWalletService {
  private readonly repository =
    new TronSystemWalletRepository();

  /*
   * ==========================================================
   * RED
   * ==========================================================
   */

  private getNetwork():
    TronNetwork {
    return getConfiguredTronNetwork();
  }

  /*
   * ==========================================================
   * PLATFORM TREASURY
   * ==========================================================
   */

  async getOrCreatePlatformTreasury() {
    const network =
      this.getNetwork();

    const existing =
      await this.repository
        .findPlatformTreasury(
          network,
        );

    if (
      existing
    ) {
      if (
        existing.network !==
        network
      ) {
        throw new Error(
          "La wallet treasury encontrada pertenece a una red TRON diferente.",
        );
      }

      return {
        ...this.toPublic(
          existing,
        ),

        createdNow:
          false,

        recovery:
          null,
      };
    }

    /*
     * Esta wallet pertenece a la plataforma.
     *
     * La private key existe sin cifrar solamente durante
     * esta operación.
     */

    const generated =
      generatePlatformWallet();

    const encryptedPrivateKey =
      encryptValue(
        generated.privateKey,
      );

    const created =
      await this.repository
        .createPlatformTreasury({
          network,

          addressBase58:
            generated
              .addressBase58,

          addressHex:
            generated
              .addressHex,

          encryptedPrivateKey,
        });

    if (
      created.network !==
      network
    ) {
      throw new Error(
        "La wallet treasury creada no corresponde a la red TRON configurada.",
      );
    }

    const createdNow =
      created.addressBase58 ===
        generated.addressBase58 &&
      created.addressHex
        .toUpperCase() ===
        generated.addressHex
          .toUpperCase();

    if (
      !createdNow
    ) {
      return {
        ...this.toPublic(
          created,
        ),

        createdNow:
          false,

        recovery:
          null,
      };
    }

    return {
      ...this.toPublic(
        created,
      ),

      createdNow:
        true,

      recovery: {
        mnemonic:
          generated.mnemonic,

        derivationPath:
          generated
            .derivationPath,
      },
    };
  }

  /*
   * ==========================================================
   * ESTADO PLATFORM TREASURY
   * ==========================================================
   */

  async getPlatformTreasuryStatus() {
    const network =
      this.getNetwork();

    const wallet =
      await this.repository
        .findPlatformTreasury(
          network,
        );

    if (
      !wallet
    ) {
      return null;
    }

    if (
      wallet.network !==
      network
    ) {
      throw new Error(
        "La wallet treasury pertenece a una red TRON diferente de la red activa.",
      );
    }

    return this.getWalletStatus(
      wallet,
    );
  }

  /*
   * ==========================================================
   * ESTADO ON-CHAIN
   * ==========================================================
   *
   * La red utilizada para consultar una wallet sale de la
   * propia wallet almacenada.
   */

  private async getWalletStatus(
    wallet:
      TronSystemWalletDocument,
  ) {
    const configuredNetwork =
      this.getNetwork();

    if (
      wallet.network !==
      configuredNetwork
    ) {
      throw new Error(
        "La wallet del sistema pertenece a una red TRON diferente de la red activa.",
      );
    }

    const tronWeb =
      TronClient
        .createForAddress(
          wallet.addressBase58,
          wallet.network,
        );

    /*
     * ========================================================
     * ACTIVACIÓN
     * ========================================================
     */

    const account =
      await tronWeb
        .trx
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

    /*
     * ========================================================
     * TRX
     * ========================================================
     */

    const trxBalanceNumber =
      await tronWeb
        .trx
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

    /*
     * ========================================================
     * RECURSOS TRON
     * ========================================================
     */

    const resourceData =
      await tronWeb
        .trx
        .getAccountResources(
          wallet.addressBase58,
        );

    const freeBandwidthLimit =
      this.resourceToBigInt(
        resourceData
          .freeNetLimit,
      );

    const freeBandwidthUsed =
      this.resourceToBigInt(
        resourceData
          .freeNetUsed,
      );

    const stakedBandwidthLimit =
      this.resourceToBigInt(
        resourceData
          .NetLimit,
      );

    const stakedBandwidthUsed =
      this.resourceToBigInt(
        resourceData
          .NetUsed,
      );

    const energyLimit =
      this.resourceToBigInt(
        resourceData
          .EnergyLimit,
      );

    const energyUsed =
      this.resourceToBigInt(
        resourceData
          .EnergyUsed,
      );

    const freeBandwidthAvailable =
      this.nonNegative(
        freeBandwidthLimit -
          freeBandwidthUsed,
      );

    const stakedBandwidthAvailable =
      this.nonNegative(
        stakedBandwidthLimit -
          stakedBandwidthUsed,
      );

    const bandwidthAvailable =
      freeBandwidthAvailable +
      stakedBandwidthAvailable;

    const energyAvailable =
      this.nonNegative(
        energyLimit -
          energyUsed,
      );

    /*
     * ========================================================
     * USDT
     * ========================================================
     */

    const contractAddress =
      getUsdtTrc20ContractForNetwork(
        wallet.network,
      );

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

    /*
     * ========================================================
     * RESULTADO
     * ========================================================
     */

    return {
      ...this.toPublic(
        wallet,
      ),

      activated,

      trx: {
        balanceSun:
          trxBalanceSun
            .toString(),

        formattedBalance:
          this.formatTrx(
            trxBalanceSun,
          ),
      },

      usdt: {
        contract:
          contractAddress,

        balanceUnits:
          usdtBalanceUnits
            .toString(),

        formattedBalance:
          formatUsdtDisplay(
            usdtBalanceUnits,
          ),
      },

      resources: {
        energyAvailable:
          energyAvailable
            .toString(),

        energyLimit:
          energyLimit
            .toString(),

        energyUsed:
          energyUsed
            .toString(),

        bandwidthAvailable:
          bandwidthAvailable
            .toString(),

        freeBandwidthAvailable:
          freeBandwidthAvailable
            .toString(),

        stakedBandwidthAvailable:
          stakedBandwidthAvailable
            .toString(),

        freeBandwidthLimit:
          freeBandwidthLimit
            .toString(),

        freeBandwidthUsed:
          freeBandwidthUsed
            .toString(),

        stakedBandwidthLimit:
          stakedBandwidthLimit
            .toString(),

        stakedBandwidthUsed:
          stakedBandwidthUsed
            .toString(),
      },
    };
  }

  /*
   * ==========================================================
   * REPRESENTACIÓN PÚBLICA
   * ==========================================================
   *
   * Nunca devolvemos:
   *
   * - encryptedPrivateKey;
   * - privateKey;
   * - secretos internos.
   */

  private toPublic(
    wallet:
      TronSystemWalletDocument,
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

      updatedAt:
        wallet.updatedAt
          .toISOString(),
    };
  }

  /*
   * ==========================================================
   * HELPERS DE RECURSOS
   * ==========================================================
   */

  private resourceToBigInt(
    value:
      unknown,
  ): bigint {
    if (
      value ===
        undefined ||
      value ===
        null
    ) {
      return 0n;
    }

    if (
      typeof value ===
        "bigint"
    ) {
      return value;
    }

    if (
      typeof value ===
        "number"
    ) {
      if (
        !Number.isSafeInteger(
          value,
        )
      ) {
        throw new Error(
          "Un recurso TRON excede el rango entero seguro de JavaScript.",
        );
      }

      return BigInt(
        value,
      );
    }

    if (
      typeof value ===
        "string" &&
      /^\d+$/.test(
        value,
      )
    ) {
      return BigInt(
        value,
      );
    }

    return 0n;
  }

  private nonNegative(
    value:
      bigint,
  ): bigint {
    return value <
      0n
      ? 0n
      : value;
  }

  /*
   * ==========================================================
   * FORMATO TRX
   * ==========================================================
   */

  private formatTrx(
    amountSun:
      bigint,
  ): string {
    return formatSunAsTrxDisplay(
      amountSun,
    );
  }
}