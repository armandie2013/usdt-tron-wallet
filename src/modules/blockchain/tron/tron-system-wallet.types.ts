import type {
  ObjectId,
} from "mongodb";

import type {
  TronNetwork,
} from "./tron.types";

/*
 * ============================================================
 * WALLET DE PLATAFORMA
 * ============================================================
 *
 * Esta wallet pertenece exclusivamente a la plataforma.
 *
 * Puede utilizarse para:
 *
 * - mantener TRX propios;
 * - pagar operaciones propias de la plataforma;
 * - hacer staking de TRX;
 * - obtener Energy;
 * - delegar Energy/Bandwidth;
 * - recibir comisiones de la plataforma.
 *
 * IMPORTANTE:
 *
 * Esta wallet NO contiene fondos pertenecientes a usuarios.
 * Las wallets de usuarios continúan siendo no-custodial.
 */

export type TronSystemWalletCode =
  | "HOT_WALLET"
  | "PLATFORM_TREASURY";

/*
 * HOT_WALLET se mantiene temporalmente por compatibilidad
 * con registros y código legacy.
 *
 * PLATFORM_TREASURY será el código utilizado por el nuevo
 * modelo de wallet propia de la plataforma.
 */

export type TronSystemWalletStatus =
  | "ACTIVE"
  | "DISABLED";

/*
 * ============================================================
 * DOCUMENTO INTERNO
 * ============================================================
 *
 * encryptedPrivateKey puede existir porque esta wallet es
 * propiedad de la plataforma.
 *
 * Nunca debe utilizarse este modelo para wallets de usuarios.
 */

export interface TronSystemWalletDocument {
  _id?:
    ObjectId;

  code:
    TronSystemWalletCode;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  encryptedPrivateKey:
    string;

  status:
    TronSystemWalletStatus;

  createdAt:
    Date;

  updatedAt:
    Date;
}

/*
 * ============================================================
 * REPRESENTACIÓN PÚBLICA / ADMIN
 * ============================================================
 *
 * Nunca exponemos encryptedPrivateKey.
 */

export interface PublicTronSystemWallet {
  id:
    string;

  code:
    TronSystemWalletCode;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  status:
    TronSystemWalletStatus;

  createdAt:
    string;

  updatedAt:
    string;
}