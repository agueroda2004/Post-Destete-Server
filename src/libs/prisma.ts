import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client";

const adapterConfig: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  ssl?: { rejectUnauthorized: boolean };
} = {
  host: process.env.DATABASE_HOST!,
  port: Number(process.env.DATABASE_PORT ?? 4000),
  user: process.env.DATABASE_USER!,
  password: process.env.DATABASE_PASSWORD!,
  database: process.env.DATABASE_NAME!,
  connectionLimit: 5,
};

if (process.env.DATABASE_SSL === "true") {
  adapterConfig.ssl = { rejectUnauthorized: true };
}

const adapter = new PrismaMariaDb(adapterConfig);
const prisma = new PrismaClient({ adapter });

export default prisma;
