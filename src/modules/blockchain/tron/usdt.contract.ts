export const USDT_TRC20_DECIMALS =
  6;

export function getUsdtTrc20Contract():
  string {
  const contract =
    process.env
      .USDT_TRC20_CONTRACT
      ?.trim();

  if (!contract) {
    throw new Error(
      "USDT_TRC20_CONTRACT no está configurado.",
    );
  }

  return contract;
}