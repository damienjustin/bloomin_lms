# Bloomin LMS

LMS/CMS en PHP pur, installable indépendamment par site (un peu comme
WordPress), avec un noyau (`core/`) commun mis à jour via les releases
GitHub de ce dépôt.

## Stack

- PHP 8.4+ (aucun framework, autoload maison)
- MySQL / MariaDB via PDO
- Sessions PHP natives pour l'authentification

## Démarrage

### Prérequis

- PHP 8.4+ avec l'extension `pdo_mysql`
- Un serveur MySQL/MariaDB accessible
- Apache (avec `mod_rewrite`) ou tout serveur pointant sur `public/` ; pour
  le développement, le serveur intégré de PHP fonctionne aussi

### Lancer le serveur

```bash
php -S localhost:8000 -t public public/router.php
```

### Installation (assistant façon WordPress)

1. Ouvrir `http://localhost:8000/` : tu es redirigé vers `/install` tant
   que le site n'est pas installé.
2. **Étape 1** : renseigne les identifiants MySQL. La connexion est testée
   en direct, la base est créée si besoin, et le fichier `config.php`
   (gitignored, équivalent de `wp-config.php`) est écrit. Contrairement à
   une stack Node.js, **aucun redémarrage de process n'est nécessaire** :
   `config.php` est relu à chaque requête PHP.
3. **Étape 2** : crée le compte administrateur et nomme le site. Le schéma
   SQL (`database/schema.sql`) est appliqué automatiquement.
4. Une fois installé, `/install` se verrouille (redirection vers l'accueil).

## Structure du projet

```
public/             Front controller (point d'entrée web)
core/
  bootstrap.php      Autoload, gestion des erreurs, session
  lib/                Database, Auth, Config, Csrf, Updater, InstallState
  controllers/        InstallController, AuthController, CourseController, AdminController
  views/              Templates PHP (layout + vues par section)
database/schema.sql  Schéma SQL appliqué par l'installateur
config.sample.php    Référence de configuration (config.php est généré)
```

## Modèle de données (MVP)

- `users` (rôles ADMIN / INSTRUCTOR / STUDENT)
- `courses` → `modules` → `lessons`
- `enrollments`, `lesson_progress`
- `site_meta` : statut d'installation, nom du site, version du core installée

## Mises à jour centralisées via GitHub

La page `/admin/updates` (réservée aux admins) interroge l'API GitHub
Releases du dépôt configuré dans `config.php` (`app.update_repo`) et
compare la dernière version publiée à `app.core_version` (version
installée sur ce site). La mise à jour effective (récupération du code,
migrations SQL) reste manuelle pour ce MVP : l'admin est notifié et suit
le lien vers la release.
