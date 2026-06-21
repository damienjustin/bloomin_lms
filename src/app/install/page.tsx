"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "database" | "restart" | "setup" | "done";

export default function InstallPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("database");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [db, setDb] = useState({
    host: "localhost",
    port: "3306",
    user: "",
    password: "",
    database: "bloomin_lms",
  });

  const [site, setSite] = useState({
    siteName: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  // Once the server has restarted with the new DATABASE_URL, move on automatically.
  useEffect(() => {
    if (step !== "restart") return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/install/status");
      const data = await res.json();
      if (data.state !== "needs-database") {
        clearInterval(interval);
        setStep("setup");
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [step]);

  async function submitDatabase(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/install/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(db),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setStep("restart");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/install/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setStep("done");
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Installation de Bloomin LMS</h1>

      {step === "database" && (
        <form onSubmit={submitDatabase} className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600">
            Étape 1/2 — Renseigne les informations de connexion à ta base MySQL.
          </p>
          <input
            placeholder="Hôte (ex. localhost)"
            value={db.host}
            onChange={(e) => setDb({ ...db, host: e.target.value })}
            className="rounded border px-3 py-2"
            required
          />
          <input
            placeholder="Port"
            value={db.port}
            onChange={(e) => setDb({ ...db, port: e.target.value })}
            className="rounded border px-3 py-2"
            required
          />
          <input
            placeholder="Utilisateur"
            value={db.user}
            onChange={(e) => setDb({ ...db, user: e.target.value })}
            className="rounded border px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={db.password}
            onChange={(e) => setDb({ ...db, password: e.target.value })}
            className="rounded border px-3 py-2"
          />
          <input
            placeholder="Nom de la base"
            value={db.database}
            onChange={(e) => setDb({ ...db, database: e.target.value })}
            className="rounded border px-3 py-2"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Tester et enregistrer"}
          </button>
        </form>
      )}

      {step === "restart" && (
        <div className="flex flex-col gap-3 rounded border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium">Configuration enregistrée.</p>
          <p className="text-sm text-zinc-700">
            Redémarre le processus Node (ou laisse ton orchestrateur — pm2, Docker,
            systemd — le faire) pour qu&apos;il prenne en compte la nouvelle base de
            données. Cette page passera automatiquement à l&apos;étape suivante dès
            que le serveur sera de retour.
          </p>
        </div>
      )}

      {step === "setup" && (
        <form onSubmit={submitSetup} className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600">
            Étape 2/2 — Crée le compte administrateur et nomme ton site.
          </p>
          <input
            placeholder="Nom du site"
            value={site.siteName}
            onChange={(e) => setSite({ ...site, siteName: e.target.value })}
            className="rounded border px-3 py-2"
            required
          />
          <input
            placeholder="Nom de l'administrateur"
            value={site.adminName}
            onChange={(e) => setSite({ ...site, adminName: e.target.value })}
            className="rounded border px-3 py-2"
            required
          />
          <input
            type="email"
            placeholder="Email administrateur"
            value={site.adminEmail}
            onChange={(e) => setSite({ ...site, adminEmail: e.target.value })}
            className="rounded border px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe (8 caractères min.)"
            value={site.adminPassword}
            onChange={(e) => setSite({ ...site, adminPassword: e.target.value })}
            className="rounded border px-3 py-2"
            minLength={8}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Installation..." : "Terminer l'installation"}
          </button>
        </form>
      )}

      {step === "done" && (
        <p className="text-green-700">Installation terminée, redirection...</p>
      )}
    </main>
  );
}
