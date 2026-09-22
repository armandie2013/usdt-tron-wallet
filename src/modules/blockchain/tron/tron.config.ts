import type {
  TronNetwork,
} from "./tron.types";

/*
 * ============================================================
 * CONFIGURACIÓN TRON CENTRALIZADA
 * ============================================================
 *
 * Este archivo es la única fuente de verdad del backend para:
 *
 * - red activa;
 * - Full Host;
 * - contrato USDT;
 * - API key de TronGrid;
 *
 * Ningún servicio debería decidir por su cuenta si trabaja
 * en NILE o MAINNET.
 * ============================================================
 */

export interface TronNetworkConfig {
  network:
    TronNetwork;

  fullHost:
    string;

  usdtContract:
    string;

  apiKey:
    string | null;
}

/*
 * ============================================================
 * VALORES FIJOS POR RED
 * ============================================================
 */

const NILE_FULL_HOST =
  "https://nile.trongrid.io";

const MAINNET_FULL_HOST =
  "https://api.trongrid.io";

/*
 * USDT de pruebas utilizado actualmente en NILE.
 */
const NILE_USDT_CONTRACT =
  "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";

/*
 * USDT oficial TRC20 en TRON Mainnet.
 */
const MAINNET_USDT_CONTRACT =
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

/*
 * ============================================================
 * NORMALIZAR URL
 * ============================================================
 */

function normalizeFullHost(
  value:
    string,
): string {
  return value
    .trim()
    .replace(
      /\/+$/,
      "",
    );
}

/*
 * ============================================================
 * RED ACTIVA
 * ============================================================
 *
 * IMPORTANTE:
 *
 * No utilizamos:
 *
 * value === "mainnet"
 *   ? "MAINNET"
 *   : "NILE"
 *
 * porque un error de configuración podría cambiar
 * silenciosamente la red utilizada.
 *
 * Si TRON_NETWORK no es válido, el servidor falla.
 * ============================================================
 */

export function getConfiguredTronNetwork():
  TronNetwork {
  const rawValue =
    process.env
      .TRON_NETWORK
      ?.trim()
      .toLowerCase();

  if (
    rawValue ===
    "nile"
  ) {
    return "NILE";
  }

  if (
    rawValue ===
    "mainnet"
  ) {
    return "MAINNET";
  }

  throw new Error(
    "TRON_NETWORK debe estar configurado explícitamente como 'nile' o 'mainnet'.",
  );
}

/*
 * ============================================================
 * FULL HOST
 * ============================================================
 *
 * Permitimos sobrescribir los endpoints mediante .env.
 *
 * Si no existen variables personalizadas usamos los endpoints
 * oficiales definidos arriba.
 * ============================================================
 */

function getFullHostForNetwork(
  network:
    TronNetwork,
): string {
  if (
    network ===
    "NILE"
  ) {
    const configured =
      process.env
        .TRON_NILE_FULL_HOST
        ?.trim();

    return normalizeFullHost(
      configured ||
        NILE_FULL_HOST,
    );
  }

  if (
    network ===
    "MAINNET"
  ) {
    const configured =
      process.env
        .TRON_MAINNET_FULL_HOST
        ?.trim();

    return normalizeFullHost(
      configured ||
        MAINNET_FULL_HOST,
    );
  }

  const exhaustive:
    never =
      network;

  throw new Error(
    `Red TRON no soportada: ${String(
      exhaustive,
    )}`,
  );
}

/*
 * ============================================================
 * CONTRATO USDT
 * ============================================================
 */

export function getUsdtContractForNetwork(
  network:
    TronNetwork,
): string {
  switch (
    network
  ) {
    case "NILE":
      return NILE_USDT_CONTRACT;

    case "MAINNET":
      return MAINNET_USDT_CONTRACT;

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
 * ============================================================
 * API KEY
 * ============================================================
 *
 * La API key:
 *
 * - pertenece al proveedor TronGrid;
 * - NO es una private key;
 * - NO debe usar prefijo NEXT_PUBLIC_;
 * - nunca debe enviarse al navegador.
 *
 * Durante NILE puede quedar vacía.
 *
 * Para MAINNET la vamos a configurar antes de producción.
 * ============================================================
 */

export function getTronApiKey():
  string | null {
  const value =
    process.env
      .TRON_API_KEY
      ?.trim();

  return value ||
    null;
}

/*
 * ============================================================
 * CONFIGURACIÓN POR RED
 * ============================================================
 */

export function getTronConfig(
  network?:
    TronNetwork,
): TronNetworkConfig {
  const selectedNetwork =
    network ??
    getConfiguredTronNetwork();

  return {
    network:
      selectedNetwork,

    fullHost:
      getFullHostForNetwork(
        selectedNetwork,
      ),

    usdtContract:
      getUsdtContractForNetwork(
        selectedNetwork,
      ),

    apiKey:
      getTronApiKey(),
  };
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

export function getTronFullHost(
  network?:
    TronNetwork,
): string {
  return getTronConfig(
    network,
  ).fullHost;
}

export function getConfiguredUsdtContract():
  string {
  return getTronConfig()
    .usdtContract;
}

/*
 * ============================================================
 * HEADERS TRONGRID
 * ============================================================
 */

export function getTronGridHeaders():
  Record<string, string> {
  const apiKey =
    getTronApiKey();

  if (
    !apiKey
  ) {
    return {};
  }

  return {
    "TRON-PRO-API-KEY":
      apiKey,
  };
}