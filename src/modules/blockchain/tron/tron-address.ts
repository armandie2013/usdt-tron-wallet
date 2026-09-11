import {
  TronWeb,
} from "tronweb";

export function tronEventAddressToBase58(
  value:
    string,
): string {
  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /^0x/,
        "",
      );

  if (
    !/^[0-9a-f]{40}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      `Dirección TRON de evento inválida: ${value}`,
    );
  }

  return TronWeb.address.fromHex(
    `41${normalized}`,
  );
}