// import {
//   ObjectId,
// } from "mongodb";

// import {
//   getSweepsCollection,
// } from "./sweep.model";

// import type {
//   SweepDocument,
// } from "./sweep.model";

// let indexesReady =
//   false;

// async function ensureIndexes():
//   Promise<void> {
//   if (indexesReady) {
//     return;
//   }

//   const collection =
//     await getSweepsCollection();

//   await collection.createIndex(
//     {
//       txid: 1,
//     },
//     {
//       unique: true,
//       sparse: true,
//       name:
//         "sweep_txid_unique",
//     },
//   );

//   await collection.createIndex(
//     {
//       fromAddress: 1,
//       status: 1,
//     },
//     {
//       name:
//         "sweep_from_status",
//     },
//   );

//   await collection.createIndex(
//     {
//       createdAt: -1,
//     },
//     {
//       name:
//         "sweep_created",
//     },
//   );

//   indexesReady =
//     true;
// }

// export class SweepRepository {
//   async hasActiveSweep(
//     fromAddress:
//       string,
//   ): Promise<boolean> {
//     await ensureIndexes();

//     const collection =
//       await getSweepsCollection();

//     const existing =
//       await collection.findOne(
//         {
//           fromAddress,

//           status: {
//             $in: [
//               "PLANNED",
//               "BROADCASTED",
//             ],
//           },
//         },
//         {
//           projection: {
//             _id: 1,
//           },
//         },
//       );

//     return Boolean(
//       existing,
//     );
//   }

//   async createPlanned(
//     input: {
//       network:
//         "NILE" | "MAINNET";

//       userId:
//         string;

//       tronAccountId:
//         string;

//       fromAddress:
//         string;

//       toAddress:
//         string;

//       amountUnits:
//         bigint;
//     },
//   ): Promise<
//     SweepDocument
//   > {
//     await ensureIndexes();

//     const collection =
//       await getSweepsCollection();

//     const now =
//       new Date();

//     const document:
//       SweepDocument = {
//       network:
//         input.network,

//       userId:
//         new ObjectId(
//           input.userId,
//         ),

//       tronAccountId:
//         new ObjectId(
//           input.tronAccountId,
//         ),

//       fromAddress:
//         input.fromAddress,

//       toAddress:
//         input.toAddress,

//       asset:
//         "USDT",

//       amountUnits:
//         input.amountUnits.toString(),

//       status:
//         "PLANNED",

//       createdAt:
//         now,

//       updatedAt:
//         now,
//     };

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

//   async markBroadcasted(
//     sweepId:
//       string,

//     txid:
//       string,
//   ): Promise<void> {
//     await ensureIndexes();

//     const collection =
//       await getSweepsCollection();

//     await collection.updateOne(
//       {
//         _id:
//           new ObjectId(
//             sweepId,
//           ),
//       },
//       {
//         $set: {
//           status:
//             "BROADCASTED",

//           txid,

//           broadcastedAt:
//             new Date(),

//           updatedAt:
//             new Date(),
//         },

//         $unset: {
//           errorMessage:
//             "",
//         },
//       },
//     );
//   }

//   async markFailed(
//     sweepId:
//       string,

//     errorMessage:
//       string,
//   ): Promise<void> {
//     await ensureIndexes();

//     const collection =
//       await getSweepsCollection();

//     await collection.updateOne(
//       {
//         _id:
//           new ObjectId(
//             sweepId,
//           ),
//       },
//       {
//         $set: {
//           status:
//             "FAILED",

//           errorMessage,

//           updatedAt:
//             new Date(),
//         },
//       },
//     );
//   }
//   async listBroadcasted(
//   limit:
//     number,
// ): Promise<
//   SweepDocument[]
// > {
//   await ensureIndexes();

//   const collection =
//     await getSweepsCollection();

//   return collection
//     .find({
//       status:
//         "BROADCASTED",
//     })
//     .sort({
//       broadcastedAt: 1,
//     })
//     .limit(
//       limit,
//     )
//     .toArray();
// }

// async markConfirmed(
//   sweepId:
//     string,
// ): Promise<void> {
//   await ensureIndexes();

//   const collection =
//     await getSweepsCollection();

//   const now =
//     new Date();

//   await collection.updateOne(
//     {
//       _id:
//         new ObjectId(
//           sweepId,
//         ),

//       status:
//         "BROADCASTED",
//     },

//     {
//       $set: {
//         status:
//           "CONFIRMED",

//         confirmedAt:
//           now,

//         updatedAt:
//           now,
//       },

//       $unset: {
//         errorMessage:
//           "",
//       },
//     },
//   );
// }

// async markFailedByTx(
//   sweepId:
//     string,

//   errorMessage:
//     string,
// ): Promise<void> {
//   await ensureIndexes();

//   const collection =
//     await getSweepsCollection();

//   await collection.updateOne(
//     {
//       _id:
//         new ObjectId(
//           sweepId,
//         ),

//       status:
//         "BROADCASTED",
//     },

//     {
//       $set: {
//         status:
//           "FAILED",

//         errorMessage,

//         updatedAt:
//           new Date(),
//       },
//     },
//   );
// }
// }

import {
  AppError,
} from "@/lib/errors/app-error";

import type {
  SweepDocument,
} from "./sweep.model";

function sweepRepositoryDisabled():
  never {
  throw new AppError(
    "El repositorio de sweeps está retirado del modelo no-custodial.",
    "NON_CUSTODIAL_SWEEP_DISABLED",
    410,
  );
}

/*
 * ============================================================
 * SWEEP REPOSITORY
 * ============================================================
 *
 * Conserva temporalmente las firmas públicas del repositorio
 * heredado para no provocar errores de compilación si queda
 * alguna importación durante la migración.
 *
 * Ningún método consulta ni modifica MongoDB. Toda operación
 * queda bloqueada para impedir que se reactive accidentalmente
 * el flujo custodial anterior.
 */

export class SweepRepository {
  async hasActiveSweep(
    _fromAddress:
      string,
  ): Promise<boolean> {
    return sweepRepositoryDisabled();
  }

  async createPlanned(
    _input: {
      network:
        "NILE" | "MAINNET";

      userId:
        string;

      tronAccountId:
        string;

      fromAddress:
        string;

      toAddress:
        string;

      amountUnits:
        bigint;
    },
  ): Promise<
    SweepDocument
  > {
    return sweepRepositoryDisabled();
  }

  async markBroadcasted(
    _sweepId:
      string,

    _txid:
      string,
  ): Promise<void> {
    return sweepRepositoryDisabled();
  }

  async markFailed(
    _sweepId:
      string,

    _errorMessage:
      string,
  ): Promise<void> {
    return sweepRepositoryDisabled();
  }

  async listBroadcasted(
    _limit:
      number,
  ): Promise<
    SweepDocument[]
  > {
    return sweepRepositoryDisabled();
  }

  async markConfirmed(
    _sweepId:
      string,
  ): Promise<void> {
    return sweepRepositoryDisabled();
  }

  async markFailedByTx(
    _sweepId:
      string,

    _errorMessage:
      string,
  ): Promise<void> {
    return sweepRepositoryDisabled();
  }
}
