import {
  z,
} from "zod";

const optionalUrl =
  z.preprocess(
    (
      value,
    ) => {
      if (
        typeof value ===
          "string" &&
        value.trim() ===
          ""
      ) {
        return undefined;
      }

      return value;
    },
    z
      .string()
      .url()
      .optional(),
  );

const envSchema =
  z.object({
    NODE_ENV:
      z
        .enum([
          "development",
          "test",
          "production",
        ])
        .default(
          "development",
        ),

    APP_URL:
      z
        .string()
        .url(),

    MONGODB_URI:
      z
        .string()
        .min(
          1,
        ),

    MONGODB_DB:
      z
        .string()
        .min(
          1,
        ),

    AUTH_SECRET:
      z
        .string()
        .min(
          16,
        ),

    AUTH_SESSION_TTL_MINUTES:
      z.coerce
        .number()
        .int()
        .min(
          5,
        )
        .max(
          1440,
        )
        .default(
          15,
        ),

    TRON_NETWORK:
      z.enum([
        "nile",
        "mainnet",
      ]),

    TRON_NILE_FULL_HOST:
      optionalUrl,

    TRON_MAINNET_FULL_HOST:
      optionalUrl,

    TRON_API_KEY:
      z
        .string()
        .optional()
        .default(
          "",
        ),

    WALLET_ENCRYPTION_KEY:
      z
        .string()
        .regex(
          /^[0-9a-fA-F]{64}$/,
          "WALLET_ENCRYPTION_KEY debe contener exactamente 64 caracteres hexadecimales.",
        ),
  });

export const env =
  envSchema.parse({
    NODE_ENV:
      process.env
        .NODE_ENV,

    APP_URL:
      process.env
        .APP_URL,

    MONGODB_URI:
      process.env
        .MONGODB_URI,

    MONGODB_DB:
      process.env
        .MONGODB_DB,

    AUTH_SECRET:
      process.env
        .AUTH_SECRET,

    AUTH_SESSION_TTL_MINUTES:
      process.env
        .AUTH_SESSION_TTL_MINUTES,

    TRON_NETWORK:
      process.env
        .TRON_NETWORK,

    TRON_NILE_FULL_HOST:
      process.env
        .TRON_NILE_FULL_HOST,

    TRON_MAINNET_FULL_HOST:
      process.env
        .TRON_MAINNET_FULL_HOST,

    TRON_API_KEY:
      process.env
        .TRON_API_KEY,

    WALLET_ENCRYPTION_KEY:
      process.env
        .WALLET_ENCRYPTION_KEY,
  });