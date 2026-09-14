import {
  TronWeb,
} from "tronweb";

/*
 * ============================================================
 * PLATFORM WALLET
 * ============================================================
 *
 * Este archivo SOLO debe utilizarse desde el servidor.
 *
 * La wallet de plataforma pertenece a la empresa.
 *
 * A diferencia de las wallets de usuarios:
 *
 * - puede tener la private key cifrada en el backend;
 * - puede utilizarse para operaciones automáticas;
 * - la mnemonic NO debe almacenarse en MongoDB;
 * - la mnemonic se entrega únicamente al crear la wallet.
 *
 * Derivación estándar TRON:
 *
 * m/44'/195'/0'/0/0
 */

const TRON_PLATFORM_DERIVATION_PATH =
  "m/44'/195'/0'/0/0";

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export interface GeneratedPlatformWallet {
  addressBase58:
    string;

  addressHex:
    string;

  privateKey:
    string;

  publicKey:
    string;

  mnemonic:
    string;

  derivationPath:
    string;
}

/*
 * ============================================================
 * SERVER GUARD
 * ============================================================
 */

function ensureServer():
  void {
  if (
    typeof window !==
    "undefined"
  ) {
    throw new Error(
      "La generación de la Platform Wallet solo puede ejecutarse en el servidor.",
    );
  }
}

/*
 * ============================================================
 * PRIVATE KEY
 * ============================================================
 */

function normalizePrivateKey(
  privateKey:
    string,
): string {
  const normalized =
    privateKey
      .trim()
      .replace(
        /^0x/i,
        "",
      );

  if (
    !/^[0-9a-fA-F]{64}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "TronWeb generó una private key TRON inválida.",
    );
  }

  return normalized
    .toUpperCase();
}

/*
 * ============================================================
 * ADDRESS HEX
 * ============================================================
 */

function normalizeHexAddress(
  addressHex:
    string,
): string {
  const normalized =
    addressHex
      .trim()
      .replace(
        /^0x/i,
        "",
      )
      .toUpperCase();

  if (
    !/^41[0-9A-F]{40}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "TronWeb generó una dirección TRON hexadecimal inválida.",
    );
  }

  return normalized;
}

/*
 * ============================================================
 * MNEMONIC
 * ============================================================
 */

function normalizeMnemonic(
  mnemonic:
    string,
): string {
  return mnemonic
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    );
}

function validateMnemonicWordCount(
  mnemonic:
    string,
): void {
  const words =
    mnemonic.split(
      " ",
    );

  if (
    words.length !==
    12
  ) {
    throw new Error(
      "La frase de recuperación generada no contiene 12 palabras.",
    );
  }
}

/*
 * ============================================================
 * GENERATE PLATFORM WALLET
 * ============================================================
 *
 * Genera:
 *
 * mnemonic
 *      ↓
 * seed
 *      ↓
 * m/44'/195'/0'/0/0
 *      ↓
 * private key
 *      ↓
 * address TRON
 *
 * IMPORTANTE:
 *
 * Esta función devuelve la mnemonic para poder mostrarla
 * UNA SOLA VEZ durante la creación de la Platform Wallet.
 *
 * La capa superior debe:
 *
 * 1. cifrar privateKey;
 * 2. guardar únicamente encryptedPrivateKey;
 * 3. NO guardar mnemonic;
 * 4. devolver mnemonic únicamente en la respuesta inicial
 *    de creación.
 */

export function generatePlatformWallet():
  GeneratedPlatformWallet {
  ensureServer();

  const account =
    TronWeb.createRandom(
      "",
      TRON_PLATFORM_DERIVATION_PATH,
    );

  if (
    !account.mnemonic
  ) {
    throw new Error(
      "TronWeb no pudo generar una frase de recuperación para la Platform Wallet.",
    );
  }

  const mnemonic =
    normalizeMnemonic(
      account
        .mnemonic
        .phrase,
    );

  validateMnemonicWordCount(
    mnemonic,
  );

  const privateKey =
    normalizePrivateKey(
      account.privateKey,
    );

  const addressBase58 =
    account.address
      .trim();

  if (
    !TronWeb.isAddress(
      addressBase58,
    )
  ) {
    throw new Error(
      "TronWeb generó una dirección TRON inválida para la Platform Wallet.",
    );
  }

  const addressHex =
    normalizeHexAddress(
      TronWeb.address
        .toHex(
          addressBase58,
        ),
    );

  return {
    addressBase58,

    addressHex,

    privateKey,

    publicKey:
      account.publicKey,

    mnemonic,

    derivationPath:
      TRON_PLATFORM_DERIVATION_PATH,
  };
}

export {
  TRON_PLATFORM_DERIVATION_PATH,
};