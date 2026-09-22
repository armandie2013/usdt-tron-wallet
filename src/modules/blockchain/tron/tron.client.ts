// import {
//   TronWeb,
// } from "tronweb";

// function getTronConfiguration() {
//   const fullHost =
//     process.env
//       .TRON_FULL_HOST
//       ?.trim();

//   if (!fullHost) {
//     throw new Error(
//       "TRON_FULL_HOST no está configurado.",
//     );
//   }

//   const apiKey =
//     process.env
//       .TRON_API_KEY
//       ?.trim();

//   return {
//     fullHost,
//     apiKey,
//   };
// }

// export class TronClient {
//   /*
//    * Cliente compartido SOLO para operaciones
//    * que no mutan address/privateKey.
//    */
//   private static instance:
//     TronWeb | null = null;

//   static getInstance():
//     TronWeb {
//     if (
//       TronClient.instance
//     ) {
//       return TronClient.instance;
//     }

//     const {
//       fullHost,
//       apiKey,
//     } =
//       getTronConfiguration();

//     TronClient.instance =
//       new TronWeb({
//         fullHost,

//         headers:
//           apiKey
//             ? {
//                 "TRON-PRO-API-KEY":
//                   apiKey,
//               }
//             : undefined,
//       });

//     return TronClient.instance;
//   }

//   /*
//    * Nueva instancia independiente.
//    *
//    * Usarla siempre que necesitemos setAddress()
//    * o setPrivateKey().
//    */
//   static create():
//     TronWeb {
//     const {
//       fullHost,
//       apiKey,
//     } =
//       getTronConfiguration();

//     return new TronWeb({
//       fullHost,

//       headers:
//         apiKey
//           ? {
//               "TRON-PRO-API-KEY":
//                 apiKey,
//             }
//           : undefined,
//     });
//   }

//   static createForAddress(
//     address:
//       string,
//   ): TronWeb {
//     const tronWeb =
//       TronClient.create();

//     tronWeb.setAddress(
//       address,
//     );

//     return tronWeb;
//   }
// }

import {
  TronWeb,
} from "tronweb";

import {
  getTronConfig,
} from "./tron.config";

import type {
  TronNetwork,
} from "./tron.types";

/*
 * ============================================================
 * TRON CLIENT
 * ============================================================
 *
 * Este módulo NO contiene:
 *
 * - private keys;
 * - mnemonic;
 * - claves de usuarios;
 *
 * Solamente crea clientes RPC para comunicarse con TRON.
 *
 * La red, endpoint y API key salen exclusivamente de
 * tron.config.ts.
 * ============================================================
 */

export class TronClient {
  /*
   * Singleton utilizado por operaciones generales del backend.
   *
   * Como cada deployment trabaja con una única TRON_NETWORK,
   * una sola instancia es suficiente.
   */
  private static instance:
    TronWeb |
    null =
      null;

  private static instanceNetwork:
    TronNetwork |
    null =
      null;

  /*
   * ==========================================================
   * CREAR CLIENTE
   * ==========================================================
   */

  static create(
    network?:
      TronNetwork,
  ): TronWeb {
    const config =
      getTronConfig(
        network,
      );

    const headers =
      config.apiKey
        ? {
            "TRON-PRO-API-KEY":
              config.apiKey,
          }
        : undefined;

    return new TronWeb({
      fullHost:
        config.fullHost,

      headers,
    });
  }

  /*
   * ==========================================================
   * SINGLETON
   * ==========================================================
   *
   * El singleton queda asociado explícitamente a la red.
   *
   * Esto evita reutilizar accidentalmente un cliente creado
   * para otra red durante tests o procesos largos.
   * ==========================================================
   */

  static getInstance(
    network?:
      TronNetwork,
  ): TronWeb {
    const config =
      getTronConfig(
        network,
      );

    if (
      !this.instance ||
      this.instanceNetwork !==
        config.network
    ) {
      this.instance =
        this.create(
          config.network,
        );

      this.instanceNetwork =
        config.network;
    }

    return this.instance;
  }

  /*
   * ==========================================================
   * CLIENTE ASOCIADO A UNA DIRECCIÓN
   * ==========================================================
   *
   * Algunas llamadas de TronWeb necesitan una dirección
   * por defecto aunque la operación sea solamente de lectura.
   *
   * No se configura ninguna private key.
   * ==========================================================
   */

  static createForAddress(
    address:
      string,

    network?:
      TronNetwork,
  ): TronWeb {
    const tronWeb =
      this.create(
        network,
      );

    tronWeb.setAddress(
      address,
    );

    return tronWeb;
  }

  /*
   * ==========================================================
   * RESET
   * ==========================================================
   *
   * Útil principalmente para tests.
   * ==========================================================
   */

  static reset():
    void {
    this.instance =
      null;

    this.instanceNetwork =
      null;
  }
}