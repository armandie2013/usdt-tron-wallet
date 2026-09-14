"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

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

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function AdminPage() {
  const router =
    useRouter();

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
   * en memoria durante este flujo.
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

  /*
   * Posiciones aleatorias de las palabras
   * que deberán verificarse.
   *
   * Ejemplo:
   *
   * [2, 6, 10]
   */
  const [
    verificationPositions,
    setVerificationPositions,
  ] =
    useState<
      number[]
    >([]);

  /*
   * Respuestas introducidas por posición.
   */
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

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    creatingPlatformWallet,
    setCreatingPlatformWallet,
  ] =
    useState(
      false,
    );

  const [
    refreshingPlatformWallet,
    setRefreshingPlatformWallet,
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

  async function fetchPlatformWallet():
    Promise<
      PlatformWallet |
      null
    > {
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
      router.push(
        "/login",
      );

      return null;
    }

    if (
      response.status ===
      403
    ) {
      router.push(
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

    return data.wallet;
  }

  /*
   * ============================================================
   * RELOAD USERS
   * ============================================================
   */

  async function reloadUsers() {
    try {
      setError(
        null,
      );

      const data =
        await fetchUsers();

      if (
        data.redirect ===
          "login"
      ) {
        router.push(
          "/login",
        );

        return;
      }

      if (
        data.redirect ===
          "dashboard"
      ) {
        router.push(
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
    }
  }

  /*
   * ============================================================
   * RELOAD PLATFORM WALLET
   * ============================================================
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

      setPlatformWallet(
        wallet,
      );
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
   */

  useEffect(
    () => {
      let cancelled =
        false;

      async function initialize() {
        try {
          const [
            usersData,
            walletData,
          ] =
            await Promise.all([
              fetchUsers(),
              fetchPlatformWallet(),
            ]);

          if (
            cancelled
          ) {
            return;
          }

          if (
            usersData.redirect ===
              "login"
          ) {
            router.push(
              "/login",
            );

            return;
          }

          if (
            usersData.redirect ===
              "dashboard"
          ) {
            router.push(
              "/dashboard",
            );

            return;
          }

          setUsers(
            usersData.users,
          );

          setPlatformWallet(
            walletData,
          );
        } catch (
          loadError
        ) {
          if (
            cancelled
          ) {
            return;
          }

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
          if (
            !cancelled
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void initialize();

      return () => {
        cancelled =
          true;
      };
    },
    [
      router,
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
        wallet,
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

        /*
         * Elegimos tres palabras distintas
         * aleatoriamente entre la 1 y la 12.
         */
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

    /*
     * No regeneramos posiciones.
     *
     * Se mantienen las tres generadas
     * al crear la wallet.
     */
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

    /*
     * Las mismas tres posiciones permanecen
     * durante todo el intento.
     *
     * Una respuesta incorrecta NO genera
     * otras posiciones.
     */
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
     * La comprobación ocurre exclusivamente
     * en el navegador.
     *
     * Las palabras no vuelven a enviarse
     * al backend.
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
   * LOADING
   * ============================================================
   */

  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
            Cargando administración...
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
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl text-slate-900">
              Administración
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              USDT Wallet
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard",
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Volver al dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700"
          >
            {success}
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
            <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg text-slate-900">
                  Guardá la frase de recuperación
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Estas 12 palabras permiten recuperar la wallet de la plataforma en caso de pérdida del servidor o de la base de datos.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                Guardá estas palabras fuera del servidor. No se almacenan en MongoDB y no podrán volver a mostrarse después de este proceso.
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
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                      <span className="mr-2 text-xs text-slate-400">
                        {index + 1}.
                      </span>

                      <span className="text-sm text-slate-900">
                        {word}
                      </span>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Ruta de derivación
                </p>

                <p className="mt-2 font-mono text-sm text-slate-900">
                  {
                    platformRecovery
                      .derivationPath
                  }
                </p>
              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={
                    backupConfirmed
                  }
                  onChange={(
                    event,
                  ) =>
                    setBackupConfirmed(
                      event.target
                        .checked,
                    )
                  }
                  className="mt-1 h-4 w-4"
                />

                <span className="text-sm leading-6 text-slate-700">
                  Guardé las 12 palabras en un lugar seguro y comprendo que son necesarias para recuperar la wallet de la plataforma.
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
                className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
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
            <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg text-slate-900">
                Verificar respaldo
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ingresá las tres palabras solicitadas para comprobar que guardaste correctamente la frase de recuperación.
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
                      <label className="mb-2 block text-sm text-slate-700">
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
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500"
                      />
                    </div>
                  ),
                )}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800"
                >
                  Confirmar respaldo
                </button>
              </form>
            </section>
          )}

        {/*
         * ======================================================
         * PLATFORM WALLET
         * ======================================================
         */}

        {platformSetupStep ===
          "NONE" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg text-slate-900">
                  Wallet de plataforma
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Wallet propia de la plataforma para TRX, USDT y futura administración de recursos TRON. No contiene fondos pertenecientes a los usuarios.
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
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refreshingPlatformWallet
                    ? "Actualizando..."
                    : "Actualizar"}
                </button>
              )}
            </div>

            {!platformWallet ? (
              <div className="p-6">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Todavía no existe una wallet de plataforma para la red configurada. Al crearla se generará una frase de recuperación de 12 palabras.
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void handleCreatePlatformWallet()
                  }
                  disabled={
                    creatingPlatformWallet
                  }
                  className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingPlatformWallet
                    ? "Creando wallet..."
                    : "Crear wallet de plataforma"}
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Red
                    </p>

                    <p className="mt-2 text-sm text-slate-900">
                      {
                        platformWallet
                          .network
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Estado
                    </p>

                    <p className="mt-2 text-sm text-slate-900">
                      {
                        platformWallet
                          .status
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Cuenta TRON
                    </p>

                    <p
                      className={
                        `mt-2 text-sm ${
                          platformWallet
                            .activated
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`
                      }
                    >
                      {
                        platformWallet
                          .activated
                          ? "Activada"
                          : "No activada"
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Tipo
                    </p>

                    <p className="mt-2 text-sm text-slate-900">
                      Platform Treasury
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">
                      TRX
                    </p>

                    <p className="mt-2 text-xl text-slate-900">
                      {
                        platformWallet
                          .trx
                          ?.formattedBalance ??
                        "—"
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">
                      USDT
                    </p>

                    <p className="mt-2 text-xl text-slate-900">
                      {
                        platformWallet
                          .usdt
                          ?.formattedBalance ??
                        "—"
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">
                      Energy disponible
                    </p>

                    <p className="mt-2 text-xl text-slate-900">
                      {
                        platformWallet
                          .resources
                          ?.energyAvailable ??
                        "—"
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">
                      Bandwidth disponible
                    </p>

                    <p className="mt-2 text-xl text-slate-900">
                      {
                        platformWallet
                          .resources
                          ?.bandwidthAvailable ??
                        "—"
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        Dirección TRON
                      </p>

                      <p className="mt-2 break-all font-mono text-sm text-slate-900">
                        {
                          platformWallet
                            .addressBase58
                        }
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void handleCopyPlatformAddress()
                      }
                      className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Copiar dirección
                    </button>
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
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
        )}

        {/*
         * ======================================================
         * USERS
         * ======================================================
         */}

        {platformSetupStep ===
          "NONE" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg text-slate-900">
                  Usuarios
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {users.length} usuarios registrados
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void reloadUsers()
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Actualizar usuarios
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
                  <thead className="bg-slate-50 text-slate-500">
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

                  <tbody className="divide-y divide-slate-100">
                    {users.map(
                      (
                        user,
                      ) => (
                        <tr
                          key={
                            user.id
                          }
                        >
                          <td className="px-6 py-4">
                            <p className="text-slate-900">
                              {
                                user.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                user.email
                              }
                            </p>
                          </td>

                          <td className="px-6 py-4 text-slate-600">
                            {
                              user.role
                            }
                          </td>

                          <td className="px-6 py-4">
                            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
                              {
                                user.status
                              }
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {user.wallet ? (
                              <span className="text-sm text-emerald-700">
                                Registrada
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">
                                Sin wallet
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right text-slate-900">
                            {user.wallet
                              ? `${user.wallet.formattedBalance} USDT`
                              : "—"}
                          </td>

                          <td className="px-6 py-4 text-slate-500">
                            {formatDate(
                              user.createdAt,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {platformSetupStep ===
          "NONE" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500 shadow-sm">
            El administrador puede consultar wallets y actividad de los usuarios, pero no posee las claves privadas de las wallets no-custodial y no puede mover sus fondos.
          </section>
        )}
      </div>
    </main>
  );
}