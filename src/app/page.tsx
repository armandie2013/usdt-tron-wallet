import Link from "next/link";
import { WalletCards } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-slate-900 p-3 text-white">
            <WalletCards className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">USDT TRON Wallet</h1>
            <p className="text-sm text-slate-500">Base full-stack Next.js</p>
          </div>
        </div>

        <p className="mb-6 leading-7 text-slate-600">
          Proyecto inicial para registro de usuarios, cuentas USDT, ledger y futura integración TRON.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" href="/register">
            Crear cuenta
          </Link>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm" href="/login">
            Iniciar sesión
          </Link>
        </div>
      </section>
    </main>
  );
}
