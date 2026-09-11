import {
  TronWeb,
} from "tronweb";

function getTronConfiguration() {
  const fullHost =
    process.env
      .TRON_FULL_HOST
      ?.trim();

  if (!fullHost) {
    throw new Error(
      "TRON_FULL_HOST no está configurado.",
    );
  }

  const apiKey =
    process.env
      .TRON_API_KEY
      ?.trim();

  return {
    fullHost,
    apiKey,
  };
}

export class TronClient {
  /*
   * Cliente compartido SOLO para operaciones
   * que no mutan address/privateKey.
   */
  private static instance:
    TronWeb | null = null;

  static getInstance():
    TronWeb {
    if (
      TronClient.instance
    ) {
      return TronClient.instance;
    }

    const {
      fullHost,
      apiKey,
    } =
      getTronConfiguration();

    TronClient.instance =
      new TronWeb({
        fullHost,

        headers:
          apiKey
            ? {
                "TRON-PRO-API-KEY":
                  apiKey,
              }
            : undefined,
      });

    return TronClient.instance;
  }

  /*
   * Nueva instancia independiente.
   *
   * Usarla siempre que necesitemos setAddress()
   * o setPrivateKey().
   */
  static create():
    TronWeb {
    const {
      fullHost,
      apiKey,
    } =
      getTronConfiguration();

    return new TronWeb({
      fullHost,

      headers:
        apiKey
          ? {
              "TRON-PRO-API-KEY":
                apiKey,
            }
          : undefined,
    });
  }

  static createForAddress(
    address:
      string,
  ): TronWeb {
    const tronWeb =
      TronClient.create();

    tronWeb.setAddress(
      address,
    );

    return tronWeb;
  }
}