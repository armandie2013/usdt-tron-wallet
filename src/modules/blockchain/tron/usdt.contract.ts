// export const USDT_TRC20_DECIMALS =
//   6;

// export function getUsdtTrc20Contract():
//   string {
//   const contract =
//     process.env
//       .USDT_TRC20_CONTRACT
//       ?.trim();

//   if (!contract) {
//     throw new Error(
//       "USDT_TRC20_CONTRACT no está configurado.",
//     );
//   }

//   return contract;
// }

import {
  getConfiguredTronNetwork,
  getUsdtContractForNetwork,
} from "./tron.config";

import type {
  TronNetwork,
} from "./tron.types";

/*
 * ============================================================
 * CONTRATO USDT TRC20
 * ============================================================
 *
 * Este archivo se mantiene como fachada de compatibilidad
 * porque actualmente varios módulos importan:
 *
 * getUsdtTrc20Contract()
 *
 * La dirección real ya no se define aquí.
 *
 * La fuente de verdad está en:
 *
 * tron.config.ts
 * ============================================================
 */

/*
 * ============================================================
 * CONTRATO DE LA RED ACTIVA
 * ============================================================
 */

export function getUsdtTrc20Contract():
  string {
  const network =
    getConfiguredTronNetwork();

  return getUsdtContractForNetwork(
    network,
  );
}

/*
 * ============================================================
 * CONTRATO DE UNA RED ESPECÍFICA
 * ============================================================
 *
 * Este helper será útil para validaciones donde ya conocemos
 * explícitamente la red de una wallet o transacción.
 * ============================================================
 */

export function getUsdtTrc20ContractForNetwork(
  network:
    TronNetwork,
): string {
  return getUsdtContractForNetwork(
    network,
  );
}