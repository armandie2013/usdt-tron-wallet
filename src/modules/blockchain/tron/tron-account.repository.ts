// import {
//   ObjectId,
//   type Collection,
//   type Filter,
// } from "mongodb";

// import {
//   getDb,
// } from "@/lib/db/mongodb";

// import type {
//   CreateTronAccountInput,
//   TronAccountDocument,
//   TronAccountPublic,
//   TronNetwork,
// } from "./tron.types";

// const COLLECTION_NAME =
//   "tron_accounts";

// export class TronAccountRepository {
//   private async getCollection():
//     Promise<
//       Collection<TronAccountDocument>
//     > {
//     const database =
//       await getDb();

//     const collection =
//       database.collection<TronAccountDocument>(
//         COLLECTION_NAME,
//       );

//     /*
//      * ========================================================
//      * ÍNDICES
//      * ========================================================
//      *
//      * Un usuario puede tener una dirección por red.
//      *
//      * Una misma dirección TRON no puede pertenecer
//      * a más de un usuario dentro de la misma red.
//      */

//     await collection.createIndex(
//       {
//         userId:
//           1,

//         network:
//           1,
//       },
//       {
//         unique:
//           true,

//         name:
//           "tron_account_user_network_unique",
//       },
//     );

//     await collection.createIndex(
//       {
//         addressBase58:
//           1,
//       },
//       {
//         unique:
//           true,

//         name:
//           "tron_account_address_unique",
//       },
//     );

//     await collection.createIndex(
//       {
//         network:
//           1,

//         createdAt:
//           1,
//       },
//       {
//         name:
//           "tron_account_network_created",
//       },
//     );

//     await collection.createIndex(
//       {
//         status:
//           1,

//         network:
//           1,
//       },
//       {
//         name:
//           "status_network",
//       },
//     );

//     return collection;
//   }

//   /*
//    * ========================================================
//    * FIND BY USER
//    * ========================================================
//    */

//   async findByUserId(
//     userId:
//       string,

//     network:
//       TronNetwork,
//   ): Promise<
//     TronAccountDocument |
//     null
//   > {
//     if (
//       !ObjectId.isValid(
//         userId,
//       )
//     ) {
//       return null;
//     }

//     const collection =
//       await this.getCollection();

//     return collection.findOne(
//       {
//         userId:
//           new ObjectId(
//             userId,
//           ),

//         network,
//       },
//     );
//   }

//   /*
//    * Alias explícito.
//    *
//    * Lo mantenemos porque partes actuales del proyecto
//    * pueden utilizar findDocumentByUserId().
//    */
//   async findDocumentByUserId(
//     userId:
//       string,

//     network:
//       TronNetwork,
//   ): Promise<
//     TronAccountDocument |
//     null
//   > {
//     return this.findByUserId(
//       userId,
//       network,
//     );
//   }

//   /*
//    * ========================================================
//    * FIND BY ADDRESS
//    * ========================================================
//    */

//   async findByAddress(
//     addressBase58:
//       string,

//     network?:
//       TronNetwork,
//   ): Promise<
//     TronAccountDocument |
//     null
//   > {
//     const collection =
//       await this.getCollection();

//     const address =
//       addressBase58.trim();

//     if (!address) {
//       return null;
//     }

//     const filter:
//       Filter<TronAccountDocument> =
//         network
//           ? {
//               addressBase58:
//                 address,

//               network,
//             }
//           : {
//               addressBase58:
//                 address,
//             };

//     return collection.findOne(
//       filter,
//     );
//   }

//   /*
//    * ========================================================
//    * CREAR WALLET NO-CUSTODIAL
//    * ========================================================
//    *
//    * IMPORTANTE:
//    *
//    * Este método recibe únicamente:
//    *
//    * - userId
//    * - network
//    * - addressBase58
//    * - addressHex
//    *
//    * Nunca recibe:
//    *
//    * - privateKey
//    * - mnemonic
//    * - encryptedPrivateKey
//    */

//   async create(
//     input:
//       CreateTronAccountInput,
//   ): Promise<
//     TronAccountDocument
//   > {
//     if (
//       !ObjectId.isValid(
//         input.userId,
//       )
//     ) {
//       throw new Error(
//         "El identificador del usuario no es válido.",
//       );
//     }

//     const addressBase58 =
//       input.addressBase58
//         .trim();

//     const addressHex =
//       input.addressHex
//         .trim()
//         .toUpperCase();

//     if (
//       !addressBase58
//     ) {
//       throw new Error(
//         "La dirección TRON Base58 es obligatoria.",
//       );
//     }

//     if (
//       !/^41[0-9A-F]{40}$/.test(
//         addressHex,
//       )
//     ) {
//       throw new Error(
//         "La dirección TRON hexadecimal no es válida.",
//       );
//     }

//     const collection =
//       await this.getCollection();

//     const userObjectId =
//       new ObjectId(
//         input.userId,
//       );

//     /*
//      * --------------------------------------------------------
//      * Primero comprobamos si el usuario ya posee
//      * una wallet en esta red.
//      * --------------------------------------------------------
//      */

//     const existingForUser =
//       await collection.findOne(
//         {
//           userId:
//             userObjectId,

//           network:
//             input.network,
//         },
//       );

//     if (
//       existingForUser
//     ) {
//       /*
//        * Si coincide exactamente con la dirección que
//        * intenta registrar el cliente, devolvemos la
//        * cuenta existente.
//        *
//        * Esto hace el registro idempotente.
//        */
//       if (
//         existingForUser
//           .addressBase58 ===
//           addressBase58 &&
//         existingForUser
//           .addressHex ===
//           addressHex
//       ) {
//         return existingForUser;
//       }

//       throw new Error(
//         "El usuario ya posee una wallet TRON registrada para esta red.",
//       );
//     }

//     /*
//      * --------------------------------------------------------
//      * Evitamos que una dirección ya registrada pueda
//      * asignarse a otro usuario.
//      * --------------------------------------------------------
//      */

//     const existingAddress =
//       await collection.findOne(
//         {
//           addressBase58,

//           network:
//             input.network,
//         },
//       );

//     if (
//       existingAddress
//     ) {
//       throw new Error(
//         "La dirección TRON ya se encuentra registrada.",
//       );
//     }

//     const now =
//       new Date();

//     const document:
//       TronAccountDocument =
//         {
//           userId:
//             userObjectId,

//           network:
//             input.network,

//           addressBase58,

//           addressHex,

//           walletType:
//             "NON_CUSTODIAL",

//           status:
//             "ACTIVE",

//           createdAt:
//             now,

//           updatedAt:
//             now,
//         };

//     const result =
//       await collection.insertOne(
//         document,
//       );

//     return {
//       ...document,

//       _id:
//         result.insertedId,
//     };
//   }

//   /*
//    * ========================================================
//    * LISTADO POR RED
//    * ========================================================
//    */

//   async listByNetwork(
//     network:
//       TronNetwork,
//   ): Promise<
//     TronAccountDocument[]
//   > {
//     const collection =
//       await this.getCollection();

//     return collection
//       .find({
//         network,
//       })
//       .sort({
//         createdAt:
//           1,

//         _id:
//           1,
//       })
//       .toArray();
//   }

//   /*
//    * ========================================================
//    * PAGINACIÓN
//    * ========================================================
//    *
//    * Lo mantenemos porque actualmente el scanner y
//    * algunos módulos administrativos lo utilizan.
//    */

//   async listByNetworkPaginated(
//     network:
//       TronNetwork,

//     skip:
//       number,

//     limit:
//       number,
//   ): Promise<
//     TronAccountDocument[]
//   > {
//     const collection =
//       await this.getCollection();

//     const safeSkip =
//       Number.isFinite(
//         skip,
//       )
//         ? Math.max(
//             0,
//             Math.floor(
//               skip,
//             ),
//           )
//         : 0;

//     const safeLimit =
//       Number.isFinite(
//         limit,
//       )
//         ? Math.min(
//             500,
//             Math.max(
//               1,
//               Math.floor(
//                 limit,
//               ),
//             ),
//           )
//         : 100;

//     return collection
//       .find({
//         network,
//       })
//       .sort({
//         createdAt:
//           1,

//         _id:
//           1,
//       })
//       .skip(
//         safeSkip,
//       )
//       .limit(
//         safeLimit,
//       )
//       .toArray();
//   }

//   /*
//    * ========================================================
//    * COUNT
//    * ========================================================
//    */

//   async countByNetwork(
//     network:
//       TronNetwork,
//   ): Promise<number> {
//     const collection =
//       await this.getCollection();

//     return collection.countDocuments(
//       {
//         network,
//       },
//     );
//   }

//   /*
//    * ========================================================
//    * ESTADO
//    * ========================================================
//    */

//   async setStatus(
//     userId:
//       string,

//     network:
//       TronNetwork,

//     status:
//       "ACTIVE" |
//       "DISABLED",
//   ): Promise<boolean> {
//     if (
//       !ObjectId.isValid(
//         userId,
//       )
//     ) {
//       return false;
//     }

//     const collection =
//       await this.getCollection();

//     const result =
//       await collection.updateOne(
//         {
//           userId:
//             new ObjectId(
//               userId,
//             ),

//           network,
//         },
//         {
//           $set: {
//             status,

//             updatedAt:
//               new Date(),
//           },
//         },
//       );

//     return (
//       result.matchedCount >
//       0
//     );
//   }

//   /*
//    * ========================================================
//    * CONVERSIÓN PÚBLICA
//    * ========================================================
//    *
//    * Nunca devolvemos accidentalmente el documento
//    * MongoDB completo hacia una API.
//    *
//    * Actualmente ya no contiene secretos, pero
//    * mantenemos igualmente una capa explícita.
//    */

//   toPublic(
//     document:
//       TronAccountDocument,
//   ): TronAccountPublic {
//     if (
//       !document._id
//     ) {
//       throw new Error(
//         "La cuenta TRON no posee un identificador.",
//       );
//     }

//     return {
//       id:
//         document._id
//           .toString(),

//       userId:
//         document.userId
//           .toString(),

//       network:
//         document.network,

//       addressBase58:
//         document
//           .addressBase58,

//       addressHex:
//         document
//           .addressHex,

//       walletType:
//         document
//           .walletType,

//       status:
//         document.status,

//       createdAt:
//         document
//           .createdAt
//           .toISOString(),

//       updatedAt:
//         document
//           .updatedAt
//           .toISOString(),
//     };
//   }
// }
import {
  MongoServerError,
  ObjectId,
  type Collection,
  type Filter,
} from "mongodb";

import {
  getDb,
} from "@/lib/db/mongodb";

import type {
  CreateTronAccountInput,
  TronAccountDocument,
  TronAccountPublic,
  TronNetwork,
} from "./tron.types";

const COLLECTION_NAME =
  "tron_accounts";

export class TronAccountRepository {
  private async getCollection():
    Promise<
      Collection<TronAccountDocument>
    > {
    const database =
      await getDb();

    const collection =
      database.collection<TronAccountDocument>(
        COLLECTION_NAME,
      );

    /*
     * ========================================================
     * ÍNDICES
     * ========================================================
     *
     * Un usuario puede tener una dirección por red.
     *
     * Una misma dirección TRON no puede pertenecer
     * a más de un usuario dentro de la misma red.
     */

    await collection.createIndex(
      {
        userId:
          1,

        network:
          1,
      },
      {
        unique:
          true,

        name:
          "tron_account_user_network_unique",
      },
    );

    await collection.createIndex(
      {
        addressBase58:
          1,

        network:
          1,
      },
      {
        unique:
          true,

        name:
          "tron_account_address_network_unique",
      },
    );

    /*
     * Migración del índice anterior.
     *
     * La dirección TRON derivada de una misma clave es igual
     * en Nile y Mainnet. Por eso la unicidad debe incluir la
     * red y no puede ser global por addressBase58.
     *
     * Primero creamos el índice compuesto y recién después
     * retiramos el índice heredado para no dejar una ventana
     * sin protección contra duplicados.
     */
    if (
      await collection.indexExists(
        "tron_account_address_unique",
      )
    ) {
      try {
        await collection.dropIndex(
          "tron_account_address_unique",
        );
      } catch (error) {
        /*
         * Dos procesos pueden ejecutar la migración al mismo
         * tiempo. Si el otro ya eliminó el índice, el estado
         * final esperado ya fue alcanzado.
         */
        if (
          !(error instanceof
            MongoServerError) ||
          error.code !==
            27
        ) {
          throw error;
        }
      }
    }

    await collection.createIndex(
      {
        network:
          1,

        createdAt:
          1,
      },
      {
        name:
          "tron_account_network_created",
      },
    );

    await collection.createIndex(
      {
        status:
          1,

        network:
          1,
      },
      {
        name:
          "status_network",
      },
    );

    return collection;
  }

  /*
   * ========================================================
   * FIND BY USER
   * ========================================================
   */

  async findByUserId(
    userId:
      string,

    network:
      TronNetwork,
  ): Promise<
    TronAccountDocument |
    null
  > {
    if (
      !ObjectId.isValid(
        userId,
      )
    ) {
      return null;
    }

    const collection =
      await this.getCollection();

    return collection.findOne(
      {
        userId:
          new ObjectId(
            userId,
          ),

        network,
      },
    );
  }

  /*
   * Alias explícito.
   *
   * Lo mantenemos porque partes actuales del proyecto
   * pueden utilizar findDocumentByUserId().
   */
  async findDocumentByUserId(
    userId:
      string,

    network:
      TronNetwork,
  ): Promise<
    TronAccountDocument |
    null
  > {
    return this.findByUserId(
      userId,
      network,
    );
  }

  /*
   * ========================================================
   * FIND BY ADDRESS
   * ========================================================
   */

  async findByAddress(
    addressBase58:
      string,

    network?:
      TronNetwork,
  ): Promise<
    TronAccountDocument |
    null
  > {
    const collection =
      await this.getCollection();

    const address =
      addressBase58.trim();

    if (!address) {
      return null;
    }

    const filter:
      Filter<TronAccountDocument> =
        network
          ? {
              addressBase58:
                address,

              network,
            }
          : {
              addressBase58:
                address,
            };

    return collection.findOne(
      filter,
    );
  }

  /*
   * ========================================================
   * CREAR WALLET NO-CUSTODIAL
   * ========================================================
   *
   * IMPORTANTE:
   *
   * Este método recibe únicamente:
   *
   * - userId
   * - network
   * - addressBase58
   * - addressHex
   *
   * Nunca recibe:
   *
   * - privateKey
   * - mnemonic
   * - encryptedPrivateKey
   */

  async create(
    input:
      CreateTronAccountInput,
  ): Promise<
    TronAccountDocument
  > {
    if (
      !ObjectId.isValid(
        input.userId,
      )
    ) {
      throw new Error(
        "El identificador del usuario no es válido.",
      );
    }

    const addressBase58 =
      input.addressBase58
        .trim();

    const addressHex =
      input.addressHex
        .trim()
        .toUpperCase();

    if (
      !addressBase58
    ) {
      throw new Error(
        "La dirección TRON Base58 es obligatoria.",
      );
    }

    if (
      !/^41[0-9A-F]{40}$/.test(
        addressHex,
      )
    ) {
      throw new Error(
        "La dirección TRON hexadecimal no es válida.",
      );
    }

    const collection =
      await this.getCollection();

    const userObjectId =
      new ObjectId(
        input.userId,
      );

    /*
     * --------------------------------------------------------
     * Primero comprobamos si el usuario ya posee
     * una wallet en esta red.
     * --------------------------------------------------------
     */

    const existingForUser =
      await collection.findOne(
        {
          userId:
            userObjectId,

          network:
            input.network,
        },
      );

    if (
      existingForUser
    ) {
      /*
       * Si coincide exactamente con la dirección que
       * intenta registrar el cliente, devolvemos la
       * cuenta existente.
       *
       * Esto hace el registro idempotente.
       */
      if (
        existingForUser
          .addressBase58 ===
          addressBase58 &&
        existingForUser
          .addressHex ===
          addressHex
      ) {
        return existingForUser;
      }

      throw new Error(
        "El usuario ya posee una wallet TRON registrada para esta red.",
      );
    }

    /*
     * --------------------------------------------------------
     * Evitamos que una dirección ya registrada pueda
     * asignarse a otro usuario.
     * --------------------------------------------------------
     */

    const existingAddress =
      await collection.findOne(
        {
          addressBase58,

          network:
            input.network,
        },
      );

    if (
      existingAddress
    ) {
      throw new Error(
        "La dirección TRON ya se encuentra registrada.",
      );
    }

    const now =
      new Date();

    const document:
      TronAccountDocument =
        {
          userId:
            userObjectId,

          network:
            input.network,

          addressBase58,

          addressHex,

          walletType:
            "NON_CUSTODIAL",

          status:
            "ACTIVE",

          createdAt:
            now,

          updatedAt:
            now,
        };

    const result =
      await collection.insertOne(
        document,
      );

    return {
      ...document,

      _id:
        result.insertedId,
    };
  }

  /*
   * ========================================================
   * LISTADO POR RED
   * ========================================================
   */

  async listByNetwork(
    network:
      TronNetwork,
  ): Promise<
    TronAccountDocument[]
  > {
    const collection =
      await this.getCollection();

    return collection
      .find({
        network,
      })
      .sort({
        createdAt:
          1,

        _id:
          1,
      })
      .toArray();
  }

  /*
   * ========================================================
   * PAGINACIÓN
   * ========================================================
   *
   * Lo mantenemos porque actualmente el scanner y
   * algunos módulos administrativos lo utilizan.
   */

  async listByNetworkPaginated(
    network:
      TronNetwork,

    skip:
      number,

    limit:
      number,
  ): Promise<
    TronAccountDocument[]
  > {
    const collection =
      await this.getCollection();

    const safeSkip =
      Number.isFinite(
        skip,
      )
        ? Math.max(
            0,
            Math.floor(
              skip,
            ),
          )
        : 0;

    const safeLimit =
      Number.isFinite(
        limit,
      )
        ? Math.min(
            500,
            Math.max(
              1,
              Math.floor(
                limit,
              ),
            ),
          )
        : 100;

    return collection
      .find({
        network,
      })
      .sort({
        createdAt:
          1,

        _id:
          1,
      })
      .skip(
        safeSkip,
      )
      .limit(
        safeLimit,
      )
      .toArray();
  }

  /*
   * ========================================================
   * COUNT
   * ========================================================
   */

  async countByNetwork(
    network:
      TronNetwork,
  ): Promise<number> {
    const collection =
      await this.getCollection();

    return collection.countDocuments(
      {
        network,
      },
    );
  }

  /*
   * ========================================================
   * ESTADO
   * ========================================================
   */

  async setStatus(
    userId:
      string,

    network:
      TronNetwork,

    status:
      "ACTIVE" |
      "DISABLED",
  ): Promise<boolean> {
    if (
      !ObjectId.isValid(
        userId,
      )
    ) {
      return false;
    }

    const collection =
      await this.getCollection();

    const result =
      await collection.updateOne(
        {
          userId:
            new ObjectId(
              userId,
            ),

          network,
        },
        {
          $set: {
            status,

            updatedAt:
              new Date(),
          },
        },
      );

    return (
      result.matchedCount >
      0
    );
  }

  /*
   * ========================================================
   * CONVERSIÓN PÚBLICA
   * ========================================================
   *
   * Nunca devolvemos accidentalmente el documento
   * MongoDB completo hacia una API.
   *
   * Actualmente ya no contiene secretos, pero
   * mantenemos igualmente una capa explícita.
   */

  toPublic(
    document:
      TronAccountDocument,
  ): TronAccountPublic {
    if (
      !document._id
    ) {
      throw new Error(
        "La cuenta TRON no posee un identificador.",
      );
    }

    return {
      id:
        document._id
          .toString(),

      userId:
        document.userId
          .toString(),

      network:
        document.network,

      addressBase58:
        document
          .addressBase58,

      addressHex:
        document
          .addressHex,

      walletType:
        document
          .walletType,

      status:
        document.status,

      createdAt:
        document
          .createdAt
          .toISOString(),

      updatedAt:
        document
          .updatedAt
          .toISOString(),
    };
  }
}
