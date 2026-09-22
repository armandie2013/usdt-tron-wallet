// import {
//   AppError,
// } from "@/lib/errors/app-error";

// import {
//   formatUsdtDisplay,
// } from "@/lib/money/usdt";

// import {
//   TronAccountRepository,
// } from "./tron-account.repository";

// import {
//   TronClient,
// } from "./tron.client";

// import type {
//   CreateTronAccountInput,
//   TronAccountDocument,
//   TronNetwork,
//   TronResourceStatus,
//   TronTrxBalance,
//   TronUsdtBalance,
//   TronWalletStatus,
// } from "./tron.types";

// import {
//   getUsdtTrc20Contract,
// } from "./usdt.contract";

// /*
//  * ============================================================
//  * TIPOS INTERNOS
//  * ============================================================
//  */

// interface TronAccountResources {
//   EnergyLimit?:
//     number;

//   EnergyUsed?:
//     number;

//   freeNetLimit?:
//     number;

//   freeNetUsed?:
//     number;

//   NetLimit?:
//     number;

//   NetUsed?:
//     number;
// }

// /*
//  * ============================================================
//  * TRON SERVICE
//  * ============================================================
//  *
//  * IMPORTANTE:
//  *
//  * Este servicio NO:
//  *
//  * - genera private keys;
//  * - genera mnemonic;
//  * - cifra private keys;
//  * - descifra private keys;
//  * - firma transacciones;
//  *
//  * Las wallets de usuario ahora son NO-CUSTODIAL.
//  *
//  * El backend solamente:
//  *
//  * - registra direcciones públicas;
//  * - consulta direcciones;
//  * - consulta saldo USDT;
//  * - consulta saldo TRX;
//  * - consulta Energy/Bandwidth;
//  * - expone datos públicos de blockchain.
//  */

// export class TronService {
//   private readonly accounts =
//     new TronAccountRepository();

//   /*
//    * ========================================================
//    * NETWORK
//    * ========================================================
//    */

//   getNetwork():
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
//    * ========================================================
//    * OBTENER CUENTA DEL USUARIO
//    * ========================================================
//    */

//   async getAccountForUser(
//     userId:
//       string,
//   ): Promise<
//     TronAccountDocument |
//     null
//   > {
//     const network =
//       this.getNetwork();

//     return this.accounts
//       .findByUserId(
//         userId,
//         network,
//       );
//   }

//   /*
//    * ========================================================
//    * REGISTRAR DIRECCIÓN PÚBLICA
//    * ========================================================
//    *
//    * La wallet debe haberse generado previamente
//    * del lado del cliente.
//    *
//    * Nunca aceptamos:
//    *
//    * - privateKey
//    * - mnemonic
//    * - encryptedPrivateKey
//    */

//   async registerAddress(
//     input: {
//       userId:
//         string;

//       addressBase58:
//         string;

//       addressHex:
//         string;
//     },
//   ): Promise<
//     TronAccountDocument
//   > {
//     const network =
//       this.getNetwork();

//     const addressBase58 =
//       input.addressBase58
//         .trim();

//     const addressHex =
//       input.addressHex
//         .trim()
//         .replace(
//           /^0x/i,
//           "",
//         )
//         .toUpperCase();

//     if (
//       !addressBase58
//     ) {
//       throw new AppError(
//         "La dirección TRON es obligatoria.",
//         "TRON_ADDRESS_REQUIRED",
//         400,
//       );
//     }

//     /*
//      * Validamos Base58 usando TronWeb.
//      */
//     let validAddress =
//       false;

//     try {
//       const tronWeb =
//         TronClient.create();

//       validAddress =
//         tronWeb.isAddress(
//           addressBase58,
//         );
//     } catch {
//       validAddress =
//         false;
//     }

//     if (
//       !validAddress
//     ) {
//       throw new AppError(
//         "La dirección TRON no es válida.",
//         "TRON_ADDRESS_INVALID",
//         400,
//       );
//     }

//     /*
//      * Dirección hexadecimal TRON:
//      *
//      * 41 + 20 bytes de address
//      */
//     if (
//       !/^41[0-9A-F]{40}$/.test(
//         addressHex,
//       )
//     ) {
//       throw new AppError(
//         "La dirección TRON hexadecimal no es válida.",
//         "TRON_HEX_ADDRESS_INVALID",
//         400,
//       );
//     }

//     /*
//      * Verificamos que Base58 y HEX representen
//      * exactamente la misma dirección.
//      */
//     const tronWeb =
//       TronClient.create();

//     let derivedHex:
//       string;

//     try {
//       derivedHex =
//         tronWeb.address
//           .toHex(
//             addressBase58,
//           )
//           .replace(
//             /^0x/i,
//             "",
//           )
//           .toUpperCase();
//     } catch {
//       throw new AppError(
//         "No se pudo convertir la dirección TRON.",
//         "TRON_ADDRESS_CONVERSION_ERROR",
//         400,
//       );
//     }

//     if (
//       derivedHex !==
//       addressHex
//     ) {
//       throw new AppError(
//         "La dirección Base58 y la dirección hexadecimal no corresponden a la misma wallet.",
//         "TRON_ADDRESS_MISMATCH",
//         400,
//       );
//     }

//     const existing =
//       await this.accounts
//         .findByUserId(
//           input.userId,
//           network,
//         );

//     /*
//      * Registro idempotente.
//      */
//     if (
//       existing
//     ) {
//       if (
//         existing.addressBase58 ===
//           addressBase58 &&
//         existing.addressHex ===
//           addressHex
//       ) {
//         return existing;
//       }

//       throw new AppError(
//         "El usuario ya posee una wallet TRON registrada.",
//         "TRON_ACCOUNT_ALREADY_EXISTS",
//         409,
//       );
//     }

//     const registeredAddress =
//       await this.accounts
//         .findByAddress(
//           addressBase58,
//           network,
//         );

//     if (
//       registeredAddress
//     ) {
//       throw new AppError(
//         "La dirección TRON ya se encuentra asociada a otro usuario.",
//         "TRON_ADDRESS_ALREADY_REGISTERED",
//         409,
//       );
//     }

//     const createInput:
//       CreateTronAccountInput =
//         {
//           userId:
//             input.userId,

//           network,

//           addressBase58,

//           addressHex,
//         };

//     try {
//       return await this.accounts
//         .create(
//           createInput,
//         );
//     } catch (
//       error
//     ) {
//       /*
//        * Repository puede lanzar errores por:
//        *
//        * - índices UNIQUE;
//        * - usuario ya registrado;
//        * - address duplicada;
//        *
//        * Convertimos esos errores en una respuesta
//        * de aplicación más controlada.
//        */

//       if (
//         error instanceof
//         AppError
//       ) {
//         throw error;
//       }

//       const message =
//         error instanceof
//           Error
//           ? error.message
//           : "";

//       if (
//         message.includes(
//           "ya posee una wallet",
//         )
//       ) {
//         throw new AppError(
//           message,
//           "TRON_ACCOUNT_ALREADY_EXISTS",
//           409,
//         );
//       }

//       if (
//         message.includes(
//           "ya se encuentra registrada",
//         )
//       ) {
//         throw new AppError(
//           message,
//           "TRON_ADDRESS_ALREADY_REGISTERED",
//           409,
//         );
//       }

//       throw new AppError(
//         "No se pudo registrar la dirección TRON.",
//         "TRON_ACCOUNT_CREATE_ERROR",
//         500,
//       );
//     }
//   }

//   /*
//    * ========================================================
//    * DIRECCIÓN PÚBLICA
//    * ========================================================
//    */

//   async getPublicAddress(
//     userId:
//       string,
//   ) {
//     const account =
//       await this
//         .getAccountForUser(
//           userId,
//         );

//     if (
//       !account ||
//       !account._id
//     ) {
//       return null;
//     }

//     return this.accounts
//       .toPublic(
//         account,
//       );
//   }

//   /*
//    * ========================================================
//    * BALANCE USDT
//    * ========================================================
//    *
//    * Fuente de verdad:
//    *
//    * contrato USDT en TRON.
//    *
//    * MongoDB NO determina este balance.
//    */

//   async getUsdtBalance(
//     address:
//       string,
//   ): Promise<
//     TronUsdtBalance
//   > {
//     const tronWeb =
//       TronClient
//         .createForAddress(
//           address,
//         );

//     const contractAddress =
//       getUsdtTrc20Contract();

//     try {
//       const contract =
//         await tronWeb
//           .contract()
//           .at(
//             contractAddress,
//           );

//       const result =
//         await contract
//           .balanceOf(
//             address,
//           )
//           .call({
//             from:
//               address,
//           });

//       const balance =
//         BigInt(
//           result.toString(),
//         );

//       return {
//         balanceUnits:
//           balance.toString(),

//         formattedBalance:
//           formatUsdtDisplay(
//             balance,
//           ),
//       };
//     } catch (
//       error
//     ) {
//       console.error(
//         `[TRON USDT BALANCE] ${address}`,
//         error,
//       );

//       throw new AppError(
//         "No se pudo consultar el saldo USDT en TRON.",
//         "TRON_USDT_BALANCE_ERROR",
//         502,
//       );
//     }
//   }

//   /*
//    * ========================================================
//    * BALANCE TRX
//    * ========================================================
//    */

//   async getTrxBalance(
//     address:
//       string,
//   ): Promise<
//     TronTrxBalance
//   > {
//     const tronWeb =
//       TronClient
//         .createForAddress(
//           address,
//         );

//     try {
//       const balanceNumber =
//         await tronWeb.trx
//           .getBalance(
//             address,
//           );

//       if (
//         !Number.isSafeInteger(
//           balanceNumber,
//         )
//       ) {
//         throw new Error(
//           "Saldo TRX fuera del rango entero seguro.",
//         );
//       }

//       const balanceSun =
//         BigInt(
//           balanceNumber,
//         );

//       return {
//         balanceSun:
//           balanceSun
//             .toString(),

//         formattedBalance:
//           this.formatTrx(
//             balanceSun,
//           ),
//       };
//     } catch (
//       error
//     ) {
//       console.error(
//         `[TRON TRX BALANCE] ${address}`,
//         error,
//       );

//       throw new AppError(
//         "No se pudo consultar el saldo TRX.",
//         "TRON_TRX_BALANCE_ERROR",
//         502,
//       );
//     }
//   }

//   /*
//    * ========================================================
//    * RECURSOS
//    * ========================================================
//    */

//   async getResources(
//     address:
//       string,
//   ): Promise<
//     TronResourceStatus
//   > {
//     const tronWeb =
//       TronClient
//         .createForAddress(
//           address,
//         );

//     try {
//       const resources =
//         (
//           await tronWeb.trx
//             .getAccountResources(
//               address,
//             )
//         ) as
//           TronAccountResources;

//       const energyAvailable =
//         Math.max(
//           0,

//           (
//             resources.EnergyLimit ??
//             0
//           ) -
//             (
//               resources.EnergyUsed ??
//               0
//             ),
//         );

//       const bandwidthAvailable =
//         Math.max(
//           0,

//           (
//             resources.freeNetLimit ??
//             0
//           ) -
//             (
//               resources.freeNetUsed ??
//               0
//             ) +
//             (
//               resources.NetLimit ??
//               0
//             ) -
//             (
//               resources.NetUsed ??
//               0
//             ),
//         );

//       return {
//         energyAvailable:
//           energyAvailable
//             .toString(),

//         bandwidthAvailable:
//           bandwidthAvailable
//             .toString(),
//       };
//     } catch (
//       error
//     ) {
//       console.error(
//         `[TRON RESOURCES] ${address}`,
//         error,
//       );

//       throw new AppError(
//         "No se pudieron consultar los recursos de la wallet.",
//         "TRON_RESOURCES_ERROR",
//         502,
//       );
//     }
//   }

//   /*
//    * ========================================================
//    * ESTADO COMPLETO DE WALLET
//    * ========================================================
//    */

//   async getWalletStatus(
//     userId:
//       string,
//   ): Promise<
//     TronWalletStatus |
//     null
//   > {
//     const account =
//       await this
//         .getAccountForUser(
//           userId,
//         );

//     if (
//       !account ||
//       !account._id
//     ) {
//       return null;
//     }

//     const publicAccount =
//       this.accounts
//         .toPublic(
//           account,
//         );

//     const [
//       usdt,
//       trx,
//       resources,
//     ] =
//       await Promise.all([
//         this.getUsdtBalance(
//           account.addressBase58,
//         ),

//         this.getTrxBalance(
//           account.addressBase58,
//         ),

//         this.getResources(
//           account.addressBase58,
//         ),
//       ]);

//     return {
//       account:
//         publicAccount,

//       usdt,

//       trx,

//       resources,
//     };
//   }

//   /*
//    * ========================================================
//    * ACTIVACIÓN DE CUENTA
//    * ========================================================
//    *
//    * Esto solamente indica si la address existe como
//    * Account en el estado nativo de TRON.
//    *
//    * Una address puede tener actividad TRC20 y este dato
//    * debe tratarse independientemente.
//    */

//   async isAccountActivated(
//     address:
//       string,
//   ): Promise<boolean> {
//     const tronWeb =
//       TronClient
//         .createForAddress(
//           address,
//         );

//     try {
//       const account =
//         await tronWeb.trx
//           .getAccount(
//             address,
//           );

//       if (
//         !account
//       ) {
//         return false;
//       }

//       return (
//         typeof account ===
//           "object" &&
//         Object.keys(
//           account,
//         ).length >
//           0
//       );
//     } catch (
//       error
//     ) {
//       console.error(
//         `[TRON ACCOUNT STATUS] ${address}`,
//         error,
//       );

//       return false;
//     }
//   }

//   /*
//    * ========================================================
//    * FORMATO TRX
//    * ========================================================
//    */

//   private formatTrx(
//     amountSun:
//       bigint,
//   ): string {
//     const scale =
//       1_000_000n;

//     const negative =
//       amountSun <
//       0n;

//     const absolute =
//       negative
//         ? -amountSun
//         : amountSun;

//     const integer =
//       absolute /
//       scale;

//     const decimals =
//       absolute %
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

//     const result =
//       decimalText
//         ? `${formattedInteger},${decimalText}`
//         : formattedInteger;

//     return negative
//       ? `-${result}`
//       : result;
//   }
// }

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  formatUsdtDisplay,
} from "@/lib/money/usdt";

import {
  TronAccountRepository,
} from "./tron-account.repository";

import {
  TronClient,
} from "./tron.client";

import {
  getConfiguredTronNetwork,
} from "./tron.config";

import type {
  CreateTronAccountInput,
  TronAccountDocument,
  TronNetwork,
  TronResourceStatus,
  TronTrxBalance,
  TronUsdtBalance,
  TronWalletStatus,
} from "./tron.types";

import {
  getUsdtTrc20Contract,
} from "./usdt.contract";

/*
 * ============================================================
 * TIPOS INTERNOS
 * ============================================================
 */

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

/*
 * ============================================================
 * TRON SERVICE
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Este servicio NO:
 *
 * - genera private keys;
 * - genera mnemonic;
 * - cifra private keys;
 * - descifra private keys;
 * - firma transacciones;
 *
 * Las wallets de usuario ahora son NO-CUSTODIAL.
 *
 * El backend solamente:
 *
 * - registra direcciones públicas;
 * - consulta direcciones;
 * - consulta saldo USDT;
 * - consulta saldo TRX;
 * - consulta Energy/Bandwidth;
 * - expone datos públicos de blockchain.
 */

export class TronService {
  private readonly accounts =
    new TronAccountRepository();

  /*
   * ========================================================
   * NETWORK
   * ========================================================
   */

  getNetwork():
    TronNetwork {
    return getConfiguredTronNetwork();
  }

  /*
   * ========================================================
   * OBTENER CUENTA DEL USUARIO
   * ========================================================
   */

  async getAccountForUser(
    userId:
      string,
  ): Promise<
    TronAccountDocument |
    null
  > {
    const network =
      this.getNetwork();

    return this.accounts
      .findByUserId(
        userId,
        network,
      );
  }

  /*
   * ========================================================
   * REGISTRAR DIRECCIÓN PÚBLICA
   * ========================================================
   *
   * La wallet debe haberse generado previamente
   * del lado del cliente.
   *
   * Nunca aceptamos:
   *
   * - privateKey
   * - mnemonic
   * - encryptedPrivateKey
   */

  async registerAddress(
    input: {
      userId:
        string;

      addressBase58:
        string;

      addressHex:
        string;
    },
  ): Promise<
    TronAccountDocument
  > {
    const network =
      this.getNetwork();

    const addressBase58 =
      input.addressBase58
        .trim();

    const addressHex =
      input.addressHex
        .trim()
        .replace(
          /^0x/i,
          "",
        )
        .toUpperCase();

    if (
      !addressBase58
    ) {
      throw new AppError(
        "La dirección TRON es obligatoria.",
        "TRON_ADDRESS_REQUIRED",
        400,
      );
    }

    /*
     * Validamos Base58 usando TronWeb.
     */
    let validAddress =
      false;

    try {
      const tronWeb =
        TronClient.create();

      validAddress =
        tronWeb.isAddress(
          addressBase58,
        );
    } catch {
      validAddress =
        false;
    }

    if (
      !validAddress
    ) {
      throw new AppError(
        "La dirección TRON no es válida.",
        "TRON_ADDRESS_INVALID",
        400,
      );
    }

    /*
     * Dirección hexadecimal TRON:
     *
     * 41 + 20 bytes de address
     */
    if (
      !/^41[0-9A-F]{40}$/.test(
        addressHex,
      )
    ) {
      throw new AppError(
        "La dirección TRON hexadecimal no es válida.",
        "TRON_HEX_ADDRESS_INVALID",
        400,
      );
    }

    /*
     * Verificamos que Base58 y HEX representen
     * exactamente la misma dirección.
     */
    const tronWeb =
      TronClient.create();

    let derivedHex:
      string;

    try {
      derivedHex =
        tronWeb.address
          .toHex(
            addressBase58,
          )
          .replace(
            /^0x/i,
            "",
          )
          .toUpperCase();
    } catch {
      throw new AppError(
        "No se pudo convertir la dirección TRON.",
        "TRON_ADDRESS_CONVERSION_ERROR",
        400,
      );
    }

    if (
      derivedHex !==
      addressHex
    ) {
      throw new AppError(
        "La dirección Base58 y la dirección hexadecimal no corresponden a la misma wallet.",
        "TRON_ADDRESS_MISMATCH",
        400,
      );
    }

    const existing =
      await this.accounts
        .findByUserId(
          input.userId,
          network,
        );

    /*
     * Registro idempotente.
     */
    if (
      existing
    ) {
      if (
        existing.addressBase58 ===
          addressBase58 &&
        existing.addressHex ===
          addressHex
      ) {
        return existing;
      }

      throw new AppError(
        "El usuario ya posee una wallet TRON registrada.",
        "TRON_ACCOUNT_ALREADY_EXISTS",
        409,
      );
    }

    const registeredAddress =
      await this.accounts
        .findByAddress(
          addressBase58,
          network,
        );

    if (
      registeredAddress
    ) {
      throw new AppError(
        "La dirección TRON ya se encuentra asociada a otro usuario.",
        "TRON_ADDRESS_ALREADY_REGISTERED",
        409,
      );
    }

    const createInput:
      CreateTronAccountInput =
        {
          userId:
            input.userId,

          network,

          addressBase58,

          addressHex,
        };

    try {
      return await this.accounts
        .create(
          createInput,
        );
    } catch (
      error
    ) {
      /*
       * Repository puede lanzar errores por:
       *
       * - índices UNIQUE;
       * - usuario ya registrado;
       * - address duplicada;
       *
       * Convertimos esos errores en una respuesta
       * de aplicación más controlada.
       */

      if (
        error instanceof
        AppError
      ) {
        throw error;
      }

      const message =
        error instanceof
          Error
          ? error.message
          : "";

      if (
        message.includes(
          "ya posee una wallet",
        )
      ) {
        throw new AppError(
          message,
          "TRON_ACCOUNT_ALREADY_EXISTS",
          409,
        );
      }

      if (
        message.includes(
          "ya se encuentra registrada",
        )
      ) {
        throw new AppError(
          message,
          "TRON_ADDRESS_ALREADY_REGISTERED",
          409,
        );
      }

      throw new AppError(
        "No se pudo registrar la dirección TRON.",
        "TRON_ACCOUNT_CREATE_ERROR",
        500,
      );
    }
  }

  /*
   * ========================================================
   * DIRECCIÓN PÚBLICA
   * ========================================================
   */

  async getPublicAddress(
    userId:
      string,
  ) {
    const account =
      await this
        .getAccountForUser(
          userId,
        );

    if (
      !account ||
      !account._id
    ) {
      return null;
    }

    return this.accounts
      .toPublic(
        account,
      );
  }

  /*
   * ========================================================
   * BALANCE USDT
   * ========================================================
   *
   * Fuente de verdad:
   *
   * contrato USDT en TRON.
   *
   * MongoDB NO determina este balance.
   */

  async getUsdtBalance(
    address:
      string,
  ): Promise<
    TronUsdtBalance
  > {
    const tronWeb =
      TronClient
        .createForAddress(
          address,
        );

    const contractAddress =
      getUsdtTrc20Contract();

    try {
      const contract =
        await tronWeb
          .contract()
          .at(
            contractAddress,
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

      const balance =
        BigInt(
          result.toString(),
        );

      return {
        balanceUnits:
          balance.toString(),

        formattedBalance:
          formatUsdtDisplay(
            balance,
          ),
      };
    } catch (
      error
    ) {
      console.error(
        `[TRON USDT BALANCE] ${address}`,
        error,
      );

      throw new AppError(
        "No se pudo consultar el saldo USDT en TRON.",
        "TRON_USDT_BALANCE_ERROR",
        502,
      );
    }
  }

  /*
   * ========================================================
   * BALANCE TRX
   * ========================================================
   */

  async getTrxBalance(
    address:
      string,
  ): Promise<
    TronTrxBalance
  > {
    const tronWeb =
      TronClient
        .createForAddress(
          address,
        );

    try {
      const balanceNumber =
        await tronWeb.trx
          .getBalance(
            address,
          );

      if (
        !Number.isSafeInteger(
          balanceNumber,
        )
      ) {
        throw new Error(
          "Saldo TRX fuera del rango entero seguro.",
        );
      }

      const balanceSun =
        BigInt(
          balanceNumber,
        );

      return {
        balanceSun:
          balanceSun
            .toString(),

        formattedBalance:
          this.formatTrx(
            balanceSun,
          ),
      };
    } catch (
      error
    ) {
      console.error(
        `[TRON TRX BALANCE] ${address}`,
        error,
      );

      throw new AppError(
        "No se pudo consultar el saldo TRX.",
        "TRON_TRX_BALANCE_ERROR",
        502,
      );
    }
  }

  /*
   * ========================================================
   * RECURSOS
   * ========================================================
   */

  async getResources(
    address:
      string,
  ): Promise<
    TronResourceStatus
  > {
    const tronWeb =
      TronClient
        .createForAddress(
          address,
        );

    try {
      const resources =
        (
          await tronWeb.trx
            .getAccountResources(
              address,
            )
        ) as
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

      const bandwidthAvailable =
        Math.max(
          0,

          (
            resources.freeNetLimit ??
            0
          ) -
            (
              resources.freeNetUsed ??
              0
            ) +
            (
              resources.NetLimit ??
              0
            ) -
            (
              resources.NetUsed ??
              0
            ),
        );

      return {
        energyAvailable:
          energyAvailable
            .toString(),

        bandwidthAvailable:
          bandwidthAvailable
            .toString(),
      };
    } catch (
      error
    ) {
      console.error(
        `[TRON RESOURCES] ${address}`,
        error,
      );

      throw new AppError(
        "No se pudieron consultar los recursos de la wallet.",
        "TRON_RESOURCES_ERROR",
        502,
      );
    }
  }

  /*
   * ========================================================
   * ESTADO COMPLETO DE WALLET
   * ========================================================
   */

  async getWalletStatus(
    userId:
      string,
  ): Promise<
    TronWalletStatus |
    null
  > {
    const account =
      await this
        .getAccountForUser(
          userId,
        );

    if (
      !account ||
      !account._id
    ) {
      return null;
    }

    const publicAccount =
      this.accounts
        .toPublic(
          account,
        );

    const [
      usdt,
      trx,
      resources,
    ] =
      await Promise.all([
        this.getUsdtBalance(
          account.addressBase58,
        ),

        this.getTrxBalance(
          account.addressBase58,
        ),

        this.getResources(
          account.addressBase58,
        ),
      ]);

    return {
      account:
        publicAccount,

      usdt,

      trx,

      resources,
    };
  }

  /*
   * ========================================================
   * ACTIVACIÓN DE CUENTA
   * ========================================================
   *
   * Esto solamente indica si la address existe como
   * Account en el estado nativo de TRON.
   *
   * Una address puede tener actividad TRC20 y este dato
   * debe tratarse independientemente.
   */

  async isAccountActivated(
    address:
      string,
  ): Promise<boolean> {
    const tronWeb =
      TronClient
        .createForAddress(
          address,
        );

    try {
      const account =
        await tronWeb.trx
          .getAccount(
            address,
          );

      if (
        !account
      ) {
        return false;
      }

      return (
        typeof account ===
          "object" &&
        Object.keys(
          account,
        ).length >
          0
      );
    } catch (
      error
    ) {
      console.error(
        `[TRON ACCOUNT STATUS] ${address}`,
        error,
      );

      return false;
    }
  }

  /*
   * ========================================================
   * FORMATO TRX
   * ========================================================
   */

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
