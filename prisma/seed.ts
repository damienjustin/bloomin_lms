import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    create: { name: "Admin", email: "admin@example.com", passwordHash, role: "ADMIN" },
    update: {},
  });

  const course = await prisma.course.upsert({
    where: { slug: "intro-bloomin-lms" },
    create: {
      title: "Introduction à Bloomin LMS",
      slug: "intro-bloomin-lms",
      description: "Premier cours de démonstration.",
      status: "PUBLISHED",
      authorId: admin.id,
      modules: {
        create: [
          {
            title: "Module 1 : Bien démarrer",
            position: 1,
            lessons: {
              create: [
                { title: "Bienvenue", position: 1, content: "Contenu de la leçon." },
                { title: "Prise en main", position: 2, content: "Contenu de la leçon." },
              ],
            },
          },
        ],
      },
    },
    update: {},
  });

  await prisma.siteMeta.upsert({
    where: { id: 1 },
    create: { id: 1, installed: true, siteName: "Bloomin LMS (dev)", coreVersion: process.env.CORE_VERSION ?? "0.1.0" },
    update: {},
  });

  console.log("Seed done:", { admin: admin.email, course: course.slug });
}

main().finally(() => prisma.$disconnect());
