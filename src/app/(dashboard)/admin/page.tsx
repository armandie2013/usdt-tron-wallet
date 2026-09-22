// "use client";

// import {
//   FormEvent,
//   useEffect,
//   useRef,
//   useState,
// } from "react";

// import {
//   useRouter,
// } from "next/navigation";

// import {
//   CheckCircle2,
//   Copy,
//   LogOut,
//   RefreshCw,
//   ShieldCheck,
//   TriangleAlert,
//   Users,
//   WalletCards,
//   Wifi,
//   Zap,
// } from "lucide-react";

// import {
//   generateRecoveryVerificationPositions,
//   recoveryWordMatches,
// } from "@/lib/wallet/recovery-verification.client";

// /*
//  * ============================================================
//  * USERS
//  * ============================================================
//  */

// interface AdminUser {
//   id:
//     string;

//   name:
//     string;

//   email:
//     string;

//   role:
//     | "ADMIN"
//     | "USER";

//   status:
//     string;

//   emailVerified:
//     boolean;

//   wallet:
//     | {
//         id:
//           string;

//         asset:
//           "USDT";

//         status:
//           string;

//         balance:
//           string;

//         formattedBalance:
//           string;
//       }
//     | null;

//   createdAt:
//     string;
// }

// interface UsersSuccessResponse {
//   redirect:
//     null;

//   users:
//     AdminUser[];
// }

// interface UsersLoginRedirectResponse {
//   redirect:
//     "login";
// }

// interface UsersDashboardRedirectResponse {
//   redirect:
//     "dashboard";
// }

// type UsersResponse =
//   | UsersSuccessResponse
//   | UsersLoginRedirectResponse
//   | UsersDashboardRedirectResponse;

// /*
//  * ============================================================
//  * PLATFORM WALLET
//  * ============================================================
//  */

// interface PlatformWalletRecovery {
//   mnemonic:
//     string;

//   derivationPath:
//     string;
// }

// interface PlatformWallet {
//   id:
//     string;

//   code:
//     "PLATFORM_TREASURY";

//   network:
//     "NILE"
//     | "MAINNET";

//   addressBase58:
//     string;

//   addressHex:
//     string;

//   status:
//     "ACTIVE"
//     | "DISABLED";

//   createdAt:
//     string;

//   updatedAt:
//     string;

//   createdNow?:
//     boolean;

//   recovery?:
//     PlatformWalletRecovery
//     | null;

//   activated?:
//     boolean;

//   trx?: {
//     balanceSun:
//       string;

//     formattedBalance:
//       string;
//   };

//   usdt?: {
//     contract:
//       string;

//     balanceUnits:
//       string;

//     formattedBalance:
//       string;
//   };

//   resources?: {
//     energyAvailable:
//       string;

//     energyLimit?:
//       string;

//     energyUsed?:
//       string;

//     bandwidthAvailable:
//       string;

//     freeBandwidthAvailable?:
//       string;

//     stakedBandwidthAvailable?:
//       string;

//     freeBandwidthLimit?:
//       string;

//     freeBandwidthUsed?:
//       string;

//     stakedBandwidthLimit?:
//       string;

//     stakedBandwidthUsed?:
//       string;
//   };
// }

// interface PlatformWalletResponse {
//   success:
//     boolean;

//   wallet:
//     PlatformWallet |
//     null;

//   error?:
//     string;

//   message?:
//     string;
// }

// type PlatformSetupStep =
//   | "NONE"
//   | "BACKUP"
//   | "CONFIRM";

// /*
//  * ============================================================
//  * HELPERS
//  * ============================================================
//  */

// function formatDate(
//   value:
//     string,
// ): string {
//   return new Date(
//     value,
//   ).toLocaleString(
//     "es-AR",
//   );
// }

// function splitMnemonic(
//   mnemonic:
//     string,
// ): string[] {
//   return mnemonic
//     .trim()
//     .split(
//       /\s+/,
//     )
//     .filter(
//       Boolean,
//     );
// }

// /*
//  * ============================================================
//  * PAGE
//  * ============================================================
//  */

// export default function AdminPage() {
//   const router =
//     useRouter();

//   /*
//    * Evita la doble ejecución inicial
//    * de React Strict Mode en desarrollo.
//    */
//   const initialLoadStarted =
//     useRef(
//       false,
//     );

//   const [
//     users,
//     setUsers,
//   ] =
//     useState<
//       AdminUser[]
//     >([]);

//   const [
//     platformWallet,
//     setPlatformWallet,
//   ] =
//     useState<
//       PlatformWallet |
//       null
//     >(
//       null,
//     );

//   /*
//    * La frase de recuperación solamente vive
//    * temporalmente en memoria del navegador.
//    */
//   const [
//     platformRecovery,
//     setPlatformRecovery,
//   ] =
//     useState<
//       PlatformWalletRecovery |
//       null
//     >(
//       null,
//     );

//   const [
//     platformSetupStep,
//     setPlatformSetupStep,
//   ] =
//     useState<
//       PlatformSetupStep
//     >(
//       "NONE",
//     );

//   const [
//     backupConfirmed,
//     setBackupConfirmed,
//   ] =
//     useState(
//       false,
//     );

//   const [
//     verificationPositions,
//     setVerificationPositions,
//   ] =
//     useState<
//       number[]
//     >([]);

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
//    * loading:
//    * controla la validación inicial del ADMIN.
//    */
//   const [
//     loading,
//     setLoading,
//   ] =
//     useState(
//       true,
//     );

//   /*
//    * usersRefreshing:
//    * actualización manual de usuarios.
//    */
//   const [
//     usersRefreshing,
//     setUsersRefreshing,
//   ] =
//     useState(
//       false,
//     );

//   /*
//    * platformWalletLoading:
//    * solamente se usa para la primera consulta
//    * de Platform Wallet / TRON.
//    */
//   const [
//     platformWalletLoading,
//     setPlatformWalletLoading,
//   ] =
//     useState(
//       false,
//     );

//   /*
//    * refreshingPlatformWallet:
//    * actualización manual.
//    *
//    * IMPORTANTE:
//    * no ocultamos la wallet mientras se actualiza.
//    */
//   const [
//     refreshingPlatformWallet,
//     setRefreshingPlatformWallet,
//   ] =
//     useState(
//       false,
//     );

//   const [
//     creatingPlatformWallet,
//     setCreatingPlatformWallet,
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
//    * ============================================================
//    * USERS
//    * ============================================================
//    */

//   async function fetchUsers():
//     Promise<UsersResponse> {
//     const response =
//       await fetch(
//         "/api/v1/admin/users",
//         {
//           cache:
//             "no-store",
//         },
//       );

//     if (
//       response.status ===
//       401
//     ) {
//       return {
//         redirect:
//           "login",
//       };
//     }

//     if (
//       response.status ===
//       403
//     ) {
//       return {
//         redirect:
//           "dashboard",
//       };
//     }

//     const data =
//       await response.json();

//     if (
//       !response.ok
//     ) {
//       throw new Error(
//         data.message ??
//           "No se pudieron cargar los usuarios.",
//       );
//     }

//     return {
//       redirect:
//         null,

//       users:
//         (
//           data.users ??
//           []
//         ) as AdminUser[],
//     };
//   }

//   /*
//    * ============================================================
//    * PLATFORM WALLET
//    * ============================================================
//    */

//   async function fetchPlatformWallet():
//     Promise<
//       PlatformWallet |
//       null
//     > {
//     const response =
//       await fetch(
//         "/api/v1/admin/platform-wallet",
//         {
//           cache:
//             "no-store",
//         },
//       );

//     if (
//       response.status ===
//       401
//     ) {
//       router.replace(
//         "/login",
//       );

//       return null;
//     }

//     if (
//       response.status ===
//       403
//     ) {
//       router.replace(
//         "/dashboard",
//       );

//       return null;
//     }

//     const data =
//       (
//         await response.json()
//       ) as
//         PlatformWalletResponse;

//     if (
//       !response.ok ||
//       data.success !==
//         true
//     ) {
//       throw new Error(
//         data.message ??
//           "No se pudo consultar la wallet de la plataforma.",
//       );
//     }

//     return data.wallet;
//   }

//   /*
//    * ============================================================
//    * RELOAD USERS
//    * ============================================================
//    */

//   async function reloadUsers() {
//     try {
//       setUsersRefreshing(
//         true,
//       );

//       setError(
//         null,
//       );

//       const data =
//         await fetchUsers();

//       if (
//         data.redirect ===
//           "login"
//       ) {
//         router.replace(
//           "/login",
//         );

//         return;
//       }

//       if (
//         data.redirect ===
//           "dashboard"
//       ) {
//         router.replace(
//           "/dashboard",
//         );

//         return;
//       }

//       setUsers(
//         data.users,
//       );
//     } catch (
//       loadError
//     ) {
//       console.error(
//         "[ADMIN USERS RELOAD]",
//         loadError,
//       );

//       setError(
//         loadError instanceof Error
//           ? loadError.message
//           : "No se pudieron cargar los usuarios.",
//       );
//     } finally {
//       setUsersRefreshing(
//         false,
//       );
//     }
//   }

//   /*
//    * ============================================================
//    * RELOAD PLATFORM WALLET
//    * ============================================================
//    *
//    * IMPORTANTE:
//    *
//    * No activamos platformWalletLoading.
//    *
//    * La wallet que ya está visible permanece
//    * completamente renderizada.
//    *
//    * Solo gira el botón Actualizar.
//    */

//   async function reloadPlatformWallet() {
//     try {
//       setRefreshingPlatformWallet(
//         true,
//       );

//       setError(
//         null,
//       );

//       const wallet =
//         await fetchPlatformWallet();

//       if (
//         wallet
//       ) {
//         setPlatformWallet(
//           wallet,
//         );
//       }
//     } catch (
//       refreshError
//     ) {
//       console.error(
//         "[ADMIN PLATFORM WALLET REFRESH]",
//         refreshError,
//       );

//       setError(
//         refreshError instanceof Error
//           ? refreshError.message
//           : "No se pudo actualizar la wallet de la plataforma.",
//       );
//     } finally {
//       setRefreshingPlatformWallet(
//         false,
//       );
//     }
//   }

//   /*
//    * ============================================================
//    * INITIAL LOAD
//    * ============================================================
//    *
//    * PRIMERA ETAPA:
//    * usuarios / autorización.
//    *
//    * SEGUNDA ETAPA:
//    * Platform Wallet / TRON.
//    *
//    * La consulta on-chain no bloquea
//    * la aparición de Administración.
//    */

//   useEffect(
//     () => {
//       if (
//         initialLoadStarted
//           .current
//       ) {
//         return;
//       }

//       initialLoadStarted
//         .current =
//         true;

//       async function initialize() {
//         try {
//           setError(
//             null,
//           );

//           /*
//            * ====================================================
//            * AUTORIZACIÓN + USUARIOS
//            * ====================================================
//            */

//           const usersData =
//             await fetchUsers();

//           if (
//             usersData.redirect ===
//               "login"
//           ) {
//             router.replace(
//               "/login",
//             );

//             return;
//           }

//           if (
//             usersData.redirect ===
//               "dashboard"
//           ) {
//             router.replace(
//               "/dashboard",
//             );

//             return;
//           }

//           setUsers(
//             usersData.users,
//           );

//           /*
//            * Ya mostramos Administración.
//            */
//           setLoading(
//             false,
//           );

//           /*
//            * ====================================================
//            * PLATFORM WALLET / TRON
//            * ====================================================
//            */

//           setPlatformWalletLoading(
//             true,
//           );

//           try {
//             const walletData =
//               await fetchPlatformWallet();

//             setPlatformWallet(
//               walletData,
//             );
//           } catch (
//             walletError
//           ) {
//             console.error(
//               "[ADMIN PLATFORM WALLET INITIAL LOAD]",
//               walletError,
//             );

//             setError(
//               walletError instanceof Error
//                 ? walletError.message
//                 : "No se pudo cargar la wallet de plataforma.",
//             );
//           } finally {
//             setPlatformWalletLoading(
//               false,
//             );
//           }
//         } catch (
//           loadError
//         ) {
//           console.error(
//             "[ADMIN LOAD]",
//             loadError,
//           );

//           setError(
//             loadError instanceof Error
//               ? loadError.message
//               : "No se pudo cargar la administración.",
//           );
//         } finally {
//           setLoading(
//             false,
//           );
//         }
//       }

//       void initialize();
//     },
//     [
//       router,
//     ],
//   );

//   /*
//    * ============================================================
//    * CREAR PLATFORM WALLET
//    * ============================================================
//    */

//   async function handleCreatePlatformWallet() {
//     try {
//       setCreatingPlatformWallet(
//         true,
//       );

//       setError(
//         null,
//       );

//       setSuccess(
//         null,
//       );

//       setPlatformRecovery(
//         null,
//       );

//       setBackupConfirmed(
//         false,
//       );

//       setVerificationPositions(
//         [],
//       );

//       setVerificationWords(
//         {},
//       );

//       const response =
//         await fetch(
//           "/api/v1/admin/platform-wallet",
//           {
//             method:
//               "POST",
//           },
//         );

//       const data =
//         (
//           await response.json()
//         ) as
//           PlatformWalletResponse;

//       if (
//         !response.ok ||
//         data.success !==
//           true ||
//         !data.wallet
//       ) {
//         throw new Error(
//           data.message ??
//             "No se pudo crear la wallet de la plataforma.",
//         );
//       }

//       const wallet =
//         data.wallet;

//       setPlatformWallet(
//         wallet,
//       );

//       /*
//        * ========================================================
//        * WALLET RECIÉN CREADA
//        * ========================================================
//        */

//       if (
//         wallet.createdNow ===
//         true
//       ) {
//         if (
//           !wallet.recovery ||
//           !wallet.recovery
//             .mnemonic
//             ?.trim()
//         ) {
//           setError(
//             "La wallet fue creada, pero el servidor no devolvió la frase de recuperación. No deposites fondos hasta revisar el problema.",
//           );

//           return;
//         }

//         const words =
//           splitMnemonic(
//             wallet.recovery
//               .mnemonic,
//           );

//         if (
//           words.length !==
//           12
//         ) {
//           setError(
//             "La wallet fue creada, pero la frase de recuperación recibida no contiene 12 palabras. No deposites fondos hasta revisar el problema.",
//           );

//           return;
//         }

//         const verification =
//           generateRecoveryVerificationPositions(
//             12,
//             3,
//           );

//         setVerificationPositions(
//           verification.positions,
//         );

//         setVerificationWords(
//           {},
//         );

//         setPlatformRecovery({
//           mnemonic:
//             wallet.recovery
//               .mnemonic,

//           derivationPath:
//             wallet.recovery
//               .derivationPath,
//         });

//         setPlatformSetupStep(
//           "BACKUP",
//         );

//         return;
//       }

//       /*
//        * ========================================================
//        * WALLET YA EXISTENTE
//        * ========================================================
//        */

//       setPlatformSetupStep(
//         "NONE",
//       );

//       setSuccess(
//         data.message ??
//           "La wallet de plataforma ya existía.",
//       );

//       await reloadPlatformWallet();
//     } catch (
//       createError
//     ) {
//       console.error(
//         "[ADMIN CREATE PLATFORM WALLET]",
//         createError,
//       );

//       setError(
//         createError instanceof Error
//           ? createError.message
//           : "No se pudo crear la wallet de la plataforma.",
//       );
//     } finally {
//       setCreatingPlatformWallet(
//         false,
//       );
//     }
//   }

//   /*
//    * ============================================================
//    * CONTINUAR BACKUP
//    * ============================================================
//    */

//   function handleBackupContinue() {
//     setError(
//       null,
//     );

//     if (
//       !platformRecovery
//     ) {
//       setError(
//         "La frase de recuperación ya no está disponible.",
//       );

//       return;
//     }

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
//         "No se pudo generar correctamente la verificación de la frase. No continúes hasta revisar el problema.",
//       );

//       return;
//     }

//     setVerificationWords(
//       {},
//     );

//     setPlatformSetupStep(
//       "CONFIRM",
//     );
//   }

//   /*
//    * ============================================================
//    * CONFIRMAR FRASE
//    * ============================================================
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
//       !platformRecovery
//     ) {
//       setError(
//         "La frase temporal ya no está disponible.",
//       );

//       return;
//     }

//     const words =
//       splitMnemonic(
//         platformRecovery
//           .mnemonic,
//       );

//     if (
//       words.length !==
//       12
//     ) {
//       setError(
//         "La frase de recuperación temporal no es válida.",
//       );

//       return;
//     }

//     if (
//       verificationPositions.length !==
//       3
//     ) {
//       setError(
//         "No se pudo determinar qué palabras deben verificarse.",
//       );

//       return;
//     }

//     const verificationIsValid =
//       verificationPositions
//         .every(
//           (
//             position,
//           ) =>
//             recoveryWordMatches(
//               platformRecovery
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

//     /*
//      * La comprobación sucede únicamente
//      * en el navegador.
//      *
//      * La frase nunca vuelve al backend.
//      */

//     setPlatformRecovery(
//       null,
//     );

//     setBackupConfirmed(
//       false,
//     );

//     setVerificationWords(
//       {},
//     );

//     setVerificationPositions(
//       [],
//     );

//     setPlatformSetupStep(
//       "NONE",
//     );

//     setSuccess(
//       "Frase de recuperación verificada. El respaldo de la wallet de plataforma quedó confirmado.",
//     );

//     await reloadPlatformWallet();
//   }

//   /*
//    * ============================================================
//    * COPIAR ADDRESS
//    * ============================================================
//    */

//   async function handleCopyPlatformAddress() {
//     if (
//       !platformWallet
//     ) {
//       return;
//     }

//     try {
//       await navigator
//         .clipboard
//         .writeText(
//           platformWallet
//             .addressBase58,
//         );

//       setSuccess(
//         "Dirección de la wallet de plataforma copiada.",
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
//    * ============================================================
//    * LOGOUT
//    * ============================================================
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
//       router.replace(
//         "/login",
//       );

//       router.refresh();
//     }
//   }

//   /*
//    * ============================================================
//    * LOADING DE AUTORIZACIÓN
//    * ============================================================
//    */

//   if (
//     loading
//   ) {
//     return (
//       <main className="min-h-screen bg-[#08111f] text-slate-100">
//         <div className="mx-auto max-w-7xl p-6">
//           <div className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-8 shadow-xl shadow-black/10">
//             <div className="flex items-center gap-3 text-sm text-slate-400">
//               <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />

//               Cargando administración...
//             </div>
//           </div>
//         </div>
//       </main>
//     );
//   }

//   /*
//    * ============================================================
//    * VIEW
//    * ============================================================
//    */

//   return (
//     <main className="min-h-screen bg-[#08111f] text-slate-100">
//       {/*
//        * ========================================================
//        * HEADER
//        * ========================================================
//        */}

//       <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0b1625]/95 backdrop-blur-xl">
//         <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
//           <div className="flex items-center gap-4">
//             <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
//               <ShieldCheck className="h-6 w-6 text-blue-400" />
//             </div>

//             <div>
//               <div className="flex items-center gap-2">
//                 <h1 className="text-xl tracking-tight text-slate-100">
//                   Administración
//                 </h1>

//                 <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
//                   ADMIN
//                 </span>
//               </div>

//               <p className="mt-1 text-sm text-slate-400">
//                 USDT Wallet
//               </p>
//             </div>
//           </div>

//           <button
//             type="button"
//             onClick={
//               handleLogout
//             }
//             className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-4 py-2.5 text-sm text-slate-300 transition hover:bg-[#1e2d42] hover:text-white"
//           >
//             <LogOut className="h-4 w-4" />

//             Cerrar sesión
//           </button>
//         </div>
//       </header>

//       <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
//         {/*
//          * ======================================================
//          * ALERTAS
//          * ======================================================
//          */}

//         {error && (
//           <div
//             role="alert"
//             className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm leading-6 text-red-300"
//           >
//             <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

//             <span>
//               {error}
//             </span>
//           </div>
//         )}

//         {success && (
//           <div
//             role="status"
//             className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4 text-sm leading-6 text-emerald-300"
//           >
//             <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

//             <span>
//               {success}
//             </span>
//           </div>
//         )}

//         {/*
//          * ======================================================
//          * BACKUP - 12 PALABRAS
//          * ======================================================
//          */}

//         {platformSetupStep ===
//           "BACKUP" &&
//           platformRecovery && (
//             <section className="mx-auto max-w-3xl rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
//               <div className="flex items-start gap-4">
//                 <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
//                   <ShieldCheck className="h-6 w-6 text-amber-400" />
//                 </div>

//                 <div>
//                   <h2 className="text-lg text-slate-100">
//                     Guardá la frase de recuperación
//                   </h2>

//                   <p className="mt-2 text-sm leading-6 text-slate-400">
//                     Estas 12 palabras permiten recuperar la wallet de la
//                     plataforma en caso de pérdida del servidor o de la base
//                     de datos.
//                   </p>
//                 </div>
//               </div>

//               <div className="mt-6 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm leading-6 text-red-300">
//                 Guardá estas palabras fuera del servidor. No se almacenan en
//                 MongoDB y no podrán volver a mostrarse después de este proceso.
//               </div>

//               <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
//                 {splitMnemonic(
//                   platformRecovery
//                     .mnemonic,
//                 ).map(
//                   (
//                     word,
//                     index,
//                   ) => (
//                     <div
//                       key={`${index}-${word}`}
//                       className="rounded-xl border border-slate-700 bg-[#162335] px-3 py-3"
//                     >
//                       <span className="mr-2 text-xs text-slate-500">
//                         {index +
//                           1}.
//                       </span>

//                       <span className="text-sm text-slate-100">
//                         {word}
//                       </span>
//                     </div>
//                   ),
//                 )}
//               </div>

//               <div className="mt-6 rounded-xl border border-slate-700 bg-[#0d1928] p-4">
//                 <p className="text-xs text-slate-500">
//                   Ruta de derivación
//                 </p>

//                 <p className="mt-2 font-mono text-sm text-slate-100">
//                   {platformRecovery.derivationPath}
//                 </p>
//               </div>

//               <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-[#0d1928] p-4">
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

//                 <span className="text-sm leading-6 text-slate-300">
//                   Guardé las 12 palabras en un lugar seguro y comprendo que
//                   son necesarias para recuperar la wallet de la plataforma.
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
//                 className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
//               >
//                 Continuar
//               </button>
//             </section>
//           )}

//         {/*
//          * ======================================================
//          * CONFIRMAR BACKUP
//          * ======================================================
//          */}

//         {platformSetupStep ===
//           "CONFIRM" &&
//           platformRecovery && (
//             <section className="mx-auto max-w-2xl rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
//               <h2 className="text-lg text-slate-100">
//                 Verificar respaldo
//               </h2>

//               <p className="mt-2 text-sm leading-6 text-slate-400">
//                 Ingresá las tres palabras solicitadas para comprobar que
//                 guardaste correctamente la frase de recuperación.
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
//                       <label className="mb-2 block text-sm text-slate-300">
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
//                         className="w-full rounded-xl border border-slate-700 bg-[#0c1726] px-4 py-3 text-slate-100 outline-none focus:border-blue-500"
//                       />
//                     </div>
//                   ),
//                 )}

//                 <button
//                   type="submit"
//                   className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm text-white transition hover:bg-blue-500"
//                 >
//                   Confirmar respaldo
//                 </button>
//               </form>
//             </section>
//           )}

//         {/*
//          * ======================================================
//          * CONTENIDO NORMAL
//          * ======================================================
//          */}

//         {platformSetupStep ===
//           "NONE" && (
//             <>
//               {/*
//                * ==================================================
//                * RESUMEN
//                * ==================================================
//                */}

//               <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//                 <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-5 shadow-xl shadow-black/10">
//                   <div className="flex items-center gap-3">
//                     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
//                       <Users className="h-5 w-5 text-blue-400" />
//                     </div>

//                     <div>
//                       <p className="text-xs text-slate-500">
//                         Usuarios registrados
//                       </p>

//                       <p className="mt-1 text-2xl text-slate-100">
//                         {users.length}
//                       </p>
//                     </div>
//                   </div>
//                 </section>

//                 <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-5 shadow-xl shadow-black/10">
//                   <div className="flex items-center gap-3">
//                     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
//                       <WalletCards className="h-5 w-5 text-emerald-400" />
//                     </div>

//                     <div>
//                       <p className="text-xs text-slate-500">
//                         Platform Wallet
//                       </p>

//                       <p className="mt-1 text-lg text-slate-100">
//                         {platformWallet
//                           ? "Configurada"
//                           : platformWalletLoading
//                             ? "Preparando..."
//                             : "Sin configurar"}
//                       </p>
//                     </div>
//                   </div>
//                 </section>

//                 <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-5 shadow-xl shadow-black/10 sm:col-span-2 lg:col-span-1">
//                   <div className="flex items-center gap-3">
//                     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
//                       <ShieldCheck className="h-5 w-5 text-blue-400" />
//                     </div>

//                     <div>
//                       <p className="text-xs text-slate-500">
//                         Perfil
//                       </p>

//                       <p className="mt-1 text-lg text-slate-100">
//                         Administrador
//                       </p>
//                     </div>
//                   </div>
//                 </section>
//               </div>

//               {/*
//                * ==================================================
//                * PLATFORM WALLET
//                * ==================================================
//                */}

//               <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#111d2d] shadow-xl shadow-black/10">
//                 <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
//                   <div>
//                     <div className="flex items-center gap-3">
//                       <WalletCards className="h-5 w-5 text-blue-400" />

//                       <h2 className="text-lg text-slate-100">
//                         Wallet de plataforma
//                       </h2>
//                     </div>

//                     <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
//                       Wallet propia de la plataforma para TRX, USDT y futura
//                       administración de recursos TRON. No contiene fondos
//                       pertenecientes a los usuarios.
//                     </p>
//                   </div>

//                   {platformWallet && (
//                     <button
//                       type="button"
//                       onClick={() =>
//                         void reloadPlatformWallet()
//                       }
//                       disabled={
//                         refreshingPlatformWallet
//                       }
//                       className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-4 py-2.5 text-sm text-slate-300 transition hover:bg-[#1e2d42] disabled:cursor-not-allowed disabled:opacity-50"
//                     >
//                       <RefreshCw
//                         className={`h-4 w-4 ${
//                           refreshingPlatformWallet
//                             ? "animate-spin"
//                             : ""
//                         }`}
//                       />

//                       {refreshingPlatformWallet
//                         ? "Actualizando..."
//                         : "Actualizar"}
//                     </button>
//                   )}
//                 </div>

//                 {/*
//                  * ================================================
//                  * PRIMERA CARGA
//                  * ================================================
//                  *
//                  * No mostramos skeletons ni tarjetas vacías.
//                  */}

//                 {!platformWallet &&
//                   platformWalletLoading && (
//                     <div className="flex min-h-[360px] items-center justify-center p-6">
//                       <div className="flex max-w-md flex-col items-center text-center">
//                         <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
//                           <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
//                         </div>

//                         <h3 className="mt-5 text-lg text-slate-100">
//                           Preparando la wallet de plataforma
//                         </h3>

//                         <p className="mt-2 text-sm leading-6 text-slate-500">
//                           Estamos obteniendo el saldo, los recursos y el estado
//                           actual desde la red TRON.
//                         </p>
//                       </div>
//                     </div>
//                   )}

//                 {/*
//                  * ================================================
//                  * SIN PLATFORM WALLET
//                  * ================================================
//                  */}

//                 {!platformWallet &&
//                   !platformWalletLoading && (
//                     <div className="p-6">
//                       <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm leading-6 text-amber-300">
//                         Todavía no existe una wallet de plataforma para la red
//                         configurada. Al crearla se generará una frase de
//                         recuperación de 12 palabras.
//                       </div>

//                       <button
//                         type="button"
//                         onClick={() =>
//                           void handleCreatePlatformWallet()
//                         }
//                         disabled={
//                           creatingPlatformWallet
//                         }
//                         className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
//                       >
//                         {creatingPlatformWallet
//                           ? "Creando wallet..."
//                           : "Crear wallet de plataforma"}
//                       </button>
//                     </div>
//                   )}

//                 {/*
//                  * ================================================
//                  * PLATFORM WALLET ACTIVA
//                  * ================================================
//                  *
//                  * IMPORTANTE:
//                  *
//                  * Este bloque NO depende de platformWalletLoading
//                  * ni de refreshingPlatformWallet.
//                  *
//                  * Por eso una actualización manual no borra
//                  * ni desmonta los datos actuales.
//                  */}

//                 {platformWallet && (
//                   <div className="p-6">
//                     <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
//                       <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
//                         <p className="text-xs text-slate-500">
//                           Red
//                         </p>

//                         <p className="mt-2 text-sm text-slate-100">
//                           {platformWallet.network}
//                         </p>
//                       </div>

//                       <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
//                         <p className="text-xs text-slate-500">
//                           Estado
//                         </p>

//                         <p className="mt-2 text-sm text-slate-100">
//                           {platformWallet.status}
//                         </p>
//                       </div>

//                       <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
//                         <p className="text-xs text-slate-500">
//                           Cuenta TRON
//                         </p>

//                         <p
//                           className={
//                             platformWallet
//                               .activated
//                               ? "mt-2 text-sm text-emerald-400"
//                               : "mt-2 text-sm text-amber-400"
//                           }
//                         >
//                           {platformWallet
//                             .activated
//                             ? "Activada"
//                             : "No activada"}
//                         </p>
//                       </div>

//                       <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
//                         <p className="text-xs text-slate-500">
//                           Tipo
//                         </p>

//                         <p className="mt-2 text-sm text-slate-100">
//                           Platform Treasury
//                         </p>
//                       </div>
//                     </div>

//                     {/*
//                      * ============================================
//                      * SALDOS Y RECURSOS
//                      * ============================================
//                      */}

//                     <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
//                       <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
//                         <p className="text-xs text-slate-500">
//                           TRX
//                         </p>

//                         <p className="mt-2 text-2xl text-slate-100">
//                           {platformWallet
//                             .trx
//                             ?.formattedBalance ??
//                             "—"}
//                         </p>
//                       </div>

//                       <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
//                         <p className="text-xs text-slate-500">
//                           USDT
//                         </p>

//                         <p className="mt-2 text-2xl text-slate-100">
//                           {platformWallet
//                             .usdt
//                             ?.formattedBalance ??
//                             "—"}
//                         </p>
//                       </div>

//                       <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
//                         <div className="flex items-center gap-2">
//                           <Zap className="h-4 w-4 text-emerald-400" />

//                           <p className="text-xs text-slate-500">
//                             Energy disponible
//                           </p>
//                         </div>

//                         <p className="mt-2 text-2xl text-slate-100">
//                           {platformWallet
//                             .resources
//                             ?.energyAvailable ??
//                             "—"}
//                         </p>
//                       </div>

//                       <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
//                         <div className="flex items-center gap-2">
//                           <Wifi className="h-4 w-4 text-blue-400" />

//                           <p className="text-xs text-slate-500">
//                             Bandwidth disponible
//                           </p>
//                         </div>

//                         <p className="mt-2 text-2xl text-slate-100">
//                           {platformWallet
//                             .resources
//                             ?.bandwidthAvailable ??
//                             "—"}
//                         </p>
//                       </div>
//                     </div>

//                     {/*
//                      * ============================================
//                      * ADDRESS
//                      * ============================================
//                      */}

//                     <div className="mt-4 rounded-xl border border-slate-700 bg-[#0d1928] p-4">
//                       <div className="flex flex-wrap items-start justify-between gap-4">
//                         <div className="min-w-0">
//                           <p className="text-xs text-slate-500">
//                             Dirección TRON
//                           </p>

//                           <p className="mt-2 break-all font-mono text-sm text-slate-100">
//                             {platformWallet.addressBase58}
//                           </p>
//                         </div>

//                         <button
//                           type="button"
//                           onClick={() =>
//                             void handleCopyPlatformAddress()
//                           }
//                           className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-3 py-2 text-sm text-slate-300 transition hover:bg-[#1e2d42]"
//                         >
//                           <Copy className="h-4 w-4" />

//                           Copiar dirección
//                         </button>
//                       </div>

//                       <div className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-500">
//                         Creada:{" "}
//                         {formatDate(
//                           platformWallet
//                             .createdAt,
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </section>

//               {/*
//                * ==================================================
//                * USERS
//                * ==================================================
//                */}

//               <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#111d2d] shadow-xl shadow-black/10">
//                 <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
//                   <div>
//                     <div className="flex items-center gap-3">
//                       <Users className="h-5 w-5 text-blue-400" />

//                       <h2 className="text-lg text-slate-100">
//                         Usuarios
//                       </h2>
//                     </div>

//                     <p className="mt-1 text-sm text-slate-400">
//                       {users.length} usuarios registrados
//                     </p>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={() =>
//                       void reloadUsers()
//                     }
//                     disabled={
//                       usersRefreshing
//                     }
//                     className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-3 py-2 text-sm text-slate-300 transition hover:bg-[#1e2d42] disabled:opacity-50"
//                   >
//                     <RefreshCw
//                       className={`h-4 w-4 ${
//                         usersRefreshing
//                           ? "animate-spin"
//                           : ""
//                       }`}
//                     />

//                     {usersRefreshing
//                       ? "Actualizando..."
//                       : "Actualizar usuarios"}
//                   </button>
//                 </div>

//                 {users.length ===
//                 0 ? (
//                   <div className="p-8 text-center text-sm text-slate-500">
//                     No hay usuarios registrados.
//                   </div>
//                 ) : (
//                   <div className="overflow-x-auto">
//                     <table className="w-full text-left text-sm">
//                       <thead className="bg-[#0d1928] text-slate-500">
//                         <tr>
//                           <th className="px-6 py-3">
//                             Usuario
//                           </th>

//                           <th className="px-6 py-3">
//                             Rol
//                           </th>

//                           <th className="px-6 py-3">
//                             Estado
//                           </th>

//                           <th className="px-6 py-3">
//                             Wallet
//                           </th>

//                           <th className="px-6 py-3 text-right">
//                             Saldo
//                           </th>

//                           <th className="px-6 py-3">
//                             Registro
//                           </th>
//                         </tr>
//                       </thead>

//                       <tbody className="divide-y divide-slate-800">
//                         {users.map(
//                           (
//                             account,
//                           ) => {
//                             /*
//                              * ADMIN nunca presenta wallet personal.
//                              *
//                              * Incluso aunque exista metadata residual
//                              * vieja en Mongo.
//                              */
//                             const visibleWallet =
//                               account.role ===
//                               "USER"
//                                 ? account.wallet
//                                 : null;

//                             return (
//                               <tr
//                                 key={
//                                   account.id
//                                 }
//                                 className="transition hover:bg-[#0d1928]/70"
//                               >
//                                 <td className="px-6 py-4">
//                                   <p className="text-slate-100">
//                                     {account.name}
//                                   </p>

//                                   <p className="mt-1 text-xs text-slate-500">
//                                     {account.email}
//                                   </p>
//                                 </td>

//                                 <td className="px-6 py-4">
//                                   <span
//                                     className={
//                                       account.role ===
//                                       "ADMIN"
//                                         ? "rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300"
//                                         : "rounded-full border border-slate-700 bg-slate-800/40 px-2.5 py-1 text-xs text-slate-300"
//                                     }
//                                   >
//                                     {account.role}
//                                   </span>
//                                 </td>

//                                 <td className="px-6 py-4">
//                                   <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
//                                     {account.status}
//                                   </span>
//                                 </td>

//                                 <td className="px-6 py-4">
//                                   {account.role ===
//                                   "ADMIN" ? (
//                                     <span className="text-sm text-slate-500">
//                                       —
//                                     </span>
//                                   ) : visibleWallet ? (
//                                     <span className="text-sm text-emerald-400">
//                                       Registrada
//                                     </span>
//                                   ) : (
//                                     <span className="text-sm text-slate-500">
//                                       Sin wallet
//                                     </span>
//                                   )}
//                                 </td>

//                                 <td className="px-6 py-4 text-right text-slate-100">
//                                   {account.role ===
//                                   "ADMIN"
//                                     ? "—"
//                                     : visibleWallet
//                                       ? `${visibleWallet.formattedBalance} USDT`
//                                       : "—"}
//                                 </td>

//                                 <td className="px-6 py-4 text-slate-500">
//                                   {formatDate(
//                                     account.createdAt,
//                                   )}
//                                 </td>
//                               </tr>
//                             );
//                           },
//                         )}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}
//               </section>

//               {/*
//                * ==================================================
//                * SEGURIDAD
//                * ==================================================
//                */}

//               <section className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-950/20 p-5">
//                 <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

//                 <div>
//                   <p className="text-sm text-blue-200">
//                     Administración sin custodia de fondos de usuarios
//                   </p>

//                   <p className="mt-1 text-xs leading-5 text-slate-400">
//                     El administrador puede consultar wallets y actividad de los
//                     usuarios, pero no posee sus claves privadas y no puede
//                     mover fondos de las wallets no-custodial.
//                   </p>
//                 </div>
//               </section>
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
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  CheckCircle2,
  Copy,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Users,
  WalletCards,
  Wifi,
  Zap,
} from "lucide-react";

import {
  generateRecoveryVerificationPositions,
  recoveryWordMatches,
} from "@/lib/wallet/recovery-verification.client";

/*
 * ============================================================
 * USERS
 * ============================================================
 */

interface AdminUser {
  id:
    string;

  name:
    string;

  email:
    string;

  role:
    | "ADMIN"
    | "USER";

  status:
    string;

  emailVerified:
    boolean;

  wallet:
    | {
        id:
          string;

        asset:
          "USDT";

        status:
          string;

        balance:
          string;

        formattedBalance:
          string;
      }
    | null;

  createdAt:
    string;
}

interface UsersSuccessResponse {
  redirect:
    null;

  users:
    AdminUser[];
}

interface UsersLoginRedirectResponse {
  redirect:
    "login";
}

interface UsersDashboardRedirectResponse {
  redirect:
    "dashboard";
}

type UsersResponse =
  | UsersSuccessResponse
  | UsersLoginRedirectResponse
  | UsersDashboardRedirectResponse;

/*
 * ============================================================
 * PLATFORM WALLET
 * ============================================================
 */

interface PlatformWalletRecovery {
  mnemonic:
    string;

  derivationPath:
    string;
}

interface PlatformWallet {
  id:
    string;

  code:
    "PLATFORM_TREASURY";

  network:
    "NILE"
    | "MAINNET";

  addressBase58:
    string;

  addressHex:
    string;

  status:
    "ACTIVE"
    | "DISABLED";

  createdAt:
    string;

  updatedAt:
    string;

  createdNow?:
    boolean;

  recovery?:
    PlatformWalletRecovery
    | null;

  activated?:
    boolean;

  trx?: {
    balanceSun:
      string;

    formattedBalance:
      string;
  };

  usdt?: {
    contract:
      string;

    balanceUnits:
      string;

    formattedBalance:
      string;
  };

  resources?: {
    energyAvailable:
      string;

    energyLimit?:
      string;

    energyUsed?:
      string;

    bandwidthAvailable:
      string;

    freeBandwidthAvailable?:
      string;

    stakedBandwidthAvailable?:
      string;

    freeBandwidthLimit?:
      string;

    freeBandwidthUsed?:
      string;

    stakedBandwidthLimit?:
      string;

    stakedBandwidthUsed?:
      string;
  };
}

interface PlatformWalletResponse {
  success:
    boolean;

  wallet:
    PlatformWallet |
    null;

  error?:
    string;

  message?:
    string;
}

type PlatformSetupStep =
  | "NONE"
  | "BACKUP"
  | "CONFIRM";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function formatDate(
  value:
    string,
): string {
  return new Date(
    value,
  ).toLocaleString(
    "es-AR",
  );
}

function splitMnemonic(
  mnemonic:
    string,
): string[] {
  return mnemonic
    .trim()
    .split(
      /\s+/,
    )
    .filter(
      Boolean,
    );
}

function removePlatformWalletRecovery(
  wallet:
    PlatformWallet,
): PlatformWallet {
  return {
    ...wallet,

    recovery:
      null,
  };
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function AdminPage() {
  const router =
    useRouter();

  /*
   * Evita la doble ejecución inicial
   * de React Strict Mode en desarrollo.
   */
  const initialLoadStarted =
    useRef(
      false,
    );

  const [
    users,
    setUsers,
  ] =
    useState<
      AdminUser[]
    >([]);

  const [
    platformWallet,
    setPlatformWallet,
  ] =
    useState<
      PlatformWallet |
      null
    >(
      null,
    );

  /*
   * La frase de recuperación solamente vive
   * temporalmente en memoria del navegador.
   */
  const [
    platformRecovery,
    setPlatformRecovery,
  ] =
    useState<
      PlatformWalletRecovery |
      null
    >(
      null,
    );

  const [
    platformSetupStep,
    setPlatformSetupStep,
  ] =
    useState<
      PlatformSetupStep
    >(
      "NONE",
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
    useState<
      number[]
    >([]);

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
   * loading:
   * controla la validación inicial del ADMIN.
   */
  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  /*
   * usersRefreshing:
   * actualización manual de usuarios.
   */
  const [
    usersRefreshing,
    setUsersRefreshing,
  ] =
    useState(
      false,
    );

  /*
   * platformWalletLoading:
   * solamente se usa para la primera consulta
   * de Platform Wallet / TRON.
   */
  const [
    platformWalletLoading,
    setPlatformWalletLoading,
  ] =
    useState(
      false,
    );

  /*
   * refreshingPlatformWallet:
   * actualización manual.
   *
   * IMPORTANTE:
   * no ocultamos la wallet mientras se actualiza.
   */
  const [
    refreshingPlatformWallet,
    setRefreshingPlatformWallet,
  ] =
    useState(
      false,
    );

  const [
    creatingPlatformWallet,
    setCreatingPlatformWallet,
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
   * ============================================================
   * USERS
   * ============================================================
   */

  async function fetchUsers():
    Promise<UsersResponse> {
    const response =
      await fetch(
        "/api/v1/admin/users",
        {
          cache:
            "no-store",
        },
      );

    if (
      response.status ===
      401
    ) {
      return {
        redirect:
          "login",
      };
    }

    if (
      response.status ===
      403
    ) {
      return {
        redirect:
          "dashboard",
      };
    }

    const data =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        data.message ??
          "No se pudieron cargar los usuarios.",
      );
    }

    return {
      redirect:
        null,

      users:
        (
          data.users ??
          []
        ) as AdminUser[],
    };
  }

  /*
   * ============================================================
   * PLATFORM WALLET
   * ============================================================
   */

  const fetchPlatformWallet =
    useCallback(
      async (): Promise<
        PlatformWallet |
        null
      > => {
        const response =
          await fetch(
            "/api/v1/admin/platform-wallet",
            {
              cache:
                "no-store",
            },
          );

        if (
          response.status ===
          401
        ) {
          router.replace(
            "/login",
          );

          return null;
        }

        if (
          response.status ===
          403
        ) {
          router.replace(
            "/dashboard",
          );

          return null;
        }

        const data =
          (
            await response.json()
          ) as
            PlatformWalletResponse;

        if (
          !response.ok ||
          data.success !==
            true
        ) {
          throw new Error(
            data.message ??
              "No se pudo consultar la wallet de la plataforma.",
          );
        }

        return data.wallet
          ? removePlatformWalletRecovery(
              data.wallet,
            )
          : null;
      },
      [
        router,
      ],
    );

  /*
   * ============================================================
   * RELOAD USERS
   * ============================================================
   */

  async function reloadUsers() {
    try {
      setUsersRefreshing(
        true,
      );

      setError(
        null,
      );

      const data =
        await fetchUsers();

      if (
        data.redirect ===
          "login"
      ) {
        router.replace(
          "/login",
        );

        return;
      }

      if (
        data.redirect ===
          "dashboard"
      ) {
        router.replace(
          "/dashboard",
        );

        return;
      }

      setUsers(
        data.users,
      );
    } catch (
      loadError
    ) {
      console.error(
        "[ADMIN USERS RELOAD]",
        loadError,
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los usuarios.",
      );
    } finally {
      setUsersRefreshing(
        false,
      );
    }
  }

  /*
   * ============================================================
   * RELOAD PLATFORM WALLET
   * ============================================================
   *
   * IMPORTANTE:
   *
   * No activamos platformWalletLoading.
   *
   * La wallet que ya está visible permanece
   * completamente renderizada.
   *
   * Solo gira el botón Actualizar.
   */

  async function reloadPlatformWallet() {
    try {
      setRefreshingPlatformWallet(
        true,
      );

      setError(
        null,
      );

      const wallet =
        await fetchPlatformWallet();

      if (
        wallet
      ) {
        setPlatformWallet(
          wallet,
        );
      }
    } catch (
      refreshError
    ) {
      console.error(
        "[ADMIN PLATFORM WALLET REFRESH]",
        refreshError,
      );

      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "No se pudo actualizar la wallet de la plataforma.",
      );
    } finally {
      setRefreshingPlatformWallet(
        false,
      );
    }
  }

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   *
   * PRIMERA ETAPA:
   * usuarios / autorización.
   *
   * SEGUNDA ETAPA:
   * Platform Wallet / TRON.
   *
   * La consulta on-chain no bloquea
   * la aparición de Administración.
   */

  useEffect(
    () => {
      if (
        initialLoadStarted
          .current
      ) {
        return;
      }

      initialLoadStarted
        .current =
        true;

      async function initialize() {
        try {
          setError(
            null,
          );

          /*
           * ====================================================
           * AUTORIZACIÓN + USUARIOS
           * ====================================================
           */

          const usersData =
            await fetchUsers();

          if (
            usersData.redirect ===
              "login"
          ) {
            router.replace(
              "/login",
            );

            return;
          }

          if (
            usersData.redirect ===
              "dashboard"
          ) {
            router.replace(
              "/dashboard",
            );

            return;
          }

          setUsers(
            usersData.users,
          );

          /*
           * Ya mostramos Administración.
           */
          setLoading(
            false,
          );

          /*
           * ====================================================
           * PLATFORM WALLET / TRON
           * ====================================================
           */

          setPlatformWalletLoading(
            true,
          );

          try {
            const walletData =
              await fetchPlatformWallet();

            setPlatformWallet(
              walletData,
            );
          } catch (
            walletError
          ) {
            console.error(
              "[ADMIN PLATFORM WALLET INITIAL LOAD]",
              walletError,
            );

            setError(
              walletError instanceof Error
                ? walletError.message
                : "No se pudo cargar la wallet de plataforma.",
            );
          } finally {
            setPlatformWalletLoading(
              false,
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            "[ADMIN LOAD]",
            loadError,
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la administración.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      }

      void initialize();
    },
    [
      router,
      fetchPlatformWallet,
    ],
  );

  /*
   * ============================================================
   * CREAR PLATFORM WALLET
   * ============================================================
   */

  async function handleCreatePlatformWallet() {
    try {
      setCreatingPlatformWallet(
        true,
      );

      setError(
        null,
      );

      setSuccess(
        null,
      );

      setPlatformRecovery(
        null,
      );

      setBackupConfirmed(
        false,
      );

      setVerificationPositions(
        [],
      );

      setVerificationWords(
        {},
      );

      const response =
        await fetch(
          "/api/v1/admin/platform-wallet",
          {
            method:
              "POST",
          },
        );

      const data =
        (
          await response.json()
        ) as
          PlatformWalletResponse;

      if (
        !response.ok ||
        data.success !==
          true ||
        !data.wallet
      ) {
        throw new Error(
          data.message ??
            "No se pudo crear la wallet de la plataforma.",
        );
      }

      const wallet =
        data.wallet;

      setPlatformWallet(
        removePlatformWalletRecovery(
          wallet,
        ),
      );

      /*
       * ========================================================
       * WALLET RECIÉN CREADA
       * ========================================================
       */

      if (
        wallet.createdNow ===
        true
      ) {
        if (
          !wallet.recovery ||
          !wallet.recovery
            .mnemonic
            ?.trim()
        ) {
          setError(
            "La wallet fue creada, pero el servidor no devolvió la frase de recuperación. No deposites fondos hasta revisar el problema.",
          );

          return;
        }

        const words =
          splitMnemonic(
            wallet.recovery
              .mnemonic,
          );

        if (
          words.length !==
          12
        ) {
          setError(
            "La wallet fue creada, pero la frase de recuperación recibida no contiene 12 palabras. No deposites fondos hasta revisar el problema.",
          );

          return;
        }

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

        setPlatformRecovery({
          mnemonic:
            wallet.recovery
              .mnemonic,

          derivationPath:
            wallet.recovery
              .derivationPath,
        });

        setPlatformSetupStep(
          "BACKUP",
        );

        return;
      }

      /*
       * ========================================================
       * WALLET YA EXISTENTE
       * ========================================================
       */

      setPlatformSetupStep(
        "NONE",
      );

      setSuccess(
        data.message ??
          "La wallet de plataforma ya existía.",
      );

      await reloadPlatformWallet();
    } catch (
      createError
    ) {
      console.error(
        "[ADMIN CREATE PLATFORM WALLET]",
        createError,
      );

      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo crear la wallet de la plataforma.",
      );
    } finally {
      setCreatingPlatformWallet(
        false,
      );
    }
  }

  /*
   * ============================================================
   * CONTINUAR BACKUP
   * ============================================================
   */

  function handleBackupContinue() {
    setError(
      null,
    );

    if (
      !platformRecovery
    ) {
      setError(
        "La frase de recuperación ya no está disponible.",
      );

      return;
    }

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
        "No se pudo generar correctamente la verificación de la frase. No continúes hasta revisar el problema.",
      );

      return;
    }

    setVerificationWords(
      {},
    );

    setPlatformSetupStep(
      "CONFIRM",
    );
  }

  /*
   * ============================================================
   * CONFIRMAR FRASE
   * ============================================================
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
      !platformRecovery
    ) {
      setError(
        "La frase temporal ya no está disponible.",
      );

      return;
    }

    const words =
      splitMnemonic(
        platformRecovery
          .mnemonic,
      );

    if (
      words.length !==
      12
    ) {
      setError(
        "La frase de recuperación temporal no es válida.",
      );

      return;
    }

    if (
      verificationPositions.length !==
      3
    ) {
      setError(
        "No se pudo determinar qué palabras deben verificarse.",
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
              platformRecovery
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

    /*
     * La comprobación sucede únicamente
     * en el navegador.
     *
     * La frase nunca vuelve al backend.
     */

    setPlatformRecovery(
      null,
    );

    setBackupConfirmed(
      false,
    );

    setVerificationWords(
      {},
    );

    setVerificationPositions(
      [],
    );

    setPlatformSetupStep(
      "NONE",
    );

    setSuccess(
      "Frase de recuperación verificada. El respaldo de la wallet de plataforma quedó confirmado.",
    );

    await reloadPlatformWallet();
  }

  /*
   * ============================================================
   * COPIAR ADDRESS
   * ============================================================
   */

  async function handleCopyPlatformAddress() {
    if (
      !platformWallet
    ) {
      return;
    }

    try {
      await navigator
        .clipboard
        .writeText(
          platformWallet
            .addressBase58,
        );

      setSuccess(
        "Dirección de la wallet de plataforma copiada.",
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
   * ============================================================
   * LOGOUT
   * ============================================================
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
   * ============================================================
   * LOADING DE AUTORIZACIÓN
   * ============================================================
   */

  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-[#08111f] text-slate-100">
        <div className="mx-auto max-w-7xl p-6">
          <div className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-8 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />

              Cargando administración...
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * VIEW
   * ============================================================
   */

  return (
    <main className="min-h-screen bg-[#08111f] text-slate-100">
      {/*
       * ========================================================
       * HEADER
       * ========================================================
       */}

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0b1625]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
              <ShieldCheck className="h-6 w-6 text-blue-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl tracking-tight text-slate-100">
                  Administración
                </h1>

                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                  ADMIN
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-400">
                USDT Wallet
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
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm leading-6 text-red-300"
          >
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {error}
            </span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4 text-sm leading-6 text-emerald-300"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {success}
            </span>
          </div>
        )}

        {/*
         * ======================================================
         * BACKUP - 12 PALABRAS
         * ======================================================
         */}

        {platformSetupStep ===
          "BACKUP" &&
          platformRecovery && (
            <section className="mx-auto max-w-3xl rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <ShieldCheck className="h-6 w-6 text-amber-400" />
                </div>

                <div>
                  <h2 className="text-lg text-slate-100">
                    Guardá la frase de recuperación
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Estas 12 palabras permiten recuperar la wallet de la
                    plataforma en caso de pérdida del servidor o de la base
                    de datos.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm leading-6 text-red-300">
                Guardá estas palabras fuera del servidor. No se almacenan en
                MongoDB y no podrán volver a mostrarse después de este proceso.
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {splitMnemonic(
                  platformRecovery
                    .mnemonic,
                ).map(
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

              <div className="mt-6 rounded-xl border border-slate-700 bg-[#0d1928] p-4">
                <p className="text-xs text-slate-500">
                  Ruta de derivación
                </p>

                <p className="mt-2 font-mono text-sm text-slate-100">
                  {platformRecovery.derivationPath}
                </p>
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
                      event
                        .target
                        .checked,
                    )
                  }
                  className="mt-1 h-4 w-4"
                />

                <span className="text-sm leading-6 text-slate-300">
                  Guardé las 12 palabras en un lugar seguro y comprendo que
                  son necesarias para recuperar la wallet de la plataforma.
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

        {platformSetupStep ===
          "CONFIRM" &&
          platformRecovery && (
            <section className="mx-auto max-w-2xl rounded-2xl border border-slate-700/70 bg-[#111d2d] p-6 shadow-xl shadow-black/10">
              <h2 className="text-lg text-slate-100">
                Verificar respaldo
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Ingresá las tres palabras solicitadas para comprobar que
                guardaste correctamente la frase de recuperación.
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
                                event
                                  .target
                                  .value,
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
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm text-white transition hover:bg-blue-500"
                >
                  Confirmar respaldo
                </button>
              </form>
            </section>
          )}

        {/*
         * ======================================================
         * CONTENIDO NORMAL
         * ======================================================
         */}

        {platformSetupStep ===
          "NONE" && (
            <>
              {/*
               * ==================================================
               * RESUMEN
               * ==================================================
               */}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Usuarios registrados
                      </p>

                      <p className="mt-1 text-2xl text-slate-100">
                        {users.length}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                      <WalletCards className="h-5 w-5 text-emerald-400" />
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Platform Wallet
                      </p>

                      <p className="mt-1 text-lg text-slate-100">
                        {platformWallet
                          ? "Configurada"
                          : platformWalletLoading
                            ? "Preparando..."
                            : "Sin configurar"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-700/70 bg-[#111d2d] p-5 shadow-xl shadow-black/10 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <ShieldCheck className="h-5 w-5 text-blue-400" />
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Perfil
                      </p>

                      <p className="mt-1 text-lg text-slate-100">
                        Administrador
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/*
               * ==================================================
               * PLATFORM WALLET
               * ==================================================
               */}

              <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#111d2d] shadow-xl shadow-black/10">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <WalletCards className="h-5 w-5 text-blue-400" />

                      <h2 className="text-lg text-slate-100">
                        Wallet de plataforma
                      </h2>
                    </div>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                      Wallet propia de la plataforma para TRX, USDT y futura
                      administración de recursos TRON. No contiene fondos
                      pertenecientes a los usuarios.
                    </p>
                  </div>

                  {platformWallet && (
                    <button
                      type="button"
                      onClick={() =>
                        void reloadPlatformWallet()
                      }
                      disabled={
                        refreshingPlatformWallet
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-4 py-2.5 text-sm text-slate-300 transition hover:bg-[#1e2d42] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          refreshingPlatformWallet
                            ? "animate-spin"
                            : ""
                        }`}
                      />

                      {refreshingPlatformWallet
                        ? "Actualizando..."
                        : "Actualizar"}
                    </button>
                  )}
                </div>

                {/*
                 * ================================================
                 * PRIMERA CARGA
                 * ================================================
                 *
                 * No mostramos skeletons ni tarjetas vacías.
                 */}

                {!platformWallet &&
                  platformWalletLoading && (
                    <div className="flex min-h-[360px] items-center justify-center p-6">
                      <div className="flex max-w-md flex-col items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
                          <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                        </div>

                        <h3 className="mt-5 text-lg text-slate-100">
                          Preparando la wallet de plataforma
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Estamos obteniendo el saldo, los recursos y el estado
                          actual desde la red TRON.
                        </p>
                      </div>
                    </div>
                  )}

                {/*
                 * ================================================
                 * SIN PLATFORM WALLET
                 * ================================================
                 */}

                {!platformWallet &&
                  !platformWalletLoading && (
                    <div className="p-6">
                      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm leading-6 text-amber-300">
                        Todavía no existe una wallet de plataforma para la red
                        configurada. Al crearla se generará una frase de
                        recuperación de 12 palabras.
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void handleCreatePlatformWallet()
                        }
                        disabled={
                          creatingPlatformWallet
                        }
                        className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {creatingPlatformWallet
                          ? "Creando wallet..."
                          : "Crear wallet de plataforma"}
                      </button>
                    </div>
                  )}

                {/*
                 * ================================================
                 * PLATFORM WALLET ACTIVA
                 * ================================================
                 *
                 * IMPORTANTE:
                 *
                 * Este bloque NO depende de platformWalletLoading
                 * ni de refreshingPlatformWallet.
                 *
                 * Por eso una actualización manual no borra
                 * ni desmonta los datos actuales.
                 */}

                {platformWallet && (
                  <div className="p-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
                        <p className="text-xs text-slate-500">
                          Red
                        </p>

                        <p className="mt-2 text-sm text-slate-100">
                          {platformWallet.network}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
                        <p className="text-xs text-slate-500">
                          Estado
                        </p>

                        <p className="mt-2 text-sm text-slate-100">
                          {platformWallet.status}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
                        <p className="text-xs text-slate-500">
                          Cuenta TRON
                        </p>

                        <p
                          className={
                            platformWallet
                              .activated
                              ? "mt-2 text-sm text-emerald-400"
                              : "mt-2 text-sm text-amber-400"
                          }
                        >
                          {platformWallet
                            .activated
                            ? "Activada"
                            : "No activada"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#0d1928] p-4">
                        <p className="text-xs text-slate-500">
                          Tipo
                        </p>

                        <p className="mt-2 text-sm text-slate-100">
                          Platform Treasury
                        </p>
                      </div>
                    </div>

                    {/*
                     * ============================================
                     * SALDOS Y RECURSOS
                     * ============================================
                     */}

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
                        <p className="text-xs text-slate-500">
                          TRX
                        </p>

                        <p className="mt-2 text-2xl text-slate-100">
                          {platformWallet
                            .trx
                            ?.formattedBalance ??
                            "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
                        <p className="text-xs text-slate-500">
                          USDT
                        </p>

                        <p className="mt-2 text-2xl text-slate-100">
                          {platformWallet
                            .usdt
                            ?.formattedBalance ??
                            "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-emerald-400" />

                          <p className="text-xs text-slate-500">
                            Energy disponible
                          </p>
                        </div>

                        <p className="mt-2 text-2xl text-slate-100">
                          {platformWallet
                            .resources
                            ?.energyAvailable ??
                            "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-700 bg-[#0d1928] p-5">
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-blue-400" />

                          <p className="text-xs text-slate-500">
                            Bandwidth disponible
                          </p>
                        </div>

                        <p className="mt-2 text-2xl text-slate-100">
                          {platformWallet
                            .resources
                            ?.bandwidthAvailable ??
                            "—"}
                        </p>
                      </div>
                    </div>

                    {/*
                     * ============================================
                     * ADDRESS
                     * ============================================
                     */}

                    <div className="mt-4 rounded-xl border border-slate-700 bg-[#0d1928] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">
                            Dirección TRON
                          </p>

                          <p className="mt-2 break-all font-mono text-sm text-slate-100">
                            {platformWallet.addressBase58}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyPlatformAddress()
                          }
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-3 py-2 text-sm text-slate-300 transition hover:bg-[#1e2d42]"
                        >
                          <Copy className="h-4 w-4" />

                          Copiar dirección
                        </button>
                      </div>

                      <div className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-500">
                        Creada:{" "}
                        {formatDate(
                          platformWallet
                            .createdAt,
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/*
               * ==================================================
               * USERS
               * ==================================================
               */}

              <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#111d2d] shadow-xl shadow-black/10">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-400" />

                      <h2 className="text-lg text-slate-100">
                        Usuarios
                      </h2>
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      {users.length} usuarios registrados
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void reloadUsers()
                    }
                    disabled={
                      usersRefreshing
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#162335] px-3 py-2 text-sm text-slate-300 transition hover:bg-[#1e2d42] disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        usersRefreshing
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    {usersRefreshing
                      ? "Actualizando..."
                      : "Actualizar usuarios"}
                  </button>
                </div>

                {users.length ===
                0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No hay usuarios registrados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#0d1928] text-slate-500">
                        <tr>
                          <th className="px-6 py-3">
                            Usuario
                          </th>

                          <th className="px-6 py-3">
                            Rol
                          </th>

                          <th className="px-6 py-3">
                            Estado
                          </th>

                          <th className="px-6 py-3">
                            Wallet
                          </th>

                          <th className="px-6 py-3 text-right">
                            Saldo
                          </th>

                          <th className="px-6 py-3">
                            Registro
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800">
                        {users.map(
                          (
                            account,
                          ) => {
                            /*
                             * ADMIN nunca presenta wallet personal.
                             *
                             * Incluso aunque exista metadata residual
                             * vieja en Mongo.
                             */
                            const visibleWallet =
                              account.role ===
                              "USER"
                                ? account.wallet
                                : null;

                            return (
                              <tr
                                key={
                                  account.id
                                }
                                className="transition hover:bg-[#0d1928]/70"
                              >
                                <td className="px-6 py-4">
                                  <p className="text-slate-100">
                                    {account.name}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {account.email}
                                  </p>
                                </td>

                                <td className="px-6 py-4">
                                  <span
                                    className={
                                      account.role ===
                                      "ADMIN"
                                        ? "rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300"
                                        : "rounded-full border border-slate-700 bg-slate-800/40 px-2.5 py-1 text-xs text-slate-300"
                                    }
                                  >
                                    {account.role}
                                  </span>
                                </td>

                                <td className="px-6 py-4">
                                  <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
                                    {account.status}
                                  </span>
                                </td>

                                <td className="px-6 py-4">
                                  {account.role ===
                                  "ADMIN" ? (
                                    <span className="text-sm text-slate-500">
                                      —
                                    </span>
                                  ) : visibleWallet ? (
                                    <span className="text-sm text-emerald-400">
                                      Registrada
                                    </span>
                                  ) : (
                                    <span className="text-sm text-slate-500">
                                      Sin wallet
                                    </span>
                                  )}
                                </td>

                                <td className="px-6 py-4 text-right text-slate-100">
                                  {account.role ===
                                  "ADMIN"
                                    ? "—"
                                    : visibleWallet
                                      ? `${visibleWallet.formattedBalance} USDT`
                                      : "—"}
                                </td>

                                <td className="px-6 py-4 text-slate-500">
                                  {formatDate(
                                    account.createdAt,
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/*
               * ==================================================
               * SEGURIDAD
               * ==================================================
               */}

              <section className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-950/20 p-5">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

                <div>
                  <p className="text-sm text-blue-200">
                    Administración sin custodia de fondos de usuarios
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    El administrador puede consultar wallets y actividad de los
                    usuarios, pero no posee sus claves privadas y no puede
                    mover fondos de las wallets no-custodial.
                  </p>
                </div>
              </section>
            </>
          )}
      </div>
    </main>
  );
}
