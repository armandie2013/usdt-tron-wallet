import { z } from "zod";

export const userNameSchema = z
  .string()
  .trim()
  .min(
    2,
    "El nombre debe tener al menos 2 caracteres.",
  )
  .max(
    100,
    "El nombre no puede superar los 100 caracteres.",
  );

export const userEmailSchema = z
  .string()
  .trim()
  .email(
    "El correo electrónico no es válido.",
  )
  .max(
    254,
    "El correo electrónico es demasiado largo.",
  )
  .transform((value) =>
    value.toLowerCase(),
  );