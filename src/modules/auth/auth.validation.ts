import { z } from "zod";

import {
  userEmailSchema,
  userNameSchema,
} from "@/modules/users/user.validation";

export const passwordSchema = z
  .string()
  .min(
    8,
    "La contraseña debe tener al menos 8 caracteres.",
  )
  .max(
    128,
    "La contraseña no puede superar los 128 caracteres.",
  )
  .regex(
    /[a-z]/,
    "La contraseña debe contener al menos una letra minúscula.",
  )
  .regex(
    /[A-Z]/,
    "La contraseña debe contener al menos una letra mayúscula.",
  )
  .regex(
    /\d/,
    "La contraseña debe contener al menos un número.",
  );

export const registerSchema = z.object({
  action: z
    .literal("register")
    .optional(),

  name: userNameSchema,
  email: userEmailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: userEmailSchema,

  password: z
    .string()
    .min(
      1,
      "Debe ingresar una contraseña.",
    ),

  client: z
    .enum([
      "web",
      "mobile",
    ])
    .default("web"),
});

export const refreshSchema = z.object({
  client: z
    .enum([
      "web",
      "mobile",
    ])
    .default("web"),

  refreshToken: z
    .string()
    .min(1)
    .optional(),
});

export type RegisterRequest =
  z.infer<typeof registerSchema>;

export type LoginRequest =
  z.infer<typeof loginSchema>;

export type RefreshRequest =
  z.infer<typeof refreshSchema>;