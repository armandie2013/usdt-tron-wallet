export const USDT_DECIMALS = 6;

export const USDT_SCALE =
  1_000_000n;

const USDT_PATTERN =
  /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/;

export function parseUsdt(
  value: string,
): bigint {
  const normalized =
    value.trim();

  const match =
    USDT_PATTERN.exec(
      normalized,
    );

  if (!match) {
    throw new Error(
      "Monto USDT inválido.",
    );
  }

  const integerPart =
    BigInt(match[1]);

  const decimalPart =
    (match[2] ?? "")
      .padEnd(
        USDT_DECIMALS,
        "0",
      );

  return (
    integerPart *
      USDT_SCALE +
    BigInt(
      decimalPart || "0",
    )
  );
}

export function formatUsdt(
  amount: bigint,
): string {
  const negative =
    amount < 0n;

  const absolute =
    negative
      ? -amount
      : amount;

  const integerPart =
    absolute /
    USDT_SCALE;

  const decimalPart =
    absolute %
    USDT_SCALE;

  const formatted =
    `${integerPart}.${decimalPart
      .toString()
      .padStart(
        USDT_DECIMALS,
        "0",
      )}`;

  return negative
    ? `-${formatted}`
    : formatted;
}

export function formatUsdtDisplay(
  amount: bigint,
): string {
  const negative =
    amount < 0n;

  const absolute =
    negative
      ? -amount
      : amount;

  const integerPart =
    absolute /
    USDT_SCALE;

  const decimalPart =
    absolute %
    USDT_SCALE;

  const formattedInteger =
    new Intl.NumberFormat(
      "es-AR",
      {
        maximumFractionDigits:
          0,
      },
    ).format(
      integerPart,
    );

  const decimalText =
    decimalPart
      .toString()
      .padStart(
        USDT_DECIMALS,
        "0",
      )
      .replace(
        /0+$/,
        "",
      );

  const result =
    decimalText
      ? `${formattedInteger},${decimalText}`
      : formattedInteger;

  return negative
    ? `-${result}`
    : result;
}

export function assertPositiveUsdt(
  amount: bigint,
): void {
  if (
    amount <= 0n
  ) {
    throw new Error(
      "El monto debe ser mayor a cero.",
    );
  }
}