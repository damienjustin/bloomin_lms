import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!course) notFound();

  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">{course.title}</h1>
      {course.description && <p className="mt-2 text-zinc-600">{course.description}</p>}

      <div className="mt-8 flex flex-col gap-6">
        {course.modules.map((module) => (
          <div key={module.id}>
            <h2 className="text-lg font-medium">{module.title}</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {module.lessons.map((lesson) => (
                <li key={lesson.id} className="rounded border px-4 py-2">
                  {lesson.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
