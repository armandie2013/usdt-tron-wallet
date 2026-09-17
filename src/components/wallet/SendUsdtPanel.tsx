"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  X,
  Zap,
} from "lucide-react";

import AppModal, {
  type AppModalVariant,
} from "@/components/ui/AppModal";

import {
  unlockStoredWallet,
} from "@/lib/wallet/wallet-storage.client";

import type {
  WalletNetwork,
} from "@/lib/wallet/wallet-storage.client";

import {
  buildAndSignUsdtTransfer,
} from "@/lib/wallet/tron-transaction.client";

import {
  formatWalletUnlockRemainingTime,
  getWalletUnlockGuardState,
  registerWalletUnlockFailure,
  registerWalletUnlockSuccess,
} from "@/lib/wallet/wallet-unlock-guard.client";

import type {
  WalletUnlockGuardState,
} from "@/lib/wallet/wallet-unlock-guard.client";

/*
 * ============================================================
 * PROPS
 * ============================================================
 */

interface SendUsdtPanelProps {
  userId: string;

  network: WalletNetwork;

  fromAddress: string;

  contractAddress: string;

  onTransferBroadcasted?:
    (
      txid: string,
    ) => void | Promise<void>;

  onRecoveryRequested?:
    () => void;
}

/*
 * ============================================================
 * RESPUESTAS API
 * ============================================================
 */

interface ResolveRecipientResponse {
  success: boolean;

  recipient?: {
    type:
      | "TRON_ADDRESS"
      | "INTERNAL_USER";

    address: string;

    addressBase58: string;

    network: WalletNetwork;

    internal: boolean;

    user:
      | {
          id: string;

          name:
            string |
            null;

          username:
            string |
            null;
        }
      | null;
  };

  code?: string;

  message?: string;
}

interface TransferQuoteResponse {
  success: boolean;

  quote?: {
    network: WalletNetwork;

    asset: "USDT";

    tokenStandard: "TRC20";

    contractAddress: string;

    fromAddress: string;

    toAddress: string;

    amount: {
      units: string;

      formatted: string;

      decimals: number;

      scale: string;
    };

    balance: {
      usdtUnits: string;

      formattedUsdt: string;

      trxSun: string;

      formattedTrx: string;
    };

    resources: {
      energyAvailable: string;

      bandwidthAvailable: string;

      estimatedEnergy:
        string |
        null;

      energyDeficit:
        string |
        null;

      energyPriceSun: string;
    };

    networkCost: {
      estimatedSun:
        string |
        null;

      estimatedTrx:
        string |
        null;

      enoughTrx:
        boolean |
        null;
    };

    feeLimitSun: number;

    platformFee: {
      enabled: boolean;

      usdtUnits: string;

      formattedUsdt: string;
    };

    canProceed: boolean;
  };

  code?: string;

  message?: string;
}

interface BroadcastResponse {
  success: boolean;

  broadcast?: {
    accepted: boolean;

    txid: string;

    network: WalletNetwork;

    fromAddress: string;

    toAddress: string;

    amountUnits: string;

    contractAddress: string;

    feeLimitSun: number;

    status: "BROADCASTED";
  };

  code?: string;

  message?: string;
}

/*
 * ============================================================
 * ESTADO
 * ============================================================
 */

type SendStep =
  | "FORM"
  | "QUOTE"
  | "PASSWORD"
  | "BROADCASTING"
  | "BROADCAST_UNKNOWN"
  | "SUCCESS";

interface SendModalState {
  title: string;

  message: string;

  variant:
    AppModalVariant;
}

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
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

function isWalletCredentialError(
  error:
    unknown,
): boolean {
  if (
    !(error instanceof Error)
  ) {
    return false;
  }

  return (
    error.message ===
    "La contraseña de la wallet es incorrecta o los datos locales están dañados."
  );
}

/*
 * ============================================================
 * IMPORTES USDT
 * ============================================================
 *
 * La interfaz trabaja con 2 decimales.
 *
 * USDT TRC20 continúa trabajando internamente
 * con 6 decimales.
 *
 * No utilizamos Number ni parseFloat para
 * construir el importe de una transferencia.
 * ============================================================
 */

interface ParsedUsdtInput {
  integerPart: string;

  decimalPart: string;
}

/*
 * ============================================================
 * PARSEAR IMPORTE VISIBLE
 * ============================================================
 *
 * Formatos aceptados:
 *
 * 1
 * 1,5
 * 1,50
 * 1000
 * 1000,50
 * 1.000
 * 1.000,50
 * 1.000.000,50
 *
 * También:
 *
 * 1000.50
 *
 * por compatibilidad con teclados que utilizan
 * el punto como separador decimal.
 * ============================================================
 */

function parseVisibleUsdtAmount(
  input:
    string,
): ParsedUsdtInput {
  const value =
    input
      .trim()
      .replace(
        /\s+/g,
        "",
      );

  if (
    !value
  ) {
    throw new Error(
      "Ingresá un importe USDT.",
    );
  }

  /*
   * ==========================================================
   * COMA COMO SEPARADOR DECIMAL
   * ==========================================================
   */

  if (
    value.includes(
      ",",
    )
  ) {
    const parts =
      value.split(
        ",",
      );

    if (
      parts.length !==
      2
    ) {
      throw new Error(
        "Ingresá un importe USDT válido.",
      );
    }

    const rawInteger =
      parts[0];

    const decimalPart =
      parts[1];

    /*
     * La parte entera puede venir:
     *
     * 1000
     *
     * o
     *
     * 1.000
     * 1.000.000
     */

    if (
      !(
        /^\d+$/.test(
          rawInteger,
        ) ||
        /^\d{1,3}(?:\.\d{3})+$/.test(
          rawInteger,
        )
      )
    ) {
      throw new Error(
        "Ingresá un importe USDT válido.",
      );
    }

    if (
      !/^\d{0,2}$/.test(
        decimalPart,
      )
    ) {
      throw new Error(
        "El importe puede tener como máximo 2 decimales.",
      );
    }

    return {
      integerPart:
        rawInteger.replace(
          /\./g,
          "",
        ),

      decimalPart,
    };
  }

  /*
   * ==========================================================
   * SIN COMA
   * ==========================================================
   */

  const dotMatches =
    value.match(
      /\./g,
    );

  const dotCount =
    dotMatches
      ?.length ??
    0;

  /*
   * Entero puro.
   */

  if (
    dotCount ===
    0
  ) {
    if (
      !/^\d+$/.test(
        value,
      )
    ) {
      throw new Error(
        "Ingresá un importe USDT válido.",
      );
    }

    return {
      integerPart:
        value,

      decimalPart:
        "",
    };
  }

  /*
   * Un solo punto seguido de 1 o 2 números:
   *
   * 1.5
   * 1.50
   * 1000.50
   *
   * Lo consideramos separador decimal.
   */

  if (
    dotCount ===
      1 &&
    /^\d+\.\d{1,2}$/.test(
      value,
    )
  ) {
    const [
      integerPart,
      decimalPart,
    ] =
      value.split(
        ".",
      );

    return {
      integerPart,
      decimalPart,
    };
  }

  /*
   * Agrupación de miles:
   *
   * 1.000
   * 10.000
   * 100.000
   * 1.000.000
   */

  if (
    /^\d{1,3}(?:\.\d{3})+$/.test(
      value,
    )
  ) {
    return {
      integerPart:
        value.replace(
          /\./g,
          "",
        ),

      decimalPart:
        "",
    };
  }

  throw new Error(
    "Ingresá un importe USDT válido con hasta 2 decimales.",
  );
}

/*
 * ============================================================
 * IMPORTE VISIBLE -> UNIDADES MÍNIMAS
 * ============================================================
 *
 * 1 USDT
 * =
 * 1.000.000 unidades mínimas
 *
 * Aunque el usuario solamente pueda operar
 * con 2 decimales.
 *
 * Ejemplos:
 *
 * 1,00
 * ->
 * 1000000
 *
 * 1,50
 * ->
 * 1500000
 *
 * 1000,25
 * ->
 * 1000250000
 * ============================================================
 */

function parseUsdtToUnits(
  input:
    string,
): string {
  const parsed =
    parseVisibleUsdtAmount(
      input,
    );

  const normalizedInteger =
    parsed
      .integerPart
      .replace(
        /^0+(?=\d)/,
        "",
      );

  /*
   * El usuario utiliza 2 decimales.
   *
   * USDT utiliza 6.
   *
   * Ejemplo:
   *
   * 0,50
   *
   * decimal visible:
   * 50
   *
   * unidades USDT:
   * 500000
   */

  const visibleDecimals =
    parsed
      .decimalPart
      .padEnd(
        2,
        "0",
      );

  const blockchainDecimals =
    `${visibleDecimals}0000`;

  const units =
    BigInt(
      normalizedInteger ||
        "0",
    ) *
      1_000_000n +
    BigInt(
      blockchainDecimals ||
        "0",
    );

  if (
    units <=
    0n
  ) {
    throw new Error(
      "El importe debe ser mayor que cero.",
    );
  }

  return units.toString();
}

/*
 * ============================================================
 * SEPARADOR DE MILES
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

/*
 * ============================================================
 * UNIDADES USDT -> FORMATO VISIBLE
 * ============================================================
 *
 * La blockchain puede contener hasta 6 decimales.
 *
 * Nosotros mostramos 2:
 *
 * 1000000
 * ->
 * 1,00
 *
 * 1000000000
 * ->
 * 1.000,00
 *
 * 1000000000000
 * ->
 * 1.000.000,00
 *
 * Si el saldo on-chain tiene más de dos decimales,
 * se redondea únicamente para su visualización.
 *
 * El valor real nunca se modifica.
 * ============================================================
 */

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
   * 1 centavo visible =
   * 10.000 unidades mínimas.
   *
   * 5.000 permite redondear
   * correctamente al centavo.
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

  return `${
    negative
      ? "-"
      : ""
  }${formattedInteger},${formattedDecimals}`;
}

/*
 * ============================================================
 * FORMATEAR INPUT
 * ============================================================
 *
 * Se ejecuta cuando el usuario sale del campo.
 *
 * Ejemplo:
 *
 * 1000
 * ->
 * 1.000,00
 *
 * 1000,5
 * ->
 * 1.000,50
 * ============================================================
 */

function formatVisibleUsdtInput(
  input:
    string,
): string {
  if (
    !input.trim()
  ) {
    return "";
  }

  const units =
    parseUsdtToUnits(
      input,
    );

  return formatUsdtUnitsTwoDecimals(
    units,
  );
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function SendUsdtPanel({
  userId,
  network,
  fromAddress,
  contractAddress,
  onTransferBroadcasted,
  onRecoveryRequested,
}: SendUsdtPanelProps) {
  const [
    step,
    setStep,
  ] =
    useState<SendStep>(
      "FORM",
    );

  const [
    recipientInput,
    setRecipientInput,
  ] =
    useState(
      "",
    );

  const [
    amountInput,
    setAmountInput,
  ] =
    useState(
      "",
    );

  const [
    resolvedRecipient,
    setResolvedRecipient,
  ] =
    useState<
      NonNullable<
        ResolveRecipientResponse["recipient"]
      > |
      null
    >(
      null,
    );

  const [
    quote,
    setQuote,
  ] =
    useState<
      NonNullable<
        TransferQuoteResponse["quote"]
      > |
      null
    >(
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
    txid,
    setTxid,
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
      false,
    );

  /*
   * Este error se conserva exclusivamente para
   * BROADCAST_UNKNOWN.
   *
   * En ese estado necesitamos mantener visible
   * el mensaje junto al TXID.
   */

  const [
    broadcastUnknownMessage,
    setBroadcastUnknownMessage,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  /*
   * Errores / advertencias normales del flujo.
   * Se muestran siempre en pantalla mediante AppModal.
   */

  const [
    sendModal,
    setSendModal,
  ] =
    useState<SendModalState | null>(
      null,
    );

  const [
    unlockGuard,
    setUnlockGuard,
  ] =
    useState<
      WalletUnlockGuardState |
      null
    >(
      null,
    );

  const [
    guardClock,
    setGuardClock,
  ] =
    useState(
      Date.now(),
    );

  const sendInProgressRef =
    useRef(
      false,
    );

  /*
   * ==========================================================
   * MODAL
   * ==========================================================
   */

  function showSendModal(
    message:
      string,

    title =
      "No pudimos continuar",

    variant:
      AppModalVariant =
      "error",
  ) {
    setSendModal({
      title,
      message,
      variant,
    });
  }

  function closeSendModal() {
    setSendModal(
      null,
    );
  }

  /*
   * ==========================================================
   * GUARD
   * ==========================================================
   */

  function getGuardIdentifier() {
    return {
      userId,

      network,

      addressBase58:
        fromAddress,
    };
  }

  useEffect(
    () => {
      try {
        const state =
          getWalletUnlockGuardState({
            userId,

            network,

            addressBase58:
              fromAddress,
          });

        setUnlockGuard(
          state,
        );
      } catch (
        guardError
      ) {
        console.error(
          "[WALLET UNLOCK GUARD]",
          guardError,
        );
      }
    },
    [
      userId,
      network,
      fromAddress,
    ],
  );

  useEffect(
    () => {
      if (
        !unlockGuard?.locked
      ) {
        return;
      }

      const timer =
        window.setInterval(
          () => {
            setGuardClock(
              Date.now(),
            );

            try {
              const state =
                getWalletUnlockGuardState({
                  userId,

                  network,

                  addressBase58:
                    fromAddress,
                });

              setUnlockGuard(
                state,
              );

              if (
                !state.locked
              ) {
                setWalletPassword(
                  "",
                );
              }
            } catch (
              guardError
            ) {
              console.error(
                "[WALLET UNLOCK GUARD TIMER]",
                guardError,
              );
            }
          },
          1000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      unlockGuard?.locked,
      userId,
      network,
      fromAddress,
    ],
  );

  void guardClock;

  /*
   * ==========================================================
   * RESET
   * ==========================================================
   */

  function resetFlow() {
    sendInProgressRef.current =
      false;

    setStep(
      "FORM",
    );

    setRecipientInput(
      "",
    );

    setAmountInput(
      "",
    );

    setResolvedRecipient(
      null,
    );

    setQuote(
      null,
    );

    setWalletPassword(
      "",
    );

    setTxid(
      null,
    );

    setBroadcastUnknownMessage(
      null,
    );

    setSendModal(
      null,
    );
  }

  /*
   * ==========================================================
   * PASO 1
   *
   * RESOLVER DESTINATARIO + COTIZAR
   * ==========================================================
   */

  async function handlePrepareTransfer(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSendModal(
      null,
    );

    setBroadcastUnknownMessage(
      null,
    );

    setLoading(
      true,
    );

    try {
      const amountUnits =
        parseUsdtToUnits(
          amountInput,
        );

      /*
       * ======================================================
       * RESOLVE RECIPIENT
       * ======================================================
       */

      const resolveResponse =
        await fetch(
          "/api/v1/wallet/resolve-recipient",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                recipient:
                  recipientInput,
              }),
          },
        );

      const resolveData =
        (
          await resolveResponse.json()
        ) as
          ResolveRecipientResponse;

      if (
        !resolveResponse.ok ||
        resolveData.success !==
          true ||
        !resolveData.recipient
      ) {
        throw new Error(
          resolveData.message ??
            "No se pudo resolver el destinatario.",
        );
      }

      if (
        resolveData
          .recipient
          .network !==
        network
      ) {
        throw new Error(
          "El destinatario pertenece a otra red TRON.",
        );
      }

      setResolvedRecipient(
        resolveData.recipient,
      );

      /*
       * ======================================================
       * QUOTE
       * ======================================================
       */

      const quoteResponse =
        await fetch(
          "/api/v1/wallet/transfer-quote",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                toAddress:
                  resolveData
                    .recipient
                    .addressBase58,

                amountUnits,
              }),
          },
        );

      const quoteData =
        (
          await quoteResponse.json()
        ) as
          TransferQuoteResponse;

      if (
        !quoteResponse.ok ||
        quoteData.success !==
          true ||
        !quoteData.quote
      ) {
        throw new Error(
          quoteData.message ??
            "No se pudo calcular la transferencia.",
        );
      }

      /*
       * ======================================================
       * VALIDACIONES DE INTEGRIDAD
       * ======================================================
       */

      if (
        quoteData
          .quote
          .network !==
        network
      ) {
        throw new Error(
          "La cotización corresponde a otra red.",
        );
      }

      if (
        quoteData
          .quote
          .fromAddress !==
        fromAddress
      ) {
        throw new Error(
          "La wallet emisora de la cotización no coincide con la wallet local.",
        );
      }

      if (
        quoteData
          .quote
          .contractAddress !==
        contractAddress
      ) {
        throw new Error(
          "El contrato USDT de la cotización no coincide con el configurado.",
        );
      }

      if (
        quoteData
          .quote
          .toAddress !==
        resolveData
          .recipient
          .addressBase58
      ) {
        throw new Error(
          "La dirección de destino cambió durante la cotización.",
        );
      }

      if (
        quoteData
          .quote
          .amount
          .units !==
        amountUnits
      ) {
        throw new Error(
          "El importe de la cotización no coincide con el solicitado.",
        );
      }

      setQuote(
        quoteData.quote,
      );

      setStep(
        "QUOTE",
      );
    } catch (
      prepareError
    ) {
      console.error(
        "[SEND PREPARE]",
        prepareError,
      );

      setResolvedRecipient(
        null,
      );

      setQuote(
        null,
      );

      showSendModal(
        getErrorMessage(
          prepareError,
          "No se pudo preparar la transferencia.",
        ),
        "No pudimos preparar la transferencia",
        "error",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  /*
   * ==========================================================
   * PASO 2
   *
   * ACEPTAR COTIZACIÓN
   * ==========================================================
   */

  function handleAcceptQuote() {
    setSendModal(
      null,
    );

    if (
      !quote
    ) {
      showSendModal(
        "La cotización ya no está disponible. Volvé a preparar la transferencia.",
        "La cotización venció",
        "warning",
      );

      return;
    }

    if (
      !quote.canProceed
    ) {
      showSendModal(
        "La wallet no dispone actualmente de recursos o TRX suficientes para cubrir esta transferencia.",
        "Recursos insuficientes",
        "warning",
      );

      return;
    }

    try {
      const guardState =
        getWalletUnlockGuardState(
          getGuardIdentifier(),
        );

      setUnlockGuard(
        guardState,
      );

      if (
        guardState.locked
      ) {
        showSendModal(
          "La wallet se encuentra temporalmente bloqueada por intentos fallidos de contraseña. Esperá a que finalice el bloqueo o recuperá el acceso con tus 12 palabras.",
          "Wallet temporalmente bloqueada",
          "warning",
        );

        return;
      }
    } catch (
      guardError
    ) {
      console.error(
        "[WALLET UNLOCK GUARD]",
        guardError,
      );

      showSendModal(
        "No se pudo comprobar el estado de seguridad local de la wallet.",
        "No pudimos verificar la wallet",
        "error",
      );

      return;
    }

    setWalletPassword(
      "",
    );

    setStep(
      "PASSWORD",
    );
  }

  /*
   * ==========================================================
   * PASO 3
   *
   * DESBLOQUEAR + FIRMAR + BROADCAST
   * ==========================================================
   */

  async function handleSignAndBroadcast(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      sendInProgressRef.current
    ) {
      return;
    }

    setSendModal(
      null,
    );

    if (
      !quote ||
      !resolvedRecipient
    ) {
      showSendModal(
        "Los datos preparados ya no están disponibles. Volvé a ingresar el destinatario y el importe.",
        "Prepará nuevamente la transferencia",
        "warning",
      );

      setStep(
        "FORM",
      );

      return;
    }

    if (
      !quote.canProceed
    ) {
      showSendModal(
        "La cotización ya no permite continuar. Verificá el saldo, TRX y recursos de la wallet.",
        "No podemos continuar",
        "warning",
      );

      setStep(
        "QUOTE",
      );

      return;
    }

    /*
     * ========================================================
     * VALIDACIÓN DE INTEGRIDAD ANTES DE FIRMAR
     * ========================================================
     */

    if (
      quote.network !==
        network ||
      quote.fromAddress !==
        fromAddress ||
      quote.contractAddress !==
        contractAddress ||
      quote.toAddress !==
        resolvedRecipient.addressBase58
    ) {
      showSendModal(
        "Los datos de la transferencia cambiaron. Por seguridad, prepará nuevamente la operación.",
        "Los datos cambiaron",
        "error",
      );

      setStep(
        "FORM",
      );

      return;
    }

    let guardState:
      WalletUnlockGuardState;

    try {
      guardState =
        getWalletUnlockGuardState(
          getGuardIdentifier(),
        );

      setUnlockGuard(
        guardState,
      );
    } catch (
      guardError
    ) {
      console.error(
        "[WALLET UNLOCK GUARD]",
        guardError,
      );

      showSendModal(
        "No se pudo verificar el estado de seguridad de la wallet.",
        "No pudimos verificar la wallet",
        "error",
      );

      return;
    }

    /*
     * ========================================================
     * BLOQUEO TEMPORAL
     * ========================================================
     */

    if (
      guardState.locked
    ) {
      setWalletPassword(
        "",
      );

      showSendModal(
        "La wallet continúa temporalmente bloqueada por intentos fallidos. Esperá a que finalice el tiempo de bloqueo antes de volver a intentar.",
        "Wallet temporalmente bloqueada",
        "warning",
      );

      return;
    }

    if (
      !walletPassword
    ) {
      showSendModal(
        "Ingresá la contraseña local que protege esta wallet.",
        "Ingresá tu contraseña",
        "warning",
      );

      return;
    }

    sendInProgressRef.current =
      true;

    try {
      setLoading(
        true,
      );

      /*
       * ======================================================
       * DESBLOQUEO LOCAL
       * ======================================================
       */

      let unlockedWallet:
        Awaited<
          ReturnType<
            typeof unlockStoredWallet
          >
        >;

      try {
        unlockedWallet =
          await unlockStoredWallet({
            userId,

            network,

            password:
              walletPassword,
          });
      } catch (
        unlockError
      ) {
        setWalletPassword(
          "",
        );

        /*
         * Solamente este error cuenta como
         * intento fallido.
         */

        if (
          isWalletCredentialError(
            unlockError,
          )
        ) {
          const failedState =
            registerWalletUnlockFailure(
              getGuardIdentifier(),
            );

          setUnlockGuard(
            failedState,
          );

          /*
           * Tercer intento:
           * entra en bloqueo temporal.
           */

          if (
            failedState.locked
          ) {
            showSendModal(
              "Se alcanzó el máximo de intentos permitidos. La wallet fue bloqueada temporalmente en este dispositivo. Tus fondos y la wallet no fueron modificados.",
              "Wallet temporalmente bloqueada",
              "warning",
            );
          } else {
            const remaining =
              failedState.attemptsRemaining;

            showSendModal(
              remaining ===
                1
                ? "La contraseña de la wallet es incorrecta. Te queda 1 intento antes del bloqueo temporal."
                : `La contraseña de la wallet es incorrecta. Te quedan ${remaining} intentos antes del bloqueo temporal.`,
              "Contraseña incorrecta",
              "error",
            );
          }

          return;
        }

        /*
         * Otros errores no consumen intentos.
         */

        throw unlockError;
      }

      /*
       * ======================================================
       * CONTRASEÑA CORRECTA
       * ======================================================
       */

      const successState =
        registerWalletUnlockSuccess(
          getGuardIdentifier(),
        );

      setUnlockGuard(
        successState,
      );

      /*
       * Confirmamos que la wallet desbloqueada
       * sea exactamente la emisora registrada.
       */

      if (
        unlockedWallet
          .addressBase58 !==
        fromAddress
      ) {
        throw new Error(
          "La wallet local desbloqueada no coincide con la wallet registrada.",
        );
      }

      setWalletPassword(
        "",
      );

      setStep(
        "BROADCASTING",
      );

      /*
       * ======================================================
       * CONSTRUIR Y FIRMAR LOCALMENTE
       * ======================================================
       */

      const signed =
        await buildAndSignUsdtTransfer({
          network,

          fromAddress:
            quote.fromAddress,

          toAddress:
            quote.toAddress,

          contractAddress:
            quote.contractAddress,

          amountUnits:
            quote
              .amount
              .units,

          feeLimitSun:
            quote
              .feeLimitSun,

          privateKey:
            unlockedWallet
              .privateKey,
        });

      /*
       * ======================================================
       * BROADCAST
       * ======================================================
       */

      let broadcastResponse:
        Response;

      try {
        broadcastResponse =
          await fetch(
            "/api/v1/wallet/broadcast",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  signedTransaction:
                    signed
                      .signedTransaction,
                }),
            },
          );
      } catch (
        broadcastNetworkError
      ) {
        console.error(
          "[SEND BROADCAST NETWORK]",
          broadcastNetworkError,
        );

        /*
         * A partir de este punto NO debemos asumir
         * que la operación falló.
         *
         * El servidor pudo haber recibido y enviado
         * la transacción antes de cortarse la conexión.
         */

        setTxid(
          signed.txid,
        );

        setBroadcastUnknownMessage(
          "No pudimos confirmar la respuesta del broadcast. La transacción podría haber sido recibida por TRON. Verificá el TXID antes de intentar otro envío.",
        );

        setStep(
          "BROADCAST_UNKNOWN",
        );

        return;
      }

      /*
       * ======================================================
       * PARSE RESPONSE
       * ======================================================
       */

      let broadcastData:
        BroadcastResponse;

      try {
        broadcastData =
          (
            await broadcastResponse
              .json()
          ) as
            BroadcastResponse;
      } catch (
        broadcastParseError
      ) {
        console.error(
          "[SEND BROADCAST RESPONSE]",
          broadcastParseError,
        );

        setTxid(
          signed.txid,
        );

        setBroadcastUnknownMessage(
          "El servidor respondió al broadcast pero no pudimos interpretar la respuesta. Verificá el TXID antes de intentar otro envío.",
        );

        setStep(
          "BROADCAST_UNKNOWN",
        );

        return;
      }

      /*
       * ======================================================
       * RESPUESTA NEGATIVA
       * ======================================================
       */

      if (
        !broadcastResponse.ok ||
        broadcastData.success !==
          true ||
        !broadcastData.broadcast
      ) {
        const explicitRejection =
          broadcastData.code ===
            "TRON_BROADCAST_REJECTED";

        /*
         * Un 5xx sin rechazo explícito es ambiguo.
         */

        if (
          broadcastResponse.status >=
            500 &&
          !explicitRejection
        ) {
          setTxid(
            signed.txid,
          );

          setBroadcastUnknownMessage(
            broadcastData.message ??
              "No pudimos confirmar si TRON aceptó la transacción. Verificá el TXID antes de intentar otro envío.",
          );

          setStep(
            "BROADCAST_UNKNOWN",
          );

          return;
        }

        /*
         * Rechazo explícito.
         */

        throw new Error(
          broadcastData.message ??
            "TRON rechazó la transferencia.",
        );
      }

      /*
       * ======================================================
       * VALIDAR RESPUESTA DEL BROADCAST
       * ======================================================
       */

      const broadcast =
        broadcastData.broadcast;

      const responseMatchesSignedTransfer =
        broadcast.accepted ===
          true &&
        broadcast.txid ===
          signed.txid &&
        broadcast.network ===
          network &&
        broadcast.fromAddress ===
          signed.fromAddress &&
        broadcast.toAddress ===
          signed.toAddress &&
        broadcast.contractAddress ===
          signed.contractAddress &&
        broadcast.amountUnits ===
          signed.amountUnits &&
        broadcast.feeLimitSun ===
          signed.feeLimitSun &&
        broadcast.status ===
          "BROADCASTED";

      if (
        !responseMatchesSignedTransfer
      ) {
        setTxid(
          signed.txid,
        );

        setBroadcastUnknownMessage(
          "La respuesta del broadcast no coincide completamente con la transacción firmada. Verificá el TXID antes de realizar otro envío.",
        );

        setStep(
          "BROADCAST_UNKNOWN",
        );

        return;
      }

      /*
       * ======================================================
       * SUCCESS
       * ======================================================
       */

      setTxid(
        signed.txid,
      );

      setBroadcastUnknownMessage(
        null,
      );

      setStep(
        "SUCCESS",
      );

      if (
        onTransferBroadcasted
      ) {
        try {
          await onTransferBroadcasted(
            signed.txid,
          );
        } catch (
          callbackError
        ) {
          console.error(
            "[SEND POST-BROADCAST REFRESH]",
            callbackError,
          );
        }
      }
    } catch (
      sendError
    ) {
      console.error(
        "[SEND USDT]",
        sendError,
      );

      setWalletPassword(
        "",
      );

      showSendModal(
        getErrorMessage(
          sendError,
          "No se pudo realizar la transferencia.",
        ),
        "No pudimos enviar la transferencia",
        "error",
      );

      setStep(
        "QUOTE",
      );
    } finally {
      sendInProgressRef.current =
        false;

      setLoading(
        false,
      );
    }
  }

  /*
   * ==========================================================
   * BLOQUEO
   * ==========================================================
   */

  const walletLocked =
    unlockGuard?.locked ===
      true;

  const remainingLockText =
    walletLocked &&
    unlockGuard
      ? formatWalletUnlockRemainingTime(
          unlockGuard.remainingLockMs,
        )
      : null;

  /*
   * ==========================================================
   * STEPPER
   * ==========================================================
   */

  const stepOneDone =
    step !==
      "FORM";

  const stepTwoActive =
    step ===
      "QUOTE";

  const stepTwoDone =
    step ===
      "PASSWORD" ||
    step ===
      "BROADCASTING" ||
    step ===
      "BROADCAST_UNKNOWN" ||
    step ===
      "SUCCESS";

  const stepThreeActive =
    step ===
      "PASSWORD";

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(14,25,45,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        {/*
         * ======================================================
         * HEADER
         * ======================================================
         */}

        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-300">
              <Send className="h-[19px] w-[19px]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-[#dee2f6]">
                  Enviar USDT
                </h2>

                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-cyan-300">
                  TRC20
                </span>
              </div>

              <p className="mt-1 max-w-lg text-[11px] leading-5 text-[#849495]">
                La operación se firma en este dispositivo. Tu clave privada nunca sale del navegador.
              </p>
            </div>
          </div>

          {step !==
            "FORM" &&
            step !==
              "SUCCESS" &&
            step !==
              "BROADCAST_UNKNOWN" &&
            step !==
              "BROADCASTING" && (
            <button
              type="button"
              onClick={
                resetFlow
              }
              disabled={
                loading
              }
              title="Cancelar operación"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#252a39] text-[#849495] transition hover:text-white disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-5">
          {/*
           * ====================================================
           * STEPPER
           * ====================================================
           */}

          {step !==
            "SUCCESS" &&
            step !==
              "BROADCAST_UNKNOWN" &&
            step !==
              "BROADCASTING" && (
            <div className="mb-6">
              <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center">
                <div
                  className={
                    step ===
                      "FORM"
                      ? "flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-[11px] font-bold text-[#001f22] shadow-[0_0_18px_rgba(0,220,230,0.28)]"
                      : "flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-[11px] font-bold text-emerald-300"
                  }
                >
                  {stepOneDone
                    ? "✓"
                    : "1"}
                </div>

                <div
                  className={
                    stepOneDone
                      ? "mx-2 h-px bg-gradient-to-r from-emerald-400/45 to-cyan-400/30"
                      : "mx-2 h-px bg-white/[0.08]"
                  }
                />

                <div
                  className={
                    stepTwoActive
                      ? "flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-[11px] font-bold text-[#001f22] shadow-[0_0_18px_rgba(0,220,230,0.28)]"
                      : stepTwoDone
                        ? "flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-[11px] font-bold text-emerald-300"
                        : "flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.10] bg-[#1a1f2e] text-[11px] text-[#849495]"
                  }
                >
                  {stepTwoDone
                    ? "✓"
                    : "2"}
                </div>

                <div
                  className={
                    stepTwoDone
                      ? "mx-2 h-px bg-gradient-to-r from-emerald-400/45 to-cyan-400/30"
                      : "mx-2 h-px bg-white/[0.08]"
                  }
                />

                <div
                  className={
                    stepThreeActive
                      ? "flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-[11px] font-bold text-[#001f22] shadow-[0_0_18px_rgba(0,220,230,0.28)]"
                      : "flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.10] bg-[#1a1f2e] text-[11px] text-[#849495]"
                  }
                >
                  3
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-[#849495]">
                <span>
                  Datos
                </span>

                <span>
                  Revisar
                </span>

                <span>
                  Confirmar
                </span>
              </div>
            </div>
          )}

          {/*
           * ====================================================
           * FORM
           * ====================================================
           */}

          {step ===
            "FORM" && (
            <form
              onSubmit={
                handlePrepareTransfer
              }
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-xs font-medium text-[#dee2f6]">
                  Destinatario
                </label>

                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#849495]" />

                  <input
                    type="text"
                    value={
                      recipientInput
                    }
                    onChange={(
                      event,
                    ) =>
                      setRecipientInput(
                        event.target.value,
                      )
                    }
                    disabled={
                      loading
                    }
                    autoComplete="off"
                    required
                    placeholder="Email, usuario o dirección TRON"
                    className="w-full rounded-xl border border-white/[0.10] bg-[#090e1c]/80 py-3 pl-10 pr-4 text-sm text-[#dee2f6] outline-none transition placeholder:text-[#657476] focus:border-cyan-400 disabled:opacity-60"
                  />
                </div>

                <p className="mt-2 text-[10px] leading-5 text-[#657476]">
                  Podés enviar a otro usuario de la plataforma o directamente a una dirección TRON.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[#dee2f6]">
                  Importe
                </label>

                <div className="relative overflow-hidden rounded-xl border border-white/[0.10] bg-[#090e1c]/80 transition focus-within:border-cyan-400 focus-within:shadow-[0_0_0_3px_rgba(0,220,230,0.08)]">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      amountInput
                    }
                    onChange={(
                      event,
                    ) => {
                      const value =
                        event.target.value;

                      /*
                       * Sólo permitimos números,
                       * punto y coma.
                       *
                       * La validación definitiva
                       * ocurre antes de cotizar.
                       */

                      if (
                        /^[0-9.,]*$/.test(
                          value,
                        )
                      ) {
                        setAmountInput(
                          value,
                        );
                      }
                    }}
                    onBlur={() => {
                      if (
                        !amountInput.trim()
                      ) {
                        return;
                      }

                      try {
                        setAmountInput(
                          formatVisibleUsdtInput(
                            amountInput,
                          ),
                        );
                      } catch {
                        /*
                         * No mostramos error por blur.
                         *
                         * El error formal aparece al
                         * intentar revisar la transferencia.
                         */
                      }
                    }}
                    disabled={
                      loading
                    }
                    autoComplete="off"
                    required
                    placeholder="0,00"
                    className="w-full border-0 bg-transparent px-4 py-3 pr-20 text-[22px] font-semibold text-[#dee2f6] outline-none placeholder:text-[#404a50] disabled:opacity-60"
                  />

                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-emerald-300">
                    USDT
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#1a1f2e]/75 p-3.5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />

                  <p className="text-[10px] leading-5 text-[#849495]">
                    Antes de firmar vas a poder revisar el destinatario, importe y costo estimado de red.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  loading
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00a9d9] to-[#00dce6] px-4 py-3 text-sm font-semibold text-[#002022] shadow-[0_8px_24px_-6px_rgba(0,220,230,0.42)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />

                    Calculando...
                  </>
                ) : (
                  <>
                    Revisar transferencia

                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/*
           * ====================================================
           * QUOTE
           * ====================================================
           */}

          {step ===
            "QUOTE" &&
            quote &&
            resolvedRecipient && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.10] to-cyan-400/[0.03] p-5">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl" />

                <p className="relative text-[10px] uppercase tracking-[0.08em] text-[#849495]">
                  Vas a enviar
                </p>

                <div className="relative mt-2 flex items-baseline gap-2">
                  <p className="text-[32px] font-bold tracking-[-0.03em] text-[#dee2f6]">
                    {
                      formatUsdtUnitsTwoDecimals(
                        quote
                          .amount
                          .units,
                      )
                    }
                  </p>

                  <span className="text-sm font-semibold text-emerald-300">
                    USDT
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#1a1f2e]/75 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <UserRound className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-[#849495]">
                      Destinatario
                    </p>

                    {resolvedRecipient.internal &&
                      resolvedRecipient
                        .user
                        ?.name && (
                      <p className="mt-1 text-sm font-medium text-[#dee2f6]">
                        {
                          resolvedRecipient
                            .user
                            .name
                        }
                      </p>
                    )}

                    <p className="mt-1 break-all font-mono text-[11px] leading-5 text-[#b9cacb]">
                      {
                        quote
                          .toAddress
                      }
                    </p>

                    {resolvedRecipient.internal && (
                      <span className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-medium text-cyan-300">
                        Usuario interno
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-white/[0.06] bg-[#1a1f2e]/60 p-3">
                  <p className="text-[9px] uppercase tracking-wide text-[#657476]">
                    Red
                  </p>

                  <p className="mt-1.5 text-xs font-medium text-[#dee2f6]">
                    {quote.network} · TRC20
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#1a1f2e]/60 p-3">
                  <p className="text-[9px] uppercase tracking-wide text-[#657476]">
                    Saldo
                  </p>

                  <p className="mt-1.5 text-xs font-medium text-[#dee2f6]">
                    {
                      formatUsdtUnitsTwoDecimals(
                        quote
                          .balance
                          .usdtUnits,
                      )
                    }{" "}
                    USDT
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#1a1f2e]/60 p-3">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-cyan-300" />

                    <p className="text-[9px] uppercase tracking-wide text-[#657476]">
                      Energy
                    </p>
                  </div>

                  <p className="mt-1.5 text-xs font-medium text-[#dee2f6]">
                    {
                      quote
                        .resources
                        .energyAvailable
                    }
                  </p>

                  <p className="mt-1 text-[9px] text-[#657476]">
                    Est.:{" "}
                    {quote
                      .resources
                      .estimatedEnergy ??
                      "N/D"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#1a1f2e]/60 p-3">
                  <p className="text-[9px] uppercase tracking-wide text-[#657476]">
                    Costo estimado
                  </p>

                  <p className="mt-1.5 text-xs font-medium text-[#dee2f6]">
                    {quote
                      .networkCost
                      .estimatedTrx !==
                    null
                      ? `${quote.networkCost.estimatedTrx} TRX`
                      : "N/D"}
                  </p>

                  <p className="mt-1 text-[9px] text-[#657476]">
                    Saldo:{" "}
                    {
                      quote
                        .balance
                        .formattedTrx
                    }{" "}
                    TRX
                  </p>
                </div>
              </div>

              {!quote.canProceed && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-950/15 p-3.5 text-xs leading-5 text-amber-200">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />

                  <p>
                    La wallet no dispone actualmente de TRX o recursos suficientes para cubrir el costo estimado.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={
                    resetFlow
                  }
                  disabled={
                    loading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#252a39] px-4 py-3 text-xs font-medium text-[#b9cacb] transition hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />

                  Modificar
                </button>

                <button
                  type="button"
                  onClick={
                    handleAcceptQuote
                  }
                  disabled={
                    loading ||
                    !quote.canProceed
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00a9d9] to-[#00dce6] px-4 py-3 text-xs font-semibold text-[#002022] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continuar

                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/*
           * ====================================================
           * PASSWORD
           * ====================================================
           */}

          {step ===
            "PASSWORD" &&
            quote && (
            <div className="space-y-4">
              {walletLocked ? (
                <>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-950/15 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                        <Clock3 className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-[#dee2f6]">
                          Wallet temporalmente bloqueada
                        </h3>

                        <p className="mt-1.5 text-[11px] leading-5 text-[#b9cacb]">
                          Se alcanzó el máximo de intentos de contraseña permitidos.
                        </p>

                        {remainingLockText && (
                          <p className="mt-3 text-xs font-medium text-amber-300">
                            Podrás volver a intentar en{" "}
                            {remainingLockText}.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-[#1a1f2e]/65 p-3.5">
                    <div className="flex gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />

                      <p className="text-[10px] leading-5 text-[#849495]">
                        El bloqueo solamente afecta nuevos intentos de contraseña en este dispositivo. La wallet y los fondos no fueron modificados.
                      </p>
                    </div>
                  </div>

                  {onRecoveryRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        setWalletPassword(
                          "",
                        );

                        setSendModal(
                          null,
                        );

                        onRecoveryRequested();
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/15"
                    >
                      <RotateCcw className="h-4 w-4" />

                      Recuperar acceso con mis 12 palabras
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setStep(
                        "QUOTE",
                      );

                      setSendModal(
                        null,
                      );
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#252a39] px-4 py-3 text-xs text-[#b9cacb]"
                  >
                    <ArrowLeft className="h-4 w-4" />

                    Volver
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                        <KeyRound className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#dee2f6]">
                          Autorizar transferencia
                        </p>

                        <p className="mt-1 text-[10px] leading-5 text-[#849495]">
                          Ingresá la contraseña que protege esta wallet. Nunca se envía al servidor.
                        </p>
                      </div>
                    </div>
                  </div>

                  {unlockGuard &&
                    unlockGuard.failedAttempts >
                      0 && (
                    <div className="rounded-xl border border-amber-400/20 bg-amber-950/15 px-4 py-3">
                      <p className="text-[11px] text-amber-300">
                        {unlockGuard.attemptsRemaining ===
                        1
                          ? "Queda 1 intento antes del bloqueo temporal."
                          : `Quedan ${unlockGuard.attemptsRemaining} intentos antes del bloqueo temporal.`}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/[0.06] bg-[#1a1f2e]/65 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-[#849495]">
                      Estás autorizando
                    </p>

                    <p className="mt-2 text-[26px] font-bold tracking-tight text-[#dee2f6]">
                      {
                        formatUsdtUnitsTwoDecimals(
                          quote
                            .amount
                            .units,
                        )
                      }{" "}
                      <span className="text-sm text-emerald-300">
                        USDT
                      </span>
                    </p>

                    <p className="mt-2 break-all font-mono text-[10px] leading-5 text-[#849495]">
                      a{" "}
                      {
                        quote
                          .toAddress
                      }
                    </p>
                  </div>

                  <form
                    onSubmit={
                      handleSignAndBroadcast
                    }
                    className="space-y-4"
                  >
                    <div>
                      <label className="mb-2 block text-xs font-medium text-[#dee2f6]">
                        Contraseña de la wallet
                      </label>

                      <input
                        type="password"
                        autoComplete="current-password"
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
                        required
                        autoFocus
                        disabled={
                          loading
                        }
                        className="w-full rounded-xl border border-white/[0.10] bg-[#090e1c]/80 px-4 py-3 text-sm text-[#dee2f6] outline-none transition focus:border-cyan-400 disabled:opacity-60"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setWalletPassword(
                            "",
                          );

                          setStep(
                            "QUOTE",
                          );

                          setSendModal(
                            null,
                          );
                        }}
                        disabled={
                          loading
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#252a39] px-4 py-3 text-xs font-medium text-[#b9cacb]"
                      >
                        <ArrowLeft className="h-4 w-4" />

                        Volver
                      </button>

                      <button
                        type="submit"
                        disabled={
                          loading
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00a9d9] to-[#00dce6] px-4 py-3 text-xs font-semibold text-[#002022] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />

                            Verificando...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />

                            Firmar y enviar
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/*
           * ====================================================
           * BROADCASTING
           * ====================================================
           */}

          {step ===
            "BROADCASTING" && (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_30px_rgba(0,220,230,0.10)]">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
              </div>

              <p className="mt-5 text-sm font-semibold text-[#dee2f6]">
                Firmando y enviando
              </p>

              <p className="mt-2 max-w-xs text-[10px] leading-5 text-[#849495]">
                No cierres esta ventana hasta que la red TRON responda.
              </p>
            </div>
          )}

          {/*
           * ====================================================
           * BROADCAST UNKNOWN
           * ====================================================
           */}

          {step ===
            "BROADCAST_UNKNOWN" &&
            txid && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-950/15 p-4">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />

                  <div>
                    <p className="text-sm font-semibold text-amber-200">
                      Estado sin confirmar
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-amber-200/70">
                      La transacción podría haber sido recibida por TRON. No vuelvas a enviarla hasta verificar el TXID.
                    </p>
                  </div>
                </div>
              </div>

              {broadcastUnknownMessage && (
                <div className="rounded-xl border border-amber-400/15 bg-amber-950/10 p-3.5">
                  <p className="text-[11px] leading-5 text-amber-100/80">
                    {
                      broadcastUnknownMessage
                    }
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-white/[0.06] bg-[#1a1f2e]/65 p-4">
                <p className="text-[9px] uppercase tracking-wide text-[#657476]">
                  TXID para verificar
                </p>

                <p className="mt-2 break-all font-mono text-[10px] leading-5 text-[#b9cacb]">
                  {txid}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  resetFlow
                }
                className="w-full rounded-xl border border-white/[0.08] bg-[#252a39] px-4 py-3 text-xs text-[#b9cacb]"
              >
                Ya verifiqué el TXID
              </button>
            </div>
          )}

          {/*
           * ====================================================
           * SUCCESS
           * ====================================================
           */}

          {step ===
            "SUCCESS" &&
            txid && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-950/15 px-5 py-7 text-center">
                <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10">
                  <CheckCircle2 className="h-7 w-7 text-emerald-300" />
                </div>

                <h3 className="relative mt-4 text-base font-semibold text-[#dee2f6]">
                  Transacción enviada
                </h3>

                <p className="relative mt-2 text-[10px] leading-5 text-[#849495]">
                  TRON aceptó el broadcast. La confirmación definitiva ocurrirá on-chain.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#1a1f2e]/65 p-4">
                <p className="text-[9px] uppercase tracking-wide text-[#657476]">
                  TXID
                </p>

                <p className="mt-2 break-all font-mono text-[10px] leading-5 text-[#b9cacb]">
                  {txid}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  resetFlow
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00a9d9] to-[#00dce6] px-4 py-3 text-xs font-semibold text-[#002022]"
              >
                <Send className="h-4 w-4" />

                Realizar otra transferencia
              </button>
            </div>
          )}
        </div>

        {/*
         * ======================================================
         * FOOTER
         * ======================================================
         */}

        {step ===
          "FORM" && (
          <div className="border-t border-white/[0.05] bg-[#090e1c]/45 px-5 py-3">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />

              <p className="text-[9px] tracking-wide text-[#657476]">
                Firma local · Clave privada protegida en este dispositivo
              </p>
            </div>
          </div>
        )}
      </section>

      {/*
       * ========================================================
       * MODAL
       * ========================================================
       */}

      <AppModal
        open={
          sendModal !==
          null
        }
        variant={
          sendModal
            ?.variant ??
          "error"
        }
        title={
          sendModal
            ?.title ??
          "No pudimos continuar"
        }
        message={
          sendModal
            ?.message ??
          ""
        }
        confirmLabel="Entendido"
        onClose={
          closeSendModal
        }
      />
    </>
  );
}