import type {
  ObjectId,
} from "mongodb";

/*
 * ============================================================
 * RED TRON
 * ============================================================
 */

export type TronNetwork =
  | "NILE"
  | "MAINNET";

/*
 * ============================================================
 * TIPO DE WALLET
 * ============================================================
 *
 * A partir de esta migración, las wallets de usuarios
 * son explícitamente NO-CUSTODIAL.
 *
 * El backend:
 *
 * - conoce la dirección pública;
 * - puede consultar balances;
 * - puede consultar transacciones;
 * - puede asociar una dirección a un usuario;
 *
 * pero NO posee:
 *
 * - private key;
 * - mnemonic;
 * - seed;
 * - material secreto de firma.
 */

export type TronWalletType =
  "NON_CUSTODIAL";

/*
 * ============================================================
 * ESTADO DE CUENTA TRON
 * ============================================================
 */

export type TronAccountStatus =
  | "ACTIVE"
  | "DISABLED";

/*
 * ============================================================
 * DOCUMENTO TRON ACCOUNT
 * ============================================================
 *
 * Este es el modelo persistido en MongoDB para las
 * direcciones TRON pertenecientes a usuarios.
 *
 * IMPORTANTE:
 *
 * encryptedPrivateKey fue eliminado intencionalmente.
 *
 * Una cuenta de usuario NO debe volver a almacenar
 * claves privadas en el servidor.
 */

export interface TronAccountDocument {
  _id?:
    ObjectId;

  userId:
    ObjectId;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  walletType:
    TronWalletType;

  status:
    TronAccountStatus;

  createdAt:
    Date;

  updatedAt:
    Date;
}

/*
 * ============================================================
 * CREACIÓN DE CUENTA
 * ============================================================
 *
 * Este tipo se utiliza cuando el frontend registra
 * en el backend una wallet creada localmente.
 *
 * Solo contiene información pública.
 */

export interface CreateTronAccountInput {
  userId:
    string;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;
}

/*
 * ============================================================
 * RESPUESTA PÚBLICA
 * ============================================================
 *
 * Este tipo puede devolverse sin riesgo desde la API.
 */

export interface TronAccountPublic {
  id:
    string;

  userId:
    string;

  network:
    TronNetwork;

  addressBase58:
    string;

  addressHex:
    string;

  walletType:
    TronWalletType;

  status:
    TronAccountStatus;

  createdAt:
    string;

  updatedAt:
    string;
}

/*
 * ============================================================
 * DATOS PÚBLICOS DE BALANCE
 * ============================================================
 *
 * El saldo real NO vive en MongoDB.
 *
 * Se obtiene desde la blockchain.
 */

export interface TronUsdtBalance {
  balanceUnits:
    string;

  formattedBalance:
    string;
}

export interface TronTrxBalance {
  balanceSun:
    string;

  formattedBalance:
    string;
}

/*
 * ============================================================
 * RECURSOS DE RED
 * ============================================================
 */

export interface TronResourceStatus {
  energyAvailable:
    string;

  bandwidthAvailable:
    string;
}

/*
 * ============================================================
 * ESTADO COMPLETO DE WALLET
 * ============================================================
 *
 * Este objeto representa lo que puede consultar
 * nuestra aplicación sobre una wallet pública.
 */

export interface TronWalletStatus {
  account:
    TronAccountPublic;

  usdt:
    TronUsdtBalance;

  trx:
    TronTrxBalance;

  resources:
    TronResourceStatus;
}