"use client";

import {
  FormEvent,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Send,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  unlockStoredWallet,
} from "@/lib/wallet/wallet-storage.client";

import type {
  WalletNetwork,
} from "@/lib/wallet/wallet-storage.client";

import {
  buildAndSignUsdtTransfer,
} from "@/lib/wallet/tron-transaction.client";

/*
 * ============================================================
 * PROPS
 * ============================================================
 */

interface SendUsdtPanelProps {
  userId:
    string;

  network:
    WalletNetwork;

  fromAddress:
    string;

  contractAddress:
    string;

  onTransferBroadcasted?:
    (
      txid:
        string,
    ) => void | Promise<void>;
}

/*
 * ============================================================
 * RESPUESTAS API
 * ============================================================
 */

interface ResolveRecipientResponse {
  success:
    boolean;

  recipient?: {
    type:
      "TRON_ADDRESS" |
      "INTERNAL_USER";

    address:
      string;

    addressBase58:
      string;

    network:
      WalletNetwork;

    internal:
      boolean;

    user:
      {
        id:
          string;

        name:
          string |
          null;

        username:
          string |
          null;
      } |
      null;
  };

  code?:
    string;

  message?:
    string;
}

interface TransferQuoteResponse {
  success:
    boolean;

  quote?: {
    network:
      WalletNetwork;

    asset:
      "USDT";

    tokenStandard:
      "TRC20";

    contractAddress:
      string;

    fromAddress:
      string;

    toAddress:
      string;

    amount: {
      units:
        string;

      formatted:
        string;

      decimals:
        number;

      scale:
        string;
    };

    balance: {
      usdtUnits:
        string;

      formattedUsdt:
        string;

      trxSun:
        string;

      formattedTrx:
        string;
    };

    resources: {
      energyAvailable:
        string;

      bandwidthAvailable:
        string;

      estimatedEnergy:
        string |
        null;

      energyDeficit:
        string |
        null;

      energyPriceSun:
        string;
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

    feeLimitSun:
      number;

    platformFee: {
      enabled:
        boolean;

      usdtUnits:
        string;

      formattedUsdt:
        string;
    };

    canProceed:
      boolean;
  };

  code?:
    string;

  message?:
    string;
}

interface BroadcastResponse {
  success:
    boolean;

  broadcast?: {
    accepted:
      boolean;

    txid:
      string;

    network:
      WalletNetwork;

    fromAddress:
      string;

    toAddress:
      string;

    amountUnits:
      string;

    contractAddress:
      string;

    feeLimitSun:
      number;

    status:
      "BROADCASTED";
  };

  code?:
    string;

  message?:
    string;
}

/*
 * ============================================================
 * ESTADO DEL FLUJO
 * ============================================================
 */

type SendStep =
  | "FORM"
  | "QUOTE"
  | "PASSWORD"
  | "BROADCASTING"
  | "BROADCAST_UNKNOWN"
  | "SUCCESS";

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

/*
 * Convierte texto decimal USDT a unidades mínimas.
 *
 * Ejemplos:
 *
 * "1"       -> "1000000"
 * "1,5"     -> "1500000"
 * "1.5"     -> "1500000"
 * "0,000001" -> "1"
 *
 * No usamos float.
 */
function parseUsdtToUnits(
  input:
    string,
): string {
  const normalized =
    input
      .trim()
      .replace(
        ",",
        ".",
      );

  if (
    !/^\d+(?:\.\d{0,6})?$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "Ingresá un importe USDT válido con hasta 6 decimales.",
    );
  }

  const [
    integerPart,
    decimalPart =
      "",
  ] =
    normalized.split(
      ".",
    );

  const decimals =
    decimalPart
      .padEnd(
        6,
        "0",
      );

  const units =
    BigInt(
      integerPart,
    ) *
      1_000_000n +
    BigInt(
      decimals ||
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

function shortenAddress(
  address:
    string,
): string {
  if (
    address.length <
    22
  ) {
    return address;
  }

  return `${address.slice(
    0,
    10,
  )}...${address.slice(
    -10,
  )}`;
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

  /*
   * Guardia síncrona contra doble submit.
   *
   * React deshabilita el botón mediante "loading", pero useRef
   * evita que dos eventos muy próximos entren al flujo antes
   * de que ocurra el siguiente render.
   */
  const sendInProgressRef =
    useRef(
      false,
    );

  /*
   * ==========================================================
   * REINICIAR
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

    setError(
      null,
    );
  }

  /*
   * ==========================================================
   * PASO 1
   * RESOLVER DESTINATARIO + COTIZAR
   * ==========================================================
   */

  async function handlePrepareTransfer(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(
      null,
    );

    setLoading(
      true,
    );

    try {
      /*
       * Importe decimal visible
       * →
       * unidades mínimas USDT.
       */
      const amountUnits =
        parseUsdtToUnits(
          amountInput,
        );

      /*
       * ======================================================
       * RESOLVER DESTINATARIO
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
       * COTIZAR TRANSFERENCIA
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
       * Validaciones adicionales del cliente.
       *
       * El backend también valida, pero no confiamos
       * únicamente en una sola capa.
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

      setError(
        getErrorMessage(
          prepareError,
          "No se pudo preparar la transferencia.",
        ),
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
   * ACEPTAR COTIZACIÓN
   * ==========================================================
   */

  function handleAcceptQuote() {
    setError(
      null,
    );

    if (
      !quote
    ) {
      setError(
        "La cotización ya no está disponible.",
      );

      return;
    }

    if (
      !quote.canProceed
    ) {
      setError(
        "La wallet no dispone de recursos/TRX suficientes para esta transferencia.",
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
   * DESBLOQUEAR + FIRMAR + BROADCAST
   * ==========================================================
   */

  async function handleSignAndBroadcast(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    /*
     * Evita doble firma / doble broadcast por doble submit.
     */
    if (
      sendInProgressRef.current
    ) {
      return;
    }

    setError(
      null,
    );

    if (
      !quote ||
      !resolvedRecipient
    ) {
      setError(
        "La transferencia debe volver a prepararse.",
      );

      setStep(
        "FORM",
      );

      return;
    }

    if (
      !quote.canProceed
    ) {
      setError(
        "La cotización ya no permite continuar con esta transferencia.",
      );

      setStep(
        "QUOTE",
      );

      return;
    }

    /*
     * Revalidamos los datos públicos inmediatamente antes
     * de desbloquear y firmar.
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
      setError(
        "Los datos de la transferencia cambiaron. Prepará nuevamente la operación.",
      );

      setStep(
        "FORM",
      );

      return;
    }

    if (
      !walletPassword
    ) {
      setError(
        "Ingresá la contraseña de tu wallet.",
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
       * DESBLOQUEAR VAULT LOCAL
       * ======================================================
       *
       * Esta operación ocurre en el navegador.
       *
       * La contraseña NO se envía al backend.
       * La private key NO se envía al backend.
       */

      const unlockedWallet =
        await unlockStoredWallet({
          userId,
          network,
          password:
            walletPassword,
        });

      if (
        unlockedWallet
          .addressBase58 !==
        fromAddress
      ) {
        throw new Error(
          "La wallet local desbloqueada no coincide con la wallet registrada.",
        );
      }

      /*
       * Quitamos la contraseña del estado React
       * inmediatamente después de desbloquear.
       */
      setWalletPassword(
        "",
      );

      /*
       * ======================================================
       * FIRMA LOCAL
       * ======================================================
       */

      setStep(
        "BROADCASTING",
      );

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
       * A partir de acá existe una transacción firmada con TXID.
       *
       * Si perdemos la respuesta HTTP después de este punto,
       * NO debemos asumir que la red no la recibió.
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

        setTxid(
          signed.txid,
        );

        setError(
          "No pudimos confirmar la respuesta del broadcast. La transacción podría haber sido recibida por TRON. Verificá el TXID antes de intentar otro envío.",
        );

        setStep(
          "BROADCAST_UNKNOWN",
        );

        return;
      }

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

        setError(
          "El servidor respondió al broadcast pero la respuesta no pudo interpretarse. Verificá el TXID antes de intentar otro envío.",
        );

        setStep(
          "BROADCAST_UNKNOWN",
        );

        return;
      }

      if (
        !broadcastResponse.ok ||
        broadcastData.success !==
          true ||
        !broadcastData.broadcast
      ) {
        /*
         * Un rechazo explícito de TRON o un error 4xx ocurre
         * sin un broadcast aceptado.
         *
         * Para errores inesperados 5xx somos conservadores:
         * la solicitud pudo haber llegado a la red antes de
         * perderse la respuesta.
         */
        const explicitRejection =
          broadcastData.code ===
            "TRON_BROADCAST_REJECTED";

        if (
          broadcastResponse.status >=
            500 &&
          !explicitRejection
        ) {
          setTxid(
            signed.txid,
          );

          setError(
            broadcastData.message ??
              "No pudimos confirmar si TRON aceptó la transacción. Verificá el TXID antes de intentar otro envío.",
          );

          setStep(
            "BROADCAST_UNKNOWN",
          );

          return;
        }

        throw new Error(
          broadcastData.message ??
            "TRON rechazó la transferencia.",
        );
      }

      const broadcast =
        broadcastData.broadcast;

      /*
       * Verificamos que la respuesta corresponda exactamente
       * a la transacción que acabamos de firmar.
       *
       * Si alguno de estos datos no coincide, no habilitamos
       * un nuevo envío automáticamente porque el broadcast
       * ya pudo haber sido aceptado.
       */
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

        setError(
          "La respuesta del broadcast no coincide completamente con la transacción firmada. Verificá el TXID antes de realizar otro envío.",
        );

        setStep(
          "BROADCAST_UNKNOWN",
        );

        return;
      }

      setTxid(
        signed.txid,
      );

      setStep(
        "SUCCESS",
      );

      /*
       * Este callback es solamente una actualización auxiliar
       * de UI/datos.
       *
       * Si falla, NO puede transformar un broadcast exitoso
       * en un error de transferencia ni habilitar un reenvío.
       */
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

      /*
       * Este catch solamente cubre errores donde todavía
       * sabemos que no existe un broadcast aceptado/ambiguo.
       */
      setWalletPassword(
        "",
      );

      setError(
        getErrorMessage(
          sendError,
          "No se pudo realizar la transferencia.",
        ),
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
   * RENDER
   * ==========================================================
   */

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-3">
            <Send className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <h2 className="text-lg text-slate-900">
              Enviar USDT
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              La transferencia se firma en este dispositivo. Tu clave privada nunca se envía al servidor.
            </p>
          </div>
        </div>

        {step !==
          "FORM" &&
          step !==
            "SUCCESS" &&
          step !==
            "BROADCAST_UNKNOWN" && (
            <button
              type="button"
              onClick={
                resetFlow
              }
              disabled={
                loading
              }
              title="Cancelar"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

          <span>
            {error}
          </span>
        </div>
      )}

      {/*
       * ======================================================
       * PASO 1 - DATOS
       * ======================================================
       */}

      {step ===
        "FORM" && (
        <form
          onSubmit={
            handlePrepareTransfer
          }
          className="mt-6 space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm text-slate-700">
              Destinatario
            </label>

            <input
              type="text"
              value={
                recipientInput
              }
              onChange={(
                event,
              ) =>
                setRecipientInput(
                  event
                    .target
                    .value,
                )
              }
              disabled={
                loading
              }
              autoComplete="off"
              required
              placeholder="Email, usuario o dirección TRON"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-50"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Podés enviar a otro usuario de la plataforma o directamente a una dirección TRON.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-700">
              Importe USDT
            </label>

            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={
                  amountInput
                }
                onChange={(
                  event,
                ) =>
                  setAmountInput(
                    event
                      .target
                      .value,
                  )
                }
                disabled={
                  loading
                }
                autoComplete="off"
                required
                placeholder="0,00"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-16 text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-50"
              />

              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
                USDT
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Hasta 6 decimales.
            </p>
          </div>

          <button
            type="submit"
            disabled={
              loading
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />

                Calculando...
              </>
            ) : (
              <>
                Continuar

                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/*
       * ======================================================
       * PASO 2 - COTIZACIÓN
       * ======================================================
       */}

      {step ===
        "QUOTE" &&
        quote &&
        resolvedRecipient && (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Enviar
              </p>

              <p className="mt-1 text-2xl text-slate-900">
                {
                  quote
                    .amount
                    .formatted
                }{" "}
                USDT
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-slate-500">
                  Destinatario
                </span>

                <div className="min-w-0 text-right">
                  {resolvedRecipient
                    .internal &&
                    resolvedRecipient
                      .user
                      ?.name && (
                      <p className="text-slate-900">
                        {
                          resolvedRecipient
                            .user
                            .name
                        }
                      </p>
                    )}

                  <p
                    title={
                      quote.toAddress
                    }
                    className="font-mono text-xs text-slate-600"
                  >
                    {shortenAddress(
                      quote.toAddress,
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-slate-500">
                  Red
                </span>

                <span className="text-slate-900">
                  {
                    quote.network
                  }{" "}
                  · TRC20
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-slate-500">
                  Energy estimada
                </span>

                <span className="text-slate-900">
                  {quote
                    .resources
                    .estimatedEnergy ??
                    "No disponible"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-slate-500">
                  Energy disponible
                </span>

                <span className="text-slate-900">
                  {
                    quote
                      .resources
                      .energyAvailable
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-slate-500">
                  Costo de red estimado
                </span>

                <span className="text-slate-900">
                  {quote
                    .networkCost
                    .estimatedTrx !==
                    null
                    ? `${quote.networkCost.estimatedTrx} TRX`
                    : "No disponible"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">
                  Comisión plataforma
                </span>

                <span className="text-slate-900">
                  {quote
                    .platformFee
                    .enabled
                    ? `${quote.platformFee.formattedUsdt} USDT`
                    : "Sin comisión"}
                </span>
              </div>
            </div>

            {!quote.canProceed && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

                <div>
                  La wallet no dispone actualmente de TRX/recursos suficientes para cubrir el costo estimado de esta operación.
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                Revisá cuidadosamente el importe y la dirección. Una transferencia confirmada en blockchain no puede deshacerse desde la plataforma.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={
                  resetFlow
                }
                disabled={
                  loading
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmar datos

                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      {/*
       * ======================================================
       * PASO 3 - CONTRASEÑA LOCAL
       * ======================================================
       */}

      {step ===
        "PASSWORD" &&
        quote && (
          <div className="mt-6">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

              <div>
                <p className="text-sm text-slate-900">
                  Autorizar transferencia
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  La contraseña desbloquea temporalmente la wallet cifrada de este dispositivo para firmar la operación.
                </p>
              </div>
            </div>

            <form
              onSubmit={
                handleSignAndBroadcast
              }
              className="mt-5 space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm text-slate-700">
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
                      event
                        .target
                        .value,
                    )
                  }
                  required
                  autoFocus
                  disabled={
                    loading
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Estás autorizando el envío de{" "}
                <span className="font-medium">
                  {
                    quote
                      .amount
                      .formatted
                  }{" "}
                  USDT
                </span>{" "}
                a{" "}
                <span className="break-all font-mono text-xs">
                  {
                    quote.toAddress
                  }
                </span>.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setWalletPassword(
                      "",
                    );

                    setStep(
                      "QUOTE",
                    );

                    setError(
                      null,
                    );
                  }}
                  disabled={
                    loading
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  Volver
                </button>

                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />

                  Firmar y enviar
                </button>
              </div>
            </form>
          </div>
        )}

      {/*
       * ======================================================
       * FIRMANDO / BROADCAST
       * ======================================================
       */}

      {step ===
        "BROADCASTING" && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />

            <p className="mt-4 text-sm text-slate-900">
              Firmando y transmitiendo la transacción...
            </p>

            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
              No cierres esta ventana hasta que TRON responda.
            </p>
          </div>
        )}

      {/*
       * ======================================================
       * BROADCAST INDETERMINADO
       * ======================================================
       *
       * Existe una transacción firmada y un TXID, pero no
       * pudimos confirmar de forma segura la respuesta del relay.
       *
       * No ofrecemos retry directo para evitar un doble envío.
       */}

      {step ===
        "BROADCAST_UNKNOWN" &&
        txid && (
          <div className="mt-6">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />

              <div className="min-w-0">
                <p className="text-sm text-amber-900">
                  Estado del broadcast sin confirmar
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800">
                  No vuelvas a firmar ni enviar esta operación hasta verificar el TXID en TRON. La transacción podría haber sido recibida aunque la respuesta del servidor se haya perdido.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                TXID para verificar
              </p>

              <p className="mt-1 break-all font-mono text-xs leading-5 text-slate-900">
                {txid}
              </p>
            </div>

            <button
              type="button"
              onClick={
                resetFlow
              }
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Ya verifiqué el TXID
            </button>
          </div>
        )}

      {/*
       * ======================================================
       * ÉXITO
       * ======================================================
       */}

      {step ===
        "SUCCESS" &&
        txid && (
          <div className="mt-6">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />

              <div className="min-w-0">
                <p className="text-sm text-emerald-900">
                  Transacción enviada a TRON
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  La red aceptó el broadcast. La confirmación definitiva ocurrirá cuando la transacción sea incluida y confirmada on-chain.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                TXID
              </p>

              <p className="mt-1 break-all font-mono text-xs leading-5 text-slate-900">
                {txid}
              </p>
            </div>

            <button
              type="button"
              onClick={
                resetFlow
              }
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800"
            >
              Realizar otra transferencia
            </button>
          </div>
        )}
    </section>
  );
}