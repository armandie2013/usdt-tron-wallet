import {
  AppError,
} from "@/lib/errors/app-error";

import type {
  SweepDryRunResult,
} from "./sweep.types";

/*
 * ============================================================
 * SWEEP SERVICE
 * ============================================================
 *
 * IMPORTANTE
 * ============================================================
 *
 * Este módulo pertenecía al diseño custodial anterior.
 *
 * Antes:
 *
 * wallet usuario
 *      ↓
 * backend tenía encryptedPrivateKey
 *      ↓
 * backend descifraba private key
 *      ↓
 * backend firmaba transfer()
 *      ↓
 * fondos enviados a hot wallet
 *
 * Ese comportamiento es incompatible con la arquitectura
 * NO-CUSTODIAL actual.
 *
 * En la nueva arquitectura:
 *
 * - el servidor no posee private keys de clientes;
 * - el servidor no posee mnemonic de clientes;
 * - el servidor no puede firmar por clientes;
 * - los fondos permanecen en la address del usuario;
 * - solamente el usuario puede autorizar movimientos.
 *
 * Por seguridad dejamos este servicio explícitamente
 * deshabilitado.
 *
 * Más adelante podremos reutilizar parte del concepto de
 * "dry run" para estimar recursos, pero ya no como sweep
 * automático hacia una hot wallet.
 * ============================================================
 */

export class SweepService {
  /*
   * ==========================================================
   * DRY RUN
   * ==========================================================
   *
   * Deshabilitado durante la migración.
   *
   * Aunque un dry-run no firma una transacción, el flujo
   * anterior estaba diseñado específicamente para analizar
   * cuánto costaría mover TODO el saldo del cliente hacia
   * una hot wallet.
   *
   * Ese modelo ya no corresponde.
   */

  async dryRun(
    _page:
      number,

    _pageSize:
      number,
  ): Promise<
    SweepDryRunResult
  > {
    throw new AppError(
      "Los sweeps de wallets de clientes están deshabilitados en el modelo no-custodial.",
      "NON_CUSTODIAL_SWEEP_DISABLED",
      409,
    );
  }

  /*
   * ==========================================================
   * EXECUTE SWEEP
   * ==========================================================
   *
   * Esta operación nunca debe volver a:
   *
   * - leer encryptedPrivateKey;
   * - ejecutar decryptValue();
   * - firmar mediante tronWeb.trx.sign();
   * - transmitir fondos del cliente automáticamente.
   */

  async executeSweep(
    _address:
      string,
  ): Promise<never> {
    throw new AppError(
      "El servidor no puede mover fondos de una wallet no-custodial.",
      "NON_CUSTODIAL_SWEEP_DISABLED",
      409,
    );
  }
}