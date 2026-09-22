// import { z } from "zod";

// const envSchema = z.object({
//   NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
//   APP_URL: z.string().url(),
//   MONGODB_URI: z.string().min(1),
//   MONGODB_DB: z.string().min(1),
//   AUTH_SECRET: z.string().min(16),
//   TRON_NETWORK: z.enum(["nile", "shasta", "mainnet"]).default("nile"),
//   TRON_FULL_HOST: z.string().url(),
//   TRON_API_KEY: z.string().optional().default(""),
//   USDT_TRC20_CONTRACT: z.string().optional().default(""),
//   WALLET_ENCRYPTION_KEY: z.string().optional().default(""),
// });

// export const env = envSchema.parse({
//   NODE_ENV: process.env.NODE_ENV,
//   APP_URL: process.env.APP_URL,
//   MONGODB_URI: process.env.MONGODB_URI,
//   MONGODB_DB: process.env.MONGODB_DB,
//   AUTH_SECRET: process.env.AUTH_SECRET,
//   TRON_NETWORK: process.env.TRON_NETWORK,
//   TRON_FULL_HOST: process.env.TRON_FULL_HOST,
//   TRON_API_KEY: process.env.TRON_API_KEY,
//   USDT_TRC20_CONTRACT: process.env.USDT_TRC20_CONTRACT,
//   WALLET_ENCRYPTION_KEY: process.env.WALLET_ENCRYPTION_KEY,
// });
import {
  z,
} from "zod";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

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

/*
 * ============================================================
 * ESQUEMA DE ENTORNO
 * ============================================================
 *
 * TRON_NETWORK es obligatoria y solamente acepta:
 *
 * - nile
 * - mainnet
 *
 * Los contratos USDT ya no se configuran desde .env.
 * La fuente de verdad está en tron.config.ts.
 */

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

/*
 * ============================================================
 * ENTORNO VALIDADO
 * ============================================================
 */

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
