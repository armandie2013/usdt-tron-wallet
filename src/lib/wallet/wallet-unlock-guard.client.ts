"use client";

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const STORAGE_PREFIX =
  "wallet_unlock_guard";

const MAX_ATTEMPTS =
  3;

const LOCK_DURATIONS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
] as const;

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

export type WalletUnlockNetwork =
  | "NILE"
  | "MAINNET";

interface WalletUnlockGuardRecord {
  version:
    1;

  failedAttempts:
    number;

  lockLevel:
    number;

  lockedUntil:
    number |
    null;

  updatedAt:
    number;
}

export interface WalletUnlockGuardState {
  failedAttempts:
    number;

  attemptsRemaining:
    number;

  lockLevel:
    number;

  locked:
    boolean;

  lockedUntil:
    number |
    null;

  remainingLockMs:
    number;
}

interface WalletUnlockIdentifier {
  userId:
    string;

  network:
    WalletUnlockNetwork;

  addressBase58:
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
      "undefined" ||
    typeof localStorage ===
      "undefined"
  ) {
    throw new Error(
      "El control de desbloqueo de la wallet solo está disponible en el navegador.",
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

function normalizeNetwork(
  network:
    WalletUnlockNetwork,
): WalletUnlockNetwork {
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

function normalizeAddress(
  addressBase58:
    string,
): string {
  const value =
    addressBase58.trim();

  if (
    !value
  ) {
    throw new Error(
      "La dirección TRON no es válida.",
    );
  }

  return value;
}

/*
 * ============================================================
 * STORAGE KEY
 * ============================================================
 */

function getStorageKey(
  input:
    WalletUnlockIdentifier,
): string {
  const userId =
    normalizeUserId(
      input.userId,
    );

  const network =
    normalizeNetwork(
      input.network,
    );

  const address =
    normalizeAddress(
      input.addressBase58,
    );

  return [
    STORAGE_PREFIX,
    network,
    userId,
    address,
  ].join(
    ":",
  );
}

/*
 * ============================================================
 * DEFAULT
 * ============================================================
 */

function createDefaultRecord():
  WalletUnlockGuardRecord {
  return {
    version:
      1,

    failedAttempts:
      0,

    lockLevel:
      0,

    lockedUntil:
      null,

    updatedAt:
      Date.now(),
  };
}

/*
 * ============================================================
 * READ
 * ============================================================
 */

function readRecord(
  input:
    WalletUnlockIdentifier,
): WalletUnlockGuardRecord {
  ensureBrowser();

  const key =
    getStorageKey(
      input,
    );

  const raw =
    localStorage.getItem(
      key,
    );

  if (
    !raw
  ) {
    return createDefaultRecord();
  }

  try {
    const parsed =
      JSON.parse(
        raw,
      ) as
        Partial<WalletUnlockGuardRecord>;

    if (
      parsed.version !==
        1
    ) {
      return createDefaultRecord();
    }

    const failedAttempts =
      typeof parsed.failedAttempts ===
        "number" &&
      Number.isFinite(
        parsed.failedAttempts,
      ) &&
      parsed.failedAttempts >=
        0
        ? Math.floor(
            parsed.failedAttempts,
          )
        : 0;

    const lockLevel =
      typeof parsed.lockLevel ===
        "number" &&
      Number.isFinite(
        parsed.lockLevel,
      ) &&
      parsed.lockLevel >=
        0
        ? Math.floor(
            parsed.lockLevel,
          )
        : 0;

    const lockedUntil =
      typeof parsed.lockedUntil ===
        "number" &&
      Number.isFinite(
        parsed.lockedUntil,
      ) &&
      parsed.lockedUntil >
        0
        ? parsed.lockedUntil
        : null;

    return {
      version:
        1,

      failedAttempts,

      lockLevel,

      lockedUntil,

      updatedAt:
        typeof parsed.updatedAt ===
          "number" &&
        Number.isFinite(
          parsed.updatedAt,
        )
          ? parsed.updatedAt
          : Date.now(),
    };
  } catch {
    return createDefaultRecord();
  }
}

/*
 * ============================================================
 * WRITE
 * ============================================================
 */

function writeRecord(
  input:
    WalletUnlockIdentifier,

  record:
    WalletUnlockGuardRecord,
): void {
  ensureBrowser();

  const key =
    getStorageKey(
      input,
    );

  localStorage.setItem(
    key,
    JSON.stringify(
      record,
    ),
  );
}

/*
 * ============================================================
 * LOCK DURATION
 * ============================================================
 */

function getLockDurationMs(
  lockLevel:
    number,
): number {
  const index =
    Math.max(
      0,
      Math.min(
        lockLevel - 1,
        LOCK_DURATIONS_MS.length -
          1,
      ),
    );

  return LOCK_DURATIONS_MS[
    index
  ];
}

/*
 * ============================================================
 * PUBLIC STATE
 * ============================================================
 */

function buildPublicState(
  record:
    WalletUnlockGuardRecord,
): WalletUnlockGuardState {
  const now =
    Date.now();

  const locked =
    record.lockedUntil !==
      null &&
    record.lockedUntil >
      now;

  const remainingLockMs =
    locked &&
    record.lockedUntil
      ? Math.max(
          0,
          record.lockedUntil -
            now,
        )
      : 0;

  const attemptsRemaining =
    locked
      ? 0
      : Math.max(
          0,
          MAX_ATTEMPTS -
            record.failedAttempts,
        );

  return {
    failedAttempts:
      record.failedAttempts,

    attemptsRemaining,

    lockLevel:
      record.lockLevel,

    locked,

    lockedUntil:
      locked
        ? record.lockedUntil
        : null,

    remainingLockMs,
  };
}

/*
 * ============================================================
 * GET STATE
 * ============================================================
 */

export function getWalletUnlockGuardState(
  input:
    WalletUnlockIdentifier,
): WalletUnlockGuardState {
  const record =
    readRecord(
      input,
    );

  if (
    record.lockedUntil !==
      null &&
    record.lockedUntil <=
      Date.now()
  ) {
    const unlockedRecord:
      WalletUnlockGuardRecord =
        {
          ...record,

          failedAttempts:
            0,

          lockedUntil:
            null,

          updatedAt:
            Date.now(),
        };

    writeRecord(
      input,
      unlockedRecord,
    );

    return buildPublicState(
      unlockedRecord,
    );
  }

  return buildPublicState(
    record,
  );
}

/*
 * ============================================================
 * FAILURE
 * ============================================================
 */

export function registerWalletUnlockFailure(
  input:
    WalletUnlockIdentifier,
): WalletUnlockGuardState {
  const current =
    readRecord(
      input,
    );

  const now =
    Date.now();

  if (
    current.lockedUntil !==
      null &&
    current.lockedUntil >
      now
  ) {
    return buildPublicState(
      current,
    );
  }

  const previousAttempts =
    current.lockedUntil !==
      null &&
    current.lockedUntil <=
      now
      ? 0
      : current.failedAttempts;

  const failedAttempts =
    previousAttempts +
    1;

  if (
    failedAttempts <
    MAX_ATTEMPTS
  ) {
    const record:
      WalletUnlockGuardRecord =
        {
          ...current,

          failedAttempts,

          lockedUntil:
            null,

          updatedAt:
            now,
        };

    writeRecord(
      input,
      record,
    );

    return buildPublicState(
      record,
    );
  }

  const lockLevel =
    current.lockLevel +
    1;

  const lockDurationMs =
    getLockDurationMs(
      lockLevel,
    );

  const record:
    WalletUnlockGuardRecord =
      {
        ...current,

        failedAttempts:
          MAX_ATTEMPTS,

        lockLevel,

        lockedUntil:
          now +
          lockDurationMs,

        updatedAt:
          now,
      };

  writeRecord(
    input,
    record,
  );

  return buildPublicState(
    record,
  );
}

/*
 * ============================================================
 * SUCCESS
 * ============================================================
 */

export function registerWalletUnlockSuccess(
  input:
    WalletUnlockIdentifier,
): WalletUnlockGuardState {
  const record =
    createDefaultRecord();

  writeRecord(
    input,
    record,
  );

  return buildPublicState(
    record,
  );
}

/*
 * ============================================================
 * RESET
 * ============================================================
 */

export function resetWalletUnlockGuard(
  input:
    WalletUnlockIdentifier,
): void {
  ensureBrowser();

  const key =
    getStorageKey(
      input,
    );

  localStorage.removeItem(
    key,
  );
}

/*
 * ============================================================
 * FORMAT TIME
 * ============================================================
 */

export function formatWalletUnlockRemainingTime(
  remainingMs:
    number,
): string {
  const safeMs =
    Math.max(
      0,
      remainingMs,
    );

  const totalSeconds =
    Math.ceil(
      safeMs /
        1000,
    );

  const minutes =
    Math.floor(
      totalSeconds /
        60,
    );

  const seconds =
    totalSeconds %
    60;

  if (
    minutes <=
    0
  ) {
    return `${seconds} s`;
  }

  if (
    seconds ===
    0
  ) {
    return `${minutes} min`;
  }

  return `${minutes} min ${seconds} s`;
}