import { NextResponse, type NextRequest } from "next/server";
import { getInstallState } from "@/lib/install-state";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isInstallRoute = pathname === "/install" || pathname.startsWith("/api/install");
  if (isInstallRoute) {
    return NextResponse.next();
  }

  const state = await getInstallState();
  if (state !== "ready") {
    return NextResponse.redirect(new URL("/install", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)).*)"],
};
