"use client";

import {
  TronWeb,
} from "tronweb";

/*
 * Ruta estándar TRON BIP44.
 *
 * 195 = coin type asignado a TRON.
 */
const TRON_DERIVATION_PATH =
  "m/44'/195'/0'/0/0";

export interface GeneratedNonCustodialWallet {
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

export interface RestoredNonCustodialWallet {
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
 * BROWSER
 * ============================================================
 */

function ensureBrowser():
  void {
  if (
    typeof window ===
    "undefined"
  ) {
    throw new Error(
      "La wallet no-custodial solo puede operar en el navegador.",
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
      "La private key TRON no es válida.",
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

  /*
   * Dirección TRON hexadecimal:
   *
   * 41 + 20 bytes
   */
  if (
    !/^41[0-9A-F]{40}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "La dirección TRON hexadecimal no es válida.",
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
      "La frase de recuperación debe contener 12 palabras.",
    );
  }
}

/*
 * ============================================================
 * GENERAR WALLET
 * ============================================================
 *
 * Todo ocurre del lado del navegador.
 *
 * Nunca se envía al backend:
 *
 * - mnemonic
 * - privateKey
 */

export function generateNonCustodialWallet():
  GeneratedNonCustodialWallet {
  ensureBrowser();

  const account =
    TronWeb.createRandom(
      "",
      TRON_DERIVATION_PATH,
    );

  /*
   * TronWeb tipa mnemonic como:
   *
   * Mnemonic | null
   *
   * Aunque createRandom normalmente genera mnemonic,
   * TypeScript correctamente exige validar el null.
   */

  if (
    !account.mnemonic
  ) {
    throw new Error(
      "TronWeb no pudo generar una frase de recuperación.",
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
      "TronWeb generó una dirección TRON inválida.",
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

    /*
     * TronWeb 6 devuelve la cuenta derivada,
     * pero el objeto resultante no expone
     * una propiedad `path`.
     *
     * Como nosotros definimos explícitamente
     * la ruta utilizada, guardamos esa misma.
     */
    derivationPath:
      TRON_DERIVATION_PATH,
  };
}

/*
 * ============================================================
 * RESTAURAR WALLET
 * ============================================================
 */

export function restoreNonCustodialWallet(
  mnemonic:
    string,
): RestoredNonCustodialWallet {
  ensureBrowser();

  const normalizedMnemonic =
    normalizeMnemonic(
      mnemonic,
    );

  validateMnemonicWordCount(
    normalizedMnemonic,
  );

  let account:
    ReturnType<
      typeof TronWeb.fromMnemonic
    >;

  try {
    account =
      TronWeb.fromMnemonic(
        normalizedMnemonic,
        TRON_DERIVATION_PATH,
      );
  } catch {
    throw new Error(
      "La frase de recuperación no es válida.",
    );
  }

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
      "No se pudo recuperar una dirección TRON válida.",
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

    mnemonic:
      normalizedMnemonic,

    derivationPath:
      TRON_DERIVATION_PATH,
  };
}

/*
 * ============================================================
 * PRIVATE KEY ↔ ADDRESS
 * ============================================================
 *
 * Verifica que la private key desbloqueada corresponda
 * realmente a la address pública almacenada.
 */

export function privateKeyMatchesAddress(
  privateKey:
    string,

  expectedAddress:
    string,
): boolean {
  ensureBrowser();

  try {
    const normalizedPrivateKey =
      normalizePrivateKey(
        privateKey,
      );

    const derivedAddress =
      TronWeb.address
        .fromPrivateKey(
          normalizedPrivateKey,
        );

    if (
      !derivedAddress
    ) {
      return false;
    }

    return (
      derivedAddress ===
      expectedAddress
        .trim()
    );
  } catch {
    return false;
  }
}

/*
 * ============================================================
 * ADDRESS VALIDATION
 * ============================================================
 */

export function isValidTronAddress(
  address:
    string,
): boolean {
  try {
    return TronWeb.isAddress(
      address.trim(),
    );
  } catch {
    return false;
  }
}

export {
  TRON_DERIVATION_PATH,
};