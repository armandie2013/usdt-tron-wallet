// import {
//   createCipheriv,
//   createDecipheriv,
//   randomBytes,
// } from "crypto";

// const ALGORITHM =
//   "aes-256-gcm";

// const IV_LENGTH =
//   12;

// const VERSION =
//   "v1";

// function getEncryptionKey():
//   Buffer {
//   const key =
//     process.env
//       .WALLET_ENCRYPTION_KEY;

//   if (!key) {
//     throw new Error(
//       "WALLET_ENCRYPTION_KEY no está configurada.",
//     );
//   }

//   if (
//     !/^[0-9a-fA-F]{64}$/.test(
//       key,
//     )
//   ) {
//     throw new Error(
//       "WALLET_ENCRYPTION_KEY debe contener exactamente 64 caracteres hexadecimales.",
//     );
//   }

//   return Buffer.from(
//     key,
//     "hex",
//   );
// }

// export function encryptValue(
//   value: string,
// ): string {
//   if (!value) {
//     throw new Error(
//       "No se puede cifrar un valor vacío.",
//     );
//   }

//   const key =
//     getEncryptionKey();

//   const iv =
//     randomBytes(
//       IV_LENGTH,
//     );

//   const cipher =
//     createCipheriv(
//       ALGORITHM,
//       key,
//       iv,
//     );

//   const encrypted =
//     Buffer.concat([
//       cipher.update(
//         value,
//         "utf8",
//       ),

//       cipher.final(),
//     ]);

//   const authTag =
//     cipher.getAuthTag();

//   return [
//     VERSION,

//     iv.toString(
//       "base64url",
//     ),

//     authTag.toString(
//       "base64url",
//     ),

//     encrypted.toString(
//       "base64url",
//     ),
//   ].join(":");
// }

// export function decryptValue(
//   value: string,
// ): string {
//   const [
//     version,
//     ivEncoded,
//     authTagEncoded,
//     encryptedEncoded,
//   ] = value.split(":");

//   if (
//     version !== VERSION ||
//     !ivEncoded ||
//     !authTagEncoded ||
//     !encryptedEncoded
//   ) {
//     throw new Error(
//       "El valor cifrado posee un formato inválido.",
//     );
//   }

//   const key =
//     getEncryptionKey();

//   const iv =
//     Buffer.from(
//       ivEncoded,
//       "base64url",
//     );

//   const authTag =
//     Buffer.from(
//       authTagEncoded,
//       "base64url",
//     );

//   const encrypted =
//     Buffer.from(
//       encryptedEncoded,
//       "base64url",
//     );

//   const decipher =
//     createDecipheriv(
//       ALGORITHM,
//       key,
//       iv,
//     );

//   decipher.setAuthTag(
//     authTag,
//   );

//   const decrypted =
//     Buffer.concat([
//       decipher.update(
//         encrypted,
//       ),

//       decipher.final(),
//     ]);

//   return decrypted.toString(
//     "utf8",
//   );
// }

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGORITHM =
  "aes-256-gcm";

const IV_LENGTH =
  12;

const AUTH_TAG_LENGTH =
  16;

const VERSION =
  "v1";

function decodeBase64UrlComponent(
  value:
    string,

  label:
    string,
): Buffer {
  if (
    !/^[A-Za-z0-9_-]+$/.test(
      value,
    )
  ) {
    throw new Error(
      `El componente ${label} posee una codificación inválida.`,
    );
  }

  const decoded =
    Buffer.from(
      value,
      "base64url",
    );

  if (
    decoded.toString(
      "base64url",
    ) !== value
  ) {
    throw new Error(
      `El componente ${label} posee una codificación no canónica.`,
    );
  }

  return decoded;
}

function getEncryptionKey():
  Buffer {
  const key =
    process.env
      .WALLET_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY no está configurada.",
    );
  }

  if (
    !/^[0-9a-fA-F]{64}$/.test(
      key,
    )
  ) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY debe contener exactamente 64 caracteres hexadecimales.",
    );
  }

  return Buffer.from(
    key,
    "hex",
  );
}

export function encryptValue(
  value: string,
): string {
  if (!value) {
    throw new Error(
      "No se puede cifrar un valor vacío.",
    );
  }

  const key =
    getEncryptionKey();

  const iv =
    randomBytes(
      IV_LENGTH,
    );

  const cipher =
    createCipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength:
          AUTH_TAG_LENGTH,
      },
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        value,
        "utf8",
      ),

      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return [
    VERSION,

    iv.toString(
      "base64url",
    ),

    authTag.toString(
      "base64url",
    ),

    encrypted.toString(
      "base64url",
    ),
  ].join(":");
}

export function decryptValue(
  value: string,
): string {
  const parts =
    value.split(":");

  if (
    parts.length !== 4
  ) {
    throw new Error(
      "El valor cifrado posee un formato inválido.",
    );
  }

  const [
    version,
    ivEncoded,
    authTagEncoded,
    encryptedEncoded,
  ] = parts;

  if (
    version !== VERSION ||
    !ivEncoded ||
    !authTagEncoded ||
    !encryptedEncoded
  ) {
    throw new Error(
      "El valor cifrado posee un formato inválido.",
    );
  }

  const key =
    getEncryptionKey();

  const iv =
    decodeBase64UrlComponent(
      ivEncoded,
      "IV",
    );

  const authTag =
    decodeBase64UrlComponent(
      authTagEncoded,
      "authTag",
    );

  const encrypted =
    decodeBase64UrlComponent(
      encryptedEncoded,
      "ciphertext",
    );

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH ||
    encrypted.length === 0
  ) {
    throw new Error(
      "El valor cifrado posee parámetros criptográficos inválidos.",
    );
  }

  const decipher =
    createDecipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength:
          AUTH_TAG_LENGTH,
      },
    );

  decipher.setAuthTag(
    authTag,
  );

  const decrypted =
    Buffer.concat([
      decipher.update(
        encrypted,
      ),

      decipher.final(),
    ]);

  return decrypted.toString(
    "utf8",
  );
}
