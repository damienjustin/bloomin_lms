import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Bloomin LMS</h1>
      <p className="max-w-md text-zinc-600">
        Plateforme de formation en ligne, installable et indépendante par site.
      </p>
      <div className="flex gap-4">
        <Link href="/courses" className="rounded-full bg-black px-5 py-3 text-white">
          Voir les cours
        </Link>
        <Link href="/login" className="rounded-full border px-5 py-3">
          Se connecter
        </Link>
      </div>
    </main>
  );
}
