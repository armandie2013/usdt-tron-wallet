// "use client";

// import {
//   FormEvent,
//   useCallback,
//   useEffect,
//   useState,
// } from "react";

// import {
//   useRouter,
// } from "next/navigation";

// import QRCode from "qrcode";

// import {
//   TronWeb,
// } from "tronweb";

// import {
//   CheckCircle2,
//   Copy,
//   KeyRound,
//   LockKeyhole,
//   LogOut,
//   QrCode,
//   RefreshCw,
//   RotateCcw,
//   ShieldCheck,
//   TriangleAlert,
//   WalletCards,
// } from "lucide-react";

// import SendUsdtPanel from "@/components/wallet/SendUsdtPanel";

// import {
//   generateNonCustodialWallet,
//   restoreNonCustodialWallet,
// } from "@/lib/wallet/non-custodial-wallet.client";

// import type {
//   GeneratedNonCustodialWallet,
// } from "@/lib/wallet/non-custodial-wallet.client";

// import {
//   generateRecoveryVerificationPositions,
//   recoveryWordMatches,
// } from "@/lib/wallet/recovery-verification.client";

// import {
//   getStoredWalletMetadata,
//   hasStoredWallet,
//   saveEncryptedWallet,
//   unlockStoredWallet,
// } from "@/lib/wallet/wallet-storage.client";

// import type {
//   StoredWalletMetadata,
//   WalletNetwork,
// } from "@/lib/wallet/wallet-storage.client";

// /*
//  * ============================================================
//  * TIPOS
//  * ============================================================
//  */

// interface User {
//   id: string;

//   name: string;

//   email: string;

//   role:
//     | "ADMIN"
//     | "USER";
// }

// interface BlockchainInfo {
//   network:
//     WalletNetwork;

//   asset:
//     "USDT";

//   tokenStandard:
//     "TRC20";

//   contractAddress:
//     string;
// }

// interface WalletInfo {
//   id: string;

//   asset:
//     "USDT";

//   status:
//     string;

//   walletType:
//     string;

//   network:
//     WalletNetwork;

//   address:
//     string;

//   addressBase58:
//     string;

//   addressHex:
//     string;

//   balance:
//     string;

//   formattedBalance:
//     string;

//   usdt: {
//     balanceUnits:
//       string;

//     formattedBalance:
//       string;

//     contractAddress:
//       string;
//   };

//   trx: {
//     balanceSun:
//       string;

//     formattedBalance:
//       string;
//   };

//   resources: {
//     energyAvailable:
//       string;

//     bandwidthAvailable:
//       string;
//   };

//   activated:
//     boolean;

//   createdAt:
//     string;

//   updatedAt:
//     string;
// }

// interface MeResponse {
//   user?:
//     User;

//   message?:
//     string;
// }

// interface WalletResponse {
//   success:
//     boolean;

//   needsWalletSetup:
//     boolean;

//   wallet:
//     WalletInfo |
//     null;

//   blockchain:
//     BlockchainInfo;

//   code?:
//     string;

//   message?:
//     string;
// }

// interface AddressChallengeResponse {
//   success:
//     boolean;

//   challenge?: {
//     id:
//       string;

//     network:
//       WalletNetwork;

//     addressBase58:
//       string;

//     addressHex:
//       string;

//     message:
//       string;

//     expiresAt:
//       string;
//   };

//   code?:
//     string;

//   message?:
//     string;
// }

// interface RegisterAddressResponse {
//   success:
//     boolean;

//   ownershipVerified?:
//     boolean;

//   wallet?: {
//     id:
//       string;

//     userId:
//       string;

//     network:
//       WalletNetwork;

//     addressBase58:
//       string;

//     addressHex:
//       string;

//     walletType:
//       string;

//     status:
//       string;

//     createdAt:
//       string;

//     updatedAt:
//       string;
//   };

//   code?:
//     string;

//   message?:
//     string;
// }

// type SetupStep =
//   | "NONE"
//   | "CREATE"
//   | "BACKUP"
//   | "CONFIRM"
//   | "REGISTERING"
//   | "COMPLETE";

// /*
//  * ============================================================
//  * HELPERS
//  * ============================================================
//  */

// function getErrorMessage(
//   error:
//     unknown,

//   fallback:
//     string,
// ): string {
//   if (
//     error instanceof
//       Error &&
//     error.message
//   ) {
//     return error.message;
//   }

//   return fallback;
// }

// function shortenAddress(
//   address:
//     string,
// ): string {
//   if (
//     address.length <=
//     18
//   ) {
//     return address;
//   }

//   return `${address.slice(
//     0,
//     9,
//   )}...${address.slice(
//     -9,
//   )}`;
// }

// /*
//  * ============================================================
//  * DASHBOARD
//  * ============================================================
//  */

// export default function DashboardPage() {
//   const router =
//     useRouter();

//   const [
//     user,
//     setUser,
//   ] =
//     useState<User | null>(
//       null,
//     );

//   const [
//     wallet,
//     setWallet,
//   ] =
//     useState<WalletInfo | null>(
//       null,
//     );

//   const [
//     blockchain,
//     setBlockchain,
//   ] =
//     useState<BlockchainInfo | null>(
//       null,
//     );

//   const [
//     localWallet,
//     setLocalWallet,
//   ] =
//     useState<StoredWalletMetadata | null>(
//       null,
//     );

//   const [
//     needsWalletSetup,
//     setNeedsWalletSetup,
//   ] =
//     useState(
//       false,
//     );

//   const [
//     setupStep,
//     setSetupStep,
//   ] =
//     useState<SetupStep>(
//       "NONE",
//     );

//   const [
//     generatedWallet,
//     setGeneratedWallet,
//   ] =
//     useState<GeneratedNonCustodialWallet | null>(
//       null,
//     );

//   const [
//     walletPassword,
//     setWalletPassword,
//   ] =
//     useState(
//       "",
//     );

//   const [
//     walletPasswordConfirmation,
//     setWalletPasswordConfirmation,
//   ] =
//     useState(
//       "",
//     );

//   const [
//     registrationPassword,
//     setRegistrationPassword,
//   ] =
//     useState(
//       "",
//     );

//   const [
//     backupConfirmed,
//     setBackupConfirmed,
//   ] =
//     useState(
//       false,
//     );

//   /*
//    * Las posiciones se generan aleatoriamente
//    * al crear cada nueva wallet.
//    *
//    * Ejemplo:
//    *
//    * [2, 6, 10]
//    *
//    * Siempre son 3 posiciones distintas.
//    */
//   const [
//     verificationPositions,
//     setVerificationPositions,
//   ] =
//     useState<
//       number[]
//     >([]);

//   /*
//    * Las respuestas se almacenan por posición:
//    *
//    * {
//    *   2: "palabra",
//    *   6: "palabra",
//    *   10: "palabra"
//    * }
//    */
//   const [
//     verificationWords,
//     setVerificationWords,
//   ] =
//     useState<
//       Record<
//         number,
//         string
//       >
//     >({});

//   /*
//    * ==========================================================
//    * RECUPERACIÓN
//    * ==========================================================
//    */

//   const [
//     recoveryMnemonic,
//     setRecoveryMnemonic,
//   ] =
//     useState(
//       "",
//     );

//   const [
//     recoveryPassword,
//     setRecoveryPassword,
//   ] =
//     useState(
//       "",
//     );

//   const [
//     recoveryPasswordConfirmation,
//     setRecoveryPasswordConfirmation,
//   ] =
//     useState(
//       "",
//     );

//   const [
//     recoveringWallet,
//     setRecoveringWallet,
//   ] =
//     useState(
//       false,
//     );

//   const [
//     qrDataUrl,
//     setQrDataUrl,
//   ] =
//     useState<
//       string |
//       null
//     >(
//       null,
//     );

//   const [
//     loading,
//     setLoading,
//   ] =
//     useState(
//       true,
//     );

//   const [
//     refreshing,
//     setRefreshing,
//   ] =
//     useState(
//       false,
//     );

//   const [
//     creatingWallet,
//     setCreatingWallet,
//   ] =
//     useState(
//       false,
//     );

//   const [
//     error,
//     setError,
//   ] =
//     useState<
//       string |
//       null
//     >(
//       null,
//     );

//   const [
//     success,
//     setSuccess,
//   ] =
//     useState<
//       string |
//       null
//     >(
//       null,
//     );

//   /*
//    * ==========================================================
//    * CARGA DE DATOS
//    * ==========================================================
//    */

//   const loadDashboard =
//     useCallback(
//       async (
//         showRefresh:
//           boolean =
//           false,
//       ) => {
//         if (
//           showRefresh
//         ) {
//           setRefreshing(
//             true,
//           );
//         }

//         try {
//           setError(
//             null,
//           );

//           const [
//             meResponse,
//             walletResponse,
//           ] =
//             await Promise.all([
//               fetch(
//                 "/api/v1/me",
//                 {
//                   cache:
//                     "no-store",
//                 },
//               ),

//               fetch(
//                 "/api/v1/wallet",
//                 {
//                   cache:
//                     "no-store",
//                 },
//               ),
//             ]);

//           if (
//             meResponse.status ===
//               401 ||
//             walletResponse.status ===
//               401
//           ) {
//             router.push(
//               "/login",
//             );

//             return;
//           }

//           const meData =
//             (
//               await meResponse.json()
//             ) as
//               MeResponse;

//           const walletData =
//             (
//               await walletResponse.json()
//             ) as
//               WalletResponse;

//           if (
//             !meResponse.ok
//           ) {
//             throw new Error(
//               meData.message ??
//                 "No se pudo obtener el usuario.",
//             );
//           }

//           if (
//             !walletResponse.ok ||
//             walletData.success !==
//               true
//           ) {
//             throw new Error(
//               walletData.message ??
//                 "No se pudo obtener la wallet.",
//             );
//           }

//           if (
//             !meData.user
//           ) {
//             throw new Error(
//               "La sesión no contiene un usuario válido.",
//             );
//           }

//           const currentUser =
//             meData.user;

//           setUser(
//             currentUser,
//           );

//           setWallet(
//             walletData.wallet,
//           );

//           setBlockchain(
//             walletData.blockchain,
//           );

//           setNeedsWalletSetup(
//             walletData
//               .needsWalletSetup,
//           );

//           const network =
//             walletData
//               .blockchain
//               .network;

//           const stored =
//             await getStoredWalletMetadata({
//               userId:
//                 currentUser.id,

//               network,
//             });

//           setLocalWallet(
//             stored,
//           );

//           if (
//             walletData
//               .needsWalletSetup &&
//             !stored
//           ) {
//             setSetupStep(
//               "CREATE",
//             );
//           }

//           if (
//             walletData
//               .needsWalletSetup &&
//             stored
//           ) {
//             setSetupStep(
//               "REGISTERING",
//             );
//           }

//           if (
//             !walletData
//               .needsWalletSetup
//           ) {
//             setSetupStep(
//               "COMPLETE",
//             );
//           }
//         } catch (
//           loadError
//         ) {
//           console.error(
//             loadError,
//           );

//           setError(
//             getErrorMessage(
//               loadError,
//               "No se pudo cargar la cuenta.",
//             ),
//           );
//         } finally {
//           setLoading(
//             false,
//           );

//           setRefreshing(
//             false,
//           );
//         }
//       },
//       [
//         router,
//       ],
//     );

//   useEffect(
//     () => {
//       void loadDashboard();
//     },
//     [
//       loadDashboard,
//     ],
//   );

//   /*
//    * ==========================================================
//    * QR
//    * ==========================================================
//    */

//   useEffect(
//     () => {
//       let cancelled =
//         false;

//       async function buildQr() {
//         const address =
//           wallet
//             ?.addressBase58 ??
//           localWallet
//             ?.addressBase58;

//         if (
//           !address
//         ) {
//           setQrDataUrl(
//             null,
//           );

//           return;
//         }

//         try {
//           const dataUrl =
//             await QRCode
//               .toDataURL(
//                 address,
//                 {
//                   width:
//                     240,

//                   margin:
//                     1,

//                   errorCorrectionLevel:
//                     "M",
//                 },
//               );

//           if (
//             !cancelled
//           ) {
//             setQrDataUrl(
//               dataUrl,
//             );
//           }
//         } catch (
//           qrError
//         ) {
//           console.error(
//             "[QR]",
//             qrError,
//           );

//           if (
//             !cancelled
//           ) {
//             setQrDataUrl(
//               null,
//             );
//           }
//         }
//       }

//       void buildQr();

//       return () => {
//         cancelled =
//           true;
//       };
//     },
//     [
//       wallet,
//       localWallet,
//     ],
//   );

//   /*
//    * ==========================================================
//    * CREAR WALLET
//    * ==========================================================
//    */

//   function handleGenerateWallet(
//     event:
//       FormEvent<HTMLFormElement>,
//   ) {
//     event.preventDefault();

//     setError(
//       null,
//     );

//     setSuccess(
//       null,
//     );

//     if (
//       !user ||
//       !blockchain
//     ) {
//       setError(
//         "No se pudo determinar el usuario o la red.",
//       );

//       return;
//     }

//     if (
//       walletPassword.length <
//       8
//     ) {
//       setError(
//         "La contraseña de la wallet debe tener al menos 8 caracteres.",
//       );

//       return;
//     }

//     if (
//       walletPassword !==
//       walletPasswordConfirmation
//     ) {
//       setError(
//         "Las contraseñas no coinciden.",
//       );

//       return;
//     }

//     try {
//       setCreatingWallet(
//         true,
//       );

//       const generated =
//         generateNonCustodialWallet();

//       setGeneratedWallet(
//         generated,
//       );

//       setBackupConfirmed(
//         false,
//       );

//       /*
//        * Elegimos 3 posiciones criptográficamente aleatorias,
//        * distintas, entre las 12 palabras.
//        */
//       const verification =
//         generateRecoveryVerificationPositions(
//           12,
//           3,
//         );

//       setVerificationPositions(
//         verification.positions,
//       );

//       setVerificationWords(
//         {},
//       );

//       setSetupStep(
//         "BACKUP",
//       );
//     } catch (
//       generationError
//     ) {
//       console.error(
//         generationError,
//       );

//       setError(
//         getErrorMessage(
//           generationError,
//           "No se pudo generar la wallet.",
//         ),
//       );
//     } finally {
//       setCreatingWallet(
//         false,
//       );
//     }
//   }

//   /*
//    * ==========================================================
//    * CONTINUAR BACKUP
//    * ==========================================================
//    */

//   function handleBackupContinue() {
//     setError(
//       null,
//     );

//     if (
//       !backupConfirmed
//     ) {
//       setError(
//         "Confirmá que guardaste la frase de recuperación antes de continuar.",
//       );

//       return;
//     }

//     if (
//       verificationPositions.length !==
//       3
//     ) {
//       setError(
//         "No se pudo generar correctamente la verificación de la frase. Volvé a iniciar el proceso.",
//       );

//       return;
//     }

//     setSetupStep(
//       "CONFIRM",
//     );
//   }

//   /*
//    * ==========================================================
//    * CONFIRMAR FRASE
//    * ==========================================================
//    */

//   async function handleConfirmRecoveryPhrase(
//     event:
//       FormEvent<HTMLFormElement>,
//   ) {
//     event.preventDefault();

//     setError(
//       null,
//     );

//     setSuccess(
//       null,
//     );

//     if (
//       !generatedWallet ||
//       !user ||
//       !blockchain
//     ) {
//       setError(
//         "La wallet temporal ya no está disponible. Volvé a iniciar el proceso.",
//       );

//       return;
//     }

//     if (
//       verificationPositions.length !==
//       3
//     ) {
//       setError(
//         "No se pudo determinar qué palabras deben verificarse. Volvé a iniciar el proceso.",
//       );

//       return;
//     }

//     /*
//      * Las posiciones no cambian si el usuario
//      * introduce una palabra incorrecta.
//      *
//      * Se mantienen las mismas tres hasta que
//      * la comprobación sea correcta.
//      */
//     const verificationIsValid =
//       verificationPositions
//         .every(
//           (
//             position,
//           ) =>
//             recoveryWordMatches(
//               generatedWallet
//                 .mnemonic,

//               position,

//               verificationWords[
//                 position
//               ] ??
//                 "",
//             ),
//         );

//     if (
//       !verificationIsValid
//     ) {
//       setError(
//         "Las palabras ingresadas no coinciden con la frase de recuperación.",
//       );

//       return;
//     }

//     try {
//       setCreatingWallet(
//         true,
//       );

//       await saveEncryptedWallet({
//         userId:
//           user.id,

//         network:
//           blockchain.network,

//         wallet:
//           generatedWallet,

//         password:
//           walletPassword,
//       });

//       const stored =
//         await getStoredWalletMetadata({
//           userId:
//             user.id,

//           network:
//             blockchain.network,
//         });

//       if (
//         !stored
//       ) {
//         throw new Error(
//           "La wallet no pudo verificarse después de guardarla localmente.",
//         );
//       }

//       setLocalWallet(
//         stored,
//       );

//       await registerPublicAddress(
//         stored,
//         generatedWallet.privateKey,
//       );

//       setGeneratedWallet(
//         null,
//       );

//       setWalletPassword(
//         "",
//       );

//       setWalletPasswordConfirmation(
//         "",
//       );

//       setVerificationWords(
//         {},
//       );

//       setVerificationPositions(
//         [],
//       );

//       setBackupConfirmed(
//         false,
//       );

//       setSetupStep(
//         "COMPLETE",
//       );

//       setSuccess(
//         "Wallet no-custodial creada, propiedad verificada y registrada correctamente.",
//       );

//       await loadDashboard();
//     } catch (
//       saveError
//     ) {
//       console.error(
//         saveError,
//       );

//       const stored =
//         await hasStoredWallet({
//           userId:
//             user.id,

//           network:
//             blockchain.network,
//         });

//       if (
//         stored
//       ) {
//         setGeneratedWallet(
//           null,
//         );

//         setVerificationWords(
//           {},
//         );

//         setVerificationPositions(
//           [],
//         );

//         setBackupConfirmed(
//           false,
//         );

//         setSetupStep(
//           "REGISTERING",
//         );

//         setError(
//           "La wallet quedó guardada de forma segura en este dispositivo, pero no se pudo registrar la dirección pública. Podés reintentar el registro sin generar otra wallet.",
//         );

//         return;
//       }

//       setError(
//         getErrorMessage(
//           saveError,
//           "No se pudo guardar la wallet.",
//         ),
//       );
//     } finally {
//       setCreatingWallet(
//         false,
//       );
//     }
//   }

//   /*
//    * ==========================================================
//    * TRONWEB PARA FIRMA DE CHALLENGE
//    * ==========================================================
//    *
//    * La firma se realiza completamente en el navegador.
//    * La private key nunca se envía al backend.
//    */

//   function createOwnershipProofTronWeb(
//     network:
//       WalletNetwork,
//   ): TronWeb {
//     switch (
//       network
//     ) {
//       case "NILE":
//         return new TronWeb({
//           fullHost:
//             "https://nile.trongrid.io",
//         });

//       case "MAINNET":
//         return new TronWeb({
//           fullHost:
//             "https://api.trongrid.io",
//         });

//       default: {
//         const exhaustive:
//           never =
//             network;

//         throw new Error(
//           `Red TRON no soportada: ${String(
//             exhaustive,
//           )}`,
//         );
//       }
//     }
//   }

//   /*
//    * ==========================================================
//    * REGISTRAR ADDRESS
//    * ==========================================================
//    */

//   async function registerPublicAddress(
//     metadata:
//       StoredWalletMetadata,

//     privateKey:
//       string,
//   ): Promise<void> {
//     /*
//      * ========================================================
//      * 1. PEDIR CHALLENGE
//      * ========================================================
//      */

//     const challengeResponse =
//       await fetch(
//         "/api/v1/wallet/address-challenge",
//         {
//           method:
//             "POST",

//           headers: {
//             "Content-Type":
//               "application/json",
//           },

//           body:
//             JSON.stringify({
//               addressBase58:
//                 metadata
//                   .addressBase58,

//               addressHex:
//                 metadata
//                   .addressHex,
//             }),
//         },
//       );

//     const challengeData =
//       (
//         await challengeResponse
//           .json()
//       ) as
//         AddressChallengeResponse;

//     if (
//       !challengeResponse.ok ||
//       challengeData.success !==
//         true ||
//       !challengeData.challenge
//     ) {
//       throw new Error(
//         challengeData.message ??
//           "No se pudo generar el challenge de propiedad.",
//       );
//     }

//     const challenge =
//       challengeData.challenge;

//     /*
//      * Validación defensiva del challenge recibido.
//      */
//     if (
//       challenge.network !==
//         metadata.network ||
//       challenge.addressBase58 !==
//         metadata.addressBase58 ||
//       challenge.addressHex.toUpperCase() !==
//         metadata.addressHex.toUpperCase()
//     ) {
//       throw new Error(
//         "El challenge recibido no corresponde a la wallet local.",
//       );
//     }

//     /*
//      * ========================================================
//      * 2. FIRMAR CHALLENGE LOCALMENTE
//      * ========================================================
//      */

//     const tronWeb =
//       createOwnershipProofTronWeb(
//         metadata.network,
//       );

//     const signature =
//       await tronWeb
//         .trx
//         .signMessageV2(
//           challenge.message,
//           privateKey,
//         );

//     if (
//       typeof signature !==
//         "string" ||
//       !/^(?:0x)?[0-9a-fA-F]{130}$/.test(
//         signature,
//       )
//     ) {
//       throw new Error(
//         "No se pudo generar una firma válida para demostrar la propiedad de la wallet.",
//       );
//     }

//     /*
//      * ========================================================
//      * 3. REGISTRAR ADDRESS + PRUEBA
//      * ========================================================
//      */

//     const response =
//       await fetch(
//         "/api/v1/wallet/register-address",
//         {
//           method:
//             "POST",

//           headers: {
//             "Content-Type":
//               "application/json",
//           },

//           body:
//             JSON.stringify({
//               addressBase58:
//                 metadata
//                   .addressBase58,

//               addressHex:
//                 metadata
//                   .addressHex,

//               challengeId:
//                 challenge.id,

//               signature,
//             }),
//         },
//       );

//     const data =
//       (
//         await response.json()
//       ) as
//         RegisterAddressResponse;

//     if (
//       !response.ok ||
//       data.success !==
//         true ||
//       data.ownershipVerified !==
//         true
//     ) {
//       throw new Error(
//         data.message ??
//           "No se pudo registrar la dirección pública.",
//       );
//     }
//   }

//   /*
//    * ==========================================================
//    * REINTENTAR REGISTRO
//    * ==========================================================
//    */

//   async function handleRetryRegistration() {
//     if (
//       !user ||
//       !blockchain
//     ) {
//       setError(
//         "No se pudo determinar el usuario o la red.",
//       );

//       return;
//     }

//     if (
//       !registrationPassword
//     ) {
//       setError(
//         "Ingresá la contraseña de la wallet para demostrar que controlás esta dirección.",
//       );

//       return;
//     }

//     setError(
//       null,
//     );

//     setSuccess(
//       null,
//     );

//     try {
//       setCreatingWallet(
//         true,
//       );

//       const metadata =
//         await getStoredWalletMetadata({
//           userId:
//             user.id,

//           network:
//             blockchain.network,
//         });

//       if (
//         !metadata
//       ) {
//         setLocalWallet(
//           null,
//         );

//         setSetupStep(
//           "CREATE",
//         );

//         throw new Error(
//           "No se encontró la wallet local en este dispositivo.",
//         );
//       }

//       /*
//        * Desbloqueamos el vault únicamente en el navegador.
//        *
//        * La contraseña y la private key nunca se envían
//        * al endpoint de registro.
//        */
//       const unlocked =
//         await unlockStoredWallet({
//           userId:
//             user.id,

//           network:
//             blockchain.network,

//           password:
//             registrationPassword,
//         });

//       setRegistrationPassword(
//         "",
//       );

//       if (
//         unlocked.addressBase58 !==
//           metadata.addressBase58 ||
//         unlocked.addressHex.toUpperCase() !==
//           metadata.addressHex.toUpperCase()
//       ) {
//         throw new Error(
//           "La wallet desbloqueada no coincide con la wallet local pendiente de registro.",
//         );
//       }

//       await registerPublicAddress(
//         metadata,
//         unlocked.privateKey,
//       );

//       setSuccess(
//         "La propiedad de la wallet fue verificada y la dirección pública quedó registrada correctamente.",
//       );

//       setSetupStep(
//         "COMPLETE",
//       );

//       await loadDashboard();
//     } catch (
//       registrationError
//     ) {
//       console.error(
//         registrationError,
//       );

//       setRegistrationPassword(
//         "",
//       );

//       setError(
//         getErrorMessage(
//           registrationError,
//           "No se pudo registrar la dirección pública.",
//         ),
//       );
//     } finally {
//       setCreatingWallet(
//         false,
//       );
//     }
//   }

//   /*
//    * ==========================================================
//    * RECUPERAR WALLET
//    * ==========================================================
//    */

//   async function handleRecoverWallet(
//     event:
//       FormEvent<HTMLFormElement>,
//   ) {
//     event.preventDefault();

//     setError(
//       null,
//     );

//     setSuccess(
//       null,
//     );

//     if (
//       !user ||
//       !wallet ||
//       !blockchain
//     ) {
//       setError(
//         "No se pudo determinar la wallet registrada.",
//       );

//       return;
//     }

//     if (
//       recoveryPassword.length <
//       8
//     ) {
//       setError(
//         "La nueva contraseña local debe tener al menos 8 caracteres.",
//       );

//       return;
//     }

//     if (
//       recoveryPassword !==
//       recoveryPasswordConfirmation
//     ) {
//       setError(
//         "Las contraseñas no coinciden.",
//       );

//       return;
//     }

//     try {
//       setRecoveringWallet(
//         true,
//       );

//       const restored =
//         restoreNonCustodialWallet(
//           recoveryMnemonic,
//         );

//       if (
//         restored.addressBase58 !==
//         wallet.addressBase58
//       ) {
//         throw new Error(
//           "La frase de recuperación corresponde a otra wallet. La dirección derivada no coincide con la wallet registrada en esta cuenta.",
//         );
//       }

//       if (
//         restored.addressHex !==
//         wallet.addressHex
//       ) {
//         throw new Error(
//           "La dirección hexadecimal derivada no coincide con la wallet registrada.",
//         );
//       }

//       await saveEncryptedWallet({
//         userId:
//           user.id,

//         network:
//           blockchain.network,

//         wallet:
//           restored,

//         password:
//           recoveryPassword,
//       });

//       const stored =
//         await getStoredWalletMetadata({
//           userId:
//             user.id,

//           network:
//             blockchain.network,
//         });

//       if (
//         !stored
//       ) {
//         throw new Error(
//           "La wallet fue recuperada pero no pudo verificarse en el almacenamiento local.",
//         );
//       }

//       if (
//         stored.addressBase58 !==
//         wallet.addressBase58
//       ) {
//         throw new Error(
//           "La wallet local recuperada no coincide con la dirección registrada.",
//         );
//       }

//       setLocalWallet(
//         stored,
//       );

//       setRecoveryMnemonic(
//         "",
//       );

//       setRecoveryPassword(
//         "",
//       );

//       setRecoveryPasswordConfirmation(
//         "",
//       );

//       setSuccess(
//         "Wallet recuperada correctamente en este dispositivo.",
//       );
//     } catch (
//       recoveryError
//     ) {
//       console.error(
//         "[WALLET RECOVERY]",
//         recoveryError,
//       );

//       setError(
//         getErrorMessage(
//           recoveryError,
//           "No se pudo recuperar la wallet.",
//         ),
//       );
//     } finally {
//       setRecoveringWallet(
//         false,
//       );
//     }
//   }

//   /*
//    * ==========================================================
//    * TRANSFERENCIA BROADCAST
//    * ==========================================================
//    */

//   const handleTransferBroadcasted =
//     useCallback(
//       async (
//         txid:
//           string,
//       ) => {
//         setSuccess(
//           `La transacción fue enviada a TRON. TXID: ${txid}`,
//         );

//         /*
//          * El saldo puede tardar algunos segundos
//          * en reflejar el nuevo estado.
//          *
//          * Hacemos una primera actualización inmediata.
//          */
//         await loadDashboard(
//           true,
//         );
//       },
//       [
//         loadDashboard,
//       ],
//     );

//   /*
//    * ==========================================================
//    * COPIAR ADDRESS
//    * ==========================================================
//    */

//   async function handleCopyAddress() {
//     const address =
//       wallet
//         ?.addressBase58 ??
//       localWallet
//         ?.addressBase58;

//     if (
//       !address
//     ) {
//       return;
//     }

//     try {
//       await navigator
//         .clipboard
//         .writeText(
//           address,
//         );

//       setSuccess(
//         "Dirección copiada.",
//       );

//       window.setTimeout(
//         () => {
//           setSuccess(
//             null,
//           );
//         },
//         2000,
//       );
//     } catch {
//       setError(
//         "No se pudo copiar la dirección.",
//       );
//     }
//   }

//   /*
//    * ==========================================================
//    * LOGOUT
//    * ==========================================================
//    */

//   async function handleLogout() {
//     try {
//       await fetch(
//         "/api/v1/auth/logout",
//         {
//           method:
//             "POST",
//         },
//       );
//     } finally {
//       router.push(
//         "/login",
//       );

//       router.refresh();
//     }
//   }

//   /*
//    * ==========================================================
//    * LOADING
//    * ==========================================================
//    */

//   if (
//     loading
//   ) {
//     return (
//       <main className="min-h-screen bg-slate-50">
//         <div className="mx-auto max-w-6xl p-6">
//           <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
//             Cargando wallet...
//           </div>
//         </div>
//       </main>
//     );
//   }

//   /*
//    * ==========================================================
//    * RENDER
//    * ==========================================================
//    */

//   return (
//     <main className="min-h-screen bg-slate-50">
//       <header className="border-b border-slate-200 bg-white">
//         <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
//           <div>
//             <div className="flex items-center gap-2">
//               <WalletCards className="h-5 w-5 text-slate-700" />

//               <h1 className="text-xl text-slate-900">
//                 USDT Wallet
//               </h1>
//             </div>

//             <p className="mt-1 text-sm text-slate-500">
//               {user?.name}
//             </p>
//           </div>

//           <div className="flex items-center gap-2">
//             {user?.role ===
//               "ADMIN" && (
//               <button
//                 type="button"
//                 onClick={() =>
//                   router.push(
//                     "/admin",
//                   )
//                 }
//                 className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
//               >
//                 Administración
//               </button>
//             )}

//             <button
//               type="button"
//               onClick={
//                 handleLogout
//               }
//               className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
//             >
//               <LogOut className="h-4 w-4" />

//               Salir
//             </button>
//           </div>
//         </div>
//       </header>

//       <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
//         {error && (
//           <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
//             <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

//             <span>
//               {error}
//             </span>
//           </div>
//         )}

//         {success && (
//           <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
//             <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

//             <span className="break-all">
//               {success}
//             </span>
//           </div>
//         )}

//         {/*
//          * ====================================================
//          * SETUP - CREAR WALLET
//          * ====================================================
//          */}

//         {needsWalletSetup &&
//           setupStep ===
//             "CREATE" && (
//             <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//               <div className="flex items-start gap-3">
//                 <div className="rounded-xl bg-slate-100 p-3">
//                   <KeyRound className="h-6 w-6 text-slate-700" />
//                 </div>

//                 <div>
//                   <h2 className="text-lg text-slate-900">
//                     Crear mi wallet
//                   </h2>

//                   <p className="mt-1 text-sm leading-6 text-slate-500">
//                     La wallet se generará en este dispositivo. La clave privada y la frase de recuperación no serán enviadas al servidor.
//                   </p>
//                 </div>
//               </div>

//               <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
//                 La contraseña protege la copia local de la wallet. Si perdés este dispositivo, la recuperación se realizará mediante las 12 palabras.
//               </div>

//               <form
//                 onSubmit={
//                   handleGenerateWallet
//                 }
//                 className="mt-6 space-y-4"
//               >
//                 <div>
//                   <label className="mb-2 block text-sm text-slate-700">
//                     Contraseña de la wallet
//                   </label>

//                   <input
//                     type="password"
//                     autoComplete="new-password"
//                     value={
//                       walletPassword
//                     }
//                     onChange={(
//                       event,
//                     ) =>
//                       setWalletPassword(
//                         event
//                           .target
//                           .value,
//                       )
//                     }
//                     minLength={
//                       8
//                     }
//                     required
//                     disabled={
//                       creatingWallet
//                     }
//                     className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="mb-2 block text-sm text-slate-700">
//                     Repetir contraseña
//                   </label>

//                   <input
//                     type="password"
//                     autoComplete="new-password"
//                     value={
//                       walletPasswordConfirmation
//                     }
//                     onChange={(
//                       event,
//                     ) =>
//                       setWalletPasswordConfirmation(
//                         event
//                           .target
//                           .value,
//                       )
//                     }
//                     minLength={
//                       8
//                     }
//                     required
//                     disabled={
//                       creatingWallet
//                     }
//                     className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500"
//                   />
//                 </div>

//                 <button
//                   type="submit"
//                   disabled={
//                     creatingWallet
//                   }
//                   className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
//                 >
//                   <ShieldCheck className="h-4 w-4" />

//                   {creatingWallet
//                     ? "Generando..."
//                     : "Crear wallet no-custodial"}
//                 </button>
//               </form>
//             </section>
//           )}

//         {/*
//          * ====================================================
//          * SETUP - BACKUP
//          * ====================================================
//          */}

//         {setupStep ===
//           "BACKUP" &&
//           generatedWallet && (
//             <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//               <div className="flex items-start gap-3">
//                 <div className="rounded-xl bg-amber-100 p-3">
//                   <LockKeyhole className="h-6 w-6 text-amber-700" />
//                 </div>

//                 <div>
//                   <h2 className="text-lg text-slate-900">
//                     Guardá tu frase de recuperación
//                   </h2>

//                   <p className="mt-1 text-sm leading-6 text-slate-500">
//                     Estas 12 palabras permiten recuperar los fondos desde una wallet compatible aun si esta plataforma deja de existir.
//                   </p>
//                 </div>
//               </div>

//               <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
//                 No compartas estas palabras con nadie. El administrador de la plataforma nunca debe pedírtelas.
//               </div>

//               <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
//                 {generatedWallet
//                   .mnemonic
//                   .split(
//                     " ",
//                   )
//                   .map(
//                     (
//                       word,
//                       index,
//                     ) => (
//                       <div
//                         key={`${index}-${word}`}
//                         className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
//                       >
//                         <span className="mr-2 text-xs text-slate-400">
//                           {index +
//                             1}.
//                         </span>

//                         <span className="text-sm text-slate-900">
//                           {word}
//                         </span>
//                       </div>
//                     ),
//                   )}
//               </div>

//               <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
//                 <input
//                   type="checkbox"
//                   checked={
//                     backupConfirmed
//                   }
//                   onChange={(
//                     event,
//                   ) =>
//                     setBackupConfirmed(
//                       event
//                         .target
//                         .checked,
//                     )
//                   }
//                   className="mt-1 h-4 w-4"
//                 />

//                 <span className="text-sm leading-6 text-slate-700">
//                   Guardé las 12 palabras en un lugar seguro y comprendo que son necesarias para recuperar mi wallet.
//                 </span>
//               </label>

//               <button
//                 type="button"
//                 onClick={
//                   handleBackupContinue
//                 }
//                 disabled={
//                   !backupConfirmed
//                 }
//                 className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
//               >
//                 Continuar
//               </button>
//             </section>
//           )}

//         {/*
//          * ====================================================
//          * SETUP - CONFIRMAR BACKUP
//          * ====================================================
//          */}

//         {setupStep ===
//           "CONFIRM" &&
//           generatedWallet && (
//             <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//               <h2 className="text-lg text-slate-900">
//                 Verificar respaldo
//               </h2>

//               <p className="mt-2 text-sm leading-6 text-slate-500">
//                 Ingresá las palabras solicitadas.
//               </p>

//               <form
//                 onSubmit={
//                   handleConfirmRecoveryPhrase
//                 }
//                 className="mt-6 space-y-4"
//               >
//                 {verificationPositions.map(
//                   (
//                     position,
//                   ) => (
//                     <div
//                       key={
//                         position
//                       }
//                     >
//                       <label className="mb-2 block text-sm text-slate-700">
//                         Palabra número{" "}
//                         {position}
//                       </label>

//                       <input
//                         type="text"
//                         autoComplete="off"
//                         autoCapitalize="none"
//                         spellCheck={
//                           false
//                         }
//                         value={
//                           verificationWords[
//                             position
//                           ] ??
//                           ""
//                         }
//                         onChange={(
//                           event,
//                         ) =>
//                           setVerificationWords(
//                             (
//                               current,
//                             ) => ({
//                               ...current,

//                               [position]:
//                                 event
//                                   .target
//                                   .value,
//                             }),
//                           )
//                         }
//                         required
//                         className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500"
//                       />
//                     </div>
//                   ),
//                 )}

//                 <button
//                   type="submit"
//                   disabled={
//                     creatingWallet
//                   }
//                   className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
//                 >
//                   <ShieldCheck className="h-4 w-4" />

//                   {creatingWallet
//                     ? "Guardando wallet..."
//                     : "Confirmar y guardar wallet"}
//                 </button>
//               </form>
//             </section>
//           )}

//         {/*
//          * ====================================================
//          * REGISTRO PENDIENTE
//          * ====================================================
//          */}

//         {setupStep ===
//           "REGISTERING" &&
//           localWallet && (
//             <section className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
//               <div className="flex items-start gap-3">
//                 <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />

//                 <div>
//                   <h2 className="text-lg text-slate-900">
//                     Wallet local pendiente de registro
//                   </h2>

//                   <p className="mt-2 text-sm leading-6 text-slate-500">
//                     La wallet ya está guardada y cifrada en este dispositivo, pero su dirección pública todavía no figura en el servidor.
//                   </p>
//                 </div>
//               </div>

//               <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
//                 <p className="text-xs text-slate-500">
//                   Dirección
//                 </p>

//                 <p className="mt-1 break-all font-mono text-sm text-slate-900">
//                   {
//                     localWallet.addressBase58
//                   }
//                 </p>
//               </div>

//               <div className="mt-5">
//                 <label className="mb-2 block text-sm text-slate-700">
//                   Contraseña de la wallet
//                 </label>

//                 <input
//                   type="password"
//                   autoComplete="current-password"
//                   value={
//                     registrationPassword
//                   }
//                   onChange={(
//                     event,
//                   ) =>
//                     setRegistrationPassword(
//                       event.target.value,
//                     )
//                   }
//                   disabled={
//                     creatingWallet
//                   }
//                   placeholder="Desbloquear wallet local"
//                   className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-50"
//                 />

//                 <p className="mt-2 text-xs leading-5 text-slate-500">
//                   La contraseña se usa solamente en este dispositivo para firmar una prueba de propiedad. No se envía al servidor.
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={
//                   handleRetryRegistration
//                 }
//                 disabled={
//                   creatingWallet ||
//                   !registrationPassword
//                 }
//                 className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
//               >
//                 <RefreshCw className="h-4 w-4" />

//                 {creatingWallet
//                   ? "Verificando y registrando..."
//                   : "Verificar propiedad y registrar"}
//               </button>
//             </section>
//           )}

//         {/*
//          * ====================================================
//          * WALLET ACTIVA
//          * ====================================================
//          */}

//         {!needsWalletSetup &&
//           wallet &&
//           blockchain && (
//             <>
//               <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//                 <div className="flex flex-wrap items-start justify-between gap-4">
//                   <div>
//                     <p className="text-sm text-slate-500">
//                       Saldo USDT
//                     </p>

//                     <div className="mt-2 flex items-end gap-2">
//                       <span className="text-4xl tracking-tight text-slate-900">
//                         {
//                           wallet
//                             .formattedBalance
//                         }
//                       </span>

//                       <span className="pb-1 text-lg text-slate-500">
//                         USDT
//                       </span>
//                     </div>

//                     <p className="mt-3 text-xs text-slate-400">
//                       Saldo obtenido directamente de TRON · TRC20
//                     </p>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={() =>
//                       void loadDashboard(
//                         true,
//                       )
//                     }
//                     disabled={
//                       refreshing
//                     }
//                     className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
//                   >
//                     <RefreshCw
//                       className={`h-4 w-4 ${
//                         refreshing
//                           ? "animate-spin"
//                           : ""
//                       }`}
//                     />

//                     Actualizar
//                   </button>
//                 </div>
//               </section>

//               <div className="grid gap-6 lg:grid-cols-2">
//                 <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//                   <div className="flex items-center gap-2">
//                     <QrCode className="h-5 w-5 text-slate-600" />

//                     <h2 className="text-lg text-slate-900">
//                       Recibir USDT
//                     </h2>
//                   </div>

//                   <p className="mt-2 text-sm leading-6 text-slate-500">
//                     Enviá únicamente USDT mediante la red TRON TRC20 a esta dirección.
//                   </p>

//                   {qrDataUrl && (
//                     <div className="mt-5 flex justify-center">
//                       {/* eslint-disable-next-line @next/next/no-img-element */}
//                       <img
//                         src={
//                           qrDataUrl
//                         }
//                         alt="QR dirección TRON"
//                         width={
//                           220
//                         }
//                         height={
//                           220
//                         }
//                         className="rounded-xl border border-slate-200 bg-white p-2"
//                       />
//                     </div>
//                   )}

//                   <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
//                     <p className="break-all font-mono text-sm text-slate-900">
//                       {
//                         wallet.addressBase58
//                       }
//                     </p>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={
//                       handleCopyAddress
//                     }
//                     className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
//                   >
//                     <Copy className="h-4 w-4" />

//                     Copiar dirección
//                   </button>
//                 </section>

//                 <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//                   <h2 className="text-lg text-slate-900">
//                     Estado de la wallet
//                   </h2>

//                   <div className="mt-5 space-y-4 text-sm">
//                     <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
//                       <span className="text-slate-500">
//                         Red
//                       </span>

//                       <span className="text-slate-900">
//                         {
//                           wallet.network
//                         }
//                       </span>
//                     </div>

//                     <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
//                       <span className="text-slate-500">
//                         Tipo
//                       </span>

//                       <span className="text-slate-900">
//                         No-custodial
//                       </span>
//                     </div>

//                     <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
//                       <span className="text-slate-500">
//                         TRX
//                       </span>

//                       <span className="text-slate-900">
//                         {
//                           wallet
//                             .trx
//                             .formattedBalance
//                         }
//                       </span>
//                     </div>

//                     <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
//                       <span className="text-slate-500">
//                         Energy disponible
//                       </span>

//                       <span className="text-slate-900">
//                         {
//                           wallet
//                             .resources
//                             .energyAvailable
//                         }
//                       </span>
//                     </div>

//                     <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
//                       <span className="text-slate-500">
//                         Bandwidth disponible
//                       </span>

//                       <span className="text-slate-900">
//                         {
//                           wallet
//                             .resources
//                             .bandwidthAvailable
//                         }
//                       </span>
//                     </div>

//                     <div className="flex items-center justify-between gap-4">
//                       <span className="text-slate-500">
//                         Cuenta TRON
//                       </span>

//                       <span
//                         className={
//                           wallet.activated
//                             ? "text-emerald-600"
//                             : "text-amber-600"
//                         }
//                       >
//                         {wallet.activated
//                           ? "Activada"
//                           : "No activada"}
//                       </span>
//                     </div>
//                   </div>
//                 </section>
//               </div>

//               {/*
//                * ===============================================
//                * RECUPERACIÓN LOCAL
//                * ===============================================
//                */}

//               {!localWallet && (
//                 <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
//                   <div className="flex items-start gap-3">
//                     <div className="rounded-xl bg-amber-100 p-3">
//                       <RotateCcw className="h-6 w-6 text-amber-700" />
//                     </div>

//                     <div>
//                       <h2 className="text-lg text-slate-900">
//                         Recuperar wallet en este dispositivo
//                       </h2>

//                       <p className="mt-2 text-sm leading-6 text-slate-500">
//                         Esta cuenta ya tiene una dirección TRON registrada, pero este navegador no contiene el vault cifrado necesario para firmar transacciones.
//                       </p>
//                     </div>
//                   </div>

//                   <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
//                     Ingresá únicamente las 12 palabras correspondientes a esta wallet. La frase se procesa localmente en este navegador y no se envía al servidor.
//                   </div>

//                   <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
//                     <p className="text-xs text-slate-500">
//                       Dirección que debe recuperarse
//                     </p>

//                     <p className="mt-1 break-all font-mono text-sm text-slate-900">
//                       {
//                         wallet.addressBase58
//                       }
//                     </p>
//                   </div>

//                   <form
//                     onSubmit={
//                       handleRecoverWallet
//                     }
//                     className="mt-6 space-y-4"
//                   >
//                     <div>
//                       <label className="mb-2 block text-sm text-slate-700">
//                         Frase de recuperación de 12 palabras
//                       </label>

//                       <textarea
//                         value={
//                           recoveryMnemonic
//                         }
//                         onChange={(
//                           event,
//                         ) =>
//                           setRecoveryMnemonic(
//                             event
//                               .target
//                               .value,
//                           )
//                         }
//                         rows={
//                           4
//                         }
//                         autoComplete="off"
//                         autoCapitalize="none"
//                         spellCheck={
//                           false
//                         }
//                         required
//                         disabled={
//                           recoveringWallet
//                         }
//                         placeholder="palabra1 palabra2 palabra3 ..."
//                         className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-3 font-mono text-sm text-slate-900 outline-none focus:border-slate-500"
//                       />
//                     </div>

//                     <div>
//                       <label className="mb-2 block text-sm text-slate-700">
//                         Nueva contraseña local
//                       </label>

//                       <input
//                         type="password"
//                         autoComplete="new-password"
//                         value={
//                           recoveryPassword
//                         }
//                         onChange={(
//                           event,
//                         ) =>
//                           setRecoveryPassword(
//                             event
//                               .target
//                               .value,
//                           )
//                         }
//                         minLength={
//                           8
//                         }
//                         required
//                         disabled={
//                           recoveringWallet
//                         }
//                         className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500"
//                       />
//                     </div>

//                     <div>
//                       <label className="mb-2 block text-sm text-slate-700">
//                         Repetir nueva contraseña
//                       </label>

//                       <input
//                         type="password"
//                         autoComplete="new-password"
//                         value={
//                           recoveryPasswordConfirmation
//                         }
//                         onChange={(
//                           event,
//                         ) =>
//                           setRecoveryPasswordConfirmation(
//                             event
//                               .target
//                               .value,
//                           )
//                         }
//                         minLength={
//                           8
//                         }
//                         required
//                         disabled={
//                           recoveringWallet
//                         }
//                         className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500"
//                       />
//                     </div>

//                     <button
//                       type="submit"
//                       disabled={
//                         recoveringWallet
//                       }
//                       className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
//                     >
//                       <RotateCcw className="h-4 w-4" />

//                       {recoveringWallet
//                         ? "Recuperando..."
//                         : "Recuperar wallet"}
//                     </button>
//                   </form>
//                 </section>
//               )}

//               {/*
//                * ===============================================
//                * ENVÍO USDT
//                * ===============================================
//                *
//                * Solo habilitamos firma si este dispositivo
//                * posee el vault local cifrado.
//                */}

//               {localWallet ? (
//                 <SendUsdtPanel
//                   userId={
//                     user!.id
//                   }
//                   network={
//                     blockchain.network
//                   }
//                   fromAddress={
//                     wallet.addressBase58
//                   }
//                   contractAddress={
//                     blockchain.contractAddress
//                   }
//                   onTransferBroadcasted={
//                     handleTransferBroadcasted
//                   }
//                 />
//               ) : (
//                 <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//                   <h2 className="text-lg text-slate-900">
//                     Enviar USDT
//                   </h2>

//                   <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
//                     <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

//                     <div>
//                       Para enviar fondos primero tenés que recuperar la wallet en este dispositivo mediante las 12 palabras.
//                     </div>
//                   </div>
//                 </section>
//               )}

//               <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//                 <h2 className="text-lg text-slate-900">
//                   Mi cuenta
//                 </h2>

//                 <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
//                   <div>
//                     <p className="text-slate-500">
//                       Nombre
//                     </p>

//                     <p className="mt-1 text-slate-900">
//                       {user?.name}
//                     </p>
//                   </div>

//                   <div>
//                     <p className="text-slate-500">
//                       Email
//                     </p>

//                     <p className="mt-1 text-slate-900">
//                       {user?.email}
//                     </p>
//                   </div>

//                   <div>
//                     <p className="text-slate-500">
//                       Perfil
//                     </p>

//                     <p className="mt-1 text-slate-900">
//                       {user?.role}
//                     </p>
//                   </div>

//                   <div>
//                     <p className="text-slate-500">
//                       Dirección
//                     </p>

//                     <p
//                       title={
//                         wallet.addressBase58
//                       }
//                       className="mt-1 font-mono text-slate-900"
//                     >
//                       {shortenAddress(
//                         wallet.addressBase58,
//                       )}
//                     </p>
//                   </div>
//                 </div>
//               </section>

//               {localWallet && (
//                 <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
//                   <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

//                   <div>
//                     <p className="text-sm text-emerald-800">
//                       Wallet protegida localmente
//                     </p>

//                     <p className="mt-1 text-xs leading-5 text-emerald-700">
//                       Este dispositivo contiene una copia cifrada de la wallet. El servidor solamente conoce la dirección pública.
//                     </p>
//                   </div>
//                 </section>
//               )}
//             </>
//           )}
//       </div>
//     </main>
//   );
// }

"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import QRCode from "qrcode";

import {
  TronWeb,
} from "tronweb";

import {
  CheckCircle2,
  Copy,
  KeyRound,
  LockKeyhole,
  LogOut,
  QrCode,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
  Zap,
  Wifi,
} from "lucide-react";

import SendUsdtPanel from "@/components/wallet/SendUsdtPanel";

import {
  generateNonCustodialWallet,
  restoreNonCustodialWallet,
} from "@/lib/wallet/non-custodial-wallet.client";

import type {
  GeneratedNonCustodialWallet,
} from "@/lib/wallet/non-custodial-wallet.client";

import {
  generateRecoveryVerificationPositions,
  recoveryWordMatches,
} from "@/lib/wallet/recovery-verification.client";

import {
  getStoredWalletMetadata,
  hasStoredWallet,
  saveEncryptedWallet,
  unlockStoredWallet,
} from "@/lib/wallet/wallet-storage.client";

import type {
  StoredWalletMetadata,
  WalletNetwork,
} from "@/lib/wallet/wallet-storage.client";

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

interface User {
  id:
    string;

  name:
    string;

  email:
    string;

  role:
    | "ADMIN"
    | "USER";
}

interface BlockchainInfo {
  network:
    WalletNetwork;

  asset:
    "USDT";

  tokenStandard:
    "TRC20";

  contractAddress:
    string;
}

interface WalletInfo {
  id:
    string;

  asset:
    "USDT";

  status:
    string;

  walletType:
    string;

  network:
    WalletNetwork;

  address:
    string;

  addressBase58:
    string;

  addressHex:
    string;

  balance:
    string;

  formattedBalance:
    string;

  usdt: {
    balanceUnits:
      string;

    formattedBalance:
      string;

    contractAddress:
      string;
  };

  trx: {
    balanceSun:
      string;

    formattedBalance:
      string;
  };

  resources: {
    energyAvailable:
      string;

    bandwidthAvailable:
      string;
  };

  activated:
    boolean;

  createdAt:
    string;

  updatedAt:
    string;
}

interface MeResponse {
  user?:
    User;

  message?:
    string;
}

interface WalletResponse {
  success:
    boolean;

  needsWalletSetup:
    boolean;

  wallet:
    WalletInfo |
    null;

  blockchain:
    BlockchainInfo;

  code?:
    string;

  message?:
    string;
}

interface AddressChallengeResponse {
  success:
    boolean;

  challenge?: {
    id:
      string;

    network:
      WalletNetwork;

    addressBase58:
      string;

    addressHex:
      string;

    message:
      string;

    expiresAt:
      string;
  };

  code?:
    string;

  message?:
    string;
}

interface RegisterAddressResponse {
  success:
    boolean;

  ownershipVerified?:
    boolean;

  wallet?: {
    id:
      string;

    userId:
      string;

    network:
      WalletNetwork;

    addressBase58:
      string;

    addressHex:
      string;

    walletType:
      string;

    status:
      string;

    createdAt:
      string;

    updatedAt:
      string;
  };

  code?:
    string;

  message?:
    string;
}

type SetupStep =
  | "NONE"
  | "CREATE"
  | "BACKUP"
  | "CONFIRM"
  | "REGISTERING"
  | "COMPLETE";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getErrorMessage(
  error:
    unknown,

  fallback:
    string,
): string {
  if (
    error instanceof
      Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

function shortenAddress(
  address:
    string,
): string {
  if (
    address.length <=
    18
  ) {
    return address;
  }

  return `${address.slice(
    0,
    9,
  )}...${address.slice(
    -9,
  )}`;
}

/*
 * ============================================================
 * DASHBOARD
 * ============================================================
 */

export default function DashboardPage() {
  const router =
    useRouter();

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null,
    );

  const [
    wallet,
    setWallet,
  ] =
    useState<WalletInfo | null>(
      null,
    );

  const [
    blockchain,
    setBlockchain,
  ] =
    useState<BlockchainInfo | null>(
      null,
    );

  const [
    localWallet,
    setLocalWallet,
  ] =
    useState<StoredWalletMetadata | null>(
      null,
    );

  const [
    needsWalletSetup,
    setNeedsWalletSetup,
  ] =
    useState(
      false,
    );

  const [
    setupStep,
    setSetupStep,
  ] =
    useState<SetupStep>(
      "NONE",
    );

  const [
    generatedWallet,
    setGeneratedWallet,
  ] =
    useState<GeneratedNonCustodialWallet | null>(
      null,
    );

  const [
    walletPassword,
    setWalletPassword,
  ] =
    useState(
      "",
    );

  const [
    walletPasswordConfirmation,
    setWalletPasswordConfirmation,
  ] =
    useState(
      "",
    );

  const [
    registrationPassword,
    setRegistrationPassword,
  ] =
    useState(
      "",
    );

  const [
    backupConfirmed,
    setBackupConfirmed,
  ] =
    useState(
      false,
    );

  const [
    verificationPositions,
    setVerificationPositions,
  ] =
    useState<number[]>(
      [],
    );

  const [
    verificationWords,
    setVerificationWords,
  ] =
    useState<
      Record<
        number,
        string
      >
    >({});

  /*
   * ==========================================================
   * RECUPERACIÓN
   * ==========================================================
   */

  const [
    recoveryMnemonic,
    setRecoveryMnemonic,
  ] =
    useState(
      "",
    );

  const [
    recoveryPassword,
    setRecoveryPassword,
  ] =
    useState(
      "",
    );

  const [
    recoveryPasswordConfirmation,
    setRecoveryPasswordConfirmation,
  ] =
    useState(
      "",
    );

  const [
    recoveringWallet,
    setRecoveringWallet,
  ] =
    useState(
      false,
    );

  const [
    qrDataUrl,
    setQrDataUrl,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    );

  const [
    creatingWallet,
    setCreatingWallet,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const [
    success,
    setSuccess,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  /*
   * ==========================================================
   * CARGA
   * ==========================================================
   *
   * IMPORTANTE:
   *
   * Primero consultamos /me.
   *
   * ADMIN es redirigido antes de llamar /wallet.
   */

  const loadDashboard =
    useCallback(
      async (
        showRefresh:
          boolean =
          false,
      ) => {
        if (
          showRefresh
        ) {
          setRefreshing(
            true,
          );
        }

        try {
          setError(
            null,
          );

          /*
           * ====================================================
           * USUARIO
           * ====================================================
           */

          const meResponse =
            await fetch(
              "/api/v1/me",
              {
                cache:
                  "no-store",
              },
            );

          if (
            meResponse.status ===
            401
          ) {
            router.replace(
              "/login",
            );

            return;
          }

          const meData =
            (
              await meResponse.json()
            ) as
              MeResponse;

          if (
            !meResponse.ok
          ) {
            throw new Error(
              meData.message ??
                "No se pudo obtener el usuario.",
            );
          }

          if (
            !meData.user
          ) {
            throw new Error(
              "La sesión no contiene un usuario válido.",
            );
          }

          const currentUser =
            meData.user;

          /*
           * ====================================================
           * ADMIN
           * ====================================================
           *
           * ADMIN no posee wallet personal.
           *
           * No consultamos /api/v1/wallet.
           */

          if (
            currentUser.role ===
            "ADMIN"
          ) {
            router.replace(
              "/admin",
            );

            return;
          }

          /*
           * ====================================================
           * USER
           * ====================================================
           */

          setUser(
            currentUser,
          );

          const walletResponse =
            await fetch(
              "/api/v1/wallet",
              {
                cache:
                  "no-store",
              },
            );

          if (
            walletResponse.status ===
            401
          ) {
            router.replace(
              "/login",
            );

            return;
          }

          const walletData =
            (
              await walletResponse.json()
            ) as
              WalletResponse;

          if (
            !walletResponse.ok ||
            walletData.success !==
              true
          ) {
            throw new Error(
              walletData.message ??
                "No se pudo obtener la wallet.",
            );
          }

          setWallet(
            walletData.wallet,
          );

          setBlockchain(
            walletData.blockchain,
          );

          setNeedsWalletSetup(
            walletData
              .needsWalletSetup,
          );

          const network =
            walletData
              .blockchain
              .network;

          const stored =
            await getStoredWalletMetadata({
              userId:
                currentUser.id,

              network,
            });

          setLocalWallet(
            stored,
          );

          if (
            walletData
              .needsWalletSetup &&
            !stored
          ) {
            setSetupStep(
              "CREATE",
            );
          }

          if (
            walletData
              .needsWalletSetup &&
            stored
          ) {
            setSetupStep(
              "REGISTERING",
            );
          }

          if (
            !walletData
              .needsWalletSetup
          ) {
            setSetupStep(
              "COMPLETE",
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            loadError,
          );

          setError(
            getErrorMessage(
              loadError,
              "No se pudo cargar la cuenta.",
            ),
          );
        } finally {
          setLoading(
            false,
          );

          setRefreshing(
            false,
          );
        }
      },
      [
        router,
      ],
    );

  useEffect(
    () => {
      void loadDashboard();
    },
    [
      loadDashboard,
    ],
  );

  /*
   * ==========================================================
   * QR
   * ==========================================================
   */

  useEffect(
    () => {
      let cancelled =
        false;

      async function buildQr() {
        const address =
          wallet
            ?.addressBase58 ??
          localWallet
            ?.addressBase58;

        if (
          !address
        ) {
          setQrDataUrl(
            null,
          );

          return;
        }

        try {
          const dataUrl =
            await QRCode
              .toDataURL(
                address,
                {
                  width:
                    240,

                  margin:
                    1,

                  errorCorrectionLevel:
                    "M",
                },
              );

          if (
            !cancelled
          ) {
            setQrDataUrl(
              dataUrl,
            );
          }
        } catch (
          qrError
        ) {
          console.error(
            "[QR]",
            qrError,
          );

          if (
            !cancelled
          ) {
            setQrDataUrl(
              null,
            );
          }
        }
      }

      void buildQr();

      return () => {
        cancelled =
          true;
      };
    },
    [
      wallet,
      localWallet,
    ],
  );

  /*
   * ==========================================================
   * CREAR WALLET
   * ==========================================================
   */

  function handleGenerateWallet(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(
      null,
    );

    setSuccess(
      null,
    );

    if (
      !user ||
      !blockchain
    ) {
      setError(
        "No se pudo determinar el usuario o la red.",
      );

      return;
    }

    if (
      walletPassword.length <
      8
    ) {
      setError(
        "La contraseña de la wallet debe tener al menos 8 caracteres.",
      );

      return;
    }

    if (
      walletPassword !==
      walletPasswordConfirmation
    ) {
      setError(
        "Las contraseñas no coinciden.",
      );

      return;
    }

    try {
      setCreatingWallet(
        true,
      );

      const generated =
        generateNonCustodialWallet();

      setGeneratedWallet(
        generated,
      );

      setBackupConfirmed(
        false,
      );

      const verification =
        generateRecoveryVerificationPositions(
          12,
          3,
        );

      setVerificationPositions(
        verification.positions,
      );

      setVerificationWords(
        {},
      );

      setSetupStep(
        "BACKUP",
      );
    } catch (
      generationError
    ) {
      console.error(
        generationError,
      );

      setError(
        getErrorMessage(
          generationError,
          "No se pudo generar la wallet.",
        ),
      );
    } finally {
      setCreatingWallet(
        false,
      );
    }
  }

  /*
   * ==========================================================
   * BACKUP
   * ==========================================================
   */

  function handleBackupContinue() {
    setError(
      null,
    );

    if (
      !backupConfirmed
    ) {
      setError(
        "Confirmá que guardaste la frase de recuperación antes de continuar.",
      );

      return;
    }

    if (
      verificationPositions.length !==
      3
    ) {
      setError(
        "No se pudo generar correctamente la verificación de la frase. Volvé a iniciar el proceso.",
      );

      return;
    }

    setSetupStep(
      "CONFIRM",
    );
  }

  /*
   * ==========================================================
   * CONFIRMAR FRASE
   * ==========================================================
   */

  async function handleConfirmRecoveryPhrase(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(
      null,
    );

    setSuccess(
      null,
    );

    if (
      !generatedWallet ||
      !user ||
      !blockchain
    ) {
      setError(
        "La wallet temporal ya no está disponible. Volvé a iniciar el proceso.",
      );

      return;
    }

    if (
      verificationPositions.length !==
      3
    ) {
      setError(
        "No se pudo determinar qué palabras deben verificarse. Volvé a iniciar el proceso.",
      );

      return;
    }

    const verificationIsValid =
      verificationPositions
        .every(
          (
            position,
          ) =>
            recoveryWordMatches(
              generatedWallet
                .mnemonic,

              position,

              verificationWords[
                position
              ] ??
                "",
            ),
        );

    if (
      !verificationIsValid
    ) {
      setError(
        "Las palabras ingresadas no coinciden con la frase de recuperación.",
      );

      return;
    }

    try {
      setCreatingWallet(
        true,
      );

      await saveEncryptedWallet({
        userId:
          user.id,

        network:
          blockchain.network,

        wallet:
          generatedWallet,

        password:
          walletPassword,
      });

      const stored =
        await getStoredWalletMetadata({
          userId:
            user.id,

          network:
            blockchain.network,
        });

      if (
        !stored
      ) {
        throw new Error(
          "La wallet no pudo verificarse después de guardarla localmente.",
        );
      }

      setLocalWallet(
        stored,
      );

      await registerPublicAddress(
        stored,
        generatedWallet.privateKey,
      );

      setGeneratedWallet(
        null,
      );

      setWalletPassword(
        "",
      );

      setWalletPasswordConfirmation(
        "",
      );

      setVerificationWords(
        {},
      );

      setVerificationPositions(
        [],
      );

      setBackupConfirmed(
        false,
      );

      setSetupStep(
        "COMPLETE",
      );

      setSuccess(
        "Wallet no-custodial creada, propiedad verificada y registrada correctamente.",
      );

      await loadDashboard();
    } catch (
      saveError
    ) {
      console.error(
        saveError,
      );

      const stored =
        await hasStoredWallet({
          userId:
            user.id,

          network:
            blockchain.network,
        });

      if (
        stored
      ) {
        setGeneratedWallet(
          null,
        );

        setVerificationWords(
          {},
        );

        setVerificationPositions(
          [],
        );

        setBackupConfirmed(
          false,
        );

        setSetupStep(
          "REGISTERING",
        );

        setError(
          "La wallet quedó guardada de forma segura en este dispositivo, pero no se pudo registrar la dirección pública. Podés reintentar el registro sin generar otra wallet.",
        );

        return;
      }

      setError(
        getErrorMessage(
          saveError,
          "No se pudo guardar la wallet.",
        ),
      );
    } finally {
      setCreatingWallet(
        false,
      );
    }
  }

  /*
   * ==========================================================
   * TRONWEB PARA PRUEBA DE PROPIEDAD
   * ==========================================================
   */

  function createOwnershipProofTronWeb(
    network:
      WalletNetwork,
  ): TronWeb {
    switch (
      network
    ) {
      case "NILE":
        return new TronWeb({
          fullHost:
            "https://nile.trongrid.io",
        });

      case "MAINNET":
        return new TronWeb({
          fullHost:
            "https://api.trongrid.io",
        });

      default: {
        const exhaustive:
          never =
            network;

        throw new Error(
          `Red TRON no soportada: ${String(
            exhaustive,
          )}`,
        );
      }
    }
  }

  /*
   * ==========================================================
   * REGISTRAR DIRECCIÓN
   * ==========================================================
   */

  async function registerPublicAddress(
    metadata:
      StoredWalletMetadata,

    privateKey:
      string,
  ): Promise<void> {
    const challengeResponse =
      await fetch(
        "/api/v1/wallet/address-challenge",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              addressBase58:
                metadata
                  .addressBase58,

              addressHex:
                metadata
                  .addressHex,
            }),
        },
      );

    const challengeData =
      (
        await challengeResponse
          .json()
      ) as
        AddressChallengeResponse;

    if (
      !challengeResponse.ok ||
      challengeData.success !==
        true ||
      !challengeData.challenge
    ) {
      throw new Error(
        challengeData.message ??
          "No se pudo generar el challenge de propiedad.",
      );
    }

    const challenge =
      challengeData.challenge;

    if (
      challenge.network !==
        metadata.network ||
      challenge.addressBase58 !==
        metadata.addressBase58 ||
      challenge.addressHex.toUpperCase() !==
        metadata.addressHex.toUpperCase()
    ) {
      throw new Error(
        "El challenge recibido no corresponde a la wallet local.",
      );
    }

    /*
     * Firma local.
     * La private key nunca se envía al backend.
     */

    const tronWeb =
      createOwnershipProofTronWeb(
        metadata.network,
      );

    const signature =
      await tronWeb
        .trx
        .signMessageV2(
          challenge.message,
          privateKey,
        );

    if (
      typeof signature !==
        "string" ||
      !/^(?:0x)?[0-9a-fA-F]{130}$/.test(
        signature,
      )
    ) {
      throw new Error(
        "No se pudo generar una firma válida para demostrar la propiedad de la wallet.",
      );
    }

    const response =
      await fetch(
        "/api/v1/wallet/register-address",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              addressBase58:
                metadata
                  .addressBase58,

              addressHex:
                metadata
                  .addressHex,

              challengeId:
                challenge.id,

              signature,
            }),
        },
      );

    const data =
      (
        await response.json()
      ) as
        RegisterAddressResponse;

    if (
      !response.ok ||
      data.success !==
        true ||
      data.ownershipVerified !==
        true
    ) {
      throw new Error(
        data.message ??
          "No se pudo registrar la dirección pública.",
      );
    }
  }

  /*
   * ==========================================================
   * REINTENTAR REGISTRO
   * ==========================================================
   */

  async function handleRetryRegistration() {
    if (
      !user ||
      !blockchain
    ) {
      setError(
        "No se pudo determinar el usuario o la red.",
      );

      return;
    }

    if (
      !registrationPassword
    ) {
      setError(
        "Ingresá la contraseña de la wallet para demostrar que controlás esta dirección.",
      );

      return;
    }

    setError(
      null,
    );

    setSuccess(
      null,
    );

    try {
      setCreatingWallet(
        true,
      );

      const metadata =
        await getStoredWalletMetadata({
          userId:
            user.id,

          network:
            blockchain.network,
        });

      if (
        !metadata
      ) {
        setLocalWallet(
          null,
        );

        setSetupStep(
          "CREATE",
        );

        throw new Error(
          "No se encontró la wallet local en este dispositivo.",
        );
      }

      const unlocked =
        await unlockStoredWallet({
          userId:
            user.id,

          network:
            blockchain.network,

          password:
            registrationPassword,
        });

      setRegistrationPassword(
        "",
      );

      if (
        unlocked.addressBase58 !==
          metadata.addressBase58 ||
        unlocked.addressHex.toUpperCase() !==
          metadata.addressHex.toUpperCase()
      ) {
        throw new Error(
          "La wallet desbloqueada no coincide con la wallet local pendiente de registro.",
        );
      }

      await registerPublicAddress(
        metadata,
        unlocked.privateKey,
      );

      setSuccess(
        "La propiedad de la wallet fue verificada y la dirección pública quedó registrada correctamente.",
      );

      setSetupStep(
        "COMPLETE",
      );

      await loadDashboard();
    } catch (
      registrationError
    ) {
      console.error(
        registrationError,
      );

      setRegistrationPassword(
        "",
      );

      setError(
        getErrorMessage(
          registrationError,
          "No se pudo registrar la dirección pública.",
        ),
      );
    } finally {
      setCreatingWallet(
        false,
      );
    }
  }

  /*
   * ==========================================================
   * RECUPERAR WALLET
   * ==========================================================
   */

  async function handleRecoverWallet(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(
      null,
    );

    setSuccess(
      null,
    );

    if (
      !user ||
      !wallet ||
      !blockchain
    ) {
      setError(
        "No se pudo determinar la wallet registrada.",
      );

      return;
    }

    if (
      recoveryPassword.length <
      8
    ) {
      setError(
        "La nueva contraseña local debe tener al menos 8 caracteres.",
      );

      return;
    }

    if (
      recoveryPassword !==
      recoveryPasswordConfirmation
    ) {
      setError(
        "Las contraseñas no coinciden.",
      );

      return;
    }

    try {
      setRecoveringWallet(
        true,
      );

      const restored =
        restoreNonCustodialWallet(
          recoveryMnemonic,
        );

      if (
        restored.addressBase58 !==
        wallet.addressBase58
      ) {
        throw new Error(
          "La frase de recuperación corresponde a otra wallet. La dirección derivada no coincide con la wallet registrada en esta cuenta.",
        );
      }

      if (
        restored.addressHex !==
        wallet.addressHex
      ) {
        throw new Error(
          "La dirección hexadecimal derivada no coincide con la wallet registrada.",
        );
      }

      await saveEncryptedWallet({
        userId:
          user.id,

        network:
          blockchain.network,

        wallet:
          restored,

        password:
          recoveryPassword,
      });

      const stored =
        await getStoredWalletMetadata({
          userId:
            user.id,

          network:
            blockchain.network,
        });

      if (
        !stored
      ) {
        throw new Error(
          "La wallet fue recuperada pero no pudo verificarse en el almacenamiento local.",
        );
      }

      if (
        stored.addressBase58 !==
        wallet.addressBase58
      ) {
        throw new Error(
          "La wallet local recuperada no coincide con la dirección registrada.",
        );
      }

      setLocalWallet(
        stored,
      );

      setRecoveryMnemonic(
        "",
      );

      setRecoveryPassword(
        "",
      );

      setRecoveryPasswordConfirmation(
        "",
      );

      setSuccess(
        "Wallet recuperada correctamente en este dispositivo.",
      );
    } catch (
      recoveryError
    ) {
      console.error(
        "[WALLET RECOVERY]",
        recoveryError,
      );

      setError(
        getErrorMessage(
          recoveryError,
          "No se pudo recuperar la wallet.",
        ),
      );
    } finally {
      setRecoveringWallet(
        false,
      );
    }
  }

  /*
   * ==========================================================
   * BROADCAST
   * ==========================================================
   */

  const handleTransferBroadcasted =
    useCallback(
      async (
        txid:
          string,
      ) => {
        setSuccess(
          `La transacción fue enviada a TRON. TXID: ${txid}`,
        );

        await loadDashboard(
          true,
        );
      },
      [
        loadDashboard,
      ],
    );

  /*
   * ==========================================================
   * COPIAR DIRECCIÓN
   * ==========================================================
   */

  async function handleCopyAddress() {
    const address =
      wallet
        ?.addressBase58 ??
      localWallet
        ?.addressBase58;

    if (
      !address
    ) {
      return;
    }

    try {
      await navigator
        .clipboard
        .writeText(
          address,
        );

      setSuccess(
        "Dirección copiada.",
      );

      window.setTimeout(
        () => {
          setSuccess(
            null,
          );
        },
        2000,
      );
    } catch {
      setError(
        "No se pudo copiar la dirección.",
      );
    }
  }

  /*
   * ==========================================================
   * LOGOUT
   * ==========================================================
   */

  async function handleLogout() {
    try {
      await fetch(
        "/api/v1/auth/logout",
        {
          method:
            "POST",
        },
      );
    } finally {
      router.replace(
        "/login",
      );

      router.refresh();
    }
  }

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading ||
    !user
  ) {
    return (
      <main className="min-h-screen bg-[#08111f] text-slate-100">
        <div className="mx-auto max-w-7xl p-6">
          <div className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-8 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />

              Cargando cuenta...
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <main className="wallet-dark min-h-screen bg-[#08111f] text-slate-100">
      {/*
       * ========================================================
       * AJUSTES GLOBALES DEL DASHBOARD
       * ========================================================
       *
       * También permite que SendUsdtPanel adopte el tema oscuro
       * sin modificar todavía ese componente.
       */}

      <style jsx global>{`
        body {
          background: #08111f;
        }

        .wallet-dark {
          background:
            radial-gradient(
              circle at 85% -5%,
              rgba(37, 99, 235, 0.13),
              transparent 34rem
            ),
            radial-gradient(
              circle at 0% 50%,
              rgba(14, 165, 233, 0.04),
              transparent 30rem
            ),
            #08111f;
        }

        .wallet-dark .bg-white {
          background-color: #111d2d !important;
        }

        .wallet-dark .bg-slate-50 {
          background-color: #162335 !important;
        }

        .wallet-dark .bg-slate-100 {
          background-color: #1b2a3e !important;
        }

        .wallet-dark .border-slate-100,
        .wallet-dark .border-slate-200,
        .wallet-dark .border-slate-300 {
          border-color: rgba(71, 85, 105, 0.68) !important;
        }

        .wallet-dark .text-slate-900 {
          color: #f1f5f9 !important;
        }

        .wallet-dark .text-slate-700 {
          color: #cbd5e1 !important;
        }

        .wallet-dark .text-slate-600,
        .wallet-dark .text-slate-500 {
          color: #94a3b8 !important;
        }

        .wallet-dark .text-slate-400 {
          color: #64748b !important;
        }

        .wallet-dark input,
        .wallet-dark textarea,
        .wallet-dark select {
          background: #0c1726 !important;
          color: #f1f5f9 !important;
          border-color: rgba(71, 85, 105, 0.9) !important;
        }

        .wallet-dark input::placeholder,
        .wallet-dark textarea::placeholder {
          color: #64748b !important;
        }

        .wallet-dark input:focus,
        .wallet-dark textarea:focus,
        .wallet-dark select:focus {
          border-color: #3b82f6 !important;
          box-shadow:
            0 0 0 3px rgba(59, 130, 246, 0.12);
        }

        .wallet-dark button.bg-slate-900 {
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #3b82f6
            ) !important;
          color: #ffffff !important;
        }

        .wallet-dark button.bg-slate-900:hover {
          background:
            linear-gradient(
              135deg,
              #1d4ed8,
              #2563eb
            ) !important;
        }

        .wallet-dark button.bg-white {
          background: #162335 !important;
          color: #cbd5e1 !important;
        }

        .wallet-dark button.bg-white:hover {
          background: #1e2d42 !important;
        }

        .wallet-dark .bg-emerald-50 {
          background: rgba(6, 78, 59, 0.22) !important;
        }

        .wallet-dark .border-emerald-200 {
          border-color: rgba(52, 211, 153, 0.28) !important;
        }

        .wallet-dark .text-emerald-600,
        .wallet-dark .text-emerald-700,
        .wallet-dark .text-emerald-800 {
          color: #6ee7b7 !important;
        }

        .wallet-dark .bg-amber-50 {
          background: rgba(120, 53, 15, 0.2) !important;
        }

        .wallet-dark .bg-amber-100 {
          background: rgba(146, 64, 14, 0.28) !important;
        }

        .wallet-dark .border-amber-200 {
          border-color: rgba(251, 191, 36, 0.3) !important;
        }

        .wallet-dark .text-amber-600,
        .wallet-dark .text-amber-700,
        .wallet-dark .text-amber-800 {
          color: #fbbf24 !important;
        }

        .wallet-dark .bg-red-50 {
          background: rgba(127, 29, 29, 0.22) !important;
        }

        .wallet-dark .border-red-200 {
          border-color: rgba(248, 113, 113, 0.3) !important;
        }

        .wallet-dark .text-red-700 {
          color: #fca5a5 !important;
        }

        .wallet-dark img[alt="QR dirección TRON"] {
          background: #ffffff !important;
          border-color: #cbd5e1 !important;
        }
      `}</style>

      {/*
       * ========================================================
       * HEADER
       * ========================================================
       */}

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0b1625]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
              <WalletCards className="h-6 w-6 text-blue-400" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl tracking-tight text-slate-100">
                  USDT Wallet
                </h1>

                {wallet && (
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                    {wallet.network}
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-slate-400">
                {user.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-4 py-2.5 text-sm text-slate-300 transition hover:bg-[#1e2d42] hover:text-white"
          >
            <LogOut className="h-4 w-4" />

            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/*
         * ======================================================
         * ALERTAS
         * ======================================================
         */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm text-red-300">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {error}
            </span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <span className="break-all">
              {success}
            </span>
          </div>
        )}

        {/*
         * ======================================================
         * CREAR WALLET
         * ======================================================
         */}

        {needsWalletSetup &&
          setupStep ===
            "CREATE" && (
            <section className="mx-auto max-w-2xl rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                  <KeyRound className="h-6 w-6 text-blue-400" />
                </div>

                <div>
                  <h2 className="text-lg text-slate-100">
                    Crear mi wallet
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    La wallet se genera exclusivamente en este dispositivo.
                    La clave privada y la frase de recuperación nunca son
                    enviadas al servidor.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm leading-6 text-amber-300">
                La contraseña protege la copia cifrada almacenada localmente.
                Si perdés este dispositivo, vas a necesitar las 12 palabras
                para recuperar la wallet.
              </div>

              <form
                onSubmit={
                  handleGenerateWallet
                }
                className="mt-6 space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Contraseña de la wallet
                  </label>

                  <input
                    type="password"
                    autoComplete="new-password"
                    value={
                      walletPassword
                    }
                    onChange={(
                      event,
                    ) =>
                      setWalletPassword(
                        event.target.value,
                      )
                    }
                    minLength={
                      8
                    }
                    required
                    disabled={
                      creatingWallet
                    }
                    className="w-full rounded-xl border border-slate-700 bg-[#0c1726] px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Repetir contraseña
                  </label>

                  <input
                    type="password"
                    autoComplete="new-password"
                    value={
                      walletPasswordConfirmation
                    }
                    onChange={(
                      event,
                    ) =>
                      setWalletPasswordConfirmation(
                        event.target.value,
                      )
                    }
                    minLength={
                      8
                    }
                    required
                    disabled={
                      creatingWallet
                    }
                    className="w-full rounded-xl border border-slate-700 bg-[#0c1726] px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    creatingWallet
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />

                  {creatingWallet
                    ? "Generando..."
                    : "Crear wallet no-custodial"}
                </button>
              </form>
            </section>
          )}

        {/*
         * ======================================================
         * BACKUP
         * ======================================================
         */}

        {setupStep ===
          "BACKUP" &&
          generatedWallet && (
            <section className="mx-auto max-w-3xl rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <LockKeyhole className="h-6 w-6 text-amber-400" />
                </div>

                <div>
                  <h2 className="text-lg text-slate-100">
                    Guardá tu frase de recuperación
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Estas 12 palabras permiten recuperar los fondos desde una
                    wallet compatible aun si esta plataforma deja de existir.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm leading-6 text-red-300">
                No compartas estas palabras con nadie. El administrador de la
                plataforma nunca debe pedírtelas.
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {generatedWallet
                  .mnemonic
                  .split(
                    " ",
                  )
                  .map(
                    (
                      word,
                      index,
                    ) => (
                      <div
                        key={`${index}-${word}`}
                        className="rounded-xl border border-slate-700 bg-[#162335] px-3 py-3"
                      >
                        <span className="mr-2 text-xs text-slate-500">
                          {index +
                            1}.
                        </span>

                        <span className="text-sm text-slate-100">
                          {word}
                        </span>
                      </div>
                    ),
                  )}
              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-[#0d1928] p-4">
                <input
                  type="checkbox"
                  checked={
                    backupConfirmed
                  }
                  onChange={(
                    event,
                  ) =>
                    setBackupConfirmed(
                      event.target.checked,
                    )
                  }
                  className="mt-1 h-4 w-4"
                />

                <span className="text-sm leading-6 text-slate-300">
                  Guardé las 12 palabras en un lugar seguro y comprendo que
                  son necesarias para recuperar mi wallet.
                </span>
              </label>

              <button
                type="button"
                onClick={
                  handleBackupContinue
                }
                disabled={
                  !backupConfirmed
                }
                className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
              </button>
            </section>
          )}

        {/*
         * ======================================================
         * CONFIRMAR BACKUP
         * ======================================================
         */}

        {setupStep ===
          "CONFIRM" &&
          generatedWallet && (
            <section className="mx-auto max-w-2xl rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
              <h2 className="text-lg text-slate-100">
                Verificar respaldo
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Ingresá las palabras solicitadas para confirmar que guardaste
                correctamente la frase.
              </p>

              <form
                onSubmit={
                  handleConfirmRecoveryPhrase
                }
                className="mt-6 space-y-4"
              >
                {verificationPositions.map(
                  (
                    position,
                  ) => (
                    <div
                      key={
                        position
                      }
                    >
                      <label className="mb-2 block text-sm text-slate-300">
                        Palabra número{" "}
                        {position}
                      </label>

                      <input
                        type="text"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={
                          false
                        }
                        value={
                          verificationWords[
                            position
                          ] ??
                          ""
                        }
                        onChange={(
                          event,
                        ) =>
                          setVerificationWords(
                            (
                              current,
                            ) => ({
                              ...current,

                              [position]:
                                event.target.value,
                            }),
                          )
                        }
                        required
                        className="w-full rounded-xl border border-slate-700 bg-[#0c1726] px-4 py-3 text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>
                  ),
                )}

                <button
                  type="submit"
                  disabled={
                    creatingWallet
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />

                  {creatingWallet
                    ? "Guardando wallet..."
                    : "Confirmar y guardar wallet"}
                </button>
              </form>
            </section>
          )}

        {/*
         * ======================================================
         * REGISTRO PENDIENTE
         * ======================================================
         */}

        {setupStep ===
          "REGISTERING" &&
          localWallet && (
            <section className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />

                <div>
                  <h2 className="text-lg text-slate-100">
                    Wallet local pendiente de registro
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    La wallet está guardada y cifrada en este dispositivo,
                    pero la dirección pública todavía no figura en el servidor.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-700 bg-[#162335] p-4">
                <p className="text-xs text-slate-500">
                  Dirección
                </p>

                <p className="mt-1 break-all font-mono text-sm text-slate-100">
                  {localWallet.addressBase58}
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm text-slate-300">
                  Contraseña de la wallet
                </label>

                <input
                  type="password"
                  autoComplete="current-password"
                  value={
                    registrationPassword
                  }
                  onChange={(
                    event,
                  ) =>
                    setRegistrationPassword(
                      event.target.value,
                    )
                  }
                  disabled={
                    creatingWallet
                  }
                  placeholder="Desbloquear wallet local"
                  className="w-full rounded-xl border border-slate-700 bg-[#0c1726] px-4 py-3 text-slate-100 outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  La contraseña se usa únicamente en este dispositivo para
                  firmar una prueba de propiedad.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleRetryRegistration
                }
                disabled={
                  creatingWallet ||
                  !registrationPassword
                }
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />

                {creatingWallet
                  ? "Verificando y registrando..."
                  : "Verificar propiedad y registrar"}
              </button>
            </section>
          )}

        {/*
         * ======================================================
         * WALLET ACTIVA
         * ======================================================
         */}

        {!needsWalletSetup &&
          wallet &&
          blockchain && (
            <>
              {/*
               * ==================================================
               * RESUMEN
               * ==================================================
               */}

              <div className="grid gap-4 lg:grid-cols-3">
                <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
                  <p className="text-sm text-slate-400">
                    Saldo USDT
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-3xl tracking-tight text-slate-100 sm:text-4xl">
                      {wallet.formattedBalance}
                    </span>

                    <span className="pb-1 text-base text-slate-400">
                      USDT
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Saldo on-chain · TRC20
                  </p>
                </section>

                <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
                  <p className="text-sm text-slate-400">
                    Saldo TRX
                  </p>

                  <div className="mt-3 text-3xl tracking-tight text-slate-100">
                    {wallet.trx.formattedBalance}
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Utilizado para recursos y costos de red
                  </p>
                </section>

                <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
                  <p className="text-sm text-slate-400">
                    Estado de la wallet
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className={
                        wallet.activated
                          ? "flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"
                          : "flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"
                      }
                    >
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xl text-slate-100">
                        {wallet.activated
                          ? "Activa"
                          : "No activada"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Wallet no-custodial
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    void loadDashboard(
                      true,
                    )
                  }
                  disabled={
                    refreshing
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-4 py-2.5 text-sm text-slate-300 transition hover:bg-[#1e2d42] disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      refreshing
                        ? "animate-spin"
                        : ""
                    }`}
                  />

                  Actualizar
                </button>
              </div>

              {/*
               * ==================================================
               * RECIBIR + ESTADO
               * ==================================================
               */}

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <QrCode className="h-5 w-5 text-blue-400" />
                    </div>

                    <div>
                      <h2 className="text-lg text-slate-100">
                        Recibir USDT
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Red TRON · TRC20
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Enviá únicamente USDT mediante TRON TRC20 a esta dirección.
                  </p>

                  {qrDataUrl && (
                    <div className="mt-5 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          qrDataUrl
                        }
                        alt="QR dirección TRON"
                        width={
                          220
                        }
                        height={
                          220
                        }
                        className="rounded-xl border border-slate-300 bg-white p-2"
                      />
                    </div>
                  )}

                  <div className="mt-5 rounded-xl border border-slate-700 bg-[#0c1726] p-4">
                    <p className="text-xs text-slate-500">
                      Dirección TRON (Base58)
                    </p>

                    <p className="mt-2 break-all font-mono text-sm text-slate-100">
                      {wallet.addressBase58}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleCopyAddress
                    }
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-4 py-3 text-sm text-slate-300 transition hover:bg-[#1e2d42]"
                  >
                    <Copy className="h-4 w-4" />

                    Copiar dirección
                  </button>
                </section>

                <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
                  <h2 className="text-lg text-slate-100">
                    Información de la wallet
                  </h2>

                  <div className="mt-5 divide-y divide-slate-800 text-sm">
                    <div className="flex items-center justify-between gap-4 py-4">
                      <span className="text-slate-500">
                        Red
                      </span>

                      <span className="text-slate-100">
                        {wallet.network}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-4">
                      <span className="text-slate-500">
                        Tipo
                      </span>

                      <span className="text-slate-100">
                        No-custodial
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-4">
                      <span className="text-slate-500">
                        Estado
                      </span>

                      <span
                        className={
                          wallet.activated
                            ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400"
                            : "rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400"
                        }
                      >
                        {wallet.activated
                          ? "Activada"
                          : "No activada"}
                      </span>
                    </div>

                    <div className="py-4">
                      <p className="text-slate-500">
                        Dirección Base58
                      </p>

                      <p className="mt-2 break-all font-mono text-xs text-slate-300">
                        {wallet.addressBase58}
                      </p>
                    </div>

                    <div className="py-4">
                      <p className="text-slate-500">
                        Contrato USDT
                      </p>

                      <p className="mt-2 break-all font-mono text-xs text-slate-300">
                        {blockchain.contractAddress}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/*
               * ==================================================
               * RECURSOS
               * ==================================================
               */}

              <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
                <div>
                  <h2 className="text-lg text-slate-100">
                    Recursos de la red
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Recursos disponibles actualmente en tu cuenta TRON.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                        <Zap className="h-5 w-5 text-emerald-400" />
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">
                          Energy disponible
                        </p>

                        <p className="mt-1 text-xl text-slate-100">
                          {wallet.resources.energyAvailable}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                        <Wifi className="h-5 w-5 text-blue-400" />
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">
                          Bandwidth disponible
                        </p>

                        <p className="mt-1 text-xl text-slate-100">
                          {wallet.resources.bandwidthAvailable}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/*
               * ==================================================
               * RECUPERACIÓN LOCAL
               * ==================================================
               */}

              {!localWallet && (
                <section className="rounded-2xl border border-amber-500/30 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-amber-500/10 p-3">
                      <RotateCcw className="h-6 w-6 text-amber-400" />
                    </div>

                    <div>
                      <h2 className="text-lg text-slate-100">
                        Recuperar wallet en este dispositivo
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Esta cuenta tiene una dirección TRON registrada, pero
                        este navegador no contiene el vault cifrado necesario
                        para firmar transacciones.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm leading-6 text-red-300">
                    Ingresá únicamente las 12 palabras correspondientes a esta
                    wallet. La frase se procesa localmente en este navegador y
                    no se envía al servidor.
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-700 bg-[#0c1726] p-4">
                    <p className="text-xs text-slate-500">
                      Dirección que debe recuperarse
                    </p>

                    <p className="mt-2 break-all font-mono text-sm text-slate-100">
                      {wallet.addressBase58}
                    </p>
                  </div>

                  <form
                    onSubmit={
                      handleRecoverWallet
                    }
                    className="mt-6 space-y-4"
                  >
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Frase de recuperación de 12 palabras
                      </label>

                      <textarea
                        value={
                          recoveryMnemonic
                        }
                        onChange={(
                          event,
                        ) =>
                          setRecoveryMnemonic(
                            event.target.value,
                          )
                        }
                        rows={
                          4
                        }
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={
                          false
                        }
                        required
                        disabled={
                          recoveringWallet
                        }
                        placeholder="palabra1 palabra2 palabra3 ..."
                        className="w-full resize-none rounded-xl border border-slate-700 bg-[#0c1726] px-4 py-3 font-mono text-sm text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Nueva contraseña local
                      </label>

                      <input
                        type="password"
                        autoComplete="new-password"
                        value={
                          recoveryPassword
                        }
                        onChange={(
                          event,
                        ) =>
                          setRecoveryPassword(
                            event.target.value,
                          )
                        }
                        minLength={
                          8
                        }
                        required
                        disabled={
                          recoveringWallet
                        }
                        className="w-full rounded-xl border border-slate-700 bg-[#0c1726] px-4 py-3 text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Repetir nueva contraseña
                      </label>

                      <input
                        type="password"
                        autoComplete="new-password"
                        value={
                          recoveryPasswordConfirmation
                        }
                        onChange={(
                          event,
                        ) =>
                          setRecoveryPasswordConfirmation(
                            event.target.value,
                          )
                        }
                        minLength={
                          8
                        }
                        required
                        disabled={
                          recoveringWallet
                        }
                        className="w-full rounded-xl border border-slate-700 bg-[#0c1726] px-4 py-3 text-slate-100 outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        recoveringWallet
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />

                      {recoveringWallet
                        ? "Recuperando..."
                        : "Recuperar wallet"}
                    </button>
                  </form>
                </section>
              )}

              {/*
               * ==================================================
               * ENVÍO
               * ==================================================
               */}

              {localWallet ? (
                <SendUsdtPanel
                  userId={
                    user.id
                  }
                  network={
                    blockchain.network
                  }
                  fromAddress={
                    wallet.addressBase58
                  }
                  contractAddress={
                    blockchain.contractAddress
                  }
                  onTransferBroadcasted={
                    handleTransferBroadcasted
                  }
                />
              ) : (
                <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
                  <h2 className="text-lg text-slate-100">
                    Enviar USDT
                  </h2>

                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm leading-6 text-amber-300">
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

                    <div>
                      Para enviar fondos primero tenés que recuperar la wallet
                      en este dispositivo mediante las 12 palabras.
                    </div>
                  </div>
                </section>
              )}

              {/*
               * ==================================================
               * CUENTA
               * ==================================================
               */}

              <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
                <h2 className="text-lg text-slate-100">
                  Mi cuenta
                </h2>

                <div className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
                    <p className="text-slate-500">
                      Nombre
                    </p>

                    <p className="mt-1 text-slate-100">
                      {user.name}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
                    <p className="text-slate-500">
                      Email
                    </p>

                    <p className="mt-1 break-all text-slate-100">
                      {user.email}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
                    <p className="text-slate-500">
                      Perfil
                    </p>

                    <p className="mt-1 text-slate-100">
                      Usuario
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
                    <p className="text-slate-500">
                      Dirección
                    </p>

                    <p
                      title={
                        wallet.addressBase58
                      }
                      className="mt-1 font-mono text-slate-100"
                    >
                      {shortenAddress(
                        wallet.addressBase58,
                      )}
                    </p>
                  </div>
                </div>
              </section>

              {localWallet && (
                <section className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                  <div>
                    <p className="text-sm text-emerald-300">
                      Wallet protegida localmente
                    </p>

                    <p className="mt-1 text-xs leading-5 text-emerald-400/80">
                      Este dispositivo contiene una copia cifrada de la wallet.
                      El servidor solamente conoce la dirección pública.
                    </p>
                  </div>
                </section>
              )}
            </>
          )}
      </div>
    </main>
  );
}