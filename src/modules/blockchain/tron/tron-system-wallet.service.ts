// import {
//   encryptValue,
// } from "@/lib/crypto/encryption";

// import {
//   formatUsdtDisplay,
// } from "@/lib/money/usdt";

// import {
//   generatePlatformWallet,
// } from "@/lib/wallet/tron-platform-wallet.server";

// import {
//   TronClient,
// } from "./tron.client";

// import {
//   TronSystemWalletRepository,
// } from "./tron-system-wallet.repository";

// import type {
//   TronSystemWalletDocument,
// } from "./tron-system-wallet.types";

// import type {
//   TronNetwork,
// } from "./tron.types";

// import {
//   getUsdtTrc20Contract,
// } from "./usdt.contract";

// export class TronSystemWalletService {
//   private readonly repository =
//     new TronSystemWalletRepository();

//   /*
//    * ============================================================
//    * RED
//    * ============================================================
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
//    * ============================================================
//    * PLATFORM TREASURY
//    * ============================================================
//    *
//    * La Platform Wallet pertenece a la empresa.
//    *
//    * Se genera utilizando:
//    *
//    * BIP-39
//    *   ↓
//    * mnemonic de 12 palabras
//    *   ↓
//    * BIP-44 TRON
//    *   ↓
//    * m/44'/195'/0'/0/0
//    *   ↓
//    * private key
//    *   ↓
//    * address TRON
//    *
//    * La mnemonic:
//    *
//    * - NO se cifra;
//    * - NO se almacena;
//    * - NO se escribe en MongoDB;
//    * - solamente se devuelve cuando la wallet acaba
//    *   de ser creada.
//    *
//    * La private key:
//    *
//    * - existe temporalmente en memoria;
//    * - se cifra antes de persistir;
//    * - MongoDB recibe únicamente encryptedPrivateKey.
//    */

//   async getOrCreatePlatformTreasury() {
//     const network =
//       this.getNetwork();

//     const existing =
//       await this.repository
//         .findPlatformTreasury(
//           network,
//         );

//     /*
//      * Si ya existe, nunca podemos volver
//      * a entregar la mnemonic porque no
//      * está almacenada.
//      */
//     if (
//       existing
//     ) {
//       return {
//         ...this.toPublic(
//           existing,
//         ),

//         createdNow:
//           false,

//         recovery:
//           null,
//       };
//     }

//     /*
//      * Generación server-side.
//      *
//      * La mnemonic y la private key existen
//      * únicamente en memoria durante esta
//      * operación.
//      */
//     const generated =
//       generatePlatformWallet();

//     const encryptedPrivateKey =
//       encryptValue(
//         generated.privateKey,
//       );

//     const created =
//       await this.repository
//         .createPlatformTreasury({
//           network,

//           addressBase58:
//             generated.addressBase58,

//           addressHex:
//             generated.addressHex,

//           encryptedPrivateKey,
//         });

//     /*
//      * ==========================================================
//      * PROTECCIÓN DE CONCURRENCIA
//      * ==========================================================
//      *
//      * El repositorio puede encontrar una wallet ya creada
//      * si dos solicitudes intentaron crear PLATFORM_TREASURY
//      * prácticamente al mismo tiempo.
//      *
//      * En ese caso NO debemos devolver las 12 palabras de la
//      * wallet temporal que acabamos de generar, porque esa wallet
//      * no es la que quedó persistida.
//      */
//     const createdNow =
//       created.addressBase58 ===
//       generated.addressBase58;

//     if (
//       !createdNow
//     ) {
//       return {
//         ...this.toPublic(
//           created,
//         ),

//         createdNow:
//           false,

//         recovery:
//           null,
//       };
//     }

//     /*
//      * Solamente en este punto sabemos que:
//      *
//      * 1. la wallet generada es la que quedó en MongoDB;
//      * 2. podemos entregar su recovery phrase;
//      * 3. esta es la única oportunidad para respaldarla.
//      */
//     return {
//       ...this.toPublic(
//         created,
//       ),

//       createdNow:
//         true,

//       recovery: {
//         mnemonic:
//           generated.mnemonic,

//         derivationPath:
//           generated.derivationPath,
//       },
//     };
//   }

//   /*
//    * ============================================================
//    * ESTADO PLATFORM TREASURY
//    * ============================================================
//    */

//   async getPlatformTreasuryStatus() {
//     const network =
//       this.getNetwork();

//     const wallet =
//       await this.repository
//         .findPlatformTreasury(
//           network,
//         );

//     if (
//       !wallet
//     ) {
//       return null;
//     }

//     return this.getWalletStatus(
//       wallet,
//     );
//   }

//   /*
//    * ============================================================
//    * ESTADO ON-CHAIN
//    * ============================================================
//    */

//   private async getWalletStatus(
//     wallet:
//       TronSystemWalletDocument,
//   ) {
//     const tronWeb =
//       TronClient
//         .createForAddress(
//           wallet.addressBase58,
//         );

//     /*
//      * ========================================================
//      * ACTIVACIÓN
//      * ========================================================
//      */

//     const account =
//       await tronWeb
//         .trx
//         .getAccount(
//           wallet.addressBase58,
//         );

//     const activated =
//       Boolean(
//         account &&
//         typeof account ===
//           "object" &&
//         "address" in
//           account,
//       );

//     /*
//      * ========================================================
//      * TRX
//      * ========================================================
//      */

//     const trxBalanceNumber =
//       await tronWeb
//         .trx
//         .getBalance(
//           wallet.addressBase58,
//         );

//     if (
//       !Number.isSafeInteger(
//         trxBalanceNumber,
//       )
//     ) {
//       throw new Error(
//         "El saldo TRX excede el rango entero seguro de JavaScript.",
//       );
//     }

//     const trxBalanceSun =
//       BigInt(
//         trxBalanceNumber,
//       );

//     /*
//      * ========================================================
//      * RECURSOS TRON
//      * ========================================================
//      *
//      * Bandwidth disponible:
//      *
//      * freeNetLimit - freeNetUsed
//      * +
//      * NetLimit - NetUsed
//      *
//      * Energy disponible:
//      *
//      * EnergyLimit - EnergyUsed
//      */

//     const resourceData =
//       await tronWeb
//         .trx
//         .getAccountResources(
//           wallet.addressBase58,
//         );

//     const freeBandwidthLimit =
//       this.resourceToBigInt(
//         resourceData
//           .freeNetLimit,
//       );

//     const freeBandwidthUsed =
//       this.resourceToBigInt(
//         resourceData
//           .freeNetUsed,
//       );

//     const stakedBandwidthLimit =
//       this.resourceToBigInt(
//         resourceData
//           .NetLimit,
//       );

//     const stakedBandwidthUsed =
//       this.resourceToBigInt(
//         resourceData
//           .NetUsed,
//       );

//     const energyLimit =
//       this.resourceToBigInt(
//         resourceData
//           .EnergyLimit,
//       );

//     const energyUsed =
//       this.resourceToBigInt(
//         resourceData
//           .EnergyUsed,
//       );

//     const freeBandwidthAvailable =
//       this.nonNegative(
//         freeBandwidthLimit -
//           freeBandwidthUsed,
//       );

//     const stakedBandwidthAvailable =
//       this.nonNegative(
//         stakedBandwidthLimit -
//           stakedBandwidthUsed,
//       );

//     const bandwidthAvailable =
//       freeBandwidthAvailable +
//       stakedBandwidthAvailable;

//     const energyAvailable =
//       this.nonNegative(
//         energyLimit -
//           energyUsed,
//       );

//     /*
//      * ========================================================
//      * USDT
//      * ========================================================
//      */

//     const contractAddress =
//       getUsdtTrc20Contract();

//     const contract =
//       await tronWeb
//         .contract()
//         .at(
//           contractAddress,
//         );

//     const usdtResult =
//       await contract
//         .balanceOf(
//           wallet.addressBase58,
//         )
//         .call({
//           from:
//             wallet.addressBase58,
//         });

//     const usdtBalanceUnits =
//       BigInt(
//         usdtResult.toString(),
//       );

//     /*
//      * ========================================================
//      * RESULTADO
//      * ========================================================
//      */

//     return {
//       ...this.toPublic(
//         wallet,
//       ),

//       activated,

//       trx: {
//         balanceSun:
//           trxBalanceSun
//             .toString(),

//         formattedBalance:
//           this.formatTrx(
//             trxBalanceSun,
//           ),
//       },

//       usdt: {
//         contract:
//           contractAddress,

//         balanceUnits:
//           usdtBalanceUnits
//             .toString(),

//         formattedBalance:
//           formatUsdtDisplay(
//             usdtBalanceUnits,
//           ),
//       },

//       resources: {
//         energyAvailable:
//           energyAvailable
//             .toString(),

//         energyLimit:
//           energyLimit
//             .toString(),

//         energyUsed:
//           energyUsed
//             .toString(),

//         bandwidthAvailable:
//           bandwidthAvailable
//             .toString(),

//         freeBandwidthAvailable:
//           freeBandwidthAvailable
//             .toString(),

//         stakedBandwidthAvailable:
//           stakedBandwidthAvailable
//             .toString(),

//         freeBandwidthLimit:
//           freeBandwidthLimit
//             .toString(),

//         freeBandwidthUsed:
//           freeBandwidthUsed
//             .toString(),

//         stakedBandwidthLimit:
//           stakedBandwidthLimit
//             .toString(),

//         stakedBandwidthUsed:
//           stakedBandwidthUsed
//             .toString(),
//       },
//     };
//   }

//   /*
//    * ============================================================
//    * HOT WALLET LEGACY
//    * ============================================================
//    *
//    * Se conserva temporalmente por compatibilidad.
//    *
//    * No utilizar para nuevas operaciones de plataforma.
//    */

//   async getOrCreateHotWallet() {
//     const network =
//       this.getNetwork();

//     const existing =
//       await this.repository
//         .findHotWallet(
//           network,
//         );

//     if (
//       existing
//     ) {
//       return this.toPublic(
//         existing,
//       );
//     }

//     const account =
//       await TronClient
//         .create()
//         .createAccount();

//     const encryptedPrivateKey =
//       encryptValue(
//         account.privateKey,
//       );

//     const created =
//       await this.repository
//         .createHotWallet({
//           network,

//           addressBase58:
//             account.address
//               .base58,

//           addressHex:
//             account.address
//               .hex,

//           encryptedPrivateKey,
//         });

//     return this.toPublic(
//       created,
//     );
//   }

//   async getHotWalletStatus() {
//     const network =
//       this.getNetwork();

//     const wallet =
//       await this.repository
//         .findHotWallet(
//           network,
//         );

//     if (
//       !wallet
//     ) {
//       return null;
//     }

//     return this.getWalletStatus(
//       wallet,
//     );
//   }

//   /*
//    * ============================================================
//    * REPRESENTACIÓN PÚBLICA
//    * ============================================================
//    */

//   private toPublic(
//     wallet:
//       TronSystemWalletDocument,
//   ) {
//     return {
//       id:
//         wallet._id
//           ?.toString() ??
//         "",

//       code:
//         wallet.code,

//       network:
//         wallet.network,

//       addressBase58:
//         wallet.addressBase58,

//       addressHex:
//         wallet.addressHex,

//       status:
//         wallet.status,

//       createdAt:
//         wallet.createdAt
//           .toISOString(),

//       updatedAt:
//         wallet.updatedAt
//           .toISOString(),
//     };
//   }

//   /*
//    * ============================================================
//    * HELPERS RECURSOS
//    * ============================================================
//    */

//   private resourceToBigInt(
//     value:
//       unknown,
//   ): bigint {
//     if (
//       value ===
//         undefined ||
//       value ===
//         null
//     ) {
//       return 0n;
//     }

//     if (
//       typeof value ===
//         "bigint"
//     ) {
//       return value;
//     }

//     if (
//       typeof value ===
//         "number"
//     ) {
//       if (
//         !Number.isSafeInteger(
//           value,
//         )
//       ) {
//         throw new Error(
//           "Un recurso TRON excede el rango entero seguro de JavaScript.",
//         );
//       }

//       return BigInt(
//         value,
//       );
//     }

//     if (
//       typeof value ===
//         "string" &&
//       /^\d+$/.test(
//         value,
//       )
//     ) {
//       return BigInt(
//         value,
//       );
//     }

//     return 0n;
//   }

//   private nonNegative(
//     value:
//       bigint,
//   ): bigint {
//     return value <
//       0n
//       ? 0n
//       : value;
//   }

//   /*
//    * ============================================================
//    * FORMATO TRX
//    * ============================================================
//    */

//   private formatTrx(
//     amountSun:
//       bigint,
//   ): string {
//     const scale =
//       1_000_000n;

//     const integer =
//       amountSun /
//       scale;

//     const decimals =
//       amountSun %
//       scale;

//     const formattedInteger =
//       new Intl.NumberFormat(
//         "es-AR",
//         {
//           maximumFractionDigits:
//             0,
//         },
//       ).format(
//         integer,
//       );

//     const decimalText =
//       decimals
//         .toString()
//         .padStart(
//           6,
//           "0",
//         )
//         .replace(
//           /0+$/,
//           "",
//         );

//     return decimalText
//       ? `${formattedInteger},${decimalText}`
//       : formattedInteger;
//   }
// }

// import {
//   encryptValue,
// } from "@/lib/crypto/encryption";

// import {
//   formatUsdtDisplay,
// } from "@/lib/money/usdt";

// import {
//   generatePlatformWallet,
// } from "@/lib/wallet/tron-platform-wallet.server";

// import {
//   getConfiguredTronNetwork,
// } from "./tron.config";

// import {
//   TronClient,
// } from "./tron.client";

// import {
//   TronSystemWalletRepository,
// } from "./tron-system-wallet.repository";

// import type {
//   TronSystemWalletDocument,
// } from "./tron-system-wallet.types";

// import type {
//   TronNetwork,
// } from "./tron.types";

// import {
//   getUsdtTrc20ContractForNetwork,
// } from "./usdt.contract";

// /*
//  * ============================================================
//  * SYSTEM WALLET SERVICE
//  * ============================================================
//  *
//  * Este servicio administra exclusivamente wallets
//  * pertenecientes a la PLATAFORMA.
//  *
//  * No representa las wallets personales no-custodial
//  * de los usuarios.
//  *
//  * Las private keys administradas aquí pertenecen solamente
//  * a wallets propias de infraestructura de la plataforma.
//  * ============================================================
//  */

// export class TronSystemWalletService {
//   private readonly repository =
//     new TronSystemWalletRepository();

//   /*
//    * ==========================================================
//    * RED
//    * ==========================================================
//    *
//    * La red ya no se interpreta localmente.
//    *
//    * La única fuente de verdad es:
//    *
//    * tron.config.ts
//    * ==========================================================
//    */

//   private getNetwork():
//     TronNetwork {
//     return getConfiguredTronNetwork();
//   }

//   /*
//    * ==========================================================
//    * PLATFORM TREASURY
//    * ==========================================================
//    */

//   async getOrCreatePlatformTreasury() {
//     const network =
//       this.getNetwork();

//     const existing =
//       await this.repository
//         .findPlatformTreasury(
//           network,
//         );

//     if (
//       existing
//     ) {
//       /*
//        * Defensa adicional.
//        *
//        * Aunque el repository fue consultado
//        * explícitamente por red, volvemos a validar.
//        */

//       if (
//         existing.network !==
//         network
//       ) {
//         throw new Error(
//           "La wallet treasury encontrada pertenece a una red TRON diferente.",
//         );
//       }

//       return {
//         ...this.toPublic(
//           existing,
//         ),

//         createdNow:
//           false,

//         recovery:
//           null,
//       };
//     }

//     /*
//      * Esta wallet pertenece a la plataforma.
//      *
//      * La private key existe sin cifrar solamente
//      * durante esta operación.
//      *
//      * TronClient recibe explícitamente la red
//      * para impedir cualquier ambigüedad
//      * NILE / MAINNET.
//      */

//     const generated =
//       generatePlatformWallet();

//     const encryptedPrivateKey =
//       encryptValue(
//         generated.privateKey,
//       );

//     const created =
//       await this.repository
//         .createPlatformTreasury({
//           network,

//           addressBase58:
//             generated
//               .addressBase58,

//           addressHex:
//             generated
//               .addressHex,

//           encryptedPrivateKey,
//         });

//     /*
//      * Defensa adicional.
//      */

//     if (
//       created.network !==
//       network
//     ) {
//       throw new Error(
//         "La wallet treasury creada no corresponde a la red TRON configurada.",
//       );
//     }

//     const createdNow =
//       created.addressBase58 ===
//         generated.addressBase58 &&
//       created.addressHex
//         .toUpperCase() ===
//         generated.addressHex
//           .toUpperCase();

//     if (
//       !createdNow
//     ) {
//       return {
//         ...this.toPublic(
//           created,
//         ),

//         createdNow:
//           false,

//         recovery:
//           null,
//       };
//     }

//     return {
//       ...this.toPublic(
//         created,
//       ),

//       createdNow:
//         true,

//       recovery: {
//         mnemonic:
//           generated.mnemonic,

//         derivationPath:
//           generated
//             .derivationPath,
//       },
//     };
//   }

//   /*
//    * ==========================================================
//    * ESTADO PLATFORM TREASURY
//    * ==========================================================
//    */

//   async getPlatformTreasuryStatus() {
//     const network =
//       this.getNetwork();

//     const wallet =
//       await this.repository
//         .findPlatformTreasury(
//           network,
//         );

//     if (
//       !wallet
//     ) {
//       return null;
//     }

//     if (
//       wallet.network !==
//       network
//     ) {
//       throw new Error(
//         "La wallet treasury pertenece a una red TRON diferente de la red activa.",
//       );
//     }

//     return this.getWalletStatus(
//       wallet,
//     );
//   }

//   /*
//    * ==========================================================
//    * ESTADO ON-CHAIN
//    * ==========================================================
//    *
//    * La red utilizada para consultar una wallet
//    * sale de la propia wallet almacenada.
//    *
//    * Esto evita consultar accidentalmente:
//    *
//    * MAINNET -> NILE
//    *
//    * o
//    *
//    * NILE -> MAINNET
//    * ==========================================================
//    */

//   private async getWalletStatus(
//     wallet:
//       TronSystemWalletDocument,
//   ) {
//     const configuredNetwork =
//       this.getNetwork();

//     if (
//       wallet.network !==
//       configuredNetwork
//     ) {
//       throw new Error(
//         "La wallet del sistema pertenece a una red TRON diferente de la red activa.",
//       );
//     }

//     const tronWeb =
//       TronClient
//         .createForAddress(
//           wallet.addressBase58,
//           wallet.network,
//         );

//     /*
//      * ========================================================
//      * ACTIVACIÓN
//      * ========================================================
//      */

//     const account =
//       await tronWeb
//         .trx
//         .getAccount(
//           wallet.addressBase58,
//         );

//     const activated =
//       Boolean(
//         account &&
//         typeof account ===
//           "object" &&
//         "address" in
//           account,
//       );

//     /*
//      * ========================================================
//      * TRX
//      * ========================================================
//      */

//     const trxBalanceNumber =
//       await tronWeb
//         .trx
//         .getBalance(
//           wallet.addressBase58,
//         );

//     if (
//       !Number.isSafeInteger(
//         trxBalanceNumber,
//       )
//     ) {
//       throw new Error(
//         "El saldo TRX excede el rango entero seguro de JavaScript.",
//       );
//     }

//     const trxBalanceSun =
//       BigInt(
//         trxBalanceNumber,
//       );

//     /*
//      * ========================================================
//      * RECURSOS TRON
//      * ========================================================
//      *
//      * Bandwidth disponible:
//      *
//      * freeNetLimit - freeNetUsed
//      *
//      * +
//      *
//      * NetLimit - NetUsed
//      *
//      * Energy disponible:
//      *
//      * EnergyLimit - EnergyUsed
//      * ========================================================
//      */

//     const resourceData =
//       await tronWeb
//         .trx
//         .getAccountResources(
//           wallet.addressBase58,
//         );

//     const freeBandwidthLimit =
//       this.resourceToBigInt(
//         resourceData
//           .freeNetLimit,
//       );

//     const freeBandwidthUsed =
//       this.resourceToBigInt(
//         resourceData
//           .freeNetUsed,
//       );

//     const stakedBandwidthLimit =
//       this.resourceToBigInt(
//         resourceData
//           .NetLimit,
//       );

//     const stakedBandwidthUsed =
//       this.resourceToBigInt(
//         resourceData
//           .NetUsed,
//       );

//     const energyLimit =
//       this.resourceToBigInt(
//         resourceData
//           .EnergyLimit,
//       );

//     const energyUsed =
//       this.resourceToBigInt(
//         resourceData
//           .EnergyUsed,
//       );

//     const freeBandwidthAvailable =
//       this.nonNegative(
//         freeBandwidthLimit -
//           freeBandwidthUsed,
//       );

//     const stakedBandwidthAvailable =
//       this.nonNegative(
//         stakedBandwidthLimit -
//           stakedBandwidthUsed,
//       );

//     const bandwidthAvailable =
//       freeBandwidthAvailable +
//       stakedBandwidthAvailable;

//     const energyAvailable =
//       this.nonNegative(
//         energyLimit -
//           energyUsed,
//       );

//     /*
//      * ========================================================
//      * USDT
//      * ========================================================
//      *
//      * El contrato se obtiene explícitamente
//      * utilizando la red de la wallet.
//      * ========================================================
//      */

//     const contractAddress =
//       getUsdtTrc20ContractForNetwork(
//         wallet.network,
//       );

//     const contract =
//       await tronWeb
//         .contract()
//         .at(
//           contractAddress,
//         );

//     const usdtResult =
//       await contract
//         .balanceOf(
//           wallet.addressBase58,
//         )
//         .call({
//           from:
//             wallet.addressBase58,
//         });

//     const usdtBalanceUnits =
//       BigInt(
//         usdtResult.toString(),
//       );

//     /*
//      * ========================================================
//      * RESULTADO
//      * ========================================================
//      */

//     return {
//       ...this.toPublic(
//         wallet,
//       ),

//       activated,

//       trx: {
//         balanceSun:
//           trxBalanceSun
//             .toString(),

//         formattedBalance:
//           this.formatTrx(
//             trxBalanceSun,
//           ),
//       },

//       usdt: {
//         contract:
//           contractAddress,

//         balanceUnits:
//           usdtBalanceUnits
//             .toString(),

//         formattedBalance:
//           formatUsdtDisplay(
//             usdtBalanceUnits,
//           ),
//       },

//       resources: {
//         energyAvailable:
//           energyAvailable
//             .toString(),

//         energyLimit:
//           energyLimit
//             .toString(),

//         energyUsed:
//           energyUsed
//             .toString(),

//         bandwidthAvailable:
//           bandwidthAvailable
//             .toString(),

//         freeBandwidthAvailable:
//           freeBandwidthAvailable
//             .toString(),

//         stakedBandwidthAvailable:
//           stakedBandwidthAvailable
//             .toString(),

//         freeBandwidthLimit:
//           freeBandwidthLimit
//             .toString(),

//         freeBandwidthUsed:
//           freeBandwidthUsed
//             .toString(),

//         stakedBandwidthLimit:
//           stakedBandwidthLimit
//             .toString(),

//         stakedBandwidthUsed:
//           stakedBandwidthUsed
//             .toString(),
//       },
//     };
//   }

//   /*
//    * ==========================================================
//    * REPRESENTACIÓN PÚBLICA
//    * ==========================================================
//    *
//    * Nunca devolvemos:
//    *
//    * - encryptedPrivateKey;
//    * - privateKey;
//    * - secretos internos.
//    * ==========================================================
//    */

//   private toPublic(
//     wallet:
//       TronSystemWalletDocument,
//   ) {
//     return {
//       id:
//         wallet._id
//           ?.toString() ??
//         "",

//       code:
//         wallet.code,

//       network:
//         wallet.network,

//       addressBase58:
//         wallet.addressBase58,

//       addressHex:
//         wallet.addressHex,

//       status:
//         wallet.status,

//       createdAt:
//         wallet.createdAt
//           .toISOString(),

//       updatedAt:
//         wallet.updatedAt
//           .toISOString(),
//     };
//   }

//   /*
//    * ==========================================================
//    * HELPERS RECURSOS
//    * ==========================================================
//    */

//   private resourceToBigInt(
//     value:
//       unknown,
//   ): bigint {
//     if (
//       value ===
//         undefined ||
//       value ===
//         null
//     ) {
//       return 0n;
//     }

//     if (
//       typeof value ===
//         "bigint"
//     ) {
//       return value;
//     }

//     if (
//       typeof value ===
//         "number"
//     ) {
//       if (
//         !Number.isSafeInteger(
//           value,
//         )
//       ) {
//         throw new Error(
//           "Un recurso TRON excede el rango entero seguro de JavaScript.",
//         );
//       }

//       return BigInt(
//         value,
//       );
//     }

//     if (
//       typeof value ===
//         "string" &&
//       /^\d+$/.test(
//         value,
//       )
//     ) {
//       return BigInt(
//         value,
//       );
//     }

//     return 0n;
//   }

//   private nonNegative(
//     value:
//       bigint,
//   ): bigint {
//     return value <
//       0n
//       ? 0n
//       : value;
//   }

//   /*
//    * ==========================================================
//    * FORMATO TRX
//    * ==========================================================
//    */

//   private formatTrx(
//     amountSun:
//       bigint,
//   ): string {
//     const scale =
//       1_000_000n;

//     const integer =
//       amountSun /
//       scale;

//     const decimals =
//       amountSun %
//       scale;

//     const formattedInteger =
//       new Intl.NumberFormat(
//         "es-AR",
//         {
//           maximumFractionDigits:
//             0,
//         },
//       ).format(
//         integer,
//       );

//     const decimalText =
//       decimals
//         .toString()
//         .padStart(
//           6,
//           "0",
//         )
//         .replace(
//           /0+$/,
//           "",
//         );

//     return decimalText
//       ? `${formattedInteger},${decimalText}`
//       : formattedInteger;
//   }
// }


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