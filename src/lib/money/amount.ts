import {
  Long,
} from "mongodb";

const MIN_INT64 =
  -9_223_372_036_854_775_808n;

const MAX_INT64 =
  9_223_372_036_854_775_807n;

export function bigintToLong(
  value: bigint,
): Long {
  if (
    value < MIN_INT64 ||
    value > MAX_INT64
  ) {
    throw new Error(
      "El monto excede el rango permitido.",
    );
  }

  return Long.fromString(
    value.toString(),
  );
}

export function longToBigint(
  value: Long | number,
): bigint {
  if (
    typeof value ===
    "number"
  ) {
    if (
      !Number.isSafeInteger(
        value,
      )
    ) {
      throw new Error(
        "MongoDB devolvió un entero fuera del rango seguro.",
      );
    }

    return BigInt(
      value,
    );
  }

  return BigInt(
    value.toString(),
  );
}