// // import {
// //   randomBytes,
// // } from "crypto";

// // import {
// //   NextResponse,
// // } from "next/server";

// // import {
// //   cookies,
// // } from "next/headers";

// // import {
// //   z,
// // } from "zod";

// // import {
// //   TronWeb,
// // } from "tronweb";

// // import {
// //   AppError,
// // } from "@/lib/errors/app-error";

// // import {
// //   ACCESS_TOKEN_COOKIE,
// //   verifyAccessToken,
// // } from "@/modules/auth/auth.tokens";

// // import {
// //   TronAddressChallengeRepository,
// // } from "@/modules/blockchain/tron/tron-address-challenge.repository";

// // import type {
// //   TronNetwork,
// // } from "@/modules/blockchain/tron/tron.types";

// // /*
// //  * ============================================================
// //  * CONFIGURACIÓN
// //  * ============================================================
// //  */

// // const CHALLENGE_TTL_MS =
// //   5 * 60 * 1000;

// // /*
// //  * ============================================================
// //  * BODY
// //  * ============================================================
// //  */

// // const requestSchema =
// //   z
// //     .object({
// //       addressBase58:
// //         z
// //           .string()
// //           .trim()
// //           .min(
// //             1,
// //             "La dirección TRON es obligatoria.",
// //           ),

// //       addressHex:
// //         z
// //           .string()
// //           .trim()
// //           .min(
// //             1,
// //             "La dirección hexadecimal es obligatoria.",
// //           ),
// //     })
// //     .strict();

// // /*
// //  * ============================================================
// //  * AUTH
// //  * ============================================================
// //  */

// // interface AuthenticatedUser {
// //   id:
// //     string;

// //   role:
// //     "ADMIN"
// //     | "USER";
// // }

// // async function getAuthenticatedUser():
// //   Promise<AuthenticatedUser> {
// //   const cookieStore =
// //     await cookies();

// //   const token =
// //     cookieStore
// //       .get(
// //         ACCESS_TOKEN_COOKIE,
// //       )
// //       ?.value;

// //   if (
// //     !token
// //   ) {
// //     throw new AppError(
// //       "No autenticado.",
// //       "UNAUTHORIZED",
// //       401,
// //     );
// //   }

// //   try {
// //     const payload =
// //       await verifyAccessToken(
// //         token,
// //       );

// //     if (
// //       !payload.sub
// //     ) {
// //       throw new Error(
// //         "Token sin identificador de usuario.",
// //       );
// //     }

// //     return {
// //       id:
// //         payload.sub,

// //       role:
// //         payload.role,
// //     };
// //   } catch {
// //     throw new AppError(
// //       "La sesión no es válida o ha expirado.",
// //       "INVALID_ACCESS_TOKEN",
// //       401,
// //     );
// //   }
// // }

// // /*
// //  * ============================================================
// //  * RED
// //  * ============================================================
// //  */

// // function getNetwork():
// //   TronNetwork {
// //   const value =
// //     process.env
// //       .TRON_NETWORK
// //       ?.trim()
// //       .toLowerCase();

// //   return value ===
// //     "mainnet"
// //     ? "MAINNET"
// //     : "NILE";
// // }

// // /*
// //  * ============================================================
// //  * DIRECCIONES
// //  * ============================================================
// //  */

// // function normalizeAndValidateAddresses(
// //   addressBase58:
// //     string,

// //   addressHex:
// //     string,
// // ): {
// //   addressBase58:
// //     string;

// //   addressHex:
// //     string;
// // } {
// //   const normalizedBase58 =
// //     addressBase58.trim();

// //   const normalizedHex =
// //     addressHex
// //       .trim()
// //       .replace(
// //         /^0x/i,
// //         "",
// //       )
// //       .toUpperCase();

// //   if (
// //     !TronWeb.isAddress(
// //       normalizedBase58,
// //     )
// //   ) {
// //     throw new AppError(
// //       "La dirección TRON Base58 no es válida.",
// //       "INVALID_TRON_ADDRESS",
// //       400,
// //     );
// //   }

// //   if (
// //     !/^41[0-9A-F]{40}$/.test(
// //       normalizedHex,
// //     )
// //   ) {
// //     throw new AppError(
// //       "La dirección TRON hexadecimal no es válida.",
// //       "INVALID_TRON_HEX_ADDRESS",
// //       400,
// //     );
// //   }

// //   let derivedBase58:
// //     string;

// //   try {
// //     derivedBase58 =
// //       TronWeb
// //         .address
// //         .fromHex(
// //           normalizedHex,
// //         );
// //   } catch {
// //     throw new AppError(
// //       "No se pudo interpretar la dirección TRON hexadecimal.",
// //       "INVALID_TRON_HEX_ADDRESS",
// //       400,
// //     );
// //   }

// //   if (
// //     derivedBase58 !==
// //       normalizedBase58
// //   ) {
// //     throw new AppError(
// //       "La dirección Base58 y la dirección hexadecimal no corresponden a la misma wallet.",
// //       "TRON_ADDRESS_MISMATCH",
// //       400,
// //     );
// //   }

// //   return {
// //     addressBase58:
// //       normalizedBase58,

// //     addressHex:
// //       normalizedHex,
// //   };
// // }

// // /*
// //  * ============================================================
// //  * MENSAJE
// //  * ============================================================
// //  *
// //  * El mensaje es determinista y explícito.
// //  *
// //  * La firma solamente autoriza:
// //  * - registrar esta dirección;
// //  * - para este usuario;
// //  * - en esta red;
// //  * - con este nonce;
// //  * - dentro de esta ventana temporal.
// //  */

// // function buildChallengeMessage(input: {
// //   userId:
// //     string;

// //   network:
// //     TronNetwork;

// //   addressBase58:
// //     string;

// //   addressHex:
// //     string;

// //   nonce:
// //     string;

// //   expiresAt:
// //     Date;
// // }): string {
// //   return [
// //     "TRON Wallet Ownership Verification",
// //     "",
// //     "Purpose: REGISTER_TRON_ADDRESS",
// //     `User ID: ${input.userId}`,
// //     `Network: ${input.network}`,
// //     `Address Base58: ${input.addressBase58}`,
// //     `Address Hex: ${input.addressHex}`,
// //     `Nonce: ${input.nonce}`,
// //     `Expires At: ${input.expiresAt.toISOString()}`,
// //     "",
// //     "Signing this message proves control of the private key for this address.",
// //     "This signature does not authorize any blockchain transfer.",
// //   ].join(
// //     "\n",
// //   );
// // }

// // /*
// //  * ============================================================
// //  * POST /api/v1/wallet/address-challenge
// //  * ============================================================
// //  *
// //  * Solamente los usuarios USER pueden demostrar propiedad
// //  * de una wallet personal.
// //  *
// //  * ADMIN:
// //  *
// //  * - no posee wallet personal;
// //  * - no puede registrar una dirección TRON;
// //  * - no puede crear challenges de propiedad;
// //  * - no participa del flujo no-custodial.
// //  *
// //  * La wallet de plataforma se administra por rutas ADMIN
// //  * separadas y no utiliza este endpoint.
// //  */

// // export async function POST(
// //   request:
// //     Request,
// // ) {
// //   try {
// //     const authenticatedUser =
// //       await getAuthenticatedUser();

// //     /*
// //      * ========================================================
// //      * ADMIN NO PUEDE CREAR CHALLENGE DE WALLET PERSONAL
// //      * ========================================================
// //      */

// //     if (
// //       authenticatedUser.role ===
// //       "ADMIN"
// //     ) {
// //       throw new AppError(
// //         "Las cuentas administradoras no pueden registrar ni verificar una wallet personal.",
// //         "WALLET_NOT_ALLOWED_FOR_ADMIN",
// //         403,
// //       );
// //     }

// //     const userId =
// //       authenticatedUser.id;

// //     let rawBody:
// //       unknown;

// //     try {
// //       rawBody =
// //         await request.json();
// //     } catch {
// //       throw new AppError(
// //         "El cuerpo de la solicitud no es JSON válido.",
// //         "INVALID_JSON",
// //         400,
// //       );
// //     }

// //     const parsed =
// //       requestSchema
// //         .safeParse(
// //           rawBody,
// //         );

// //     if (
// //       !parsed.success
// //     ) {
// //       throw new AppError(
// //         parsed.error
// //           .issues[0]
// //           ?.message ??
// //           "Los datos enviados no son válidos.",
// //         "INVALID_CHALLENGE_REQUEST",
// //         400,
// //       );
// //     }

// //     const addresses =
// //       normalizeAndValidateAddresses(
// //         parsed.data
// //           .addressBase58,

// //         parsed.data
// //           .addressHex,
// //       );

// //     const network =
// //       getNetwork();

// //     const nonce =
// //       randomBytes(
// //         32,
// //       ).toString(
// //         "hex",
// //       );

// //     const expiresAt =
// //       new Date(
// //         Date.now() +
// //           CHALLENGE_TTL_MS,
// //       );

// //     const message =
// //       buildChallengeMessage({
// //         userId,

// //         network,

// //         addressBase58:
// //           addresses
// //             .addressBase58,

// //         addressHex:
// //           addresses
// //             .addressHex,

// //         nonce,

// //         expiresAt,
// //       });

// //     const repository =
// //       new TronAddressChallengeRepository();

// //     const challenge =
// //       await repository
// //         .create({
// //           userId,

// //           network,

// //           addressBase58:
// //             addresses
// //               .addressBase58,

// //           addressHex:
// //             addresses
// //               .addressHex,

// //           message,

// //           nonce,

// //           expiresAt,
// //         });

// //     if (
// //       !challenge._id
// //     ) {
// //       throw new AppError(
// //         "El challenge no posee un identificador válido.",
// //         "INVALID_CHALLENGE",
// //         500,
// //       );
// //     }

// //     return NextResponse.json(
// //       {
// //         success:
// //           true,

// //         challenge: {
// //           id:
// //             challenge
// //               ._id
// //               .toString(),

// //           network:
// //             challenge
// //               .network,

// //           addressBase58:
// //             challenge
// //               .addressBase58,

// //           addressHex:
// //             challenge
// //               .addressHex,

// //           message:
// //             challenge
// //               .message,

// //           expiresAt:
// //             challenge
// //               .expiresAt
// //               .toISOString(),
// //         },
// //       },
// //       {
// //         status:
// //           201,
// //       },
// //     );
// //   } catch (
// //     error
// //   ) {
// //     if (
// //       error instanceof
// //       AppError
// //     ) {
// //       return NextResponse.json(
// //         {
// //           success:
// //             false,

// //           code:
// //             error.code,

// //           message:
// //             error.message,
// //         },
// //         {
// //           status:
// //             error.statusCode,
// //         },
// //       );
// //     }

// //     console.error(
// //       "[WALLET ADDRESS CHALLENGE]",
// //       error,
// //     );

// //     return NextResponse.json(
// //       {
// //         success:
// //           false,

// //         code:
// //           "INTERNAL_SERVER_ERROR",

// //         message:
// //           "No se pudo generar el challenge de propiedad de la wallet.",
// //       },
// //       {
// //         status:
// //           500,
// //       },
// //     );
// //   }
// // }
// import {
//   randomBytes,
// } from "crypto";

// import {
//   NextResponse,
// } from "next/server";

// import {
//   cookies,
// } from "next/headers";

// import {
//   z,
// } from "zod";

// import {
//   TronWeb,
// } from "tronweb";

// import {
//   AppError,
// } from "@/lib/errors/app-error";

// import {
//   ACCESS_TOKEN_COOKIE,
//   verifyAccessToken,
// } from "@/modules/auth/auth.tokens";

// import {
//   TronAddressChallengeRepository,
// } from "@/modules/blockchain/tron/tron-address-challenge.repository";

// import {
//   getConfiguredTronNetwork,
// } from "@/modules/blockchain/tron/tron.config";

// import type {
//   TronNetwork,
// } from "@/modules/blockchain/tron/tron.types";

// /*
//  * ============================================================
//  * CONFIGURACIÓN
//  * ============================================================
//  */

// const CHALLENGE_TTL_MS =
//   5 * 60 * 1000;

// /*
//  * ============================================================
//  * BODY
//  * ============================================================
//  */

// const requestSchema =
//   z
//     .object({
//       addressBase58:
//         z
//           .string()
//           .trim()
//           .min(
//             1,
//             "La dirección TRON es obligatoria.",
//           ),

//       addressHex:
//         z
//           .string()
//           .trim()
//           .min(
//             1,
//             "La dirección hexadecimal es obligatoria.",
//           ),
//     })
//     .strict();

// /*
//  * ============================================================
//  * AUTH
//  * ============================================================
//  */

// interface AuthenticatedUser {
//   id:
//     string;

//   role:
//     "ADMIN"
//     | "USER";
// }

// async function getAuthenticatedUser():
//   Promise<AuthenticatedUser> {
//   const cookieStore =
//     await cookies();

//   const token =
//     cookieStore
//       .get(
//         ACCESS_TOKEN_COOKIE,
//       )
//       ?.value;

//   if (
//     !token
//   ) {
//     throw new AppError(
//       "No autenticado.",
//       "UNAUTHORIZED",
//       401,
//     );
//   }

//   try {
//     const payload =
//       await verifyAccessToken(
//         token,
//       );

//     if (
//       !payload.sub
//     ) {
//       throw new Error(
//         "Token sin identificador de usuario.",
//       );
//     }

//     return {
//       id:
//         payload.sub,

//       role:
//         payload.role,
//     };
//   } catch {
//     throw new AppError(
//       "La sesión no es válida o ha expirado.",
//       "INVALID_ACCESS_TOKEN",
//       401,
//     );
//   }
// }

// /*
//  * ============================================================
//  * RED
//  * ============================================================
//  */

// function getNetwork():
//   TronNetwork {
//   return getConfiguredTronNetwork();
// }

// /*
//  * ============================================================
//  * DIRECCIONES
//  * ============================================================
//  */

// function normalizeAndValidateAddresses(
//   addressBase58:
//     string,

//   addressHex:
//     string,
// ): {
//   addressBase58:
//     string;

//   addressHex:
//     string;
// } {
//   const normalizedBase58 =
//     addressBase58.trim();

//   const normalizedHex =
//     addressHex
//       .trim()
//       .replace(
//         /^0x/i,
//         "",
//       )
//       .toUpperCase();

//   if (
//     !TronWeb.isAddress(
//       normalizedBase58,
//     )
//   ) {
//     throw new AppError(
//       "La dirección TRON Base58 no es válida.",
//       "INVALID_TRON_ADDRESS",
//       400,
//     );
//   }

//   if (
//     !/^41[0-9A-F]{40}$/.test(
//       normalizedHex,
//     )
//   ) {
//     throw new AppError(
//       "La dirección TRON hexadecimal no es válida.",
//       "INVALID_TRON_HEX_ADDRESS",
//       400,
//     );
//   }

//   let derivedBase58:
//     string;

//   try {
//     derivedBase58 =
//       TronWeb
//         .address
//         .fromHex(
//           normalizedHex,
//         );
//   } catch {
//     throw new AppError(
//       "No se pudo interpretar la dirección TRON hexadecimal.",
//       "INVALID_TRON_HEX_ADDRESS",
//       400,
//     );
//   }

//   if (
//     derivedBase58 !==
//       normalizedBase58
//   ) {
//     throw new AppError(
//       "La dirección Base58 y la dirección hexadecimal no corresponden a la misma wallet.",
//       "TRON_ADDRESS_MISMATCH",
//       400,
//     );
//   }

//   return {
//     addressBase58:
//       normalizedBase58,

//     addressHex:
//       normalizedHex,
//   };
// }

// /*
//  * ============================================================
//  * MENSAJE
//  * ============================================================
//  *
//  * El mensaje es determinista y explícito.
//  *
//  * La firma solamente autoriza:
//  * - registrar esta dirección;
//  * - para este usuario;
//  * - en esta red;
//  * - con este nonce;
//  * - dentro de esta ventana temporal.
//  */

// function buildChallengeMessage(input: {
//   userId:
//     string;

//   network:
//     TronNetwork;

//   addressBase58:
//     string;

//   addressHex:
//     string;

//   nonce:
//     string;

//   expiresAt:
//     Date;
// }): string {
//   return [
//     "TRON Wallet Ownership Verification",
//     "",
//     "Purpose: REGISTER_TRON_ADDRESS",
//     `User ID: ${input.userId}`,
//     `Network: ${input.network}`,
//     `Address Base58: ${input.addressBase58}`,
//     `Address Hex: ${input.addressHex}`,
//     `Nonce: ${input.nonce}`,
//     `Expires At: ${input.expiresAt.toISOString()}`,
//     "",
//     "Signing this message proves control of the private key for this address.",
//     "This signature does not authorize any blockchain transfer.",
//   ].join(
//     "\n",
//   );
// }

// /*
//  * ============================================================
//  * POST /api/v1/wallet/address-challenge
//  * ============================================================
//  *
//  * Solamente los usuarios USER pueden demostrar propiedad
//  * de una wallet personal.
//  *
//  * ADMIN:
//  *
//  * - no posee wallet personal;
//  * - no puede registrar una dirección TRON;
//  * - no puede crear challenges de propiedad;
//  * - no participa del flujo no-custodial.
//  *
//  * La wallet de plataforma se administra por rutas ADMIN
//  * separadas y no utiliza este endpoint.
//  */

// export async function POST(
//   request:
//     Request,
// ) {
//   try {
//     const authenticatedUser =
//       await getAuthenticatedUser();

//     /*
//      * ========================================================
//      * ADMIN NO PUEDE CREAR CHALLENGE DE WALLET PERSONAL
//      * ========================================================
//      */

//     if (
//       authenticatedUser.role ===
//       "ADMIN"
//     ) {
//       throw new AppError(
//         "Las cuentas administradoras no pueden registrar ni verificar una wallet personal.",
//         "WALLET_NOT_ALLOWED_FOR_ADMIN",
//         403,
//       );
//     }

//     const userId =
//       authenticatedUser.id;

//     let rawBody:
//       unknown;

//     try {
//       rawBody =
//         await request.json();
//     } catch {
//       throw new AppError(
//         "El cuerpo de la solicitud no es JSON válido.",
//         "INVALID_JSON",
//         400,
//       );
//     }

//     const parsed =
//       requestSchema
//         .safeParse(
//           rawBody,
//         );

//     if (
//       !parsed.success
//     ) {
//       throw new AppError(
//         parsed.error
//           .issues[0]
//           ?.message ??
//           "Los datos enviados no son válidos.",
//         "INVALID_CHALLENGE_REQUEST",
//         400,
//       );
//     }

//     const addresses =
//       normalizeAndValidateAddresses(
//         parsed.data
//           .addressBase58,

//         parsed.data
//           .addressHex,
//       );

//     const network =
//       getNetwork();

//     const nonce =
//       randomBytes(
//         32,
//       ).toString(
//         "hex",
//       );

//     const expiresAt =
//       new Date(
//         Date.now() +
//           CHALLENGE_TTL_MS,
//       );

//     const message =
//       buildChallengeMessage({
//         userId,

//         network,

//         addressBase58:
//           addresses
//             .addressBase58,

//         addressHex:
//           addresses
//             .addressHex,

//         nonce,

//         expiresAt,
//       });

//     const repository =
//       new TronAddressChallengeRepository();

//     const challenge =
//       await repository
//         .create({
//           userId,

//           network,

//           addressBase58:
//             addresses
//               .addressBase58,

//           addressHex:
//             addresses
//               .addressHex,

//           message,

//           nonce,

//           expiresAt,
//         });

//     if (
//       !challenge._id
//     ) {
//       throw new AppError(
//         "El challenge no posee un identificador válido.",
//         "INVALID_CHALLENGE",
//         500,
//       );
//     }

//     return NextResponse.json(
//       {
//         success:
//           true,

//         challenge: {
//           id:
//             challenge
//               ._id
//               .toString(),

//           network:
//             challenge
//               .network,

//           addressBase58:
//             challenge
//               .addressBase58,

//           addressHex:
//             challenge
//               .addressHex,

//           message:
//             challenge
//               .message,

//           expiresAt:
//             challenge
//               .expiresAt
//               .toISOString(),
//         },
//       },
//       {
//         status:
//           201,
//       },
//     );
//   } catch (
//     error
//   ) {
//     if (
//       error instanceof
//       AppError
//     ) {
//       return NextResponse.json(
//         {
//           success:
//             false,

//           code:
//             error.code,

//           message:
//             error.message,
//         },
//         {
//           status:
//             error.statusCode,
//         },
//       );
//     }

//     console.error(
//       "[WALLET ADDRESS CHALLENGE]",
//       error,
//     );

//     return NextResponse.json(
//       {
//         success:
//           false,

//         code:
//           "INTERNAL_SERVER_ERROR",

//         message:
//           "No se pudo generar el challenge de propiedad de la wallet.",
//       },
//       {
//         status:
//           500,
//       },
//     );
//   }
// }


import {
  randomBytes,
} from "crypto";

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  TronWeb,
} from "tronweb";

import {
  AppError,
} from "@/lib/errors/app-error";

import {
  requireWalletUser,
} from "@/modules/auth/auth.guard";

import {
  TronAddressChallengeRepository,
} from "@/modules/blockchain/tron/tron-address-challenge.repository";

import {
  getConfiguredTronNetwork,
} from "@/modules/blockchain/tron/tron.config";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const CHALLENGE_TTL_MS =
  5 * 60 * 1000;

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0",

  Pragma:
    "no-cache",
} as const;

/*
 * ============================================================
 * BODY
 * ============================================================
 */

const requestSchema =
  z
    .object({
      addressBase58:
        z
          .string()
          .trim()
          .min(
            1,
            "La dirección TRON es obligatoria.",
          ),

      addressHex:
        z
          .string()
          .trim()
          .min(
            1,
            "La dirección hexadecimal es obligatoria.",
          ),
    })
    .strict();

/*
 * ============================================================
 * RED
 * ============================================================
 */

function getNetwork():
  TronNetwork {
  return getConfiguredTronNetwork();
}

/*
 * ============================================================
 * DIRECCIONES
 * ============================================================
 */

function normalizeAndValidateAddresses(
  addressBase58:
    string,

  addressHex:
    string,
): {
  addressBase58:
    string;

  addressHex:
    string;
} {
  const normalizedBase58 =
    addressBase58.trim();

  const normalizedHex =
    addressHex
      .trim()
      .replace(
        /^0x/i,
        "",
      )
      .toUpperCase();

  if (
    !TronWeb.isAddress(
      normalizedBase58,
    )
  ) {
    throw new AppError(
      "La dirección TRON Base58 no es válida.",
      "INVALID_TRON_ADDRESS",
      400,
    );
  }

  if (
    !/^41[0-9A-F]{40}$/.test(
      normalizedHex,
    )
  ) {
    throw new AppError(
      "La dirección TRON hexadecimal no es válida.",
      "INVALID_TRON_HEX_ADDRESS",
      400,
    );
  }

  let derivedBase58:
    string;

  try {
    derivedBase58 =
      TronWeb
        .address
        .fromHex(
          normalizedHex,
        );
  } catch {
    throw new AppError(
      "No se pudo interpretar la dirección TRON hexadecimal.",
      "INVALID_TRON_HEX_ADDRESS",
      400,
    );
  }

  if (
    derivedBase58 !==
      normalizedBase58
  ) {
    throw new AppError(
      "La dirección Base58 y la dirección hexadecimal no corresponden a la misma wallet.",
      "TRON_ADDRESS_MISMATCH",
      400,
    );
  }

  return {
    addressBase58:
      normalizedBase58,

    addressHex:
      normalizedHex,
  };
}

/*
 * ============================================================
 * MENSAJE
 * ============================================================
 *
 * El mensaje es determinista y explícito.
 *
 * La firma solamente autoriza:
 * - registrar esta dirección;
 * - para este usuario;
 * - en esta red;
 * - con este nonce;
 * - dentro de esta ventana temporal.
 */

function buildChallengeMessage(input: {
  userId:
    string;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  nonce:
    string;

  expiresAt:
    Date;
}): string {
  return [
    "TRON Wallet Ownership Verification",
    "",
    "Purpose: REGISTER_TRON_ADDRESS",
    `User ID: ${input.userId}`,
    `Network: ${input.network}`,
    `Address Base58: ${input.addressBase58}`,
    `Address Hex: ${input.addressHex}`,
    `Nonce: ${input.nonce}`,
    `Expires At: ${input.expiresAt.toISOString()}`,
    "",
    "Signing this message proves control of the private key for this address.",
    "This signature does not authorize any blockchain transfer.",
  ].join(
    "\n",
  );
}

/*
 * ============================================================
 * POST /api/v1/wallet/address-challenge
 * ============================================================
 *
 * Solamente los usuarios USER pueden demostrar propiedad
 * de una wallet personal.
 *
 * ADMIN:
 *
 * - no posee wallet personal;
 * - no puede registrar una dirección TRON;
 * - no puede crear challenges de propiedad;
 * - no participa del flujo no-custodial.
 *
 * La wallet de plataforma se administra por rutas ADMIN
 * separadas y no utiliza este endpoint.
 */

export async function POST(
  request:
    Request,
) {
  try {
    const authenticatedUser =
      await requireWalletUser();

    const userId =
      authenticatedUser.id;

    let rawBody:
      unknown;

    try {
      rawBody =
        await request.json();
    } catch {
      throw new AppError(
        "El cuerpo de la solicitud no es JSON válido.",
        "INVALID_JSON",
        400,
      );
    }

    const parsed =
      requestSchema
        .safeParse(
          rawBody,
        );

    if (
      !parsed.success
    ) {
      throw new AppError(
        parsed.error
          .issues[0]
          ?.message ??
          "Los datos enviados no son válidos.",
        "INVALID_CHALLENGE_REQUEST",
        400,
      );
    }

    const addresses =
      normalizeAndValidateAddresses(
        parsed.data
          .addressBase58,

        parsed.data
          .addressHex,
      );

    const network =
      getNetwork();

    const nonce =
      randomBytes(
        32,
      ).toString(
        "hex",
      );

    const expiresAt =
      new Date(
        Date.now() +
          CHALLENGE_TTL_MS,
      );

    const message =
      buildChallengeMessage({
        userId,

        network,

        addressBase58:
          addresses
            .addressBase58,

        addressHex:
          addresses
            .addressHex,

        nonce,

        expiresAt,
      });

    const repository =
      new TronAddressChallengeRepository();

    const challenge =
      await repository
        .create({
          userId,

          network,

          addressBase58:
            addresses
              .addressBase58,

          addressHex:
            addresses
              .addressHex,

          message,

          nonce,

          expiresAt,
        });

    if (
      !challenge._id
    ) {
      throw new AppError(
        "El challenge no posee un identificador válido.",
        "INVALID_CHALLENGE",
        500,
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        challenge: {
          id:
            challenge
              ._id
              .toString(),

          network:
            challenge
              .network,

          addressBase58:
            challenge
              .addressBase58,

          addressHex:
            challenge
              .addressHex,

          message:
            challenge
              .message,

          expiresAt:
            challenge
              .expiresAt
              .toISOString(),
        },
      },
      {
        status:
          201,

        headers:
          PRIVATE_NO_STORE_HEADERS,
      },
    );
  } catch (
    error
  ) {
    if (
      error instanceof
      AppError
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            error.code,

          message:
            error.message,
        },
        {
          status:
            error.statusCode,

          headers:
            PRIVATE_NO_STORE_HEADERS,
        },
      );
    }

    console.error(
      "[WALLET ADDRESS CHALLENGE]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo generar el challenge de propiedad de la wallet.",
      },
      {
        status:
          500,

        headers:
          PRIVATE_NO_STORE_HEADERS,
      },
    );
  }
}
