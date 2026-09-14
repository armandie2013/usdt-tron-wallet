"use client";

/*
 * ============================================================
 * RECOVERY PHRASE VERIFICATION
 * ============================================================
 *
 * Genera posiciones aleatorias y distintas para comprobar
 * que el usuario realmente guardó su frase de recuperación.
 *
 * Ejemplo:
 *
 * [2, 6, 12]
 *
 * Las posiciones son 1-based para poder mostrarlas
 * directamente al usuario.
 *
 * Se utiliza Web Crypto.
 * No se utiliza Math.random().
 */

export interface RecoveryVerificationChallenge {
  positions:
    number[];
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
    typeof crypto ===
      "undefined" ||
    typeof crypto
      .getRandomValues !==
      "function"
  ) {
    throw new Error(
      "La verificación aleatoria de la frase de recuperación requiere un navegador compatible.",
    );
  }
}

/*
 * ============================================================
 * RANDOM INTEGER
 * ============================================================
 *
 * Devuelve:
 *
 * 0 <= value < maxExclusive
 *
 * Utilizamos rejection sampling para evitar sesgo
 * producido por un módulo directo.
 */

function secureRandomInt(
  maxExclusive:
    number,
): number {
  ensureBrowser();

  if (
    !Number.isInteger(
      maxExclusive,
    ) ||
    maxExclusive <=
      0
  ) {
    throw new Error(
      "El límite aleatorio no es válido.",
    );
  }

  const range =
    0x1_0000_0000;

  const limit =
    range -
    (
      range %
      maxExclusive
    );

  const buffer =
    new Uint32Array(
      1,
    );

  while (
    true
  ) {
    crypto.getRandomValues(
      buffer,
    );

    const value =
      buffer[0];

    if (
      value <
      limit
    ) {
      return value %
        maxExclusive;
    }
  }
}

/*
 * ============================================================
 * GENERAR POSICIONES
 * ============================================================
 */

export function generateRecoveryVerificationPositions(
  totalWords:
    number =
      12,

  requestedWords:
    number =
      3,
): RecoveryVerificationChallenge {
  ensureBrowser();

  if (
    !Number.isInteger(
      totalWords,
    ) ||
    totalWords <
      1
  ) {
    throw new Error(
      "La cantidad total de palabras no es válida.",
    );
  }

  if (
    !Number.isInteger(
      requestedWords,
    ) ||
    requestedWords <
      1 ||
    requestedWords >
      totalWords
  ) {
    throw new Error(
      "La cantidad de palabras a verificar no es válida.",
    );
  }

  /*
   * Posiciones 1..N.
   */
  const positions =
    Array.from(
      {
        length:
          totalWords,
      },
      (
        _,
        index,
      ) =>
        index +
        1,
    );

  /*
   * Fisher-Yates parcial.
   *
   * Solo necesitamos seleccionar las primeras
   * requestedWords posiciones.
   */
  for (
    let index =
      0;
    index <
      requestedWords;
    index++
  ) {
    const remaining =
      totalWords -
      index;

    const randomOffset =
      secureRandomInt(
        remaining,
      );

    const randomIndex =
      index +
      randomOffset;

    [
      positions[index],
      positions[randomIndex],
    ] = [
      positions[randomIndex],
      positions[index],
    ];
  }

  /*
   * Ordenamos únicamente para que la interfaz
   * resulte más natural:
   *
   * palabra 2
   * palabra 7
   * palabra 10
   *
   * en vez de 10, 2, 7.
   */
  const selected =
    positions
      .slice(
        0,
        requestedWords,
      )
      .sort(
        (
          a,
          b,
        ) =>
          a -
          b,
      );

  return {
    positions:
      selected,
  };
}

/*
 * ============================================================
 * VALIDAR PALABRA
 * ============================================================
 */

export function recoveryWordMatches(
  mnemonic:
    string,

  position:
    number,

  enteredWord:
    string,
): boolean {
  const words =
    mnemonic
      .trim()
      .toLowerCase()
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      );

  if (
    !Number.isInteger(
      position,
    ) ||
    position <
      1 ||
    position >
      words.length
  ) {
    return false;
  }

  const normalizedEntered =
    enteredWord
      .trim()
      .toLowerCase();

  return (
    normalizedEntered ===
    words[
      position -
      1
    ]
  );
}