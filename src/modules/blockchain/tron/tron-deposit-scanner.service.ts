// import {
//   AppError,
// } from "@/lib/errors/app-error";

// import {
//   DepositService,
// } from "@/modules/deposits/deposit.service";

// import type {
//   TronContractEventsResponse,
//   TronContractTransferEvent,
// } from "@/modules/deposits/deposit.types";

// import {
//   getUsdtTrc20Contract,
// } from "./usdt.contract";

// import {
//   TronClient,
// } from "./tron.client";

// import {
//   TronScannerStateRepository,
// } from "./tron-scanner-state.repository";

// import type {
//   TronNetwork,
// } from "./tron.types";

// const DEFAULT_MAX_BLOCKS_PER_CYCLE =
//   20;

// const MAX_EVENT_PAGES_PER_BLOCK =
//   100;

// export interface TronDepositScanResult {
//   initialized:
//     boolean;

//   skippedBecauseLocked?:
//     boolean;

//   network:
//     TronNetwork;

//   latestSolidifiedBlock:
//     number;

//   lastProcessedBlock:
//     number;

//   blocksProcessed:
//     number;

//   eventsFound:
//     number;

//   /*
//    * Eventos Transfer que correspondían
//    * a wallets registradas en la plataforma.
//    *
//    * Incluye eventos ya indexados.
//    */
//   eventsObserved:
//     number;

//   /*
//    * Eventos nuevos insertados en MongoDB.
//    */
//   eventsIndexed:
//     number;

//   /*
//    * Eventos que ya estaban indexados.
//    */
//   eventsAlreadyIndexed:
//     number;

//   /*
//    * Eventos descartados porque no pertenecen
//    * a una wallet registrada o no superaron
//    * alguna validación.
//    */
//   eventsIgnored:
//     number;

// }

// export class TronDepositScannerService {
//   private readonly state =
//     new TronScannerStateRepository();

//   private readonly deposits =
//     new DepositService();

//   /*
//    * ==========================================================
//    * RED
//    * ==========================================================
//    */

//   private getNetwork():
//     TronNetwork {
//     return process.env
//       .TRON_NETWORK
//       ?.trim()
//       .toLowerCase() ===
//       "mainnet"
//       ? "MAINNET"
//       : "NILE";
//   }

//   /*
//    * ==========================================================
//    * CANTIDAD MÁXIMA DE BLOQUES POR CICLO
//    * ==========================================================
//    */

//   private getMaxBlocksPerCycle():
//     number {
//     const configured =
//       Number.parseInt(
//         process.env
//           .TRON_SCANNER_MAX_BLOCKS_PER_CYCLE ??
//           "",
//         10,
//       );

//     if (
//       Number.isFinite(
//         configured,
//       ) &&
//       configured > 0 &&
//       configured <= 200
//     ) {
//       return configured;
//     }

//     return DEFAULT_MAX_BLOCKS_PER_CYCLE;
//   }

//   /*
//    * ==========================================================
//    * SCAN
//    * ==========================================================
//    */

//   async scanOnce():
//     Promise<
//       TronDepositScanResult
//     > {
//     const network =
//       this.getNetwork();

//     /*
//      * Solamente trabajamos hasta bloques
//      * solidificados.
//      */
//     const solidBlock =
//       await this
//         .getLatestSolidifiedBlock();

//     let lastProcessed =
//       await this.state
//         .getLastProcessedBlock(
//           network,
//         );

//     /*
//      * ========================================================
//      * PRIMERA EJECUCIÓN
//      * ========================================================
//      *
//      * Si TRON_SCANNER_START_BLOCK está configurado:
//      *
//      * comenzamos desde ese bloque.
//      *
//      * Si no:
//      *
//      * comenzamos desde el bloque solidificado actual,
//      * evitando recorrer toda la historia de TRON.
//      */

//     if (
//       lastProcessed ===
//       null
//     ) {
//       const configuredStart =
//         Number.parseInt(
//           process.env
//             .TRON_SCANNER_START_BLOCK ??
//             "",
//           10,
//         );

//       if (
//         Number.isFinite(
//           configuredStart,
//         ) &&
//         configuredStart >= 0
//       ) {
//         lastProcessed =
//           configuredStart -
//           1;
//       } else {
//         lastProcessed =
//           solidBlock;
//       }

//       await this.state
//         .initialize(
//           network,
//           lastProcessed,
//         );

//       return {
//         initialized:
//           true,

//         network,

//         latestSolidifiedBlock:
//           solidBlock,

//         lastProcessedBlock:
//           lastProcessed,

//         blocksProcessed:
//           0,

//         eventsFound:
//           0,

//         eventsObserved:
//           0,

//         eventsIndexed:
//           0,

//         eventsAlreadyIndexed:
//           0,

//         eventsIgnored:
//           0,
//       };
//     }

//     /*
//      * ========================================================
//      * YA ESTAMOS AL DÍA
//      * ========================================================
//      */

//     if (
//       lastProcessed >=
//       solidBlock
//     ) {
//       return {
//         initialized:
//           false,

//         network,

//         latestSolidifiedBlock:
//           solidBlock,

//         lastProcessedBlock:
//           lastProcessed,

//         blocksProcessed:
//           0,

//         eventsFound:
//           0,

//         eventsObserved:
//           0,

//         eventsIndexed:
//           0,

//         eventsAlreadyIndexed:
//           0,

//         eventsIgnored:
//           0,
//       };
//     }

//     /*
//      * ========================================================
//      * LOCK
//      * ========================================================
//      *
//      * Evitamos dos scanners procesando simultáneamente
//      * los mismos bloques.
//      */

//     const lockAcquired =
//       await this.state
//         .acquireLock(
//           network,
//         );

//     if (
//       !lockAcquired
//     ) {
//       return {
//         initialized:
//           false,

//         skippedBecauseLocked:
//           true,

//         network,

//         latestSolidifiedBlock:
//           solidBlock,

//         lastProcessedBlock:
//           lastProcessed,

//         blocksProcessed:
//           0,

//         eventsFound:
//           0,

//         eventsObserved:
//           0,

//         eventsIndexed:
//           0,

//         eventsAlreadyIndexed:
//           0,

//         eventsIgnored:
//           0,
//       };
//     }

//     /*
//      * ========================================================
//      * CONTADORES
//      * ========================================================
//      */

//     let blocksProcessed =
//       0;

//     let eventsFound =
//       0;

//     let eventsObserved =
//       0;

//     let eventsIndexed =
//       0;

//     let eventsAlreadyIndexed =
//       0;

//     let eventsIgnored =
//       0;

//     try {
//       const maxBlocks =
//         this.getMaxBlocksPerCycle();

//       const targetBlock =
//         Math.min(
//           solidBlock,

//           lastProcessed +
//             maxBlocks,
//         );

//       /*
//        * ======================================================
//        * BLOQUES
//        * ======================================================
//        */

//       for (
//         let block =
//           lastProcessed +
//           1;

//         block <=
//           targetBlock;

//         block++
//       ) {
//         const events =
//           await this
//             .getUsdtTransferEventsForBlock(
//               block,
//             );

//         eventsFound +=
//           events.length;

//         /*
//          * ====================================================
//          * EVENTOS DEL BLOQUE
//          * ====================================================
//          */

//         for (
//           const event of
//           events
//         ) {
//           const result =
//             await this.deposits
//               .processConfirmedTronEvent(
//                 event,
//                 network,
//               );

//           /*
//            * Evento relacionado con una wallet registrada.
//            */
//           if (
//             result.observed
//           ) {
//             eventsObserved++;
//           }

//           /*
//            * Evento nuevo realmente insertado.
//            *
//            * processConfirmedTronEvent devuelve reason=null
//            * cuando acaba de indexarlo.
//            */
//           if (
//             result.observed &&
//             result.reason ===
//               null
//           ) {
//             eventsIndexed++;
//           }

//           /*
//            * Ya existía en MongoDB.
//            */
//           if (
//             result.reason ===
//             "ALREADY_INDEXED"
//           ) {
//             eventsAlreadyIndexed++;
//           }

//           /*
//            * Evento real de TRON pero fuera del universo
//            * que necesitamos indexar.
//            */
//           if (
//             result.ignored
//           ) {
//             eventsIgnored++;
//           }
//         }

//         /*
//          * ====================================================
//          * CURSOR
//          * ====================================================
//          *
//          * CRÍTICO:
//          *
//          * Solamente avanzamos el cursor DESPUÉS de haber
//          * terminado correctamente TODOS los eventos del bloque.
//          *
//          * Si cualquier consulta o escritura lanza una excepción,
//          * este código no se ejecuta y el próximo ciclo vuelve
//          * a intentar el mismo bloque.
//          *
//          * La idempotencia del DepositRepository evita duplicados.
//          */

//         await this.state
//           .updateLastProcessedBlock(
//             network,
//             block,
//           );

//         blocksProcessed++;
//       }

//       /*
//        * ======================================================
//        * RESULTADO
//        * ======================================================
//        */

//       return {
//         initialized:
//           false,

//         skippedBecauseLocked:
//           false,

//         network,

//         latestSolidifiedBlock:
//           solidBlock,

//         lastProcessedBlock:
//           lastProcessed +
//           blocksProcessed,

//         blocksProcessed,

//         eventsFound,

//         eventsObserved,

//         eventsIndexed,

//         eventsAlreadyIndexed,

//         eventsIgnored,

//       };
//     } finally {
//       /*
//        * El lock siempre debe liberarse,
//        * incluso cuando falle un bloque.
//        */

//       await this.state
//         .releaseLock(
//           network,
//         );
//     }
//   }

//   /*
//    * ==========================================================
//    * ÚLTIMO BLOQUE SOLIDIFICADO
//    * ==========================================================
//    */

//   private async getLatestSolidifiedBlock():
//     Promise<number> {
//     const tronWeb =
//       TronClient.getInstance();

//     const response =
//       await tronWeb
//         .solidityNode
//         .request<{
//           block_header?: {
//             raw_data?: {
//               number?:
//                 number;
//             };
//           };
//         }>(
//           "walletsolidity/getnowblock",
//           {},
//           "post",
//         );

//     const blockNumber =
//       response
//         .block_header
//         ?.raw_data
//         ?.number;

//     if (
//       typeof blockNumber !==
//         "number" ||
//       !Number.isSafeInteger(
//         blockNumber,
//       ) ||
//       blockNumber <
//         0
//     ) {
//       throw new AppError(
//         "No se pudo determinar el último bloque solidificado de TRON.",
//         "TRON_SOLID_BLOCK_ERROR",
//         502,
//       );
//     }

//     return blockNumber;
//   }

//   /*
//    * ==========================================================
//    * EVENTOS USDT DE UN BLOQUE
//    * ==========================================================
//    *
//    * IMPORTANTE:
//    *
//    * TronGrid pagina los eventos.
//    *
//    * El scanner anterior pedía limit=200 pero no seguía
//    * meta.fingerprint, por lo que un bloque con más de
//    * 200 eventos podía quedar incompleto.
//    *
//    * Ahora recorremos todas las páginas disponibles.
//    */

//   private async getUsdtTransferEventsForBlock(
//     blockNumber:
//       number,
//   ): Promise<
//     TronContractTransferEvent[]
//   > {
//     const fullHost =
//       process.env
//         .TRON_FULL_HOST
//         ?.trim();

//     if (
//       !fullHost
//     ) {
//       throw new AppError(
//         "TRON_FULL_HOST no está configurado.",
//         "TRON_CONFIGURATION_ERROR",
//         500,
//       );
//     }

//     const contract =
//       getUsdtTrc20Contract();

//     const events:
//       TronContractTransferEvent[] =
//       [];

//     let fingerprint:
//       string |
//       null =
//       null;

//     let page =
//       0;

//     /*
//      * Protección adicional para evitar un loop infinito
//      * si TronGrid devolviera fingerprints anómalos.
//      */
//     const seenFingerprints =
//       new Set<string>();

//     do {
//       page++;

//       if (
//         page >
//         MAX_EVENT_PAGES_PER_BLOCK
//       ) {
//         throw new AppError(
//           `Se superó el máximo de páginas de eventos permitido para el bloque ${blockNumber}.`,
//           "TRON_EVENTS_PAGINATION_LIMIT",
//           502,
//         );
//       }

//       const url =
//         new URL(
//           `/v1/contracts/${contract}/events`,
//           fullHost,
//         );

//       url.searchParams.set(
//         "event_name",
//         "Transfer",
//       );

//       url.searchParams.set(
//         "block_number",
//         blockNumber
//           .toString(),
//       );

//       url.searchParams.set(
//         "only_confirmed",
//         "true",
//       );

//       url.searchParams.set(
//         "limit",
//         "200",
//       );

//       /*
//        * TronGrid utiliza fingerprint para continuar
//        * desde la página anterior.
//        */
//       if (
//         fingerprint
//       ) {
//         url.searchParams.set(
//           "fingerprint",
//           fingerprint,
//         );
//       }

//       const apiKey =
//         process.env
//           .TRON_API_KEY
//           ?.trim();

//       const response =
//         await fetch(
//           url,
//           {
//             headers:
//               apiKey
//                 ? {
//                     "TRON-PRO-API-KEY":
//                       apiKey,
//                   }
//                 : undefined,

//             cache:
//               "no-store",
//           },
//         );

//       if (
//         !response.ok
//       ) {
//         const body =
//           await response
//             .text();

//         console.error(
//           "[TRON SCANNER EVENTS]",
//           {
//             blockNumber,
//             page,
//             status:
//               response.status,
//             body,
//           },
//         );

//         throw new AppError(
//           `No se pudieron consultar eventos TRON del bloque ${blockNumber}.`,
//           "TRON_EVENTS_ERROR",
//           502,
//         );
//       }

//       let data:
//         TronContractEventsResponse;

//       try {
//         data =
//           (
//             await response
//               .json()
//           ) as
//             TronContractEventsResponse;
//       } catch {
//         throw new AppError(
//           `TronGrid devolvió una respuesta que no pudo interpretarse para el bloque ${blockNumber}.`,
//           "TRON_EVENTS_ERROR",
//           502,
//         );
//       }

//       if (
//         data.success !==
//         true
//       ) {
//         throw new AppError(
//           `TronGrid devolvió una respuesta inválida para el bloque ${blockNumber}.`,
//           "TRON_EVENTS_ERROR",
//           502,
//         );
//       }

//       const pageEvents =
//         Array.isArray(
//           data.data,
//         )
//           ? data.data
//           : [];

//       /*
//        * Aunque el endpoint ya está filtrado por contrato
//        * y nombre del evento, volvemos a validar defensivamente.
//        */
//       for (
//         const event of
//         pageEvents
//       ) {
//         if (
//           event.event_name !==
//           "Transfer"
//         ) {
//           continue;
//         }

//         if (
//           event
//             .contract_address !==
//           contract
//         ) {
//           continue;
//         }

//         /*
//          * Defendemos también que TronGrid realmente
//          * esté respetando block_number.
//          */
//         if (
//           event.block_number !==
//           blockNumber
//         ) {
//           continue;
//         }

//         events.push(
//           event,
//         );
//       }

//       const nextFingerprint =
//         data.meta
//           ?.fingerprint
//           ?.trim() ||
//         null;

//       /*
//        * No hay próxima página.
//        */
//       if (
//         !nextFingerprint
//       ) {
//         fingerprint =
//           null;

//         break;
//       }

//       /*
//        * Si TronGrid devuelve el mismo fingerprint dos veces
//        * o uno previamente visitado, detenemos con error.
//        *
//        * No avanzamos el cursor del bloque porque la excepción
//        * sube hasta scanOnce().
//        */
//       if (
//         seenFingerprints.has(
//           nextFingerprint,
//         )
//       ) {
//         throw new AppError(
//           `TronGrid devolvió un fingerprint repetido para el bloque ${blockNumber}.`,
//           "TRON_EVENTS_PAGINATION_ERROR",
//           502,
//         );
//       }

//       seenFingerprints.add(
//         nextFingerprint,
//       );

//       fingerprint =
//         nextFingerprint;
//     } while (
//       fingerprint
//     );

//     return events;
//   }
// }

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
  getConfiguredTronNetwork,
  getTronConfig,
  getTronGridHeaders,
} from "./tron.config";

import {
  getUsdtTrc20ContractForNetwork,
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

/*
 * ============================================================
 * CONFIGURACIÓN DEL SCANNER
 * ============================================================
 */

const DEFAULT_MAX_BLOCKS_PER_CYCLE =
  20;

const MAX_EVENT_PAGES_PER_BLOCK =
  100;

const SCANNER_LOCK_LEASE_MILLISECONDS =
  5 * 60 * 1_000;

/*
 * ============================================================
 * RESULTADO
 * ============================================================
 */

export interface TronDepositScanResult {
  initialized:
    boolean;

  skippedBecauseLocked?:
    boolean;

  network:
    TronNetwork;

  latestSolidifiedBlock:
    number;

  lastProcessedBlock:
    number;

  blocksProcessed:
    number;

  eventsFound:
    number;

  /*
   * Eventos Transfer relacionados con wallets
   * registradas en nuestra plataforma.
   */
  eventsObserved:
    number;

  /*
   * Eventos nuevos insertados.
   */
  eventsIndexed:
    number;

  /*
   * Eventos que ya estaban indexados.
   */
  eventsAlreadyIndexed:
    number;

  /*
   * Eventos descartados.
   */
  eventsIgnored:
    number;
}

/*
 * ============================================================
 * SCANNER
 * ============================================================
 */

export class TronDepositScannerService {
  private readonly state =
    new TronScannerStateRepository();

  private readonly deposits =
    new DepositService();

  /*
   * ==========================================================
   * RED
   * ==========================================================
   *
   * La red ya NO se determina aquí.
   *
   * La única fuente de verdad es:
   *
   * tron.config.ts
   * ==========================================================
   */

  private getNetwork():
    TronNetwork {
    return getConfiguredTronNetwork();
  }

  /*
   * ==========================================================
   * CANTIDAD MÁXIMA DE BLOQUES POR CICLO
   * ==========================================================
   */

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
      Number.isSafeInteger(
        configured,
      ) &&
      configured > 0 &&
      configured <= 200
    ) {
      return configured;
    }

    return DEFAULT_MAX_BLOCKS_PER_CYCLE;
  }

  /*
   * ==========================================================
   * SCAN
   * ==========================================================
   */

  async scanOnce():
    Promise<TronDepositScanResult> {
    const network =
      this.getNetwork();

    /*
     * Trabajamos únicamente hasta el último
     * bloque solidificado.
     */
    const solidBlock =
      await this
        .getLatestSolidifiedBlock(
          network,
        );

    let lastProcessed =
      await this.state
        .getLastProcessedBlock(
          network,
        );

    /*
     * ========================================================
     * PRIMERA EJECUCIÓN
     * ========================================================
     *
     * Si existe TRON_SCANNER_START_BLOCK:
     *
     * comienza desde ese bloque.
     *
     * Si no:
     *
     * inicializa en el bloque solidificado actual.
     * ========================================================
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
        Number.isSafeInteger(
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

      await this.state
        .initialize(
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

        eventsObserved:
          0,

        eventsIndexed:
          0,

        eventsAlreadyIndexed:
          0,

        eventsIgnored:
          0,
      };
    }

    /*
     * ========================================================
     * YA ESTAMOS AL DÍA
     * ========================================================
     */

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

        eventsObserved:
          0,

        eventsIndexed:
          0,

        eventsAlreadyIndexed:
          0,

        eventsIgnored:
          0,
      };
    }

    /*
     * ========================================================
     * LOCK
     * ========================================================
     */

    const lockAcquired =
      await this.state
        .acquireLock(
          network,
          SCANNER_LOCK_LEASE_MILLISECONDS,
        );

    if (
      !lockAcquired
    ) {
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

        eventsObserved:
          0,

        eventsIndexed:
          0,

        eventsAlreadyIndexed:
          0,

        eventsIgnored:
          0,
      };
    }

    /*
     * ========================================================
     * CONTADORES
     * ========================================================
     */

    let blocksProcessed =
      0;

    let eventsFound =
      0;

    let eventsObserved =
      0;

    let eventsIndexed =
      0;

    let eventsAlreadyIndexed =
      0;

    let eventsIgnored =
      0;

    try {
      /*
       * El cursor se vuelve a leer después de adquirir el
       * lock. Otro worker pudo haber avanzado entre la lectura
       * inicial y este punto.
       */
      const lockedLastProcessed =
        await this.state
          .getLastProcessedBlock(
            network,
          );

      if (
        lockedLastProcessed ===
        null
      ) {
        throw new AppError(
          "El estado del scanner TRON desapareció después de adquirir el lock.",
          "TRON_SCANNER_STATE_ERROR",
          500,
        );
      }

      lastProcessed =
        lockedLastProcessed;

      if (
        lastProcessed >=
        solidBlock
      ) {
        return {
          initialized:
            false,

          skippedBecauseLocked:
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

          eventsObserved:
            0,

          eventsIndexed:
            0,

          eventsAlreadyIndexed:
            0,

          eventsIgnored:
            0,
        };
      }

      const maxBlocks =
        this.getMaxBlocksPerCycle();

      const targetBlock =
        Math.min(
          solidBlock,

          lastProcessed +
            maxBlocks,
        );

      /*
       * ======================================================
       * RECORRER BLOQUES
       * ======================================================
       */

      for (
        let block =
          lastProcessed +
          1;

        block <=
        targetBlock;

        block++
      ) {
        await this.renewLock(
          network,
        );

        const events =
          await this
            .getUsdtTransferEventsForBlock(
              network,
              block,
            );

        eventsFound +=
          events.length;

        /*
         * ====================================================
         * EVENTOS
         * ====================================================
         */

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
            result.observed
          ) {
            eventsObserved++;
          }

          /*
           * reason === null significa que acaba de
           * indexarse por primera vez.
           */
          if (
            result.observed &&
            result.reason ===
              null
          ) {
            eventsIndexed++;
          }

          if (
            result.reason ===
            "ALREADY_INDEXED"
          ) {
            eventsAlreadyIndexed++;
          }

          if (
            result.ignored
          ) {
            eventsIgnored++;
          }
        }

        /*
         * ====================================================
         * CURSOR
         * ====================================================
         *
         * Solamente avanzamos DESPUÉS de haber procesado
         * correctamente todo el bloque.
         *
         * Si ocurre una excepción antes de este punto,
         * el bloque será reintentado en el próximo ciclo.
         * ====================================================
         */

        await this.renewLock(
          network,
        );

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

        eventsObserved,

        eventsIndexed,

        eventsAlreadyIndexed,

        eventsIgnored,
      };
    } finally {
      /*
       * El lock siempre debe liberarse,
       * incluso si falla el procesamiento.
       */

      await this.state
        .releaseLock(
          network,
        );
    }
  }

  /*
   * ==========================================================
   * RENOVAR LOCK
   * ==========================================================
   *
   * Un ciclo puede tardar más que el lease original cuando
   * TronGrid responde lento o un bloque contiene muchos
   * eventos. Renovamos antes y después de cada bloque.
   */

  private async renewLock(
    network:
      TronNetwork,
  ): Promise<void> {
    const renewed =
      await this.state
        .acquireLock(
          network,
          SCANNER_LOCK_LEASE_MILLISECONDS,
        );

    if (
      !renewed
    ) {
      throw new AppError(
        "El scanner TRON perdió el lock durante el procesamiento.",
        "TRON_SCANNER_LOCK_LOST",
        409,
      );
    }
  }

  /*
   * ==========================================================
   * ÚLTIMO BLOQUE SOLIDIFICADO
   * ==========================================================
   */

  private async getLatestSolidifiedBlock(
    network:
      TronNetwork,
  ): Promise<number> {
    const tronWeb =
      TronClient.getInstance(
        network,
      );

    const response =
      await tronWeb
        .solidityNode
        .request<{
          block_header?: {
            raw_data?: {
              number?:
                number;
            };
          };
        }>(
          "walletsolidity/getnowblock",
          {},
          "post",
        );

    const blockNumber =
      response
        .block_header
        ?.raw_data
        ?.number;

    if (
      typeof blockNumber !==
        "number" ||
      !Number.isSafeInteger(
        blockNumber,
      ) ||
      blockNumber < 0
    ) {
      throw new AppError(
        "No se pudo determinar el último bloque solidificado de TRON.",
        "TRON_SOLID_BLOCK_ERROR",
        502,
      );
    }

    return blockNumber;
  }

  /*
   * ==========================================================
   * EVENTOS USDT DE UN BLOQUE
   * ==========================================================
   *
   * TronGrid pagina los eventos.
   *
   * Se recorre fingerprint hasta completar todas
   * las páginas correspondientes al bloque.
   * ==========================================================
   */

  private async getUsdtTransferEventsForBlock(
    network:
      TronNetwork,

    blockNumber:
      number,
  ): Promise<
    TronContractTransferEvent[]
  > {
    /*
     * Toda la configuración sale ahora de
     * tron.config.ts.
     */
    const config =
      getTronConfig(
        network,
      );

    const fullHost =
      config.fullHost;

    const contract =
      getUsdtTrc20ContractForNetwork(
        network,
      );

    const headers =
      getTronGridHeaders();

    const events:
      TronContractTransferEvent[] =
      [];

    let fingerprint:
      string |
      null =
      null;

    let page =
      0;

    /*
     * Evita loops infinitos ante fingerprints
     * repetidos o anómalos.
     */
    const seenFingerprints =
      new Set<string>();

    do {
      page++;

      if (
        page >
        MAX_EVENT_PAGES_PER_BLOCK
      ) {
        throw new AppError(
          `Se superó el máximo de páginas de eventos permitido para el bloque ${blockNumber}.`,
          "TRON_EVENTS_PAGINATION_LIMIT",
          502,
        );
      }

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
        blockNumber
          .toString(),
      );

      url.searchParams.set(
        "only_confirmed",
        "true",
      );

      url.searchParams.set(
        "limit",
        "200",
      );

      if (
        fingerprint
      ) {
        url.searchParams.set(
          "fingerprint",
          fingerprint,
        );
      }

      const response =
        await fetch(
          url,
          {
            headers:
              Object.keys(
                headers,
              ).length > 0
                ? headers
                : undefined,

            cache:
              "no-store",
          },
        );

      if (
        !response.ok
      ) {
        const body =
          await response
            .text();

        console.error(
          "[TRON SCANNER EVENTS]",
          {
            network,
            blockNumber,
            page,
            status:
              response.status,
            body,
          },
        );

        throw new AppError(
          `No se pudieron consultar eventos TRON del bloque ${blockNumber}.`,
          "TRON_EVENTS_ERROR",
          502,
        );
      }

      let data:
        TronContractEventsResponse;

      try {
        data =
          (
            await response
              .json()
          ) as
            TronContractEventsResponse;
      } catch {
        throw new AppError(
          `TronGrid devolvió una respuesta que no pudo interpretarse para el bloque ${blockNumber}.`,
          "TRON_EVENTS_ERROR",
          502,
        );
      }

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

      const pageEvents =
        Array.isArray(
          data.data,
        )
          ? data.data
          : [];

      /*
       * Validaciones defensivas.
       *
       * Aunque TronGrid ya filtra por contrato,
       * evento y bloque, volvemos a validarlo.
       */

      for (
        const event of
        pageEvents
      ) {
        if (
          event.event_name !==
          "Transfer"
        ) {
          continue;
        }

        if (
          event
            .contract_address !==
          contract
        ) {
          continue;
        }

        if (
          event.block_number !==
          blockNumber
        ) {
          continue;
        }

        events.push(
          event,
        );
      }

      const nextFingerprint =
        data.meta
          ?.fingerprint
          ?.trim() ||
        null;

      if (
        !nextFingerprint
      ) {
        fingerprint =
          null;

        break;
      }

      if (
        seenFingerprints.has(
          nextFingerprint,
        )
      ) {
        throw new AppError(
          `TronGrid devolvió un fingerprint repetido para el bloque ${blockNumber}.`,
          "TRON_EVENTS_PAGINATION_ERROR",
          502,
        );
      }

      seenFingerprints.add(
        nextFingerprint,
      );

      fingerprint =
        nextFingerprint;
    } while (
      fingerprint
    );

    return events;
  }
}
