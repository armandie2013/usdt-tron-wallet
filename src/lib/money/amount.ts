import { USDT_DECIMALS, USDT_SCALE } from "./usdt";

export function parseUsdt(value: string): bigint {
  if (!/^\d+(\.\d{1,6})?$/.test(value)) {
    throw new Error("Invalid USDT amount");
  }

  const [whole, fraction = ""] = value.split(".");
  const paddedFraction = fraction.padEnd(USDT_DECIMALS, "0");

  return BigInt(whole) * USDT_SCALE + BigInt(paddedFraction || "0");
}

export function formatUsdt(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / USDT_SCALE;
  const fraction = (absolute % USDT_SCALE)
    .toString()
    .padStart(USDT_DECIMALS, "0")
    .replace(/0+$/, "");

  const result = fraction ? `${whole}.${fraction}` : whole.toString();
  return negative ? `-${result}` : result;
}

export function serializeAmount(value: bigint): string {
  return value.toString();
}

export function deserializeAmount(value: string): bigint {
  return BigInt(value);
}
