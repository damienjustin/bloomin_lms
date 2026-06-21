import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const schema = z.object({ courseId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: { userId: session.user.id, courseId: parsed.data.courseId },
    },
    create: { userId: session.user.id, courseId: parsed.data.courseId },
    update: {},
  });

  return NextResponse.json(enrollment, { status: 201 });
}
