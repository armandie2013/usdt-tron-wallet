"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Image from "next/image";

import {
  useRouter,
} from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

interface Wallet {
  id: string;
  asset: "USDT";
  status: string;
  balance: string;
  formattedBalance: string;
}

interface Transaction {
  id: string;
  type: string;
  asset: "USDT";
  amount: string;
  formattedAmount: string;
  direction:
    | "CREDIT"
    | "DEBIT";
  createdAt: string;
}

interface DepositAddress {
  asset: "USDT";
  network: "TRC20";
  tronNetwork:
    | "NILE"
    | "MAINNET";
  address: string;
  addressHex: string;
  qrDataUrl: string;
  createdAt: string;
}

interface DashboardData {
  unauthorized: false;
  user: User;
  wallet: Wallet;
  transactions: Transaction[];
  deposit: DepositAddress;
}

interface UnauthorizedDashboardData {
  unauthorized: true;
}

type DashboardResponse =
  | DashboardData
  | UnauthorizedDashboardData;

function getTransactionLabel(
  type: string,
): string {
  switch (type) {
    case "ADJUSTMENT":
      return "Acreditación";

    case "DEPOSIT":
      return "Depósito";

    case "WITHDRAWAL":
      return "Retiro";

    case "INTERNAL_TRANSFER":
      return "Transferencia";

    case "FEE":
      return "Comisión";

    default:
      return type;
  }
}

export default function DashboardPage() {
  const router =
    useRouter();

  const [
    user,
    setUser,
  ] = useState<User | null>(
    null,
  );

  const [
    wallet,
    setWallet,
  ] = useState<Wallet | null>(
    null,
  );

  const [
    deposit,
    setDeposit,
  ] = useState<DepositAddress | null>(
    null,
  );

  const [
    transactions,
    setTransactions,
  ] = useState<Transaction[]>(
    [],
  );

  const [
    recipientEmail,
    setRecipientEmail,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    success,
    setSuccess,
  ] = useState<
    string | null
  >(null);

  async function fetchDashboardData():
    Promise<DashboardResponse> {
    const [
      meResponse,
      walletResponse,
      transactionsResponse,
      depositResponse,
    ] = await Promise.all([
      fetch(
        "/api/v1/me",
        {
          cache: "no-store",
        },
      ),

      fetch(
        "/api/v1/wallet",
        {
          cache: "no-store",
        },
      ),

      fetch(
        "/api/v1/transactions?limit=20",
        {
          cache: "no-store",
        },
      ),

      fetch(
        "/api/v1/wallet/deposit-address",
        {
          cache: "no-store",
        },
      ),
    ]);

    if (
      meResponse.status ===
      401
    ) {
      return {
        unauthorized: true,
      };
    }

    const meData =
      await meResponse.json();

    const walletData =
      await walletResponse.json();

    const transactionsData =
      await transactionsResponse.json();

    const depositData =
      await depositResponse.json();

    if (
      !meResponse.ok ||
      !walletResponse.ok ||
      !transactionsResponse.ok ||
      !depositResponse.ok
    ) {
      throw new Error(
        "No se pudieron cargar los datos.",
      );
    }

    return {
      unauthorized: false,

      user:
        meData.user as User,

      wallet:
        walletData.wallet as Wallet,

      transactions:
        (
          transactionsData.transactions ??
          []
        ) as Transaction[],

      deposit:
        depositData.deposit as DepositAddress,
    };
  }

  async function reloadData() {
    try {
      const data =
        await fetchDashboardData();

      if (
        data.unauthorized
      ) {
        router.push(
          "/login",
        );

        return;
      }

      setUser(
        data.user,
      );

      setWallet(
        data.wallet,
      );

      setDeposit(
        data.deposit,
      );

      setTransactions(
        data.transactions,
      );
    } catch (loadError) {
      console.error(
        "[DASHBOARD RELOAD]",
        loadError,
      );

      setError(
        "No se pudo actualizar la cuenta.",
      );
    }
  }

  useEffect(() => {
    let cancelled =
      false;

    async function initialize() {
      try {
        const data =
          await fetchDashboardData();

        if (cancelled) {
          return;
        }

        if (
          data.unauthorized
        ) {
          router.push(
            "/login",
          );

          return;
        }

        setUser(
          data.user,
        );

        setWallet(
          data.wallet,
        );

        setDeposit(
          data.deposit,
        );

        setTransactions(
          data.transactions,
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "[DASHBOARD LOAD]",
          loadError,
        );

        setError(
          "No se pudo cargar la cuenta.",
        );
      } finally {
        if (!cancelled) {
          setLoading(
            false,
          );
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleTransfer(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setSending(true);

    try {
      const response =
        await fetch(
          "/api/v1/transactions",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                recipientEmail,
                amount,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ??
            "No se pudo realizar la transferencia.",
        );

        return;
      }

      setSuccess(
        `Transferencia de ${data.result.formattedAmount} USDT realizada correctamente.`,
      );

      setRecipientEmail(
        "",
      );

      setAmount("");

      await reloadData();
    } catch (transferError) {
      console.error(
        "[TRANSFER]",
        transferError,
      );

      setError(
        "No se pudo realizar la transferencia.",
      );
    } finally {
      setSending(
        false,
      );
    }
  }

  async function handleCopyAddress() {
    if (!deposit?.address) {
      return;
    }

    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          deposit.address,
        );
      } else {
        const textarea =
          document.createElement(
            "textarea",
          );

        textarea.value =
          deposit.address;

        textarea.style.position =
          "fixed";

        textarea.style.opacity =
          "0";

        document.body.appendChild(
          textarea,
        );

        textarea.focus();
        textarea.select();

        document.execCommand(
          "copy",
        );

        textarea.remove();
      }

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        2000,
      );
    } catch (copyError) {
      console.error(
        "[COPY ADDRESS]",
        copyError,
      );

      setError(
        "No se pudo copiar la dirección.",
      );
    }
  }

  async function handleLogout() {
    try {
      await fetch(
        "/api/v1/auth/logout",
        {
          method: "POST",
        },
      );
    } finally {
      router.push(
        "/login",
      );

      router.refresh();
    }
  }

  function scrollToReceive() {
    document
      .getElementById(
        "receive-section",
      )
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }

  function scrollToSend() {
    document
      .getElementById(
        "send-section",
      )
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl text-slate-500">
          Cargando...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="text-xl text-slate-900">
              USDT Wallet
            </h1>

            <p className="truncate text-sm text-slate-500">
              {user?.name}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {user?.role ===
              "ADMIN" && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/admin",
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:px-4"
              >
                Admin
              </button>
            )}

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:px-4"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Saldo disponible
          </p>

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <span className="break-all text-3xl text-slate-900 sm:text-4xl">
              {wallet
                ?.formattedBalance ??
                "0.000000"}
            </span>

            <span className="pb-1 text-lg text-slate-500">
              USDT
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex">
            <button
              type="button"
              onClick={
                scrollToReceive
              }
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white hover:bg-slate-800"
            >
              Recibir
            </button>

            <button
              type="button"
              onClick={
                scrollToSend
              }
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              Enviar
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
            <span>
              Activo: USDT
            </span>

            <span>
              Red: TRON / TRC20
            </span>

            <span>
              Wallet:{" "}
              {wallet?.status ??
                "-"}
            </span>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section
            id="receive-section"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg text-slate-900">
                Recibir USDT
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enviá únicamente USDT mediante la red TRON / TRC20.
              </p>
            </div>

            {deposit ? (
              <div className="mt-6">
                <div className="flex justify-center">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <Image
                      src={
                        deposit.qrDataUrl
                      }
                      alt="QR de dirección TRON"
                      width={
                        240
                      }
                      height={
                        240
                      }
                      unoptimized
                      className="h-auto w-full max-w-[240px]"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      Dirección de depósito
                    </p>

                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                      {
                        deposit.tronNetwork
                      }
                    </span>
                  </div>

                  <div className="mt-2 break-all rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-900">
                    {
                      deposit.address
                    }
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleCopyAddress
                    }
                    className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {copied
                      ? "Dirección copiada"
                      : "Copiar dirección"}
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-800">
                    Usá únicamente la red TRON / TRC20. Enviar fondos mediante otra red puede provocar la pérdida de los fondos.
                  </p>
                </div>

                {deposit.tronNetwork ===
                  "NILE" && (
                  <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <p className="text-sm text-sky-800">
                      Esta dirección pertenece a Nile Testnet. Actualmente estamos trabajando con fondos de prueba, no con USDT real.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No se pudo obtener la dirección de depósito.
              </div>
            )}
          </section>

          <section
            id="send-section"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg text-slate-900">
              Enviar USDT
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Por ahora las transferencias se realizan entre usuarios registrados en la plataforma.
            </p>

            <form
              onSubmit={
                handleTransfer
              }
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="recipientEmail"
                  className="mb-2 block text-sm text-slate-700"
                >
                  Email del destinatario
                </label>

                <input
                  id="recipientEmail"
                  type="email"
                  autoComplete="email"
                  value={
                    recipientEmail
                  }
                  onChange={(
                    event,
                  ) =>
                    setRecipientEmail(
                      event.target.value,
                    )
                  }
                  required
                  disabled={
                    sending
                  }
                  placeholder="usuario@ejemplo.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className="mb-2 block text-sm text-slate-700"
                >
                  Monto USDT
                </label>

                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000000"
                  value={amount}
                  onChange={(
                    event,
                  ) =>
                    setAmount(
                      event.target.value,
                    )
                  }
                  required
                  disabled={
                    sending
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                >
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  sending
                }
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending
                  ? "Enviando..."
                  : "Enviar USDT"}
              </button>
            </form>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs leading-5 text-slate-500">
                Las transferencias entre usuarios de esta plataforma son movimientos internos del ledger y no generan una transacción en TRON.
              </p>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg text-slate-900">
            Mi cuenta
          </h2>

          <div className="mt-5 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-slate-500">
                Nombre
              </p>

              <p className="mt-1 text-slate-900">
                {user?.name}
              </p>
            </div>

            <div>
              <p className="text-slate-500">
                Email
              </p>

              <p className="mt-1 break-all text-slate-900">
                {user?.email}
              </p>
            </div>

            <div>
              <p className="text-slate-500">
                Perfil
              </p>

              <p className="mt-1 text-slate-900">
                {user?.role}
              </p>
            </div>

            <div>
              <p className="text-slate-500">
                Red
              </p>

              <p className="mt-1 text-slate-900">
                TRON / TRC20
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg text-slate-900">
              Últimos movimientos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Últimas operaciones registradas en tu cuenta.
            </p>
          </div>

          {transactions.length ===
          0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Todavía no hay movimientos.
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 md:hidden">
                {transactions.map(
                  (
                    transaction,
                  ) => (
                    <div
                      key={
                        transaction.id
                      }
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-900">
                            {getTransactionLabel(
                              transaction.type,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(
                              transaction.createdAt,
                            ).toLocaleString(
                              "es-AR",
                            )}
                          </p>
                        </div>

                        <p
                          className={`shrink-0 text-sm ${
                            transaction.direction ===
                            "CREDIT"
                              ? "text-emerald-600"
                              : "text-slate-900"
                          }`}
                        >
                          {transaction.direction ===
                          "CREDIT"
                            ? "+"
                            : ""}

                          {
                            transaction.formattedAmount
                          }{" "}
                          USDT
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-6 py-3">
                        Fecha
                      </th>

                      <th className="px-6 py-3">
                        Tipo
                      </th>

                      <th className="px-6 py-3 text-right">
                        Monto
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(
                      (
                        transaction,
                      ) => (
                        <tr
                          key={
                            transaction.id
                          }
                        >
                          <td className="px-6 py-4 text-slate-600">
                            {new Date(
                              transaction.createdAt,
                            ).toLocaleString(
                              "es-AR",
                            )}
                          </td>

                          <td className="px-6 py-4 text-slate-700">
                            {getTransactionLabel(
                              transaction.type,
                            )}
                          </td>

                          <td
                            className={`px-6 py-4 text-right ${
                              transaction.direction ===
                              "CREDIT"
                                ? "text-emerald-600"
                                : "text-slate-900"
                            }`}
                          >
                            {transaction.direction ===
                            "CREDIT"
                              ? "+"
                              : ""}

                            {
                              transaction.formattedAmount
                            }{" "}
                            USDT
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}