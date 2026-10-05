import {
  AppError,
} from "@/lib/errors/app-error";

/*
 * ============================================================
 * SWEEP CONFIRMATION SERVICE
 * ============================================================
 *
 * Este servicio pertenecía al flujo custodial anterior.
 *
 * En el modelo no-custodial el servidor:
 *
 * - no crea sweeps de wallets de usuarios;
 * - no firma transferencias por los usuarios;
 * - no mantiene un proceso activo de confirmación de sweeps.
 *
 * Se conserva temporalmente como bloqueo explícito para evitar
 * que una importación heredada reactive el flujo anterior.
 */

export class SweepConfirmationService {
  async confirmPendingSweeps(
    _limit =
      50,
  ): Promise<never> {
    void _limit;

    throw new AppError(
      "La confirmación de sweeps heredados está retirada del modelo no-custodial.",
      "NON_CUSTODIAL_SWEEP_DISABLED",
      410,
    );
  }
}
