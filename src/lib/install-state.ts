import { prisma } from "@/lib/prisma";

export type InstallState = "needs-database" | "needs-setup" | "ready";

function hasUsableDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  // Placeholder left over from `prisma init` / .env.example.
  if (url.includes("johndoe") || url.includes("user:password@localhost")) return false;
  return true;
}

export async function getInstallState(): Promise<InstallState> {
  if (!hasUsableDatabaseUrl()) {
    return "needs-database";
  }

  try {
    const meta = await prisma.siteMeta.findUnique({ where: { id: 1 } });
    if (meta?.installed) {
      return "ready";
    }
    return "needs-setup";
  } catch {
    // Can't reach the DB, or migrations haven't run yet: both are resolved
    // from the setup step (it runs `prisma migrate deploy` before creating
    // the admin account).
    return "needs-setup";
  }
}
