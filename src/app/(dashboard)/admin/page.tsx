"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

interface AdminUser {
  id: string;
  name: string;
  email: string;

  role:
    | "ADMIN"
    | "USER";

  status: string;

  emailVerified:
    boolean;

  wallet: {
    id: string;
    asset: "USDT";
    status: string;
    balance: string;
    formattedBalance:
      string;
  };

  createdAt:
    string;
}

interface UsersSuccessResponse {
  redirect: null;
  users: AdminUser[];
}

interface UsersLoginRedirectResponse {
  redirect: "login";
}

interface UsersDashboardRedirectResponse {
  redirect: "dashboard";
}

type UsersResponse =
  | UsersSuccessResponse
  | UsersLoginRedirectResponse
  | UsersDashboardRedirectResponse;

export default function AdminPage() {
  const router =
    useRouter();

  const [
    users,
    setUsers,
  ] = useState<
    AdminUser[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    creditEmail,
    setCreditEmail,
  ] = useState("");

  const [
    creditAmount,
    setCreditAmount,
  ] = useState("");

  const [
    crediting,
    setCrediting,
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

    if (!response.ok) {
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

  async function reloadUsers() {
    try {
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
    } catch (loadError) {
      console.error(
        "[ADMIN RELOAD]",
        loadError,
      );

      setError(
        "No se pudieron cargar los usuarios.",
      );
    }
  }

  useEffect(() => {
    let cancelled =
      false;

    async function initialize() {
      try {
        const data =
          await fetchUsers();

        if (cancelled) {
          return;
        }

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
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "[ADMIN LOAD]",
          loadError,
        );

        setError(
          "No se pudieron cargar los usuarios.",
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

  async function handleCredit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setCrediting(true);

    try {
      const response =
        await fetch(
          "/api/v1/admin/test-credit",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                email:
                  creditEmail,

                amount:
                  creditAmount,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ??
            "No se pudo acreditar el saldo.",
        );

        return;
      }

      setSuccess(
        `${data.result.formattedAmount} USDT acreditados a ${data.result.user.email}.`,
      );

      setCreditAmount(
        "",
      );

      await reloadUsers();
    } catch (creditError) {
      console.error(
        "[ADMIN CREDIT]",
        creditError,
      );

      setError(
        "No se pudo acreditar el saldo.",
      );
    } finally {
      setCrediting(
        false,
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl text-slate-900">
              Administración
            </h1>

            <p className="text-sm text-slate-500">
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

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg text-slate-900">
            Acreditar saldo de prueba
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Disponible únicamente durante desarrollo.
          </p>

          <form
            onSubmit={
              handleCredit
            }
            className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto]"
          >
            <input
              type="email"
              placeholder="Email del usuario"
              value={
                creditEmail
              }
              onChange={(
                event,
              ) =>
                setCreditEmail(
                  event.target.value,
                )
              }
              required
              disabled={
                crediting
              }
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />

            <input
              type="text"
              inputMode="decimal"
              placeholder="100.123456"
              value={
                creditAmount
              }
              onChange={(
                event,
              ) =>
                setCreditAmount(
                  event.target.value,
                )
              }
              required
              disabled={
                crediting
              }
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />

            <button
              type="submit"
              disabled={
                crediting
              }
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {crediting
                ? "Acreditando..."
                : "Acreditar"}
            </button>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
            >
              {success}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg text-slate-900">
              Usuarios
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {users.length} usuarios registrados
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Cargando...
            </div>
          ) : users.length ===
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

                        <td className="px-6 py-4 text-right text-slate-900">
                          {
                            user.wallet
                              .formattedBalance
                          }{" "}
                          USDT
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {new Date(
                            user.createdAt,
                          ).toLocaleString(
                            "es-AR",
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
      </div>
    </main>
  );
}