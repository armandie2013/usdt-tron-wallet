import bcrypt from "bcryptjs";
import {
  MongoClient,
} from "mongodb";

import {
  createInterface,
} from "node:readline/promises";

import {
  stdin as input,
  stdout as output,
} from "node:process";

const {
  MONGODB_URI,
  MONGODB_DB,
} = process.env;

if (
  !MONGODB_URI ||
  !MONGODB_DB
) {
  console.error(
    "Faltan MONGODB_URI o MONGODB_DB.",
  );

  process.exit(1);
}

const rl =
  createInterface({
    input,
    output,
  });

const client =
  new MongoClient(
    MONGODB_URI,
  );

try {
  const name =
    (
      await rl.question(
        "Nombre del administrador: ",
      )
    ).trim();

  const email =
    (
      await rl.question(
        "Email: ",
      )
    )
      .trim()
      .toLowerCase();

  const password =
    await rl.question(
      "Contraseña: ",
    );

  if (
    !name ||
    !email ||
    password.length < 8
  ) {
    throw new Error(
      "Datos inválidos. La contraseña debe tener al menos 8 caracteres.",
    );
  }

  await client.connect();

  const db =
    client.db(
      MONGODB_DB,
    );

  const users =
    db.collection(
      "users",
    );

  const existing =
    await users.findOne({
      email,
    });

  if (existing) {
    throw new Error(
      "Ya existe un usuario con ese email.",
    );
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12,
    );

  const now =
    new Date();

  const result =
    await users.insertOne({
      name,
      email,
      passwordHash,

      role: "ADMIN",
      status: "ACTIVE",

      emailVerified:
        true,

      createdAt: now,
      updatedAt: now,
    });

  console.log("");
  console.log(
    "Administrador creado correctamente.",
  );

  console.log(
    `ID: ${result.insertedId.toString()}`,
  );
} catch (error) {
  console.error("");

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
} finally {
  rl.close();

  await client.close();
}