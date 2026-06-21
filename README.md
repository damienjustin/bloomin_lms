# Bloomin LMS

LMS/CMS installable indépendamment par site, avec un noyau (core) commun
mis à jour via les releases GitHub de ce dépôt.

## Stack

- Next.js (App Router, full-stack)
- Prisma + MySQL
- NextAuth (credentials) pour l'authentification

## Démarrage

1. Copier `.env.example` en `.env` et renseigner `DATABASE_URL`, `AUTH_SECRET`.
2. Installer les dépendances : `npm install`
3. Appliquer le schéma : `npx prisma migrate dev --name init`
4. Charger les données de démo : `npx prisma db seed`
5. Lancer le serveur : `npm run dev`

Compte de démo créé par le seed : `admin@example.com` / `password123`.

## Modèle de données (MVP)

- `User` (rôles ADMIN / INSTRUCTOR / STUDENT)
- `Course` → `Module` → `Lesson`
- `Enrollment`, `LessonProgress`
- `SiteMeta` : version du core installée sur ce site

## Mises à jour centralisées via GitHub

La page `/admin/updates` (réservée aux admins) interroge l'API GitHub
Releases du dépôt configuré dans `UPDATE_GITHUB_REPO` et compare la
dernière version publiée à `CORE_VERSION` (version installée sur ce site).
La mise à jour effective (récupération du code, migrations Prisma) reste
manuelle pour ce MVP : l'admin est notifié et suit le lien vers la release.
