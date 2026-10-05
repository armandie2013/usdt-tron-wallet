import {
  AppError,
} from "@/lib/errors/app-error";

import type {
  SweepDocument,
} from "./sweep.model";

function sweepRepositoryDisabled():
  never {
  throw new AppError(
    "El repositorio de sweeps está retirado del modelo no-custodial.",
    "NON_CUSTODIAL_SWEEP_DISABLED",
    410,
  );
}

/*
 * ============================================================
 * SWEEP REPOSITORY
 * ============================================================
 *
 * Conserva temporalmente las firmas públicas del repositorio
 * heredado para no provocar errores de compilación si queda
 * alguna importación durante la migración.
 *
 * Ningún método consulta ni modifica MongoDB. Toda operación
 * queda bloqueada para impedir que se reactive accidentalmente
 * el flujo custodial anterior.
 */

export class SweepRepository {
  async hasActiveSweep(
    _fromAddress:
      string,
  ): Promise<boolean> {
    void _fromAddress;

    return sweepRepositoryDisabled();
  }

  async createPlanned(
    _input: {
      network:
        "NILE" | "MAINNET";

      userId:
        string;

      tronAccountId:
        string;

      fromAddress:
        string;

      toAddress:
        string;

      amountUnits:
        bigint;
    },
  ): Promise<
    SweepDocument
  > {
    void _input;

    return sweepRepositoryDisabled();
  }

  async markBroadcasted(
    _sweepId:
      string,

    _txid:
      string,
  ): Promise<void> {
    void _sweepId;
    void _txid;

    return sweepRepositoryDisabled();
  }

  async markFailed(
    _sweepId:
      string,

    _errorMessage:
      string,
  ): Promise<void> {
    void _sweepId;
    void _errorMessage;

    return sweepRepositoryDisabled();
  }

  async listBroadcasted(
    _limit:
      number,
  ): Promise<
    SweepDocument[]
  > {
    void _limit;

    return sweepRepositoryDisabled();
  }

  async markConfirmed(
    _sweepId:
      string,
  ): Promise<void> {
    void _sweepId;

    return sweepRepositoryDisabled();
  }

  async markFailedByTx(
    _sweepId:
      string,

    _errorMessage:
      string,
  ): Promise<void> {
    void _sweepId;
    void _errorMessage;

    return sweepRepositoryDisabled();
  }
}
