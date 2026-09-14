import bcrypt from "bcryptjs";

import {
  MongoClient,
} from "mongodb";

const {
  MONGODB_URI,
  MONGODB_DB,

  BOOTSTRAP_ADMIN_NAME,
  BOOTSTRAP_ADMIN_EMAIL,
  BOOTSTRAP_ADMIN_PASSWORD,
} = process.env;

async function main() {
  /*
   * ============================================================
   * VALIDACIÓN DE ENTORNO
   * ============================================================
   */

  if (
    !MONGODB_URI ||
    !MONGODB_DB
  ) {
    throw new Error(
      "Faltan MONGODB_URI o MONGODB_DB.",
    );
  }

  const name =
    BOOTSTRAP_ADMIN_NAME
      ?.trim();

  const email =
    BOOTSTRAP_ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

  const password =
    BOOTSTRAP_ADMIN_PASSWORD ??
    "";

  if (
    !name
  ) {
    throw new Error(
      "Falta BOOTSTRAP_ADMIN_NAME.",
    );
  }

  if (
    !email
  ) {
    throw new Error(
      "Falta BOOTSTRAP_ADMIN_EMAIL.",
    );
  }

  if (
    password.length <
      8
  ) {
    throw new Error(
      "BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 8 caracteres.",
    );
  }

  /*
   * ============================================================
   * CONEXIÓN
   * ============================================================
   */

  const client =
    new MongoClient(
      MONGODB_URI,
    );

  try {
    await client.connect();

    const db =
      client.db(
        MONGODB_DB,
      );

    const users =
      db.collection(
        "users",
      );

    /*
     * ==========================================================
     * BLOQUEO DE SEGUNDO ADMIN
     * ==========================================================
     */

    const existingAdmin =
      await users.findOne({
        role:
          "ADMIN",
      });

    if (
      existingAdmin
    ) {
      console.log("");

      console.log(
        "Ya existe un usuario ADMIN. No se creó ningún usuario nuevo.",
      );

      console.log(
        `Email actual: ${existingAdmin.email ?? "no disponible"}`,
      );

      return;
    }

    /*
     * ==========================================================
     * EMAIL DUPLICADO
     * ==========================================================
     */

    const existingEmail =
      await users.findOne({
        email,
      });

    if (
      existingEmail
    ) {
      throw new Error(
        "Ya existe un usuario con el email configurado para el administrador.",
      );
    }

    /*
     * ==========================================================
     * PASSWORD
     * ==========================================================
     */

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    const now =
      new Date();

    /*
     * ==========================================================
     * CREACIÓN
     * ==========================================================
     */

    const result =
      await users.insertOne({
        name,

        email,

        passwordHash,

        role:
          "ADMIN",

        status:
          "ACTIVE",

        emailVerified:
          true,

        createdAt:
          now,

        updatedAt:
          now,
      });

    console.log("");

    console.log(
      "Administrador inicial creado correctamente.",
    );

    console.log(
      `ID: ${result.insertedId.toString()}`,
    );

    console.log(
      `Email: ${email}`,
    );

    console.log("");

    console.log(
      "Por seguridad, eliminá ahora BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD de .env.local.",
    );
  } finally {
    await client.close();
  }
}

main().catch(
  (
    error,
  ) => {
    console.error("");

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode =
      1;
  },
);