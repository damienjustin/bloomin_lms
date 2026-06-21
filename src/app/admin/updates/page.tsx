"use client";

import { useEffect, useState } from "react";

type UpdateInfo = {
  installedVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  releaseNotes: string;
  publishedAt: string;
};

export default function AdminUpdatesPage() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/updates")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Erreur");
        }
        return res.json();
      })
      .then(setInfo)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="mx-auto max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Mises à jour</h1>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {info && (
        <div className="mt-6 rounded border p-4">
          <p>Version installée : <strong>{info.installedVersion}</strong></p>
          <p>Dernière version disponible : <strong>{info.latestVersion}</strong></p>
          {info.updateAvailable ? (
            <div className="mt-4 rounded bg-amber-50 p-3">
              <p className="font-medium">Une mise à jour est disponible.</p>
              <a
                href={info.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Voir la release sur GitHub
              </a>
            </div>
          ) : (
            <p className="mt-4 text-green-700">Le site est à jour.</p>
          )}
        </div>
      )}
    </main>
  );
}
