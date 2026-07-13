import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../../../generated/prisma/client";

const SYSTEM_DATABASE_NAME = "mysql";

async function main() {
  const host = process.env.DATABASE_HOST;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const databaseName = process.env.DATABASE_NAME;

  if (!host || !user || !password || !databaseName) {
    throw new Error("Faltan variables de entorno de la base de datos");
  }

  const adapter = new PrismaMariaDb({
    host,
    user,
    password,
    database: SYSTEM_DATABASE_NAME,
    connectionLimit: 1,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$executeRawUnsafe(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\``,
    );
    console.log(`DB ${databaseName} creada (o ya existía)`);
  } catch (error) {
    console.error("Error creando la DB:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
