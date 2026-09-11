import {
  TronWeb,
} from "tronweb";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  DepositService,
} from "@/modules/deposits/deposit.service";

import type {
  TronContractEventsResponse,
  TronContractTransferEvent,
} from "@/modules/deposits/deposit.types";

import {
  getUsdtTrc20Contract,
} from "./usdt.contract";

import {
  TronClient,
} from "./tron.client";

import {
  TronScannerStateRepository,
} from "./tron-scanner-state.repository";

import type {
  TronNetwork,
} from "./tron.types";

const DEFAULT_MAX_BLOCKS_PER_CYCLE =
  20;

export class TronDepositScannerService {
  private readonly state =
    new TronScannerStateRepository();

  private readonly deposits =
    new DepositService();

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

  private getMaxBlocksPerCycle():
    number {
    const configured =
      Number.parseInt(
        process.env
          .TRON_SCANNER_MAX_BLOCKS_PER_CYCLE ??
          "",
        10,
      );

    if (
      Number.isFinite(
        configured,
      ) &&
      configured > 0 &&
      configured <= 200
    ) {
      return configured;
    }

    return DEFAULT_MAX_BLOCKS_PER_CYCLE;
  }

  async scanOnce() {
    const network =
      this.getNetwork();

    const solidBlock =
      await this.getLatestSolidifiedBlock();

    let lastProcessed =
      await this.state
        .getLastProcessedBlock(
          network,
        );

    /*
     * Primera ejecución.
     *
     * Si configuramos manualmente TRON_SCANNER_START_BLOCK,
     * comenzamos desde allí.
     *
     * Si no, arrancamos desde el bloque solidificado actual.
     * Así no intentamos recorrer toda la historia de Nile/Mainnet.
     */
    if (
      lastProcessed ===
      null
    ) {
      const configuredStart =
        Number.parseInt(
          process.env
            .TRON_SCANNER_START_BLOCK ??
            "",
          10,
        );

      if (
        Number.isFinite(
          configuredStart,
        ) &&
        configuredStart >= 0
      ) {
        lastProcessed =
          configuredStart -
          1;
      } else {
        lastProcessed =
          solidBlock;
      }

      await this.state.initialize(
        network,
        lastProcessed,
      );

      return {
        initialized:
          true,

        network,

        latestSolidifiedBlock:
          solidBlock,

        lastProcessedBlock:
          lastProcessed,

        blocksProcessed:
          0,

        eventsFound:
          0,

        depositsCredited:
          0,
      };
    }

    if (
      lastProcessed >=
      solidBlock
    ) {
      return {
        initialized:
          false,

        network,

        latestSolidifiedBlock:
          solidBlock,

        lastProcessedBlock:
          lastProcessed,

        blocksProcessed:
          0,

        eventsFound:
          0,

        depositsCredited:
          0,
      };
    }

    const lockAcquired =
      await this.state
        .acquireLock(
          network,
        );

    if (!lockAcquired) {
      return {
        initialized:
          false,

        skippedBecauseLocked:
          true,

        network,

        latestSolidifiedBlock:
          solidBlock,

        lastProcessedBlock:
          lastProcessed,

        blocksProcessed:
          0,

        eventsFound:
          0,

        depositsCredited:
          0,
      };
    }

    let blocksProcessed =
      0;

    let eventsFound =
      0;

    let depositsCredited =
      0;

    try {
      const maxBlocks =
        this.getMaxBlocksPerCycle();

      const targetBlock =
        Math.min(
          solidBlock,

          lastProcessed +
            maxBlocks,
        );

      for (
        let block =
          lastProcessed +
          1;
        block <=
          targetBlock;
        block++
      ) {
        const events =
          await this.getUsdtTransferEventsForBlock(
            block,
          );

        eventsFound +=
          events.length;

        for (
          const event of
          events
        ) {
          const result =
            await this.deposits
              .processConfirmedTronEvent(
                event,
                network,
              );

          if (
            result.credited
          ) {
            depositsCredited++;
          }
        }

        /*
         * MUY IMPORTANTE:
         * avanzamos el cursor solamente DESPUÉS
         * de terminar correctamente el bloque.
         */
        await this.state
          .updateLastProcessedBlock(
            network,
            block,
          );

        blocksProcessed++;
      }

      return {
        initialized:
          false,

        skippedBecauseLocked:
          false,

        network,

        latestSolidifiedBlock:
          solidBlock,

        lastProcessedBlock:
          lastProcessed +
          blocksProcessed,

        blocksProcessed,

        eventsFound,

        depositsCredited,
      };
    } finally {
      await this.state
        .releaseLock(
          network,
        );
    }
  }

  private async getLatestSolidifiedBlock():
    Promise<number> {
    const tronWeb =
      TronClient.getInstance();

    const response =
      await tronWeb.solidityNode
        .request<{
          block_header?: {
            raw_data?: {
              number?: number;
            };
          };
        }>(
          "walletsolidity/getnowblock",
          {},
          "post",
        );

    const blockNumber =
      response.block_header
        ?.raw_data
        ?.number;

    if (
      typeof blockNumber !==
      "number"
    ) {
      throw new AppError(
        "No se pudo determinar el último bloque solidificado de TRON.",
        "TRON_SOLID_BLOCK_ERROR",
        502,
      );
    }

    return blockNumber;
  }

  private async getUsdtTransferEventsForBlock(
    blockNumber:
      number,
  ): Promise<
    TronContractTransferEvent[]
  > {
    const fullHost =
      process.env
        .TRON_FULL_HOST
        ?.trim();

    if (!fullHost) {
      throw new AppError(
        "TRON_FULL_HOST no está configurado.",
        "TRON_CONFIGURATION_ERROR",
        500,
      );
    }

    const contract =
      getUsdtTrc20Contract();

    const url =
      new URL(
        `/v1/contracts/${contract}/events`,
        fullHost,
      );

    url.searchParams.set(
      "event_name",
      "Transfer",
    );

    url.searchParams.set(
      "block_number",
      blockNumber.toString(),
    );

    url.searchParams.set(
      "only_confirmed",
      "true",
    );

    url.searchParams.set(
      "limit",
      "200",
    );

    const apiKey =
      process.env
        .TRON_API_KEY
        ?.trim();

    const response =
      await fetch(
        url,
        {
          headers:
            apiKey
              ? {
                  "TRON-PRO-API-KEY":
                    apiKey,
                }
              : undefined,

          cache:
            "no-store",
        },
      );

    if (!response.ok) {
      const body =
        await response.text();

      console.error(
        "[TRON SCANNER EVENTS]",
        response.status,
        body,
      );

      throw new AppError(
        `No se pudieron consultar eventos TRON del bloque ${blockNumber}.`,
        "TRON_EVENTS_ERROR",
        502,
      );
    }

    const data =
      (await response.json()) as
        TronContractEventsResponse;

    if (
      data.success !==
      true
    ) {
      throw new AppError(
        `TronGrid devolvió una respuesta inválida para el bloque ${blockNumber}.`,
        "TRON_EVENTS_ERROR",
        502,
      );
    }

    return (
      data.data ??
      []
    ).filter(
      (event) =>
        event.event_name ===
          "Transfer" &&
        event.contract_address ===
          contract,
    );
  }

  static eventAddressToBase58(
    value:
      string,
  ): string {
    const normalized =
      value
        .trim()
        .toLowerCase()
        .replace(
          /^0x/,
          "",
        );

    if (
      !/^[0-9a-f]{40}$/.test(
        normalized,
      )
    ) {
      throw new Error(
        `Dirección TRON de evento inválida: ${value}`,
      );
    }

    return TronWeb.address.fromHex(
      `41${normalized}`,
    );
  }
}