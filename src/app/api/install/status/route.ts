import { NextResponse } from "next/server";
import { getInstallState } from "@/lib/install-state";

export async function GET() {
  const state = await getInstallState();
  return NextResponse.json({ state });
}
