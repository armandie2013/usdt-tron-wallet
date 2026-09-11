# USDT TRON Wallet

Base full-stack con Next.js 14, TypeScript, Tailwind CSS y MongoDB para una billetera custodial de USDT sobre TRON.

## Arquitectura

- Frontend: Next.js App Router + React + Tailwind CSS.
- Backend: Route Handlers de Next.js (`src/app/api`) + módulos de dominio (`src/modules`).
- Base de datos: MongoDB.
- Montos: enteros en unidades mínimas de USDT (6 decimales), usando `BigInt` en lógica y strings en persistencia/API.
- Blockchain: módulo TRON aislado para integrar después depósitos, retiros y sweeps.

## Primer inicio

1. Instalar Node.js 20 LTS o superior compatible con Next.js 14.
2. Instalar dependencias: `npm install`.
3. Tener MongoDB disponible localmente o modificar `MONGODB_URI` en `.env.local`.
4. Ejecutar: `npm run dev`.
5. Abrir `http://localhost:3000`.

## Variables de entorno

`.env.local` contiene valores locales de desarrollo y está ignorado por Git.
`.env.example` sirve como plantilla y sí debe versionarse.

No guardar claves privadas TRON, seeds, API keys reales ni secretos de producción en Git.

## Próximo bloque

Implementar MongoDB + User + registro + login, y luego WalletAccount + Ledger.
# usdt-tron-wallet
