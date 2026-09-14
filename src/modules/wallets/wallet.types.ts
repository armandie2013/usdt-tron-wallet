export type WalletAsset =
  "USDT";

/*
 * ============================================================
 * WALLET PÚBLICA
 * ============================================================
 *
 * Este módulo ya no representa cuentas contables internas.
 *
 * PublicWalletAccount es solamente un contrato de salida
 * utilizado por la aplicación para representar la wallet
 * pública TRON del usuario.
 *
 * El saldo proviene directamente de TRON.
 */

export interface PublicWalletAccount {
  /*
   * ID del documento público TronAccount.
   */
  id:
    string;

  userId:
    string;

  asset:
    WalletAsset;

  /*
   * Estado público de la cuenta TRON.
   *
   * Lo mantenemos como string porque el documento recuperado
   * actualmente expone status con ese tipo.
   *
   * La validación específica de estados pertenece al módulo
   * blockchain/TRON, no a este DTO de compatibilidad.
   */
  status:
    string;

  /*
   * Saldo expresado en las unidades mínimas de USDT.
   *
   * USDT utiliza 6 decimales.
   *
   * Ejemplo:
   *
   * 12500000 = 12.5 USDT
   */
  balance:
    string;

  /*
   * Representación lista para mostrar.
   *
   * Ejemplo:
   *
   * "12.5"
   */
  formattedBalance:
    string;

  createdAt:
    string;

  updatedAt:
    string;
}