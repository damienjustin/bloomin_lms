import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Cours disponibles</h1>
      {courses.length === 0 && <p className="text-zinc-600">Aucun cours publié pour le moment.</p>}
      <ul className="flex flex-col gap-4">
        {courses.map((course) => (
          <li key={course.id} className="rounded border p-4">
            <Link href={`/courses/${course.slug}`} className="text-lg font-medium underline">
              {course.title}
            </Link>
            {course.description && <p className="mt-1 text-zinc-600">{course.description}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
