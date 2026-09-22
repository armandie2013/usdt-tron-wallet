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
//   TronClient,
// } from "@/modules/blockchain/tron/tron.client";

// import {
//   TronService,
// } from "@/modules/blockchain/tron/tron.service";

// import type {
//   TronNetwork,
// } from "@/modules/blockchain/tron/tron.types";

// /*
//  * ============================================================
//  * VALIDACIÓN
//  * ============================================================
//  *
//  * Este endpoint recibe solamente:
//  *
//  * - dirección pública Base58;
//  * - dirección pública hexadecimal;
//  * - identificador del challenge;
//  * - firma TIP-191 del challenge.
//  *
//  * Nunca recibe:
//  *
//  * - privateKey;
//  * - mnemonic;
//  * - seed;
//  * - encryptedPrivateKey;
//  * - password de la wallet.
//  */

// const registerAddressSchema =
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

//       challengeId:
//         z
//           .string()
//           .trim()
//           .min(
//             1,
//             "El challenge es obligatorio.",
//           ),

//       signature:
//         z
//           .string()
//           .trim()
//           .min(
//             1,
//             "La firma del challenge es obligatoria.",
//           ),
//     })
//     .strict();

// /*
//  * ============================================================
//  * AUTENTICACIÓN
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

//   const accessToken =
//     cookieStore
//       .get(
//         ACCESS_TOKEN_COOKIE,
//       )
//       ?.value;

//   if (
//     !accessToken
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
//         accessToken,
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
//   const value =
//     process.env
//       .TRON_NETWORK
//       ?.trim()
//       .toLowerCase();

//   return value ===
//     "mainnet"
//     ? "MAINNET"
//     : "NILE";
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
//     addressBase58
//       .trim();

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
//  * FIRMA TIP-191
//  * ============================================================
//  */

// function normalizeSignature(
//   signature:
//     string,
// ): string {
//   const normalized =
//     signature.trim();

//   /*
//    * signMessageV2 normalmente devuelve una firma de 65 bytes.
//    *
//    * Aceptamos tanto:
//    *
//    * - 0x + 130 caracteres hex;
//    * - 130 caracteres hex.
//    *
//    * No transformamos el contenido antes de verificarlo.
//    */
//   if (
//     !/^(?:0x)?[0-9a-fA-F]{130}$/.test(
//       normalized,
//     )
//   ) {
//     throw new AppError(
//       "La firma del challenge no tiene un formato válido.",
//       "INVALID_WALLET_OWNERSHIP_SIGNATURE",
//       400,
//     );
//   }

//   return normalized;
// }

// /*
//  * ============================================================
//  * POST /api/v1/wallet/register-address
//  * ============================================================
//  *
//  * Solamente los usuarios con rol USER pueden registrar
//  * una wallet personal.
//  *
//  * ADMIN:
//  *
//  * - no posee wallet personal;
//  * - no puede registrar una dirección TRON;
//  * - no puede consumir un challenge de propiedad;
//  * - no participa del flujo no-custodial.
//  *
//  * La PLATFORM_TREASURY pertenece a la plataforma y utiliza
//  * endpoints administrativos separados.
//  *
//  * Flujo USER:
//  *
//  * navegador
//  *   ↓
//  * challenge público
//  *   ↓
//  * firma local TIP-191
//  *   ↓
//  * backend recupera dirección del firmante
//  *   ↓
//  * consume challenge de un solo uso
//  *   ↓
//  * registra dirección pública
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
//      * ADMIN NO PUEDE REGISTRAR WALLET PERSONAL
//      * ========================================================
//      */

//     if (
//       authenticatedUser.role ===
//       "ADMIN"
//     ) {
//       throw new AppError(
//         "Las cuentas administradoras no pueden registrar una wallet personal.",
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
//       registerAddressSchema
//         .safeParse(
//           rawBody,
//         );

//     if (
//       !parsed.success
//     ) {
//       const message =
//         parsed.error
//           .issues[0]
//           ?.message ??
//         "Los datos enviados no son válidos.";

//       throw new AppError(
//         message,
//         "INVALID_WALLET_ADDRESS_DATA",
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

//     const signature =
//       normalizeSignature(
//         parsed.data
//           .signature,
//       );

//     const network =
//       getNetwork();

//     const challenges =
//       new TronAddressChallengeRepository();

//     /*
//      * ========================================================
//      * CHALLENGE ACTIVO
//      * ========================================================
//      */

//     const challenge =
//       await challenges
//         .findActiveByIdForUser(
//           parsed.data
//             .challengeId,

//           userId,
//         );

//     if (
//       !challenge ||
//       !challenge._id
//     ) {
//       throw new AppError(
//         "El challenge no existe, ya fue utilizado o expiró.",
//         "WALLET_CHALLENGE_INVALID_OR_EXPIRED",
//         409,
//       );
//     }

//     /*
//      * El challenge queda ligado exactamente a:
//      *
//      * - usuario autenticado;
//      * - red;
//      * - address Base58;
//      * - address hexadecimal.
//      */

//     if (
//       challenge.network !==
//         network
//     ) {
//       throw new AppError(
//         "El challenge corresponde a otra red TRON.",
//         "WALLET_CHALLENGE_NETWORK_MISMATCH",
//         409,
//       );
//     }

//     if (
//       challenge.addressBase58 !==
//         addresses.addressBase58 ||
//       challenge.addressHex !==
//         addresses.addressHex
//     ) {
//       throw new AppError(
//         "La dirección enviada no coincide con la dirección del challenge.",
//         "WALLET_CHALLENGE_ADDRESS_MISMATCH",
//         409,
//       );
//     }

//     /*
//      * ========================================================
//      * VERIFICACIÓN CRIPTOGRÁFICA
//      * ========================================================
//      *
//      * verifyMessageV2 recupera la dirección Base58 que firmó
//      * exactamente challenge.message.
//      *
//      * El backend nunca necesita conocer la private key.
//      */

//     const tronWeb =
//       TronClient.create();

//     let recoveredAddress:
//       string;

//     try {
//       recoveredAddress =
//         await tronWeb
//           .trx
//           .verifyMessageV2(
//             challenge.message,
//             signature,
//           );
//     } catch {
//       throw new AppError(
//         "La firma del challenge no pudo verificarse.",
//         "WALLET_OWNERSHIP_VERIFICATION_FAILED",
//         403,
//       );
//     }

//     if (
//       recoveredAddress !==
//         challenge.addressBase58 ||
//       recoveredAddress !==
//         addresses.addressBase58
//     ) {
//       throw new AppError(
//         "La firma no corresponde a la wallet que se intenta registrar.",
//         "WALLET_OWNERSHIP_MISMATCH",
//         403,
//       );
//     }

//     /*
//      * ========================================================
//      * CONSUMO ATÓMICO
//      * ========================================================
//      *
//      * Volvemos a consumirlo mediante filtro atómico.
//      *
//      * Si dos requests intentaran utilizar la misma firma,
//      * solamente uno puede continuar.
//      */

//     const consumedChallenge =
//       await challenges
//         .consume(
//           challenge
//             ._id
//             .toString(),

//           userId,
//         );

//     if (
//       !consumedChallenge
//     ) {
//       throw new AppError(
//         "El challenge ya fue utilizado o expiró.",
//         "WALLET_CHALLENGE_ALREADY_USED",
//         409,
//       );
//     }

//     /*
//      * ========================================================
//      * REGISTRO PÚBLICO
//      * ========================================================
//      */

//     const tronService =
//       new TronService();

//     const account =
//       await tronService
//         .registerAddress({
//           userId,

//           addressBase58:
//             addresses
//               .addressBase58,

//           addressHex:
//             addresses
//               .addressHex,
//         });

//     if (
//       !account._id
//     ) {
//       throw new AppError(
//         "La cuenta TRON registrada no posee un identificador válido.",
//         "INVALID_TRON_ACCOUNT",
//         500,
//       );
//     }

//     const wallet =
//       await tronService
//         .getPublicAddress(
//           userId,
//         );

//     if (
//       !wallet
//     ) {
//       throw new AppError(
//         "La wallet fue registrada pero no pudo recuperarse.",
//         "TRON_ACCOUNT_READBACK_ERROR",
//         500,
//       );
//     }

//     return NextResponse.json(
//       {
//         success:
//           true,

//         ownershipVerified:
//           true,

//         wallet,
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
//         AppError
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
//       "[WALLET REGISTER ADDRESS]",
//       error,
//     );

//     return NextResponse.json(
//       {
//         success:
//           false,

//         code:
//           "INTERNAL_SERVER_ERROR",

//         message:
//           "No se pudo registrar la dirección TRON.",
//       },
//       {
//         status:
//           500,
//       },
//     );
//   }
// }
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
//   TronClient,
// } from "@/modules/blockchain/tron/tron.client";

// import {
//   getConfiguredTronNetwork,
// } from "@/modules/blockchain/tron/tron.config";

// import {
//   TronService,
// } from "@/modules/blockchain/tron/tron.service";

// import type {
//   TronNetwork,
// } from "@/modules/blockchain/tron/tron.types";

// /*
//  * ============================================================
//  * VALIDACIÓN
//  * ============================================================
//  *
//  * Este endpoint recibe solamente:
//  *
//  * - dirección pública Base58;
//  * - dirección pública hexadecimal;
//  * - identificador del challenge;
//  * - firma TIP-191 del challenge.
//  *
//  * Nunca recibe:
//  *
//  * - privateKey;
//  * - mnemonic;
//  * - seed;
//  * - encryptedPrivateKey;
//  * - password de la wallet.
//  */

// const registerAddressSchema =
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

//       challengeId:
//         z
//           .string()
//           .trim()
//           .min(
//             1,
//             "El challenge es obligatorio.",
//           ),

//       signature:
//         z
//           .string()
//           .trim()
//           .min(
//             1,
//             "La firma del challenge es obligatoria.",
//           ),
//     })
//     .strict();

// /*
//  * ============================================================
//  * AUTENTICACIÓN
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

//   const accessToken =
//     cookieStore
//       .get(
//         ACCESS_TOKEN_COOKIE,
//       )
//       ?.value;

//   if (
//     !accessToken
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
//         accessToken,
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
//     addressBase58
//       .trim();

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
//  * FIRMA TIP-191
//  * ============================================================
//  */

// function normalizeSignature(
//   signature:
//     string,
// ): string {
//   const normalized =
//     signature.trim();

//   /*
//    * signMessageV2 normalmente devuelve una firma de 65 bytes.
//    *
//    * Aceptamos tanto:
//    *
//    * - 0x + 130 caracteres hex;
//    * - 130 caracteres hex.
//    *
//    * No transformamos el contenido antes de verificarlo.
//    */
//   if (
//     !/^(?:0x)?[0-9a-fA-F]{130}$/.test(
//       normalized,
//     )
//   ) {
//     throw new AppError(
//       "La firma del challenge no tiene un formato válido.",
//       "INVALID_WALLET_OWNERSHIP_SIGNATURE",
//       400,
//     );
//   }

//   return normalized;
// }

// /*
//  * ============================================================
//  * POST /api/v1/wallet/register-address
//  * ============================================================
//  *
//  * Solamente los usuarios con rol USER pueden registrar
//  * una wallet personal.
//  *
//  * ADMIN:
//  *
//  * - no posee wallet personal;
//  * - no puede registrar una dirección TRON;
//  * - no puede consumir un challenge de propiedad;
//  * - no participa del flujo no-custodial.
//  *
//  * La PLATFORM_TREASURY pertenece a la plataforma y utiliza
//  * endpoints administrativos separados.
//  *
//  * Flujo USER:
//  *
//  * navegador
//  *   ↓
//  * challenge público
//  *   ↓
//  * firma local TIP-191
//  *   ↓
//  * backend recupera dirección del firmante
//  *   ↓
//  * consume challenge de un solo uso
//  *   ↓
//  * registra dirección pública
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
//      * ADMIN NO PUEDE REGISTRAR WALLET PERSONAL
//      * ========================================================
//      */

//     if (
//       authenticatedUser.role ===
//       "ADMIN"
//     ) {
//       throw new AppError(
//         "Las cuentas administradoras no pueden registrar una wallet personal.",
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
//       registerAddressSchema
//         .safeParse(
//           rawBody,
//         );

//     if (
//       !parsed.success
//     ) {
//       const message =
//         parsed.error
//           .issues[0]
//           ?.message ??
//         "Los datos enviados no son válidos.";

//       throw new AppError(
//         message,
//         "INVALID_WALLET_ADDRESS_DATA",
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

//     const signature =
//       normalizeSignature(
//         parsed.data
//           .signature,
//       );

//     const network =
//       getNetwork();

//     const challenges =
//       new TronAddressChallengeRepository();

//     /*
//      * ========================================================
//      * CHALLENGE ACTIVO
//      * ========================================================
//      */

//     const challenge =
//       await challenges
//         .findActiveByIdForUser(
//           parsed.data
//             .challengeId,

//           userId,
//         );

//     if (
//       !challenge ||
//       !challenge._id
//     ) {
//       throw new AppError(
//         "El challenge no existe, ya fue utilizado o expiró.",
//         "WALLET_CHALLENGE_INVALID_OR_EXPIRED",
//         409,
//       );
//     }

//     /*
//      * El challenge queda ligado exactamente a:
//      *
//      * - usuario autenticado;
//      * - red;
//      * - address Base58;
//      * - address hexadecimal.
//      */

//     if (
//       challenge.network !==
//         network
//     ) {
//       throw new AppError(
//         "El challenge corresponde a otra red TRON.",
//         "WALLET_CHALLENGE_NETWORK_MISMATCH",
//         409,
//       );
//     }

//     if (
//       challenge.addressBase58 !==
//         addresses.addressBase58 ||
//       challenge.addressHex !==
//         addresses.addressHex
//     ) {
//       throw new AppError(
//         "La dirección enviada no coincide con la dirección del challenge.",
//         "WALLET_CHALLENGE_ADDRESS_MISMATCH",
//         409,
//       );
//     }

//     /*
//      * ========================================================
//      * VERIFICACIÓN CRIPTOGRÁFICA
//      * ========================================================
//      *
//      * verifyMessageV2 recupera la dirección Base58 que firmó
//      * exactamente challenge.message.
//      *
//      * El backend nunca necesita conocer la private key.
//      */

//     const tronWeb =
//       TronClient.create();

//     let recoveredAddress:
//       string;

//     try {
//       recoveredAddress =
//         await tronWeb
//           .trx
//           .verifyMessageV2(
//             challenge.message,
//             signature,
//           );
//     } catch {
//       throw new AppError(
//         "La firma del challenge no pudo verificarse.",
//         "WALLET_OWNERSHIP_VERIFICATION_FAILED",
//         403,
//       );
//     }

//     if (
//       recoveredAddress !==
//         challenge.addressBase58 ||
//       recoveredAddress !==
//         addresses.addressBase58
//     ) {
//       throw new AppError(
//         "La firma no corresponde a la wallet que se intenta registrar.",
//         "WALLET_OWNERSHIP_MISMATCH",
//         403,
//       );
//     }

//     /*
//      * ========================================================
//      * CONSUMO ATÓMICO
//      * ========================================================
//      *
//      * Volvemos a consumirlo mediante filtro atómico.
//      *
//      * Si dos requests intentaran utilizar la misma firma,
//      * solamente uno puede continuar.
//      */

//     const consumedChallenge =
//       await challenges
//         .consume(
//           challenge
//             ._id
//             .toString(),

//           userId,
//         );

//     if (
//       !consumedChallenge
//     ) {
//       throw new AppError(
//         "El challenge ya fue utilizado o expiró.",
//         "WALLET_CHALLENGE_ALREADY_USED",
//         409,
//       );
//     }

//     /*
//      * ========================================================
//      * REGISTRO PÚBLICO
//      * ========================================================
//      */

//     const tronService =
//       new TronService();

//     const account =
//       await tronService
//         .registerAddress({
//           userId,

//           addressBase58:
//             addresses
//               .addressBase58,

//           addressHex:
//             addresses
//               .addressHex,
//         });

//     if (
//       !account._id
//     ) {
//       throw new AppError(
//         "La cuenta TRON registrada no posee un identificador válido.",
//         "INVALID_TRON_ACCOUNT",
//         500,
//       );
//     }

//     const wallet =
//       await tronService
//         .getPublicAddress(
//           userId,
//         );

//     if (
//       !wallet
//     ) {
//       throw new AppError(
//         "La wallet fue registrada pero no pudo recuperarse.",
//         "TRON_ACCOUNT_READBACK_ERROR",
//         500,
//       );
//     }

//     return NextResponse.json(
//       {
//         success:
//           true,

//         ownershipVerified:
//           true,

//         wallet,
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
//         AppError
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
//       "[WALLET REGISTER ADDRESS]",
//       error,
//     );

//     return NextResponse.json(
//       {
//         success:
//           false,

//         code:
//           "INTERNAL_SERVER_ERROR",

//         message:
//           "No se pudo registrar la dirección TRON.",
//       },
//       {
//         status:
//           500,
//       },
//     );
//   }
// }

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
  TronClient,
} from "@/modules/blockchain/tron/tron.client";

import {
  getConfiguredTronNetwork,
} from "@/modules/blockchain/tron/tron.config";

import {
  TronService,
} from "@/modules/blockchain/tron/tron.service";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0",

  Pragma:
    "no-cache",
} as const;

/*
 * ============================================================
 * VALIDACIÓN
 * ============================================================
 *
 * Este endpoint recibe solamente:
 *
 * - dirección pública Base58;
 * - dirección pública hexadecimal;
 * - identificador del challenge;
 * - firma TIP-191 del challenge.
 *
 * Nunca recibe:
 *
 * - privateKey;
 * - mnemonic;
 * - seed;
 * - encryptedPrivateKey;
 * - password de la wallet.
 */

const registerAddressSchema =
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

      challengeId:
        z
          .string()
          .trim()
          .min(
            1,
            "El challenge es obligatorio.",
          ),

      signature:
        z
          .string()
          .trim()
          .min(
            1,
            "La firma del challenge es obligatoria.",
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
    addressBase58
      .trim();

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
 * FIRMA TIP-191
 * ============================================================
 */

function normalizeSignature(
  signature:
    string,
): string {
  const normalized =
    signature.trim();

  /*
   * signMessageV2 normalmente devuelve una firma de 65 bytes.
   *
   * Aceptamos tanto:
   *
   * - 0x + 130 caracteres hex;
   * - 130 caracteres hex.
   *
   * No transformamos el contenido antes de verificarlo.
   */
  if (
    !/^(?:0x)?[0-9a-fA-F]{130}$/.test(
      normalized,
    )
  ) {
    throw new AppError(
      "La firma del challenge no tiene un formato válido.",
      "INVALID_WALLET_OWNERSHIP_SIGNATURE",
      400,
    );
  }

  return normalized;
}

/*
 * ============================================================
 * POST /api/v1/wallet/register-address
 * ============================================================
 *
 * Solamente los usuarios con rol USER pueden registrar
 * una wallet personal.
 *
 * ADMIN:
 *
 * - no posee wallet personal;
 * - no puede registrar una dirección TRON;
 * - no puede consumir un challenge de propiedad;
 * - no participa del flujo no-custodial.
 *
 * La PLATFORM_TREASURY pertenece a la plataforma y utiliza
 * endpoints administrativos separados.
 *
 * Flujo USER:
 *
 * navegador
 *   ↓
 * challenge público
 *   ↓
 * firma local TIP-191
 *   ↓
 * backend recupera dirección del firmante
 *   ↓
 * consume challenge de un solo uso
 *   ↓
 * registra dirección pública
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
      registerAddressSchema
        .safeParse(
          rawBody,
        );

    if (
      !parsed.success
    ) {
      const message =
        parsed.error
          .issues[0]
          ?.message ??
        "Los datos enviados no son válidos.";

      throw new AppError(
        message,
        "INVALID_WALLET_ADDRESS_DATA",
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

    const signature =
      normalizeSignature(
        parsed.data
          .signature,
      );

    const network =
      getNetwork();

    const challenges =
      new TronAddressChallengeRepository();

    /*
     * ========================================================
     * CHALLENGE ACTIVO
     * ========================================================
     */

    const challenge =
      await challenges
        .findActiveByIdForUser(
          parsed.data
            .challengeId,

          userId,
        );

    if (
      !challenge ||
      !challenge._id
    ) {
      throw new AppError(
        "El challenge no existe, ya fue utilizado o expiró.",
        "WALLET_CHALLENGE_INVALID_OR_EXPIRED",
        409,
      );
    }

    /*
     * El challenge queda ligado exactamente a:
     *
     * - usuario autenticado;
     * - red;
     * - address Base58;
     * - address hexadecimal.
     */

    if (
      challenge.network !==
        network
    ) {
      throw new AppError(
        "El challenge corresponde a otra red TRON.",
        "WALLET_CHALLENGE_NETWORK_MISMATCH",
        409,
      );
    }

    if (
      challenge.addressBase58 !==
        addresses.addressBase58 ||
      challenge.addressHex !==
        addresses.addressHex
    ) {
      throw new AppError(
        "La dirección enviada no coincide con la dirección del challenge.",
        "WALLET_CHALLENGE_ADDRESS_MISMATCH",
        409,
      );
    }

    /*
     * ========================================================
     * VERIFICACIÓN CRIPTOGRÁFICA
     * ========================================================
     *
     * verifyMessageV2 recupera la dirección Base58 que firmó
     * exactamente challenge.message.
     *
     * El backend nunca necesita conocer la private key.
     */

    const tronWeb =
      TronClient.create();

    let recoveredAddress:
      string;

    try {
      recoveredAddress =
        await tronWeb
          .trx
          .verifyMessageV2(
            challenge.message,
            signature,
          );
    } catch {
      throw new AppError(
        "La firma del challenge no pudo verificarse.",
        "WALLET_OWNERSHIP_VERIFICATION_FAILED",
        403,
      );
    }

    if (
      recoveredAddress !==
        challenge.addressBase58 ||
      recoveredAddress !==
        addresses.addressBase58
    ) {
      throw new AppError(
        "La firma no corresponde a la wallet que se intenta registrar.",
        "WALLET_OWNERSHIP_MISMATCH",
        403,
      );
    }

    /*
     * ========================================================
     * CONSUMO ATÓMICO
     * ========================================================
     *
     * Volvemos a consumirlo mediante filtro atómico.
     *
     * Si dos requests intentaran utilizar la misma firma,
     * solamente uno puede continuar.
     */

    const consumedChallenge =
      await challenges
        .consume(
          challenge
            ._id
            .toString(),

          userId,
        );

    if (
      !consumedChallenge
    ) {
      throw new AppError(
        "El challenge ya fue utilizado o expiró.",
        "WALLET_CHALLENGE_ALREADY_USED",
        409,
      );
    }

    /*
     * ========================================================
     * REGISTRO PÚBLICO
     * ========================================================
     */

    const tronService =
      new TronService();

    const account =
      await tronService
        .registerAddress({
          userId,

          addressBase58:
            addresses
              .addressBase58,

          addressHex:
            addresses
              .addressHex,
        });

    if (
      !account._id
    ) {
      throw new AppError(
        "La cuenta TRON registrada no posee un identificador válido.",
        "INVALID_TRON_ACCOUNT",
        500,
      );
    }

    const wallet =
      await tronService
        .getPublicAddress(
          userId,
        );

    if (
      !wallet
    ) {
      throw new AppError(
        "La wallet fue registrada pero no pudo recuperarse.",
        "TRON_ACCOUNT_READBACK_ERROR",
        500,
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        ownershipVerified:
          true,

        wallet,
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
      "[WALLET REGISTER ADDRESS]",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        code:
          "INTERNAL_SERVER_ERROR",

        message:
          "No se pudo registrar la dirección TRON.",
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
