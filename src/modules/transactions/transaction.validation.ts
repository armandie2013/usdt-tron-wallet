import {
  z,
} from "zod";

export const internalTransferSchema =
  z.object({
    recipientEmail:
      z
        .string()
        .trim()
        .email(
          "El correo electrónico de destino no es válido.",
        )
        .transform(
          (value) =>
            value.toLowerCase(),
        ),

    amount:
      z
        .string()
        .trim()
        .min(
          1,
          "Debe indicar un monto.",
        ),
  });

export type InternalTransferInput =
  z.infer<
    typeof internalTransferSchema
  >;