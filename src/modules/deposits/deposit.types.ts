import type {
  Long,
  ObjectId,
} from "mongodb";

import type {
  TronNetwork,
} from "@/modules/blockchain/tron/tron.types";

/*
 * ============================================================
 * ESTADO DEL EVENTO ON-CHAIN
 * ============================================================
 *
 * El depósito representa un evento USDT real observado
 * directamente en TRON.
 *
 * MongoDB solamente registra/indexa metadata de ese evento.
 */

export type BlockchainDepositStatus =
  | "CONFIRMED"
  | "FAILED";

/*
 * ============================================================
 * DOCUMENTO INDEXADO
 * ============================================================
 */

export interface BlockchainDepositDocument {
  _id?:
    ObjectId;

  /*
   * Usuario asociado a la dirección pública receptora.
   */
  userId:
    ObjectId;

  network:
    TronNetwork;

  asset:
    "USDT";

  contractAddress:
    string;

  txid:
    string;

  /*
   * Permite diferenciar varios eventos dentro
   * de una misma transacción.
   */
  eventIndex:
    number;

  /*
   * Clave determinista y única del evento on-chain.
   */
  eventKey:
    string;

  blockNumber:
    number;

  fromAddress:
    string;

  toAddress:
    string;

  /*
   * Base units USDT.
   *
   * Se mantiene Long porque el esquema existente
   * ya trabaja con BSON Long.
   */
  amountUnits:
    Long;

  blockTimestamp:
    Date;

  status:
    BlockchainDepositStatus;

  /*
   * Campo únicamente informativo si alguna indexación falla.
   */
  errorMessage?:
    string;

  createdAt:
    Date;

  updatedAt:
    Date;
}

/*
 * ============================================================
 * EVENTOS DEL SCANNER DE CONTRATO
 * ============================================================
 */

export interface TronContractTransferEvent {
  block_number:
    number;

  block_timestamp:
    number;

  contract_address:
    string;

  event_index:
    number;

  event_name:
    string;

  transaction_id:
    string;

  result: {
    from?:
      string;

    to?:
      string;

    value?:
      string;

    /*
     * TronGrid también puede devolver parámetros
     * indexados por posición.
     */
    "0"?:
      string;

    "1"?:
      string;

    "2"?:
      string;
  };
}

/*
 * ============================================================
 * RESPUESTA DE EVENTOS DEL CONTRATO
 * ============================================================
 */

export interface TronContractEventsResponse {
  success:
    boolean;

  data?:
    TronContractTransferEvent[];

  meta?: {
    at?:
      number;

    page_size?:
      number;

    fingerprint?:
      string;
  };
}

/*
 * ============================================================
 * HISTORIAL TRC20 POR CUENTA
 * ============================================================
 *
 * Se conserva porque todavía existe el sincronizador
 * manual por usuario.
 */

export interface TronGridTrc20Transaction {
  transaction_id:
    string;

  token_info?: {
    symbol?:
      string;

    address?:
      string;

    decimals?:
      number;

    name?:
      string;
  };

  block_timestamp:
    number;

  from:
    string;

  to:
    string;

  type:
    string;

  value:
    string;
}

/*
 * ============================================================
 * RESPUESTA HISTORIAL TRC20
 * ============================================================
 */

export interface TronGridTrc20Response {
  success:
    boolean;

  data?:
    TronGridTrc20Transaction[];

  meta?: {
    at?:
      number;

    page_size?:
      number;

    fingerprint?:
      string;
  };
}