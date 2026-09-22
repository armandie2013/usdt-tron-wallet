// import {
//   MongoServerError,
// } from "mongodb";

// import {
//   getTronSystemWalletsCollection,
// } from "./tron-system-wallet.model";

// import type {
//   TronNetwork,
// } from "./tron.types";

// import type {
//   TronSystemWalletCode,
//   TronSystemWalletDocument,
// } from "./tron-system-wallet.types";

// let indexesReady =
//   false;

// async function ensureIndexes():
//   Promise<void> {
//   if (
//     indexesReady
//   ) {
//     return;
//   }

//   const collection =
//     await getTronSystemWalletsCollection();

//   await collection.createIndex(
//     {
//       code:
//         1,

//       network:
//         1,
//     },
//     {
//       unique:
//         true,

//       name:
//         "tron_system_wallet_code_network_unique",
//     },
//   );

//   await collection.createIndex(
//     {
//       addressBase58:
//         1,
//     },
//     {
//       unique:
//         true,

//       name:
//         "tron_system_wallet_address_unique",
//     },
//   );

//   indexesReady =
//     true;
// }

// export class TronSystemWalletRepository {
//   /*
//    * ============================================================
//    * GENÉRICO
//    * ============================================================
//    */

//   async findByCode(
//     code:
//       TronSystemWalletCode,

//     network:
//       TronNetwork,
//   ): Promise<
//     TronSystemWalletDocument |
//     null
//   > {
//     await ensureIndexes();

//     const collection =
//       await getTronSystemWalletsCollection();

//     return collection.findOne({
//       code,

//       network,
//     });
//   }

//   async createSystemWallet(
//     input: {
//       code:
//         TronSystemWalletCode;

//       network:
//         TronNetwork;

//       addressBase58:
//         string;

//       addressHex:
//         string;

//       encryptedPrivateKey:
//         string;
//     },
//   ): Promise<
//     TronSystemWalletDocument
//   > {
//     await ensureIndexes();

//     const collection =
//       await getTronSystemWalletsCollection();

//     const now =
//       new Date();

//     const document:
//       TronSystemWalletDocument =
//         {
//           code:
//             input.code,

//           network:
//             input.network,

//           addressBase58:
//             input.addressBase58,

//           addressHex:
//             input.addressHex,

//           encryptedPrivateKey:
//             input.encryptedPrivateKey,

//           status:
//             "ACTIVE",

//           createdAt:
//             now,

//           updatedAt:
//             now,
//         };

//     try {
//       const result =
//         await collection.insertOne(
//           document,
//         );

//       return {
//         ...document,

//         _id:
//           result.insertedId,
//       };
//     } catch (
//       error
//     ) {
//       if (
//         error instanceof
//           MongoServerError &&
//         error.code ===
//           11000
//       ) {
//         const existing =
//           await this.findByCode(
//             input.code,
//             input.network,
//           );

//         if (
//           existing
//         ) {
//           return existing;
//         }
//       }

//       throw error;
//     }
//   }

//   /*
//    * ============================================================
//    * PLATFORM TREASURY
//    * ============================================================
//    */

//   async findPlatformTreasury(
//     network:
//       TronNetwork,
//   ): Promise<
//     TronSystemWalletDocument |
//     null
//   > {
//     return this.findByCode(
//       "PLATFORM_TREASURY",
//       network,
//     );
//   }

//   async createPlatformTreasury(
//     input: {
//       network:
//         TronNetwork;

//       addressBase58:
//         string;

//       addressHex:
//         string;

//       encryptedPrivateKey:
//         string;
//     },
//   ): Promise<
//     TronSystemWalletDocument
//   > {
//     return this.createSystemWallet({
//       code:
//         "PLATFORM_TREASURY",

//       network:
//         input.network,

//       addressBase58:
//         input.addressBase58,

//       addressHex:
//         input.addressHex,

//       encryptedPrivateKey:
//         input.encryptedPrivateKey,
//     });
//   }

//   /*
//    * ============================================================
//    * HOT WALLET LEGACY
//    * ============================================================
//    *
//    * Se mantiene por compatibilidad temporal.
//    */

//   async findHotWallet(
//     network:
//       TronNetwork,
//   ): Promise<
//     TronSystemWalletDocument |
//     null
//   > {
//     return this.findByCode(
//       "HOT_WALLET",
//       network,
//     );
//   }

//   async createHotWallet(
//     input: {
//       network:
//         TronNetwork;

//       addressBase58:
//         string;

//       addressHex:
//         string;

//       encryptedPrivateKey:
//         string;
//     },
//   ): Promise<
//     TronSystemWalletDocument
//   > {
//     return this.createSystemWallet({
//       code:
//         "HOT_WALLET",

//       network:
//         input.network,

//       addressBase58:
//         input.addressBase58,

//       addressHex:
//         input.addressHex,

//       encryptedPrivateKey:
//         input.encryptedPrivateKey,
//     });
//   }
// }

import {
  MongoServerError,
} from "mongodb";

import {
  getTronSystemWalletsCollection,
} from "./tron-system-wallet.model";

import type {
  TronNetwork,
} from "./tron.types";

import type {
  TronSystemWalletDocument,
} from "./tron-system-wallet.types";

let indexesReady =
  false;

async function ensureIndexes():
  Promise<void> {
  if (
    indexesReady
  ) {
    return;
  }

  const collection =
    await getTronSystemWalletsCollection();

  await collection.createIndex(
    {
      code:
        1,

      network:
        1,
    },
    {
      unique:
        true,

      name:
        "tron_system_wallet_code_network_unique",
    },
  );

  await collection.createIndex(
    {
      addressBase58:
        1,
    },
    {
      unique:
        true,

      name:
        "tron_system_wallet_address_unique",
    },
  );

  indexesReady =
    true;
}

export class TronSystemWalletRepository {
  /*
   * ============================================================
   * GENÉRICO
   * ============================================================
   */

  private async findByCode(
    code:
      "PLATFORM_TREASURY",

    network:
      TronNetwork,
  ): Promise<
    TronSystemWalletDocument |
    null
  > {
    await ensureIndexes();

    const collection =
      await getTronSystemWalletsCollection();

    return collection.findOne({
      code,

      network,
    });
  }

  private async createSystemWallet(
    input: {
      code:
        "PLATFORM_TREASURY";

      network:
        TronNetwork;

      addressBase58:
        string;

      addressHex:
        string;

      encryptedPrivateKey:
        string;
    },
  ): Promise<
    TronSystemWalletDocument
  > {
    await ensureIndexes();

    const collection =
      await getTronSystemWalletsCollection();

    const now =
      new Date();

    const document:
      TronSystemWalletDocument =
        {
          code:
            input.code,

          network:
            input.network,

          addressBase58:
            input.addressBase58,

          addressHex:
            input.addressHex,

          encryptedPrivateKey:
            input.encryptedPrivateKey,

          status:
            "ACTIVE",

          createdAt:
            now,

          updatedAt:
            now,
        };

    try {
      const result =
        await collection.insertOne(
          document,
        );

      return {
        ...document,

        _id:
          result.insertedId,
      };
    } catch (
      error
    ) {
      if (
        error instanceof
          MongoServerError &&
        error.code ===
          11000
      ) {
        const existing =
          await this.findByCode(
            input.code,
            input.network,
          );

        if (
          existing
        ) {
          return existing;
        }
      }

      throw error;
    }
  }

  /*
   * ============================================================
   * PLATFORM TREASURY
   * ============================================================
   */

  async findPlatformTreasury(
    network:
      TronNetwork,
  ): Promise<
    TronSystemWalletDocument |
    null
  > {
    return this.findByCode(
      "PLATFORM_TREASURY",
      network,
    );
  }

  async createPlatformTreasury(
    input: {
      network:
        TronNetwork;

      addressBase58:
        string;

      addressHex:
        string;

      encryptedPrivateKey:
        string;
    },
  ): Promise<
    TronSystemWalletDocument
  > {
    return this.createSystemWallet({
      code:
        "PLATFORM_TREASURY",

      network:
        input.network,

      addressBase58:
        input.addressBase58,

      addressHex:
        input.addressHex,

      encryptedPrivateKey:
        input.encryptedPrivateKey,
    });
  }

}
