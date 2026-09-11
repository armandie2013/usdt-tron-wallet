import {
  AppError,
} from "@/lib/errors/app-error";

import {
  decryptValue,
} from "@/lib/crypto/encryption";

import {
  formatUsdtDisplay,
} from "@/lib/money/usdt";

import {
  TronAccountRepository,
} from "@/modules/blockchain/tron/tron-account.repository";

import {
  TronClient,
} from "@/modules/blockchain/tron/tron.client";

import {
  TronSystemWalletService,
} from "@/modules/blockchain/tron/tron-system-wallet.service";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

import {
  getUsdtTrc20Contract,
} from "@/modules/blockchain/tron/usdt.contract";

import type {
  SweepDryRunItem,
  SweepDryRunResult,
  SweepDryRunStatus,
} from "./sweep.types";

import {
  SweepRepository,
} from "./sweep.repository";

const MAX_CONCURRENCY =
  5;

interface TronAccountResources {
  EnergyLimit?:
    number;

  EnergyUsed?:
    number;

  freeNetLimit?:
    number;

  freeNetUsed?:
    number;

  NetLimit?:
    number;

  NetUsed?:
    number;
}

interface ConstantContractResult {
  result?: {
    result?:
      boolean;

    message?:
      string;
  };

  energy_used?:
    number;

  energy_used_total?:
    number;
}

interface TronChainParameter {
  key:
    string;

  value?:
    number | string;
}

export class SweepService {
  private readonly accounts =
    new TronAccountRepository();

  private readonly hotWallets =
    new TronSystemWalletService();

  private readonly sweeps =
    new SweepRepository();

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

  async dryRun(
    page:
      number,

    pageSize:
      number,
  ): Promise<
    SweepDryRunResult
  > {
    const network =
      this.getNetwork();

    const hotWallet =
      await this.hotWallets
        .getHotWalletStatus();

    if (!hotWallet) {
      throw new AppError(
        "La hot wallet todavía no fue creada.",
        "HOT_WALLET_NOT_FOUND",
        404,
      );
    }

    if (
      hotWallet.status !==
      "ACTIVE"
    ) {
      throw new AppError(
        "La hot wallet no está activa.",
        "HOT_WALLET_DISABLED",
        409,
      );
    }

    /*
     * Consultamos una sola vez por ejecución
     * el precio actual de Energy.
     *
     * No tiene sentido pedirlo por cada wallet.
     */
    const energyPriceSun =
      await this.getEnergyPriceSun();

    const totalAccounts =
      await this.accounts
        .countByNetwork(
          network,
        );

    const skip =
      (page - 1) *
      pageSize;

    const accounts =
      await this.accounts
        .listByNetworkPaginated(
          network,
          skip,
          pageSize,
        );

    const items:
      SweepDryRunItem[] =
      [];

    /*
     * Procesamos en lotes chicos para evitar
     * saturar TronGrid cuando haya muchas cuentas.
     */
    for (
      let index = 0;
      index <
      accounts.length;
      index +=
        MAX_CONCURRENCY
    ) {
      const batch =
        accounts.slice(
          index,
          index +
            MAX_CONCURRENCY,
        );

      const results =
        await Promise.all(
          batch.map(
            async (
              account,
            ) =>
              this.analyzeAccount(
                account.userId.toString(),
                account.addressBase58,
                hotWallet.addressBase58,
                energyPriceSun,
              ),
          ),
        );

      items.push(
        ...results,
      );
    }

    const summary = {
      checked:
        items.length,

      empty:
        items.filter(
          (item) =>
            item.status ===
            "EMPTY",
        ).length,

      readyEnergy:
        items.filter(
          (item) =>
            item.status ===
            "READY_ENERGY",
        ).length,

      readyTrx:
        items.filter(
          (item) =>
            item.status ===
            "READY_TRX",
        ).length,

      needsFunding:
        items.filter(
          (item) =>
            item.status ===
            "NEEDS_FUNDING",
        ).length,

      estimateUnavailable:
        items.filter(
          (item) =>
            item.status ===
            "ESTIMATE_UNAVAILABLE",
        ).length,

      errors:
        items.filter(
          (item) =>
            item.status ===
            "ERROR",
        ).length,
    };

    return {
      network,

      hotWallet: {
        address:
          hotWallet.addressBase58,

        activated:
          hotWallet.activated,
      },

      pagination: {
        page,

        pageSize,

        totalAccounts,

        totalPages:
          totalAccounts ===
          0
            ? 0
            : Math.ceil(
                totalAccounts /
                  pageSize,
              ),
      },

      summary,

      items,
    };
  }

  async executeSweep(
    address:
      string,
  ) {
    const network =
      this.getNetwork();

    const normalizedAddress =
      address.trim();

    if (!normalizedAddress) {
      throw new AppError(
        "La dirección TRON es obligatoria.",
        "SWEEP_ADDRESS_REQUIRED",
        400,
      );
    }

    /*
     * 1. La dirección origen debe pertenecer
     * a una cuenta de depósito registrada.
     */
    const tronAccount =
      await this.accounts
        .findByAddress(
          normalizedAddress,
        );

    if (
      !tronAccount ||
      !tronAccount._id
    ) {
      throw new AppError(
        "La dirección TRON no pertenece a una cuenta registrada.",
        "TRON_ACCOUNT_NOT_FOUND",
        404,
      );
    }

    if (
      tronAccount.network !==
      network
    ) {
      throw new AppError(
        "La dirección pertenece a otra red TRON.",
        "TRON_NETWORK_MISMATCH",
        409,
      );
    }

    /*
     * 2. Evitamos lanzar un segundo sweep mientras
     * exista uno PLANNED o BROADCASTED.
     */
    const activeSweep =
      await this.sweeps
        .hasActiveSweep(
          normalizedAddress,
        );

    if (activeSweep) {
      throw new AppError(
        "Ya existe un sweep pendiente para esta dirección.",
        "SWEEP_ALREADY_PENDING",
        409,
      );
    }

    /*
     * 3. Hot wallet de destino.
     */
    const hotWallet =
      await this.hotWallets
        .getHotWalletStatus();

    if (!hotWallet) {
      throw new AppError(
        "La hot wallet no existe.",
        "HOT_WALLET_NOT_FOUND",
        404,
      );
    }

    if (
      hotWallet.status !==
      "ACTIVE"
    ) {
      throw new AppError(
        "La hot wallet está deshabilitada.",
        "HOT_WALLET_DISABLED",
        409,
      );
    }

    if (
      hotWallet.addressBase58 ===
      normalizedAddress
    ) {
      throw new AppError(
        "La dirección origen coincide con la hot wallet.",
        "INVALID_SWEEP_SOURCE",
        400,
      );
    }

    const tronWeb =
      TronClient.createForAddress(
        normalizedAddress,
      );

    const contractAddress =
      getUsdtTrc20Contract();

    /*
     * 4. Revalidamos saldo USDT inmediatamente
     * antes de crear la transacción.
     */
    const contract =
      await tronWeb
        .contract()
        .at(
          contractAddress,
        );

    const balanceResult =
      await contract
        .balanceOf(
          normalizedAddress,
        )
        .call({
          from:
            normalizedAddress,
        });

    const amount =
      BigInt(
        balanceResult.toString(),
      );

    if (
      amount <=
      0n
    ) {
      throw new AppError(
        "La dirección no tiene USDT para barrer.",
        "SWEEP_EMPTY",
        409,
      );
    }

    /*
     * 5. Revalidamos recursos y Energy.
     */
    const resourcesRaw =
      await tronWeb.trx
        .getAccountResources(
          normalizedAddress,
        );

    const resources =
      resourcesRaw as
        TronAccountResources;

    const energyAvailable =
      Math.max(
        0,

        (
          resources.EnergyLimit ??
          0
        ) -
          (
            resources.EnergyUsed ??
            0
          ),
      );

    const estimatedEnergy =
      await this
        .estimateTransferEnergy(
          tronWeb,
          contractAddress,
          normalizedAddress,
          hotWallet.addressBase58,
          amount,
        );

    if (
      estimatedEnergy ===
      null
    ) {
      throw new AppError(
        "No se pudo estimar la Energy requerida.",
        "SWEEP_ENERGY_ESTIMATE_FAILED",
        502,
      );
    }

    const energyPriceSun =
      await this
        .getEnergyPriceSun();

    const energyDeficit =
      Math.max(
        0,

        estimatedEnergy -
          energyAvailable,
      );

    const estimatedDeficitCostSun =
      BigInt(
        energyDeficit,
      ) *
      energyPriceSun;

    const estimatedTotalEnergyCostSun =
      BigInt(
        estimatedEnergy,
      ) *
      energyPriceSun;

    const trxBalanceNumber =
      await tronWeb.trx
        .getBalance(
          normalizedAddress,
        );

    if (
      !Number.isSafeInteger(
        trxBalanceNumber,
      )
    ) {
      throw new AppError(
        "Saldo TRX fuera del rango entero seguro.",
        "INVALID_TRX_BALANCE",
        500,
      );
    }

    const trxBalance =
      BigInt(
        trxBalanceNumber,
      );

    if (
      energyDeficit >
        0 &&
      trxBalance <
        estimatedDeficitCostSun
    ) {
      throw new AppError(
        `La wallet no posee recursos suficientes. ` +
        `Requiere aproximadamente ${this.formatSunAsTrx(
          estimatedDeficitCostSun,
        )} TRX para cubrir el déficit de Energy y posee ${this.formatTrx(
          trxBalance,
        )} TRX.`,
        "SWEEP_INSUFFICIENT_RESOURCES",
        409,
      );
    }

    /*
     * feeLimit representa el máximo autorizado para
     * la ejecución del contrato. Lo calculamos sobre
     * la Energy TOTAL estimada, no solamente sobre el
     * déficit actual, y agregamos 20 % de margen.
     */
    const feeLimitWithMargin =
      estimatedTotalEnergyCostSun +
      (
        estimatedTotalEnergyCostSun /
        5n
      ) +
      1_000_000n;

    const MAX_FEE_LIMIT_SUN =
      100_000_000n;

    const feeLimitBigInt =
      feeLimitWithMargin >
        MAX_FEE_LIMIT_SUN
        ? MAX_FEE_LIMIT_SUN
        : feeLimitWithMargin;

    if (
      feeLimitBigInt >
      BigInt(
        Number.MAX_SAFE_INTEGER,
      )
    ) {
      throw new AppError(
        "El feeLimit calculado excede el rango entero seguro.",
        "SWEEP_FEE_LIMIT_INVALID",
        500,
      );
    }

    const feeLimit =
      Number(
        feeLimitBigInt,
      );

    /*
     * 6. Registramos la intención antes de firmar.
     */
    const sweep =
      await this.sweeps
        .createPlanned({
          network,

          userId:
            tronAccount.userId
              .toString(),

          tronAccountId:
            tronAccount._id
              .toString(),

          fromAddress:
            normalizedAddress,

          toAddress:
            hotWallet.addressBase58,

          amountUnits:
            amount,
        });

    if (!sweep._id) {
      throw new AppError(
        "No se pudo crear el registro del sweep.",
        "SWEEP_CREATE_FAILED",
        500,
      );
    }

    try {
      /*
       * 7. La private key solamente se descifra
       * dentro del backend y permanece en memoria.
       */
      const privateKey =
        decryptValue(
          tronAccount.encryptedPrivateKey,
        );

      if (!privateKey) {
        throw new Error(
          "No se pudo descifrar la clave privada de la wallet de depósito.",
        );
      }

      /*
       * 8. Construcción explícita de transfer().
       * Todavía no transmite nada.
       */
      const triggerResult =
        await tronWeb
          .transactionBuilder
          .triggerSmartContract(
            contractAddress,

            "transfer(address,uint256)",

            {
              feeLimit,
              callValue:
                0,
            },

            [
              {
                type:
                  "address",

                value:
                  hotWallet.addressBase58,
              },

              {
                type:
                  "uint256",

                value:
                  amount.toString(),
              },
            ],

            normalizedAddress,
          );

      if (
        triggerResult.result
          ?.result !==
        true
      ) {
        throw new Error(
          triggerResult.result
            ?.message
            ? String(
                triggerResult.result
                  .message,
              )
            : "TRON rechazó la construcción de la transacción.",
        );
      }

      if (
        !triggerResult.transaction
      ) {
        throw new Error(
          "TRON no devolvió una transacción para firmar.",
        );
      }

      /*
       * 9. Firma local usando la private key de
       * la dirección de depósito.
       */
      const signedTransaction =
        await tronWeb.trx
          .sign(
            triggerResult.transaction,
            privateKey,
          );

      /*
       * 10. Broadcast.
       */
      const broadcast =
        await tronWeb.trx
          .sendRawTransaction(
            signedTransaction,
          );

      if (
        broadcast.result !==
        true
      ) {
        throw new Error(
          broadcast.message
            ? String(
                broadcast.message,
              )
            : "La red TRON rechazó el broadcast.",
        );
      }

      const txid =
        broadcast.txid ??
        signedTransaction.txID;

      if (!txid) {
        throw new Error(
          "El broadcast fue aceptado pero no devolvió txid.",
        );
      }

      await this.sweeps
        .markBroadcasted(
          sweep._id.toString(),
          txid,
        );

      return {
        sweepId:
          sweep._id.toString(),

        network,

        status:
          "BROADCASTED" as const,

        fromAddress:
          normalizedAddress,

        toAddress:
          hotWallet.addressBase58,

        amountUnits:
          amount.toString(),

        formattedAmount:
          formatUsdtDisplay(
            amount,
          ),

        estimatedEnergy,

        energyAvailable,

        energyDeficit,

        energyPriceSun:
          energyPriceSun.toString(),

        estimatedDeficitCostSun:
          estimatedDeficitCostSun.toString(),

        estimatedDeficitCostTrx:
          this.formatSunAsTrx(
            estimatedDeficitCostSun,
          ),

        feeLimitSun:
          feeLimitBigInt.toString(),

        feeLimitTrx:
          this.formatSunAsTrx(
            feeLimitBigInt,
          ),

        txid,
      };
    } catch (error) {
      const message =
        error instanceof
        Error
          ? error.message
          : "Error desconocido durante el sweep.";

      await this.sweeps
        .markFailed(
          sweep._id.toString(),
          message,
        );

      throw new AppError(
        message,
        "SWEEP_BROADCAST_FAILED",
        502,
      );
    }
  }

  private async analyzeAccount(
    userId:
      string,

    address:
      string,

    hotWalletAddress:
      string,

    energyPriceSun:
      bigint,
  ): Promise<
    SweepDryRunItem
  > {
    try {
      /*
       * Cliente independiente por wallet.
       *
       * No modificamos el singleton global.
       */
      const tronWeb =
        TronClient.createForAddress(
          address,
        );

      const contractAddress =
        getUsdtTrc20Contract();

      const [
        trxBalanceNumber,
        resourcesRaw,
        contract,
      ] =
        await Promise.all([
          tronWeb.trx
            .getBalance(
              address,
            ),

          tronWeb.trx
            .getAccountResources(
              address,
            ),

          tronWeb
            .contract()
            .at(
              contractAddress,
            ),
        ]);

      if (
        !Number.isSafeInteger(
          trxBalanceNumber,
        )
      ) {
        throw new Error(
          "Saldo TRX fuera del rango entero seguro.",
        );
      }

      const trxBalance =
        BigInt(
          trxBalanceNumber,
        );

      const usdtResult =
        await contract
          .balanceOf(
            address,
          )
          .call({
            from:
              address,
          });

      const usdtBalance =
        BigInt(
          usdtResult.toString(),
        );

      const resources =
        resourcesRaw as
          TronAccountResources;

      const energyAvailable =
        Math.max(
          0,

          (
            resources.EnergyLimit ??
            0
          ) -
            (
              resources.EnergyUsed ??
              0
            ),
        );

      const freeBandwidth =
        Math.max(
          0,

          (
            resources.freeNetLimit ??
            0
          ) -
            (
              resources.freeNetUsed ??
              0
            ),
        );

      const stakedBandwidth =
        Math.max(
          0,

          (
            resources.NetLimit ??
            0
          ) -
            (
              resources.NetUsed ??
              0
            ),
        );

      const bandwidthAvailable =
        freeBandwidth +
        stakedBandwidth;

      /*
       * Si no tiene USDT no necesitamos simular
       * ninguna transferencia.
       */
      if (
        usdtBalance ===
        0n
      ) {
        return this.buildItem({
          userId,

          address,

          hotWalletAddress,

          usdtBalance,

          trxBalance,

          energyAvailable,

          bandwidthAvailable,

          estimatedEnergy:
            null,

          energyDeficit:
            null,

          energyPriceSun,

          estimatedEnergyCostSun:
            null,

          status:
            "EMPTY",

          reason:
            null,
        });
      }

      /*
       * Simulación de transfer().
       *
       * No firma.
       * No transmite.
       * No modifica blockchain.
       */
      const estimatedEnergy =
        await this
          .estimateTransferEnergy(
            tronWeb,
            contractAddress,
            address,
            hotWalletAddress,
            usdtBalance,
          );

      if (
        estimatedEnergy ===
        null
      ) {
        return this.buildItem({
          userId,

          address,

          hotWalletAddress,

          usdtBalance,

          trxBalance,

          energyAvailable,

          bandwidthAvailable,

          estimatedEnergy:
            null,

          energyDeficit:
            null,

          energyPriceSun,

          estimatedEnergyCostSun:
            null,

          status:
            "ESTIMATE_UNAVAILABLE",

          reason:
            "No se pudo obtener una estimación confiable de Energy.",
        });
      }

      /*
       * Cuánta Energy falta realmente después
       * de usar la Energy disponible.
       */
      const energyDeficit =
        Math.max(
          0,

          estimatedEnergy -
            energyAvailable,
        );

      /*
       * Costo máximo aproximado del déficit
       * expresado en SUN.
       *
       * Trabajamos con bigint.
       */
      const estimatedEnergyCostSun =
        BigInt(
          energyDeficit,
        ) *
        energyPriceSun;

      let status:
        SweepDryRunStatus;

      let reason:
        string | null =
        null;

      /*
       * Caso ideal:
       *
       * la dirección ya tiene toda la Energy.
       */
      if (
        energyDeficit ===
        0
      ) {
        status =
          "READY_ENERGY";

        reason =
          "La wallet posee Energy suficiente para ejecutar el sweep.";
      }

      /*
       * No tiene toda la Energy,
       * pero tiene suficiente TRX para cubrir
       * aproximadamente el déficit.
       */
      else if (
        trxBalance >=
        estimatedEnergyCostSun
      ) {
        status =
          "READY_TRX";

        reason =
          `Faltan ${energyDeficit} Energy. ` +
          `Costo estimado ${this.formatSunAsTrx(
            estimatedEnergyCostSun,
          )} TRX. ` +
          `Saldo disponible ${this.formatTrx(
            trxBalance,
          )} TRX.`;
      }

      /*
       * No tiene Energy y tampoco alcanza
       * el saldo TRX estimado.
       */
      else {
        const missingSun =
          estimatedEnergyCostSun -
          trxBalance;

        status =
          "NEEDS_FUNDING";

        reason =
          `Faltan ${energyDeficit} Energy. ` +
          `Costo estimado ${this.formatSunAsTrx(
            estimatedEnergyCostSun,
          )} TRX. ` +
          `Saldo disponible ${this.formatTrx(
            trxBalance,
          )} TRX. ` +
          `Déficit aproximado ${this.formatSunAsTrx(
            missingSun,
          )} TRX.`;
      }

      return this.buildItem({
        userId,

        address,

        hotWalletAddress,

        usdtBalance,

        trxBalance,

        energyAvailable,

        bandwidthAvailable,

        estimatedEnergy,

        energyDeficit,

        energyPriceSun,

        estimatedEnergyCostSun,

        status,

        reason,
      });
    } catch (error) {
      console.error(
        `[SWEEP DRY RUN] ${address}`,
        error,
      );

      return {
        userId,

        address,

        hotWallet:
          hotWalletAddress,

        usdt: {
          balanceUnits:
            "0",

          formattedBalance:
            "0",
        },

        trx: {
          balanceSun:
            "0",

          formattedBalance:
            "0",
        },

        resources: {
          energyAvailable:
            "0",

          estimatedEnergy:
            null,

          energyDeficit:
            null,

          energyPriceSun:
            null,

          estimatedEnergyCostSun:
            null,

          estimatedEnergyCostTrx:
            null,

          bandwidthAvailable:
            "0",
        },

        status:
          "ERROR",

        reason:
          error instanceof
          Error
            ? error.message
            : "Error desconocido.",
      };
    }
  }

  private async estimateTransferEnergy(
    tronWeb:
      ReturnType<
        typeof TronClient.create
      >,

    contractAddress:
      string,

    ownerAddress:
      string,

    destinationAddress:
      string,

    amount:
      bigint,
  ): Promise<number | null> {
    try {
      const response =
        await tronWeb
          .transactionBuilder
          .triggerConstantContract(
            contractAddress,

            "transfer(address,uint256)",

            {},

            [
              {
                type:
                  "address",

                value:
                  destinationAddress,
              },

              {
                type:
                  "uint256",

                value:
                  amount.toString(),
              },
            ],

            ownerAddress,
          ) as
          ConstantContractResult;

      if (
        response.result
          ?.result !==
        true
      ) {
        return null;
      }

      const energy =
        response.energy_used_total ??
        response.energy_used;

      if (
        typeof energy !==
          "number" ||
        !Number.isFinite(
          energy,
        ) ||
        energy <=
          0
      ) {
        return null;
      }

      return Math.ceil(
        energy,
      );
    } catch (error) {
      console.warn(
        `[SWEEP ENERGY ESTIMATE] ${ownerAddress}`,
        error,
      );

      return null;
    }
  }

  /*
   * Obtiene dinámicamente getEnergyFee.
   *
   * No dejamos hardcodeado el precio.
   */
  private async getEnergyPriceSun():
    Promise<bigint> {
    const tronWeb =
      TronClient.create();

    const parameters =
      await tronWeb.trx
        .getChainParameters() as
        TronChainParameter[];

    const energyFee =
      parameters.find(
        (
          parameter,
        ) =>
          parameter.key ===
          "getEnergyFee",
      );

    if (
      energyFee?.value ===
      undefined ||
      energyFee.value ===
      null
    ) {
      throw new AppError(
        "No se pudo obtener getEnergyFee de la red TRON.",
        "TRON_ENERGY_FEE_UNAVAILABLE",
        502,
      );
    }

    let value:
      bigint;

    try {
      value =
        BigInt(
          energyFee.value,
        );
    } catch {
      throw new AppError(
        "getEnergyFee devolvió un valor inválido.",
        "TRON_ENERGY_FEE_INVALID",
        502,
      );
    }

    if (
      value <=
      0n
    ) {
      throw new AppError(
        "getEnergyFee devolvió un valor inválido.",
        "TRON_ENERGY_FEE_INVALID",
        502,
      );
    }

    return value;
  }

  private buildItem(
    input: {
      userId:
        string;

      address:
        string;

      hotWalletAddress:
        string;

      usdtBalance:
        bigint;

      trxBalance:
        bigint;

      energyAvailable:
        number;

      bandwidthAvailable:
        number;

      estimatedEnergy:
        number | null;

      energyDeficit:
        number | null;

      energyPriceSun:
        bigint;

      estimatedEnergyCostSun:
        bigint | null;

      status:
        SweepDryRunStatus;

      reason:
        string | null;
    },
  ): SweepDryRunItem {
    return {
      userId:
        input.userId,

      address:
        input.address,

      hotWallet:
        input.hotWalletAddress,

      usdt: {
        balanceUnits:
          input.usdtBalance
            .toString(),

        formattedBalance:
          formatUsdtDisplay(
            input.usdtBalance,
          ),
      },

      trx: {
        balanceSun:
          input.trxBalance
            .toString(),

        formattedBalance:
          this.formatTrx(
            input.trxBalance,
          ),
      },

      resources: {
        energyAvailable:
          input.energyAvailable
            .toString(),

        estimatedEnergy:
          input.estimatedEnergy
            ?.toString() ??
          null,

        energyDeficit:
          input.energyDeficit
            ?.toString() ??
          null,

        energyPriceSun:
          input.energyPriceSun
            .toString(),

        estimatedEnergyCostSun:
          input.estimatedEnergyCostSun
            ?.toString() ??
          null,

        estimatedEnergyCostTrx:
          input.estimatedEnergyCostSun !==
            null
            ? this.formatSunAsTrx(
                input.estimatedEnergyCostSun,
              )
            : null,

        bandwidthAvailable:
          input.bandwidthAvailable
            .toString(),
      },

      status:
        input.status,

      reason:
        input.reason,
    };
  }

  private formatSunAsTrx(
    amountSun:
      bigint,
  ): string {
    return this.formatTrx(
      amountSun,
    );
  }

  private formatTrx(
    amountSun:
      bigint,
  ): string {
    const scale =
      1_000_000n;

    const negative =
      amountSun <
      0n;

    const absolute =
      negative
        ? -amountSun
        : amountSun;

    const integer =
      absolute /
      scale;

    const decimals =
      absolute %
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

    const result =
      decimalText
        ? `${formattedInteger},${decimalText}`
        : formattedInteger;

    return negative
      ? `-${result}`
      : result;
  }
}