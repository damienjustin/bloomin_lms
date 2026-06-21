import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";

type GithubRelease = {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  body: string;
};

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const repo = process.env.UPDATE_GITHUB_REPO;
  const installedVersion = process.env.CORE_VERSION ?? "0.0.0";

  if (!repo) {
    return NextResponse.json({ error: "UPDATE_GITHUB_REPO is not configured" }, { status: 500 });
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `GitHub API error: ${res.status}` },
      { status: 502 }
    );
  }

  const release = (await res.json()) as GithubRelease;
  const latestVersion = release.tag_name.replace(/^v/, "");

  return NextResponse.json({
    installedVersion,
    latestVersion,
    updateAvailable: latestVersion !== installedVersion,
    releaseUrl: release.html_url,
    releaseNotes: release.body,
    publishedAt: release.published_at,
  });
}
