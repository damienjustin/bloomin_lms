import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageCourses } from "@/lib/roles";

export async function GET() {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, description: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(courses);
}

const schema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!canManageCourses(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: { ...parsed.data, authorId: session!.user.id },
  });

  return NextResponse.json(course, { status: 201 });
}
