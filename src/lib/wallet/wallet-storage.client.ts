"use client";

import {
  privateKeyMatchesAddress,
  restoreNonCustodialWallet,
} from "@/lib/wallet/non-custodial-wallet.client";

import type {
  GeneratedNonCustodialWallet,
} from "@/lib/wallet/non-custodial-wallet.client";

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const DATABASE_NAME =
  "usdt-tron-wallet";

const DATABASE_VERSION =
  1;

const WALLET_STORE =
  "non_custodial_wallets";

const STORAGE_VERSION =
  1;

const PBKDF2_ITERATIONS =
  310_000;

const PBKDF2_HASH =
  "SHA-256";

const AES_ALGORITHM =
  "AES-GCM";

const AES_KEY_LENGTH =
  256;

const SALT_BYTES =
  16;

const IV_BYTES =
  12;

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

export type WalletNetwork =
  | "NILE"
  | "MAINNET";

/*
 * Material secreto cifrado.
 *
 * En la nueva versión guardamos solamente:
 *
 * - mnemonic
 * - derivationPath
 *
 * La private key se deriva nuevamente al desbloquear.
 *
 * privateKey queda opcional solamente para poder leer
 * un vault creado con la primera versión del código.
 */

interface WalletSecretPayload {
  mnemonic:
    string;

  derivationPath:
    string;

  privateKey?:
    string;
}

interface WalletStorageRecord {
  id:
    string;

  version:
    number;

  userId:
    string;

  network:
    WalletNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  publicKey:
    string;

  kdf:
    "PBKDF2";

  kdfHash:
    "SHA-256";

  kdfIterations:
    number;

  salt:
    string;

  algorithm:
    "AES-GCM";

  iv:
    string;

  ciphertext:
    string;

  createdAt:
    string;

  updatedAt:
    string;
}

export interface StoredWalletMetadata {
  userId:
    string;

  network:
    WalletNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  publicKey:
    string;

  createdAt:
    string;

  updatedAt:
    string;
}

export interface UnlockedWallet {
  userId:
    string;

  network:
    WalletNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  publicKey:
    string;

  privateKey:
    string;

  mnemonic:
    string;

  derivationPath:
    string;
}

interface SaveWalletInput {
  userId:
    string;

  network:
    WalletNetwork;

  wallet:
    GeneratedNonCustodialWallet;

  password:
    string;
}

interface UnlockWalletInput {
  userId:
    string;

  network:
    WalletNetwork;

  password:
    string;
}

interface WalletIdentifier {
  userId:
    string;

  network:
    WalletNetwork;
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
      "undefined" ||
    typeof indexedDB ===
      "undefined" ||
    typeof crypto ===
      "undefined" ||
    !crypto.subtle
  ) {
    throw new Error(
      "El almacenamiento seguro de la wallet solo está disponible en el navegador.",
    );
  }
}

/*
 * ============================================================
 * NORMALIZACIÓN
 * ============================================================
 */

function normalizeUserId(
  userId:
    string,
): string {
  const value =
    userId.trim();

  if (
    !value
  ) {
    throw new Error(
      "El identificador del usuario no es válido.",
    );
  }

  return value;
}

function normalizePassword(
  password:
    string,
): string {
  if (
    typeof password !==
    "string"
  ) {
    throw new Error(
      "La contraseña de la wallet no es válida.",
    );
  }

  /*
   * No usamos trim().
   *
   * Los espacios pueden formar parte deliberadamente
   * de una contraseña.
   */

  if (
    password.length <
    8
  ) {
    throw new Error(
      "La contraseña de la wallet debe tener al menos 8 caracteres.",
    );
  }

  return password;
}

function normalizeNetwork(
  network:
    WalletNetwork,
): WalletNetwork {
  if (
    network !==
      "NILE" &&
    network !==
      "MAINNET"
  ) {
    throw new Error(
      "La red TRON indicada no es válida.",
    );
  }

  return network;
}

function getRecordId(
  userId:
    string,

  network:
    WalletNetwork,
): string {
  return `${network}:${userId}`;
}

/*
 * ============================================================
 * ARRAYBUFFER
 * ============================================================
 *
 * TypeScript 6 diferencia:
 *
 * Uint8Array<ArrayBufferLike>
 *
 * de:
 *
 * ArrayBufferView<ArrayBuffer>
 *
 * Web Crypto exige BufferSource basado en ArrayBuffer.
 *
 * Por eso copiamos explícitamente los bytes dentro
 * de un ArrayBuffer nuevo.
 */

function toArrayBuffer(
  bytes:
    Uint8Array,
): ArrayBuffer {
  const copy =
    new Uint8Array(
      bytes.byteLength,
    );

  copy.set(
    bytes,
  );

  return copy.buffer;
}

/*
 * ============================================================
 * BASE64
 * ============================================================
 */

function bytesToBase64(
  bytes:
    Uint8Array,
): string {
  let binary =
    "";

  for (
    let index =
      0;
    index <
    bytes.length;
    index++
  ) {
    binary +=
      String.fromCharCode(
        bytes[index],
      );
  }

  return btoa(
    binary,
  );
}

function base64ToBytes(
  value:
    string,
): Uint8Array {
  const binary =
    atob(
      value,
    );

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index =
      0;
    index <
    binary.length;
    index++
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      );
  }

  return bytes;
}

/*
 * ============================================================
 * INDEXED DB
 * ============================================================
 */

function openDatabase():
  Promise<IDBDatabase> {
  ensureBrowser();

  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const request =
        indexedDB.open(
          DATABASE_NAME,
          DATABASE_VERSION,
        );

      request.onupgradeneeded =
        () => {
          const database =
            request.result;

          if (
            !database
              .objectStoreNames
              .contains(
                WALLET_STORE,
              )
          ) {
            const store =
              database
                .createObjectStore(
                  WALLET_STORE,
                  {
                    keyPath:
                      "id",
                  },
                );

            store.createIndex(
              "userId",
              "userId",
              {
                unique:
                  false,
              },
            );

            store.createIndex(
              "addressBase58",
              "addressBase58",
              {
                unique:
                  false,
              },
            );

            store.createIndex(
              "network",
              "network",
              {
                unique:
                  false,
              },
            );
          }
        };

      request.onsuccess =
        () => {
          resolve(
            request.result,
          );
        };

      request.onerror =
        () => {
          reject(
            request.error ??
              new Error(
                "No se pudo abrir IndexedDB.",
              ),
          );
        };

      request.onblocked =
        () => {
          reject(
            new Error(
              "IndexedDB está bloqueada por otra instancia de la aplicación.",
            ),
          );
        };
    },
  );
}

async function getRecord(
  id:
    string,
): Promise<
  WalletStorageRecord |
  null
> {
  const database =
    await openDatabase();

  try {
    return await new Promise(
      (
        resolve,
        reject,
      ) => {
        const transaction =
          database.transaction(
            WALLET_STORE,
            "readonly",
          );

        const store =
          transaction
            .objectStore(
              WALLET_STORE,
            );

        const request =
          store.get(
            id,
          );

        request.onsuccess =
          () => {
            resolve(
              (
                request.result as
                  | WalletStorageRecord
                  | undefined
              ) ??
                null,
            );
          };

        request.onerror =
          () => {
            reject(
              request.error ??
                new Error(
                  "No se pudo leer la wallet local.",
                ),
            );
          };
      },
    );
  } finally {
    database.close();
  }
}

async function putRecord(
  record:
    WalletStorageRecord,
): Promise<void> {
  const database =
    await openDatabase();

  try {
    await new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        const transaction =
          database.transaction(
            WALLET_STORE,
            "readwrite",
          );

        const store =
          transaction
            .objectStore(
              WALLET_STORE,
            );

        store.put(
          record,
        );

        transaction.oncomplete =
          () => {
            resolve();
          };

        transaction.onerror =
          () => {
            reject(
              transaction.error ??
                new Error(
                  "No se pudo guardar la wallet local.",
                ),
            );
          };

        transaction.onabort =
          () => {
            reject(
              transaction.error ??
                new Error(
                  "La operación de almacenamiento fue cancelada.",
                ),
            );
          };
      },
    );
  } finally {
    database.close();
  }
}

async function deleteRecord(
  id:
    string,
): Promise<void> {
  const database =
    await openDatabase();

  try {
    await new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        const transaction =
          database.transaction(
            WALLET_STORE,
            "readwrite",
          );

        const store =
          transaction
            .objectStore(
              WALLET_STORE,
            );

        store.delete(
          id,
        );

        transaction.oncomplete =
          () => {
            resolve();
          };

        transaction.onerror =
          () => {
            reject(
              transaction.error ??
                new Error(
                  "No se pudo eliminar la wallet local.",
                ),
            );
          };

        transaction.onabort =
          () => {
            reject(
              transaction.error ??
                new Error(
                  "La eliminación de la wallet fue cancelada.",
                ),
            );
          };
      },
    );
  } finally {
    database.close();
  }
}

/*
 * ============================================================
 * KDF
 * ============================================================
 */

async function deriveEncryptionKey(
  password:
    string,

  salt:
    Uint8Array,

  iterations:
    number,
): Promise<CryptoKey> {
  ensureBrowser();

  const encoder =
    new TextEncoder();

  const passwordBytes =
    encoder.encode(
      password,
    );

  const passwordMaterial =
    await crypto.subtle
      .importKey(
        "raw",

        toArrayBuffer(
          passwordBytes,
        ),

        {
          name:
            "PBKDF2",
        },

        false,

        [
          "deriveKey",
        ],
      );

  return crypto.subtle
    .deriveKey(
      {
        name:
          "PBKDF2",

        salt:
          toArrayBuffer(
            salt,
          ),

        iterations,

        hash:
          PBKDF2_HASH,
      },

      passwordMaterial,

      {
        name:
          AES_ALGORITHM,

        length:
          AES_KEY_LENGTH,
      },

      false,

      [
        "encrypt",
        "decrypt",
      ],
    );
}

/*
 * ============================================================
 * CIFRADO
 * ============================================================
 */

async function encryptPayload(
  payload:
    WalletSecretPayload,

  password:
    string,
): Promise<{
  salt:
    string;

  iv:
    string;

  ciphertext:
    string;
}> {
  ensureBrowser();

  const salt =
    crypto.getRandomValues(
      new Uint8Array(
        SALT_BYTES,
      ),
    );

  const iv =
    crypto.getRandomValues(
      new Uint8Array(
        IV_BYTES,
      ),
    );

  const key =
    await deriveEncryptionKey(
      password,
      salt,
      PBKDF2_ITERATIONS,
    );

  const encoder =
    new TextEncoder();

  const plaintext =
    encoder.encode(
      JSON.stringify(
        payload,
      ),
    );

  const encrypted =
    await crypto.subtle
      .encrypt(
        {
          name:
            AES_ALGORITHM,

          iv:
            toArrayBuffer(
              iv,
            ),
        },

        key,

        toArrayBuffer(
          plaintext,
        ),
      );

  return {
    salt:
      bytesToBase64(
        salt,
      ),

    iv:
      bytesToBase64(
        iv,
      ),

    ciphertext:
      bytesToBase64(
        new Uint8Array(
          encrypted,
        ),
      ),
  };
}

/*
 * ============================================================
 * DESCIFRADO
 * ============================================================
 */

async function decryptPayload(
  record:
    WalletStorageRecord,

  password:
    string,
): Promise<
  WalletSecretPayload
> {
  ensureBrowser();

  const salt =
    base64ToBytes(
      record.salt,
    );

  const iv =
    base64ToBytes(
      record.iv,
    );

  const ciphertext =
    base64ToBytes(
      record.ciphertext,
    );

  const key =
    await deriveEncryptionKey(
      password,
      salt,
      record.kdfIterations,
    );

  let decrypted:
    ArrayBuffer;

  try {
    decrypted =
      await crypto.subtle
        .decrypt(
          {
            name:
              AES_ALGORITHM,

            iv:
              toArrayBuffer(
                iv,
              ),
          },

          key,

          toArrayBuffer(
            ciphertext,
          ),
        );
  } catch {
    throw new Error(
      "La contraseña de la wallet es incorrecta o los datos locales están dañados.",
    );
  }

  let payload:
    WalletSecretPayload;

  try {
    const decoder =
      new TextDecoder();

    payload =
      JSON.parse(
        decoder.decode(
          decrypted,
        ),
      ) as
        WalletSecretPayload;
  } catch {
    throw new Error(
      "No se pudo interpretar la wallet descifrada.",
    );
  }

  if (
    typeof payload
      .mnemonic !==
      "string" ||
    !payload.mnemonic
      .trim()
  ) {
    throw new Error(
      "La wallet almacenada no contiene una frase de recuperación válida.",
    );
  }

  if (
    typeof payload
      .derivationPath !==
      "string" ||
    !payload
      .derivationPath
      .trim()
  ) {
    throw new Error(
      "La wallet almacenada no contiene una ruta de derivación válida.",
    );
  }

  return payload;
}

/*
 * ============================================================
 * GUARDAR WALLET
 * ============================================================
 */

export async function saveEncryptedWallet(
  input:
    SaveWalletInput,
): Promise<
  StoredWalletMetadata
> {
  ensureBrowser();

  const userId =
    normalizeUserId(
      input.userId,
    );

  const network =
    normalizeNetwork(
      input.network,
    );

  const password =
    normalizePassword(
      input.password,
    );

  const recordId =
    getRecordId(
      userId,
      network,
    );

  const existing =
    await getRecord(
      recordId,
    );

  if (
    existing
  ) {
    throw new Error(
      "Este usuario ya posee una wallet guardada en este dispositivo.",
    );
  }

  if (
    !privateKeyMatchesAddress(
      input.wallet
        .privateKey,

      input.wallet
        .addressBase58,
    )
  ) {
    throw new Error(
      "La private key no corresponde a la dirección TRON generada.",
    );
  }

  const encrypted =
    await encryptPayload(
      {
        mnemonic:
          input.wallet
            .mnemonic,

        derivationPath:
          input.wallet
            .derivationPath,
      },

      password,
    );

  const now =
    new Date()
      .toISOString();

  const record:
    WalletStorageRecord =
      {
        id:
          recordId,

        version:
          STORAGE_VERSION,

        userId,

        network,

        addressBase58:
          input.wallet
            .addressBase58,

        addressHex:
          input.wallet
            .addressHex,

        publicKey:
          input.wallet
            .publicKey,

        kdf:
          "PBKDF2",

        kdfHash:
          "SHA-256",

        kdfIterations:
          PBKDF2_ITERATIONS,

        salt:
          encrypted.salt,

        algorithm:
          "AES-GCM",

        iv:
          encrypted.iv,

        ciphertext:
          encrypted
            .ciphertext,

        createdAt:
          now,

        updatedAt:
          now,
      };

  await putRecord(
    record,
  );

  return {
    userId:
      record.userId,

    network:
      record.network,

    addressBase58:
      record
        .addressBase58,

    addressHex:
      record.addressHex,

    publicKey:
      record.publicKey,

    createdAt:
      record.createdAt,

    updatedAt:
      record.updatedAt,
  };
}

/*
 * ============================================================
 * EXISTE WALLET
 * ============================================================
 */

export async function hasStoredWallet(
  input:
    WalletIdentifier,
): Promise<boolean> {
  ensureBrowser();

  const userId =
    normalizeUserId(
      input.userId,
    );

  const network =
    normalizeNetwork(
      input.network,
    );

  const record =
    await getRecord(
      getRecordId(
        userId,
        network,
      ),
    );

  return Boolean(
    record,
  );
}

/*
 * ============================================================
 * METADATA PÚBLICA
 * ============================================================
 */

export async function getStoredWalletMetadata(
  input:
    WalletIdentifier,
): Promise<
  StoredWalletMetadata |
  null
> {
  ensureBrowser();

  const userId =
    normalizeUserId(
      input.userId,
    );

  const network =
    normalizeNetwork(
      input.network,
    );

  const record =
    await getRecord(
      getRecordId(
        userId,
        network,
      ),
    );

  if (
    !record
  ) {
    return null;
  }

  return {
    userId:
      record.userId,

    network:
      record.network,

    addressBase58:
      record
        .addressBase58,

    addressHex:
      record.addressHex,

    publicKey:
      record.publicKey,

    createdAt:
      record.createdAt,

    updatedAt:
      record.updatedAt,
  };
}

/*
 * ============================================================
 * DESBLOQUEAR WALLET
 * ============================================================
 *
 * La mnemonic se descifra solamente en memoria.
 *
 * Luego regeneramos:
 *
 * mnemonic
 *      ↓
 * BIP44 TRON
 *      ↓
 * private key
 *      ↓
 * address
 *
 * y verificamos que la address derivada sea exactamente
 * la misma que la registrada en IndexedDB.
 */

export async function unlockStoredWallet(
  input:
    UnlockWalletInput,
): Promise<
  UnlockedWallet
> {
  ensureBrowser();

  const userId =
    normalizeUserId(
      input.userId,
    );

  const network =
    normalizeNetwork(
      input.network,
    );

  const password =
    normalizePassword(
      input.password,
    );

  const record =
    await getRecord(
      getRecordId(
        userId,
        network,
      ),
    );

  if (
    !record
  ) {
    throw new Error(
      "No existe una wallet guardada para este usuario en este dispositivo.",
    );
  }

  if (
    record.version !==
    STORAGE_VERSION
  ) {
    throw new Error(
      "La versión de la wallet almacenada no es compatible.",
    );
  }

  if (
    record.kdf !==
      "PBKDF2" ||
    record.kdfHash !==
      "SHA-256" ||
    record.algorithm !==
      "AES-GCM"
  ) {
    throw new Error(
      "El formato criptográfico de la wallet no es compatible.",
    );
  }

  const payload =
    await decryptPayload(
      record,
      password,
    );

  const restored =
    restoreNonCustodialWallet(
      payload.mnemonic,
    );

  if (
    restored
      .derivationPath !==
    payload.derivationPath
  ) {
    throw new Error(
      "La ruta de derivación de la wallet no coincide.",
    );
  }

  if (
    restored
      .addressBase58 !==
    record.addressBase58
  ) {
    throw new Error(
      "La frase de recuperación almacenada no corresponde a la dirección de esta wallet.",
    );
  }

  if (
    restored
      .addressHex !==
    record.addressHex
  ) {
    throw new Error(
      "La dirección hexadecimal derivada no coincide con la wallet almacenada.",
    );
  }

  if (
    payload.privateKey &&
    !privateKeyMatchesAddress(
      payload.privateKey,
      record.addressBase58,
    )
  ) {
    throw new Error(
      "La private key del vault anterior no corresponde a la dirección almacenada.",
    );
  }

  return {
    userId:
      record.userId,

    network:
      record.network,

    addressBase58:
      record
        .addressBase58,

    addressHex:
      record.addressHex,

    publicKey:
      restored.publicKey,

    privateKey:
      restored.privateKey,

    mnemonic:
      restored.mnemonic,

    derivationPath:
      restored
        .derivationPath,
  };
}

/*
 * ============================================================
 * REEMPLAZAR WALLET DESDE RECUPERACIÓN
 * ============================================================
 *
 * Se utiliza cuando ya existe un vault local pero el usuario
 * decide recuperar el acceso mediante sus 12 palabras.
 *
 * El vault anterior NO se borra antes.
 *
 * Primero:
 *
 * 1. restauramos y validamos la misma wallet;
 * 2. generamos completamente el nuevo ciphertext;
 * 3. reemplazamos el registro utilizando IndexedDB.put().
 *
 * Así no existe una ventana entre delete() y save().
 */

export async function replaceEncryptedWalletFromRecovery(
  input:
    SaveWalletInput,
): Promise<
  StoredWalletMetadata
> {
  ensureBrowser();

  const userId =
    normalizeUserId(
      input.userId,
    );

  const network =
    normalizeNetwork(
      input.network,
    );

  const password =
    normalizePassword(
      input.password,
    );

  const recordId =
    getRecordId(
      userId,
      network,
    );

  /*
   * ==========================================================
   * VAULT EXISTENTE
   * ==========================================================
   */

  const existing =
    await getRecord(
      recordId,
    );

  if (
    !existing
  ) {
    throw new Error(
      "No existe una wallet local para reemplazar en este dispositivo.",
    );
  }

  /*
   * ==========================================================
   * MISMA WALLET
   * ==========================================================
   */

  if (
    input.wallet
      .addressBase58 !==
    existing.addressBase58
  ) {
    throw new Error(
      "La frase de recuperación corresponde a otra wallet. La dirección derivada no coincide con la wallet almacenada.",
    );
  }

  if (
    input.wallet
      .addressHex
      .toUpperCase() !==
    existing.addressHex
      .toUpperCase()
  ) {
    throw new Error(
      "La dirección hexadecimal derivada no coincide con la wallet almacenada.",
    );
  }

  /*
   * Validación adicional.
   *
   * La private key derivada de la mnemonic debe controlar
   * exactamente la dirección que ya teníamos almacenada.
   */

  if (
    !privateKeyMatchesAddress(
      input.wallet
        .privateKey,

      existing
        .addressBase58,
    )
  ) {
    throw new Error(
      "La clave privada derivada de la frase de recuperación no corresponde a esta wallet.",
    );
  }

  /*
   * ==========================================================
   * NUEVO CIFRADO
   * ==========================================================
   *
   * encryptPayload genera:
   *
   * - nuevo salt;
   * - nuevo IV;
   * - nueva key PBKDF2;
   * - nuevo ciphertext AES-GCM.
   */

  const encrypted =
    await encryptPayload(
      {
        mnemonic:
          input.wallet
            .mnemonic,

        derivationPath:
          input.wallet
            .derivationPath,
      },

      password,
    );

  const now =
    new Date()
      .toISOString();

  /*
   * Conservamos createdAt del vault original.
   *
   * updatedAt refleja cuándo se reconstruyó el vault.
   */

  const replacement:
    WalletStorageRecord =
      {
        id:
          existing.id,

        version:
          STORAGE_VERSION,

        userId:
          existing.userId,

        network:
          existing.network,

        addressBase58:
          existing
            .addressBase58,

        addressHex:
          existing
            .addressHex,

        publicKey:
          input.wallet
            .publicKey,

        kdf:
          "PBKDF2",

        kdfHash:
          "SHA-256",

        kdfIterations:
          PBKDF2_ITERATIONS,

        salt:
          encrypted.salt,

        algorithm:
          "AES-GCM",

        iv:
          encrypted.iv,

        ciphertext:
          encrypted
            .ciphertext,

        createdAt:
          existing
            .createdAt,

        updatedAt:
          now,
      };

  /*
   * ==========================================================
   * REEMPLAZO
   * ==========================================================
   *
   * putRecord utiliza objectStore.put().
   *
   * Como el ID es el mismo:
   *
   * NILE:userId
   *
   * reemplaza atómicamente el vault anterior.
   */

  await putRecord(
    replacement,
  );

  /*
   * ==========================================================
   * VERIFICACIÓN POSTERIOR
   * ==========================================================
   */

  const stored =
    await getRecord(
      recordId,
    );

  if (
    !stored
  ) {
    throw new Error(
      "La wallet fue recuperada pero el nuevo vault no pudo verificarse.",
    );
  }

  if (
    stored.addressBase58 !==
      existing.addressBase58 ||
    stored.addressHex
      .toUpperCase() !==
      existing.addressHex
        .toUpperCase()
  ) {
    throw new Error(
      "El vault recuperado no coincide con la wallet original.",
    );
  }

  return {
    userId:
      stored.userId,

    network:
      stored.network,

    addressBase58:
      stored
        .addressBase58,

    addressHex:
      stored
        .addressHex,

    publicKey:
      stored
        .publicKey,

    createdAt:
      stored
        .createdAt,

    updatedAt:
      stored
        .updatedAt,
  };
}

/*
 * ============================================================
 * ELIMINAR WALLET LOCAL
 * ============================================================
 *
 * Esta función NO elimina fondos ni direcciones de TRON.
 *
 * Solamente borra el vault cifrado de IndexedDB.
 *
 * No debemos exponerla directamente en UI sin una
 * confirmación fuerte de que el usuario posee su backup.
 */

export async function deleteStoredWallet(
  input:
    WalletIdentifier,
): Promise<void> {
  ensureBrowser();

  const userId =
    normalizeUserId(
      input.userId,
    );

  const network =
    normalizeNetwork(
      input.network,
    );

  await deleteRecord(
    getRecordId(
      userId,
      network,
    ),
  );
}