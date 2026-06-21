import { NextResponse } from "next/server";
import { z } from "zod";
import mysql from "mysql2/promise";
import { getInstallState } from "@/lib/install-state";
import { buildMysqlUrl, writeEnvValue } from "@/lib/env-file";

const schema = z.object({
  host: z.string().min(1),
  port: z.string().min(1).default("3306"),
  user: z.string().min(1),
  password: z.string().default(""),
  database: z.string().min(1),
});

export async function POST(request: Request) {
  const state = await getInstallState();
  if (state === "ready") {
    return NextResponse.json({ error: "Site already installed" }, { status: 409 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { host, port, user, password, database } = parsed.data;

  let connection;
  try {
    // Connect without selecting a database first, so we can create it if needed.
    connection = await mysql.createConnection({ host, port: Number(port), user, password });
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, "")}\` CHARACTER SET utf8mb4`
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Impossible de se connecter au serveur MySQL : ${(err as Error).message}` },
      { status: 400 }
    );
  } finally {
    await connection?.end();
  }

  const databaseUrl = buildMysqlUrl({ host, port, user, password, database });
  writeEnvValue("DATABASE_URL", databaseUrl);

  return NextResponse.json({
    ok: true,
    message:
      "Connexion réussie et base créée. Redémarre le serveur Node pour appliquer la nouvelle configuration, puis continue l'installation.",
  });
}
