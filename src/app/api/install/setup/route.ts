import { NextResponse } from "next/server";
import { execSync } from "child_process";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getInstallState } from "@/lib/install-state";

const schema = z.object({
  siteName: z.string().min(1),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const state = await getInstallState();
  if (state === "needs-database") {
    return NextResponse.json(
      { error: "La base de données n'est pas encore configurée." },
      { status: 400 }
    );
  }
  if (state === "ready") {
    return NextResponse.json({ error: "Site already installed" }, { status: 409 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { siteName, adminName, adminEmail, adminPassword } = parsed.data;

  try {
    execSync("npx prisma migrate deploy", { stdio: "pipe" });
  } catch (err) {
    return NextResponse.json(
      { error: `Échec des migrations : ${(err as Error).message}` },
      { status: 500 }
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { email: adminEmail },
      create: { name: adminName, email: adminEmail, passwordHash, role: "ADMIN" },
      update: { passwordHash, role: "ADMIN" },
    });

    await tx.siteMeta.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        installed: true,
        siteName,
        coreVersion: process.env.CORE_VERSION ?? "0.1.0",
      },
      update: { installed: true, siteName },
    });
  });

  return NextResponse.json({ ok: true });
}
