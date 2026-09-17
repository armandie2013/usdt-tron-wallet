"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { TronWeb } from "tronweb";

import {
  ArrowDownToLine,
  CheckCircle2,
  Copy,
  KeyRound,
  LockKeyhole,
  LogOut,
  Network,
  QrCode,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
  Wifi,
  X,
  Zap,
} from "lucide-react";

import AppModal from "@/components/ui/AppModal";
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
  replaceEncryptedWalletFromRecovery,
  saveEncryptedWallet,
  unlockStoredWallet,
} from "@/lib/wallet/wallet-storage.client";

import type {
  StoredWalletMetadata,
  WalletNetwork,
} from "@/lib/wallet/wallet-storage.client";

import {
  resetWalletUnlockGuard,
} from "@/lib/wallet/wallet-unlock-guard.client";

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

interface BlockchainInfo {
  network: WalletNetwork;
  asset: "USDT";
  tokenStandard: "TRC20";
  contractAddress: string;
}

interface WalletInfo {
  id: string;
  asset: "USDT";
  status: string;
  walletType: string;
  network: WalletNetwork;

  address: string;
  addressBase58: string;
  addressHex: string;

  balance: string;
  formattedBalance: string;

  usdt: {
    balanceUnits: string;
    formattedBalance: string;
    contractAddress: string;
  };

  trx: {
    balanceSun: string;
    formattedBalance: string;
  };

  resources: {
    energyAvailable: string;
    bandwidthAvailable: string;
  };

  activated: boolean;

  createdAt: string;
  updatedAt: string;
}

interface MeResponse {
  user?: User;
  message?: string;
}

interface WalletResponse {
  success: boolean;
  needsWalletSetup: boolean;
  wallet: WalletInfo | null;
  blockchain: BlockchainInfo;

  code?: string;
  message?: string;
}

interface AddressChallengeResponse {
  success: boolean;

  challenge?: {
    id: string;
    network: WalletNetwork;

    addressBase58: string;
    addressHex: string;

    message: string;
    expiresAt: string;
  };

  code?: string;
  message?: string;
}

interface RegisterAddressResponse {
  success: boolean;

  ownershipVerified?: boolean;

  wallet?: {
    id: string;
    userId: string;

    network: WalletNetwork;

    addressBase58: string;
    addressHex: string;

    walletType: string;
    status: string;

    createdAt: string;
    updatedAt: string;
  };

  code?: string;
  message?: string;
}

type SetupStep =
  | "NONE"
  | "CREATE"
  | "BACKUP"
  | "CONFIRM"
  | "REGISTERING"
  | "COMPLETE";

interface RecoveryErrorModalState {
  title: string;
  message: string;
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

/*
 * ============================================================
 * FORMATO USDT
 * ============================================================
 *
 * USDT en TRON mantiene 6 decimales internamente.
 *
 * El dashboard solamente muestra 2:
 *
 * 1000,00
 * ->
 * 1.000,00
 *
 * 1000000,00
 * ->
 * 1.000.000,00
 *
 * El valor real on-chain no se modifica.
 * ============================================================
 */

function addThousandsSeparators(
  integerPart:
    string,
): string {
  return integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
}

function formatUsdtUnitsTwoDecimals(
  units:
    string |
    bigint,
): string {
  let value =
    typeof units ===
      "bigint"
      ? units
      : BigInt(
        units,
      );

  const negative =
    value <
    0n;

  if (
    negative
  ) {
    value =
      -value;
  }

  /*
   * USDT tiene 6 decimales.
   *
   * Para mostrar 2:
   *
   * 10.000 unidades mínimas
   * =
   * 0,01 USDT visible
   *
   * Sumamos 5.000 antes de dividir
   * para redondear al centavo.
   */

  const cents =
    (
      value +
      5_000n
    ) /
    10_000n;

  const integerPart =
    cents /
    100n;

  const decimalPart =
    cents %
    100n;

  const formattedInteger =
    addThousandsSeparators(
      integerPart.toString(),
    );

  const formattedDecimals =
    decimalPart
      .toString()
      .padStart(
        2,
        "0",
      );

  return `${negative
      ? "-"
      : ""
    }${formattedInteger},${formattedDecimals}`;
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function DashboardPage() {
  const router =
    useRouter();

  const initialLoadStarted =
    useRef(false);

  /*
   * ==========================================================
   * DATOS PRINCIPALES
   * ==========================================================
   */

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

  /*
   * ==========================================================
   * CREACIÓN DE WALLET
   * ==========================================================
   */

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
    useState<Record<number, string>>(
      {},
    );

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
    recoveryRequested,
    setRecoveryRequested,
  ] =
    useState(
      false,
    );

  const [
    recoveryErrorModal,
    setRecoveryErrorModal,
  ] =
    useState<RecoveryErrorModalState | null>(
      null,
    );

  /*
   * ==========================================================
   * UI
   * ==========================================================
   */

  const [
    qrDataUrl,
    setQrDataUrl,
  ] =
    useState<string | null>(
      null,
    );

  const [
    receiveOpen,
    setReceiveOpen,
  ] =
    useState(
      false,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    walletLoading,
    setWalletLoading,
  ] =
    useState(
      false,
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
    useState<string | null>(
      null,
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null,
    );

  /*
   * ==========================================================
   * MODAL ERROR RECUPERACIÓN
   * ==========================================================
   */

  function showRecoveryError(
    message: string,
    title =
      "No pudimos recuperar tu wallet",
  ) {
    setError(
      null,
    );

    setRecoveryErrorModal({
      title,
      message,
    });
  }

  /*
   * ==========================================================
   * CARGAR DASHBOARD
   * ==========================================================
   */

  const loadDashboard =
    useCallback(
      async (
        showRefresh =
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
           * SESIÓN
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
           * ADMIN no utiliza wallet personal.
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

          setUser(
            currentUser,
          );

          setLoading(
            false,
          );

          /*
           * ====================================================
           * WALLET
           * ====================================================
           */

          setWalletLoading(
            true,
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
            walletData.needsWalletSetup,
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

          setWalletLoading(
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

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(
    () => {
      if (
        initialLoadStarted.current
      ) {
        return;
      }

      initialLoadStarted.current =
        true;

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
            await QRCode.toDataURL(
              address,
              {
                width:
                  280,

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
   * GENERAR WALLET
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
        "No se pudo generar correctamente la verificación de la frase.",
      );

      return;
    }

    setSetupStep(
      "CONFIRM",
    );
  }

  /*
   * ==========================================================
   * CONFIRMAR BACKUP
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
        "La wallet temporal ya no está disponible.",
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
      verificationPositions.every(
        (
          position,
        ) =>
          recoveryWordMatches(
            generatedWallet.mnemonic,
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
        "Wallet no-custodial creada y registrada correctamente.",
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
          "La wallet quedó guardada localmente, pero falta registrar la dirección pública.",
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
   * TRONWEB
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
        await challengeResponse.json()
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
      challenge.addressHex
        .toUpperCase() !==
      metadata.addressHex
        .toUpperCase()
    ) {
      throw new Error(
        "El challenge recibido no corresponde a la wallet local.",
      );
    }

    const tronWeb =
      createOwnershipProofTronWeb(
        metadata.network,
      );

    const signature =
      await tronWeb.trx
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
        "No se pudo generar una firma válida.",
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
        "Ingresá la contraseña de la wallet.",
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
          "No se encontró la wallet local.",
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
        unlocked.addressHex
          .toUpperCase() !==
        metadata.addressHex
          .toUpperCase()
      ) {
        throw new Error(
          "La wallet desbloqueada no coincide con la wallet local.",
        );
      }

      await registerPublicAddress(
        metadata,
        unlocked.privateKey,
      );

      setSuccess(
        "La propiedad de la wallet fue verificada correctamente.",
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

    setRecoveryErrorModal(
      null,
    );

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
      showRecoveryError(
        "No pudimos determinar correctamente la wallet registrada en tu cuenta. Volvé a intentarlo.",
        "No pudimos verificar tu wallet",
      );

      return;
    }

    if (
      recoveryPassword.length <
      8
    ) {
      showRecoveryError(
        "La nueva contraseña local debe tener al menos 8 caracteres.",
        "Revisá la contraseña",
      );

      return;
    }

    if (
      recoveryPassword !==
      recoveryPasswordConfirmation
    ) {
      showRecoveryError(
        "Las dos contraseñas ingresadas no coinciden. Verificalas y volvé a intentarlo.",
        "Las contraseñas no coinciden",
      );

      return;
    }

    const replacingExistingVault =
      Boolean(
        localWallet,
      );

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
        showRecoveryError(
          "Las 12 palabras ingresadas corresponden a otra wallet. La dirección obtenida no coincide con la wallet registrada en esta cuenta.",
          "La frase pertenece a otra wallet",
        );

        return;
      }

      if (
        restored.addressHex
          .toUpperCase() !==
        wallet.addressHex
          .toUpperCase()
      ) {
        showRecoveryError(
          "La dirección obtenida desde las 12 palabras no coincide con la wallet registrada en esta cuenta.",
          "La wallet no coincide",
        );

        return;
      }

      if (
        replacingExistingVault
      ) {
        await replaceEncryptedWalletFromRecovery({
          userId:
            user.id,

          network:
            blockchain.network,

          wallet:
            restored,

          password:
            recoveryPassword,
        });
      } else {
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
      }

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
          "La wallet fue reconstruida, pero no pudimos verificar que haya quedado guardada correctamente en este dispositivo.",
        );
      }

      if (
        stored.addressBase58 !==
        wallet.addressBase58 ||
        stored.addressHex
          .toUpperCase() !==
        wallet.addressHex
          .toUpperCase()
      ) {
        throw new Error(
          "La wallet recuperada no coincide con la dirección registrada en esta cuenta.",
        );
      }

      resetWalletUnlockGuard({
        userId:
          user.id,

        network:
          blockchain.network,

        addressBase58:
          wallet.addressBase58,
      });

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

      setRecoveryRequested(
        false,
      );

      setSuccess(
        replacingExistingVault
          ? "Acceso recuperado correctamente. Ya podés utilizar la nueva contraseña local."
          : "Wallet recuperada correctamente.",
      );
    } catch (
    recoveryError
    ) {
      console.error(
        "[WALLET RECOVERY]",
        recoveryError,
      );

      showRecoveryError(
        getErrorMessage(
          recoveryError,
          "No pudimos recuperar la wallet. Verificá las 12 palabras e intentá nuevamente.",
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
   * SOLICITAR RECUPERACIÓN DESDE SEND
   * ==========================================================
   */

  function handleRecoveryRequested() {
    setError(
      null,
    );

    setSuccess(
      null,
    );

    setRecoveryErrorModal(
      null,
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

    setRecoveryRequested(
      true,
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "wallet-recovery",
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      },
      50,
    );
  }

  /*
   * ==========================================================
   * CANCELAR RECUPERACIÓN
   * ==========================================================
   */

  function handleCancelRecovery() {
    if (
      recoveringWallet
    ) {
      return;
    }

    setRecoveryMnemonic(
      "",
    );

    setRecoveryPassword(
      "",
    );

    setRecoveryPasswordConfirmation(
      "",
    );

    setRecoveryErrorModal(
      null,
    );

    setError(
      null,
    );

    setRecoveryRequested(
      false,
    );
  }

  /*
   * ==========================================================
   * SCROLL
   * ==========================================================
   */

  function scrollToSection(
    id:
      string,
  ) {
    document
      .getElementById(
        id,
      )
      ?.scrollIntoView({
        behavior:
          "smooth",

        block:
          "start",
      });
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
   * COPIAR ADDRESS
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
      <main className="min-h-screen bg-[#090e1c] text-[#dee2f6]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <RefreshCw className="h-6 w-6 animate-spin text-cyan-300" />
            </div>

            <p className="mt-4 text-sm text-slate-400">
              Cargando tu cuenta...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * VIEW
   * ==========================================================
   */

  return (
    <main className="wallet-app min-h-screen bg-[#0e1321] pb-28 text-[#dee2f6]">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #0e1321;
        }

        .wallet-app {
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            sans-serif;

          background:
            radial-gradient(
              circle at 50% -8%,
              rgba(0, 242, 254, 0.14),
              transparent 31rem
            ),
            radial-gradient(
              circle at -10% 42%,
              rgba(0, 226, 160, 0.07),
              transparent 24rem
            ),
            radial-gradient(
              circle at 110% 70%,
              rgba(0, 220, 230, 0.055),
              transparent 24rem
            ),
            #0e1321;
        }

        .wallet-app input,
        .wallet-app textarea {
          background: rgba(9, 14, 28, 0.88) !important;
          border-color: rgba(132, 148, 149, 0.35) !important;
          color: #dee2f6 !important;
        }

        .wallet-app input::placeholder,
        .wallet-app textarea::placeholder {
          color: #849495 !important;
        }

        .wallet-app input:focus,
        .wallet-app textarea:focus {
          border-color: #00dce6 !important;
          box-shadow:
            0 0 0 3px rgba(0, 220, 230, 0.12);
        }

        .glass-card {
          background:
            rgba(
              14,
              25,
              45,
              0.72
            );

          backdrop-filter:
            blur(20px)
            saturate(180%);

          -webkit-backdrop-filter:
            blur(20px)
            saturate(180%);

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.10),
            0 22px 60px rgba(0,0,0,0.17);
        }

        .glass-card-nested {
          background:
            rgba(
              18,
              30,
              53,
              0.58
            );

          backdrop-filter:
            blur(16px);

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.06
            );

          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.065);
        }

        .wallet-app img[alt="QR dirección TRON"] {
          background:
            white !important;
        }

        ::-webkit-scrollbar {
          display: none;
        }

        * {
          scrollbar-width: none;
        }

        /*
         * ====================================================
         * IMPRESIÓN
         * ====================================================
         */

        @media print {
          html,
          body {
            background: #ffffff !important;
          }

          body {
            margin: 0 !important;
          }

          .wallet-app {
            min-height: auto !important;
            padding-bottom: 0 !important;
            background: #ffffff !important;
          }

          .wallet-header,
          .wallet-bottom-nav {
            display: none !important;
          }

          .wallet-background-decoration {
            display: none !important;
          }

          .wallet-app section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/*
       * ========================================================
       * BACKGROUND
       * ========================================================
       */}

      <div className="wallet-background-decoration pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />

        <div className="absolute left-[-7rem] top-[430px] h-80 w-80 rounded-full bg-emerald-400/5 blur-[100px]" />

        <div className="absolute right-[-5rem] top-[720px] h-80 w-80 rounded-full bg-cyan-300/5 blur-[90px]" />
      </div>

      {/*
       * ========================================================
       * HEADER
       * ========================================================
       */}

      <header className="wallet-header sticky top-0 z-40 border-b border-white/[0.05] bg-[#090e1c]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[720px] items-center justify-between px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#252a39] text-cyan-300 shadow-inner">
              <WalletCards className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[17px] font-semibold text-[#dee2f6]">
                  Mi Wallet
                </h1>

                {wallet && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cyan-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />

                    {
                      wallet.network
                    }
                  </span>
                )}
              </div>

              <p className="truncate text-xs text-[#b9cacb]">
                {
                  user.name
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            title="Cerrar sesión"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1a1f2e] text-[#b9cacb] transition hover:bg-[#252a39] hover:text-red-300"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      {/*
       * ========================================================
       * CONTENT
       * ========================================================
       */}

      <div className="relative z-10 mx-auto w-full max-w-[720px] space-y-5 px-4 py-4 sm:px-5">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-950/20 p-3.5 text-sm text-red-200">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {error}
            </span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-3.5 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <span className="break-all">
              {success}
            </span>
          </div>
        )}

        {walletLoading &&
          !wallet && (
            <section className="glass-card flex min-h-[400px] items-center justify-center rounded-2xl">
              <div className="text-center">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-300" />

                <p className="mt-3 text-sm text-[#b9cacb]">
                  Preparando tu wallet...
                </p>
              </div>
            </section>
          )}

        {/*
         * ======================================================
         * CREAR WALLET
         * ======================================================
         */}

        {!walletLoading &&
          needsWalletSetup &&
          setupStep ===
          "CREATE" && (
            <section className="glass-card overflow-hidden rounded-2xl">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                      <KeyRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-[var(--app-text-strong)]">
                        Crear mi wallet
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-[var(--app-text-secondary)]">
                        La wallet se genera en este dispositivo.
                        La clave privada nunca se envía al servidor.
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--app-muted)]">
                    Paso 1 de 3
                  </span>
                </div>

                <div className="mt-5 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-primary-soft)] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--app-primary)]" />

                    <div>
                      <p className="text-sm font-semibold text-[var(--app-text-strong)]">
                        Clave de cifrado local
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[var(--app-text-secondary)]">
                        Protege tu wallet en este dispositivo y se usa para
                        autorizar transacciones. Si la olvidás, vas a necesitar
                        tus 12 palabras para recuperar la wallet.
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={
                    handleGenerateWallet
                  }
                  className="mt-5 space-y-4"
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--app-text-strong)]">
                      Clave de cifrado de la wallet
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
                      minLength={8}
                      required
                      disabled={
                        creatingWallet
                      }
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-xl border px-4 py-3 outline-none"
                    />

                    <p className="mt-2 text-[10px] leading-5 text-[var(--app-muted)]">
                      Usá una clave distinta a la contraseña de acceso a la plataforma.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--app-text-strong)]">
                      Repetir clave de cifrado
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
                      minLength={8}
                      required
                      disabled={
                        creatingWallet
                      }
                      placeholder="Ingresala nuevamente"
                      className="w-full rounded-xl border px-4 py-3 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      creatingWallet
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00a9d9] to-[#00dce6] px-4 py-3 text-sm font-semibold text-[#002022] shadow-[0_8px_24px_-6px_rgba(0,220,230,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />

                    {creatingWallet
                      ? "Generando wallet..."
                      : "Crear wallet"}
                  </button>
                </form>
              </div>

              <div className="border-t border-[var(--app-border)] bg-[var(--app-surface-muted)] px-5 py-3">
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--app-success)]" />

                  <p className="text-center text-[9px] tracking-wide text-[var(--app-muted)]">
                    Generación local · La clave privada no sale de este dispositivo
                  </p>
                </div>
              </div>
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
            <section className="glass-card overflow-hidden rounded-2xl">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--app-danger)] bg-[var(--app-danger-soft)] text-[var(--app-danger)]">
                      <LockKeyhole className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-[var(--app-text-strong)]">
                        Guardá tus 12 palabras
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-[var(--app-text-secondary)]">
                        Frase de recuperación de tu wallet.
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--app-muted)]">
                    Paso 2 de 3
                  </span>
                </div>

                <div className="mt-5 rounded-xl border border-[var(--app-danger)] bg-[var(--app-danger-soft)] p-4">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--app-danger)]" />

                    <div>
                      <p className="text-sm font-semibold text-[var(--app-danger)]">
                        Guardá estas 12 palabras ahora
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[var(--app-text-secondary)]">
                        Se muestran una sola vez y no podremos recuperarlas
                        después. Guardalas exactamente en el orden indicado.
                        Las vas a necesitar para restaurar tu wallet o crear
                        una nueva clave de cifrado en otro dispositivo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div>
                      <p className="text-xs font-semibold text-[var(--app-text-strong)]">
                        Frase de recuperación
                      </p>

                      <p className="mt-0.5 text-[10px] text-[var(--app-muted)]">
                        12 palabras · Respetá el orden
                      </p>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-danger-soft)] text-[var(--app-danger)]">
                      <LockKeyhole className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                            className="flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] px-3 py-3"
                          >
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[var(--app-surface-raised)] px-1 text-[10px] font-semibold text-[var(--app-muted)]">
                              {index +
                                1}
                            </span>

                            <span className="min-w-0 font-mono text-sm font-semibold text-[var(--app-text-strong)]">
                              {word}
                            </span>
                          </div>
                        ),
                      )}
                  </div>
                </div>

                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--app-danger)] bg-[var(--app-danger-soft)] p-4">
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
                    className="mt-1 h-4 w-4 shrink-0"
                  />

                  <span className="text-xs leading-5 text-[var(--app-text-secondary)]">
                    Confirmo que guardé las 12 palabras{" "}
                    <span className="font-semibold text-[var(--app-text-strong)]">
                      exactamente como aparecen y en el orden correcto
                    </span>
                    . Entiendo que, una vez finalizada la creación de la
                    wallet, la aplicación no podrá volver a mostrármelas ni
                    recuperarlas por mí.
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
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00a9d9] to-[#00dce6] px-4 py-3 text-sm font-semibold text-[#002022] shadow-[0_8px_24px_-6px_rgba(0,220,230,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ShieldCheck className="h-4 w-4" />

                  Continuar
                </button>
              </div>
            </section>
          )}

        {/*
         * ======================================================
         * CONFIRM BACKUP
         * ======================================================
         */}

        {setupStep ===
          "CONFIRM" &&
          generatedWallet && (
            <section className="glass-card overflow-hidden rounded-2xl">
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--app-success)] bg-[var(--app-success-soft)] text-[var(--app-success)]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <h2 className="min-w-0 text-lg font-semibold text-[var(--app-text-strong)]">
                      Verificar respaldo
                    </h2>
                  </div>

                  <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--app-muted)]">
                    Paso 3 de 3
                  </span>
                </div>

                <p className="mt-4 w-full text-sm leading-6 text-[var(--app-text-secondary)]">
                  Antes de finalizar vamos a comprobar que guardaste
                  correctamente la frase de recuperación.
                </p>

                <form
                  onSubmit={
                    handleConfirmRecoveryPhrase
                  }
                  className="mt-5 space-y-4"
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
                        <label className="mb-2 block text-sm text-[var(--app-text-strong)]">
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
                          className="w-full rounded-xl border px-4 py-3 outline-none"
                        />
                      </div>
                    ),
                  )}

                  <button
                    type="submit"
                    disabled={
                      creatingWallet
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00a9d9] to-[#00dce6] px-4 py-3 text-sm font-semibold text-[#002022] shadow-[0_8px_24px_-6px_rgba(0,220,230,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />

                    {creatingWallet
                      ? "Guardando..."
                      : "Confirmar respaldo"}
                  </button>
                </form>
              </div>
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
            <section className="glass-card rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-1 h-5 w-5 shrink-0 text-amber-300" />

                <div>
                  <h2 className="text-lg font-semibold">
                    Falta registrar tu wallet
                  </h2>

                  <p className="mt-1 text-sm text-[#b9cacb]">
                    Desbloqueá la wallet para verificar la propiedad de la dirección.
                  </p>
                </div>
              </div>

              <div className="glass-card-nested mt-5 rounded-xl p-4">
                <p className="text-xs text-[#849495]">
                  Dirección
                </p>

                <p className="mt-2 break-all font-mono text-xs">
                  {
                    localWallet
                      .addressBase58
                  }
                </p>
              </div>

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
                placeholder="Contraseña de la wallet"
                className="mt-4 w-full rounded-xl border px-4 py-3 outline-none"
              />

              <button
                type="button"
                onClick={
                  handleRetryRegistration
                }
                disabled={
                  creatingWallet ||
                  !registrationPassword
                }
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#002022] disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />

                {creatingWallet
                  ? "Verificando..."
                  : "Verificar y registrar"}
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
              <section
                id="wallet-home"
                className="glass-card relative overflow-hidden rounded-2xl p-5"
              >
                <div className="pointer-events-none absolute -bottom-14 -right-12 h-44 w-44 rounded-full bg-cyan-400/10 blur-2xl" />

                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium tracking-wide text-[#b9cacb]">
                    Saldo disponible
                  </p>

                  <span
                    className={
                      wallet.activated
                        ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300"
                        : "inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300"
                    }
                  >
                    <span
                      className={
                        wallet.activated
                          ? "h-2 w-2 rounded-full bg-emerald-300"
                          : "h-2 w-2 rounded-full bg-amber-300"
                      }
                    />

                    {wallet.activated
                      ? "Cuenta activa"
                      : "No activada"}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-[34px] font-bold leading-none tracking-[-0.03em] text-[#dee2f6] sm:text-[40px]">
                    {
                      formatUsdtUnitsTwoDecimals(
                        wallet
                          .usdt
                          .balanceUnits,
                      )
                    }
                  </span>

                  <span className="text-[21px] font-bold text-cyan-300">
                    USDT
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      scrollToSection(
                        "wallet-send",
                      )
                    }
                    className="flex min-h-[58px] items-center gap-2.5 rounded-xl border border-white/15 bg-gradient-to-br from-[#0060e6] to-[#00c8f8] px-3 text-left shadow-[0_8px_24px_-4px_rgba(0,114,255,0.35)] transition active:scale-[0.98]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                      <Send className="h-[18px] w-[18px] text-white" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-tight text-white">
                        Enviar USDT
                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-white/70">
                        A otra wallet
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setReceiveOpen(
                        true,
                      )
                    }
                    className="flex min-h-[58px] items-center gap-2.5 rounded-xl border border-white/15 bg-gradient-to-br from-[#009b63] to-[#43ffbb] px-3 text-left text-[#002114] shadow-[0_8px_24px_-4px_rgba(0,226,160,0.30)] transition active:scale-[0.98]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10">
                      <ArrowDownToLine className="h-[18px] w-[18px]" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-tight">
                        Recibir USDT
                      </p>

                      <p className="mt-0.5 truncate text-[10px] opacity-70">
                        QR y dirección
                      </p>
                    </div>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="glass-card-nested rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300/10 bg-rose-400/10 text-rose-300">
                        <div className="h-3 w-3 rotate-45 border border-current" />
                      </div>

                      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#b9cacb]">
                        TRX
                      </span>
                    </div>

                    <p className="mt-2 text-lg font-semibold leading-none">
                      {
                        wallet
                          .trx
                          .formattedBalance
                      }
                    </p>

                    <p className="mt-1 text-[10px] text-[#849495]">
                      Gas / recursos
                    </p>
                  </div>

                  <div className="glass-card-nested rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/10 bg-cyan-400/10 text-cyan-300">
                        <Zap className="h-[17px] w-[17px]" />
                      </div>

                      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#b9cacb]">
                        Energy
                      </span>
                    </div>

                    <p className="mt-2 text-lg font-semibold leading-none">
                      {
                        wallet
                          .resources
                          .energyAvailable
                      }
                    </p>
                  </div>

                  <div className="glass-card-nested rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300/10 bg-emerald-400/10 text-emerald-300">
                        <Wifi className="h-[17px] w-[17px]" />
                      </div>

                      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#b9cacb]">
                        Bandwidth
                      </span>
                    </div>

                    <p className="mt-2 text-lg font-semibold leading-none">
                      {
                        wallet
                          .resources
                          .bandwidthAvailable
                      }
                    </p>
                  </div>

                  <div className="glass-card-nested rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-300/10 bg-violet-400/10 text-violet-300">
                        <Network className="h-[17px] w-[17px]" />
                      </div>

                      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#b9cacb]">
                        Red
                      </span>
                    </div>

                    <p className="mt-2 text-lg font-semibold leading-none text-cyan-100">
                      {
                        wallet.network
                      }
                    </p>

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />

                      <span className="text-[10px] text-[#849495]">
                        Conectado
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#090e1c]/70 p-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-[#849495]">
                      Dirección TRON (Base58)
                    </p>

                    <p className="mt-1 truncate font-mono text-[11px] font-medium text-[#dee2f6]">
                      {
                        wallet
                          .addressBase58
                      }
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={
                        handleCopyAddress
                      }
                      title="Copiar dirección"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#252a39] text-[#b9cacb] transition hover:text-cyan-300"
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setReceiveOpen(
                          true,
                        )
                      }
                      title="Mostrar QR"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#252a39] text-[#b9cacb] transition hover:text-cyan-300"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>

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
                      title="Actualizar"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#252a39] text-[#b9cacb] transition hover:text-cyan-300 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${refreshing
                            ? "animate-spin"
                            : ""
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              <div
                id="wallet-send"
                className="scroll-mt-20"
              >
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
                    onRecoveryRequested={
                      handleRecoveryRequested
                    }
                  />
                ) : (
                  <section className="glass-card rounded-2xl p-5">
                    <div className="flex gap-3">
                      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />

                      <div>
                        <h2 className="font-semibold">
                          Enviar USDT
                        </h2>

                        <p className="mt-1 text-sm text-[#b9cacb]">
                          Primero necesitás recuperar la wallet en este dispositivo.
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {(
                !localWallet ||
                recoveryRequested
              ) && (
                  <section
                    id="wallet-recovery"
                    className="glass-card scroll-mt-20 rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                          <RotateCcw className="h-5 w-5" />
                        </div>

                        <div>
                          <h2 className="font-semibold">
                            {localWallet
                              ? "Recuperar acceso"
                              : "Recuperar wallet"}
                          </h2>

                          <p className="mt-1 text-sm leading-5 text-[#b9cacb]">
                            Utilizá tus 12 palabras y definí una nueva contraseña local.
                          </p>
                        </div>
                      </div>

                      {localWallet && (
                        <button
                          type="button"
                          onClick={
                            handleCancelRecovery
                          }
                          disabled={
                            recoveringWallet
                          }
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#b9cacb]"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    <div className="glass-card-nested mt-4 rounded-xl p-3">
                      <p className="text-[10px] text-[#849495]">
                        Dirección que debe recuperarse
                      </p>

                      <p className="mt-1 break-all font-mono text-xs">
                        {
                          wallet
                            .addressBase58
                        }
                      </p>
                    </div>

                    <form
                      onSubmit={
                        handleRecoverWallet
                      }
                      className="mt-4 space-y-4"
                    >
                      <div>
                        <label className="mb-2 block text-sm">
                          12 palabras
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
                          rows={3}
                          required
                          disabled={
                            recoveringWallet
                          }
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={
                            false
                          }
                          placeholder="Ingresá las 12 palabras en el orden correcto..."
                          className="w-full resize-none rounded-xl border px-4 py-3 font-mono text-sm outline-none"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs text-[#b9cacb]">
                            Nueva contraseña
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
                            required
                            minLength={8}
                            disabled={
                              recoveringWallet
                            }
                            placeholder="Mínimo 8 caracteres"
                            className="w-full rounded-xl border px-4 py-3 outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-[#b9cacb]">
                            Repetir contraseña
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
                            required
                            minLength={8}
                            disabled={
                              recoveringWallet
                            }
                            placeholder="Repetir contraseña"
                            className="w-full rounded-xl border px-4 py-3 outline-none"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-[#090e1c]/40 p-3">
                        <div className="flex items-start gap-2.5">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />

                          <p className="text-[10px] leading-5 text-[#849495]">
                            Las 12 palabras se procesan localmente.
                            Solo se aceptará la recuperación si generan exactamente
                            la dirección registrada en esta cuenta.
                          </p>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          recoveringWallet
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#002022] transition hover:bg-cyan-300 disabled:opacity-50"
                      >
                        <RotateCcw
                          className={`h-4 w-4 ${recoveringWallet
                              ? "animate-spin"
                              : ""
                            }`}
                        />

                        {recoveringWallet
                          ? "Verificando y recuperando..."
                          : "Recuperar acceso"}
                      </button>
                    </form>
                  </section>
                )}

              <section
                id="wallet-security"
                className="glass-card scroll-mt-20 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <ShieldCheck className="h-[18px] w-[18px]" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      Wallet no-custodial
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#b9cacb]">
                      La wallet está cifrada en este dispositivo.
                      El servidor solamente conoce tu dirección pública
                      y nunca recibe tu clave privada ni tus 12 palabras.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-[#252a39] px-2.5 py-1 text-[10px] text-[#b9cacb]">
                        TRON
                      </span>

                      <span className="rounded-lg bg-[#252a39] px-2.5 py-1 text-[10px] text-[#b9cacb]">
                        TRC20
                      </span>

                      <span className="rounded-lg bg-[#252a39] px-2.5 py-1 text-[10px] text-[#b9cacb]">
                        No-custodial
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
      </div>

      {/*
       * ========================================================
       * RECIBIR MODAL
       * ========================================================
       */}

      {receiveOpen &&
        wallet && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() =>
              setReceiveOpen(
                false,
              )
            }
          >
            <section
              className="glass-card w-full max-w-[430px] rounded-t-[26px] p-5 sm:rounded-[26px]"
              onClick={(
                event,
              ) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Recibir USDT
                  </h2>

                  <p className="mt-0.5 text-xs text-[#b9cacb]">
                    TRON · TRC20
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setReceiveOpen(
                      false,
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#252a39] text-[#b9cacb]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 flex justify-center">
                {qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      qrDataUrl
                    }
                    alt="QR dirección TRON"
                    width={220}
                    height={220}
                    className="rounded-2xl bg-white p-3"
                  />
                )}
              </div>

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#090e1c]/70 p-3">
                <p className="text-[10px] text-[#849495]">
                  Dirección TRON
                </p>

                <p className="mt-1 break-all font-mono text-xs">
                  {
                    wallet
                      .addressBase58
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleCopyAddress
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#002022]"
              >
                <Copy className="h-4 w-4" />

                Copiar dirección
              </button>

              <p className="mt-4 text-center text-[11px] leading-5 text-[#849495]">
                Enviá únicamente USDT mediante la red TRON (TRC20).
              </p>
            </section>
          </div>
        )}

      {/*
       * ========================================================
       * BOTTOM NAV
       * ========================================================
       */}

      {!needsWalletSetup &&
        wallet &&
        blockchain && (
          <nav className="wallet-bottom-nav fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 items-center justify-around rounded-2xl border border-white/10 bg-[#090e1c]/90 p-1.5 shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "wallet-home",
                )
              }
              className="flex min-w-[66px] flex-col items-center justify-center rounded-xl bg-cyan-400/10 px-3 py-1.5 text-cyan-300"
            >
              <WalletCards className="h-[21px] w-[21px]" />

              <span className="mt-0.5 text-[9px] font-semibold">
                Inicio
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "wallet-send",
                )
              }
              className="flex min-w-[66px] flex-col items-center justify-center rounded-xl px-3 py-1.5 text-[#b9cacb] transition hover:bg-[#252a39]"
            >
              <Send className="h-[21px] w-[21px]" />

              <span className="mt-0.5 text-[9px]">
                Enviar
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setReceiveOpen(
                  true,
                )
              }
              className="flex min-w-[66px] flex-col items-center justify-center rounded-xl px-3 py-1.5 text-[#b9cacb] transition hover:bg-[#252a39]"
            >
              <QrCode className="h-[21px] w-[21px]" />

              <span className="mt-0.5 text-[9px]">
                Recibir
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "wallet-security",
                )
              }
              className="flex min-w-[66px] flex-col items-center justify-center rounded-xl px-3 py-1.5 text-[#b9cacb] transition hover:bg-[#252a39]"
            >
              <ShieldCheck className="h-[21px] w-[21px]" />

              <span className="mt-0.5 text-[9px]">
                Seguridad
              </span>
            </button>
          </nav>
        )}

      {/*
       * ========================================================
       * ERROR MODAL - RECUPERACIÓN
       * ========================================================
       */}

      <AppModal
        open={
          recoveryErrorModal !==
          null
        }
        variant="error"
        title={
          recoveryErrorModal
            ?.title ??
          "No pudimos recuperar tu wallet"
        }
        message={
          recoveryErrorModal
            ?.message ??
          ""
        }
        confirmLabel="Entendido"
        onClose={() =>
          setRecoveryErrorModal(
            null,
          )
        }
      />
    </main>
  );
}