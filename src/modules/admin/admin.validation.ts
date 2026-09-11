import { z } from "zod";

export const testCreditSchema = z.object({
  email: z
    .string()
    .trim()
    .email(
      "El correo electrónico no es válido.",
    )
    .transform((value) =>
      value.toLowerCase(),
    ),

  amount: z
    .string()
    .trim()
    .min(
      1,
      "Debe indicar un monto.",
    ),
});

export type TestCreditInput =
  z.infer<typeof testCreditSchema>;