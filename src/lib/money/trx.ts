const SUN_PER_TRX =
  1_000_000n;

const TRX_DISPLAY_DECIMALS =
  2;

const SUN_PER_DISPLAY_UNIT =
  SUN_PER_TRX /
  100n;

const HALF_DISPLAY_UNIT_SUN =
  SUN_PER_DISPLAY_UNIT /
  2n;

const INTEGER_FORMATTER =
  new Intl.NumberFormat(
    "es-AR",
    {
      maximumFractionDigits:
        0,
    },
  );

/*
 * ============================================================
 * FORMATO TRX
 * ============================================================
 *
 * Recibe el importe exacto expresado en SUN.
 *
 * Los cálculos internos conservan los 6 decimales de TRX.
 * Solamente la presentación se redondea a 2 decimales.
 *
 * Ejemplos:
 *
 * 1.465000 TRX -> 1,47
 * 998.965000 TRX -> 998,97
 * 1000 TRX -> 1.000,00
 */

export function formatSunAsTrxDisplay(
  amountSun:
    bigint,
): string {
  const negative =
    amountSun <
    0n;

  const absolute =
    negative
      ? -amountSun
      : amountSun;

  /*
   * Cada centésima de TRX equivale a 10.000 SUN.
   *
   * Sumamos media centésima antes de dividir para realizar
   * redondeo normal sin utilizar números de coma flotante.
   */

  const roundedHundredths =
    (
      absolute +
      HALF_DISPLAY_UNIT_SUN
    ) /
    SUN_PER_DISPLAY_UNIT;

  const integerPart =
    roundedHundredths /
    100n;

  const decimalPart =
    roundedHundredths %
    100n;

  const formatted =
    `${INTEGER_FORMATTER.format(
      integerPart,
    )},${decimalPart
      .toString()
      .padStart(
        TRX_DISPLAY_DECIMALS,
        "0",
      )}`;

  return negative
    ? `-${formatted}`
    : formatted;
}

/*
 * ============================================================
 * FORMATO DE RECURSOS TRON
 * ============================================================
 *
 * Energy y Bandwidth son unidades enteras.
 *
 * Ejemplos:
 *
 * 1000 -> 1.000
 * 25000 -> 25.000
 */

export function formatTronResourceDisplay(
  value:
    string |
    number |
    bigint,
): string {
  try {
    return INTEGER_FORMATTER.format(
      BigInt(
        value,
      ),
    );
  } catch {
    /*
     * Si eventualmente la API devuelve un valor inesperado,
     * conservamos el valor original para no romper la interfaz.
     */

    return String(
      value,
    );
  }
}