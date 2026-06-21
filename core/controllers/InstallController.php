<?php

final class InstallController
{
    public static function show(): void
    {
        $state = InstallState::current();

        if ($state === InstallState::READY) {
            header('Location: /');
            exit;
        }

        if ($state === InstallState::NEEDS_DATABASE) {
            View::render('install/database', ['old' => []]);
            return;
        }

        View::render('install/setup', ['old' => []]);
    }

    public static function submitDatabase(): void
    {
        Csrf::requireValid();

        $host = trim($_POST['host'] ?? '');
        $port = trim($_POST['port'] ?? '3306');
        $user = trim($_POST['user'] ?? '');
        $password = (string) ($_POST['password'] ?? '');
        $database = trim($_POST['database'] ?? '');

        if ($host === '' || $user === '' || $database === '') {
            View::render('install/database', ['error' => 'Tous les champs sont requis.', 'old' => $_POST]);
            return;
        }

        try {
            $pdo = Database::connect($host, $port, null, $user, $password);
            $safeDbName = str_replace('`', '', $database);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$safeDbName}` CHARACTER SET utf8mb4");
        } catch (Throwable $e) {
            View::render('install/database', [
                'error' => 'Impossible de se connecter au serveur MySQL : ' . $e->getMessage(),
                'old' => $_POST,
            ]);
            return;
        }

        $existing = Config::exists() ? Config::load() : [];
        $existing['db'] = compact('host', 'port', 'database', 'user', 'password');
        $existing['app'] = $existing['app'] ?? [
            'secret' => bin2hex(random_bytes(32)),
            'core_version' => '0.1.0',
            'update_repo' => 'damienjustin/bloomin_lms',
        ];
        Config::write($existing);

        header('Location: /install');
        exit;
    }

    public static function submitSetup(): void
    {
        Csrf::requireValid();

        $state = InstallState::current();
        if ($state === InstallState::NEEDS_DATABASE) {
            header('Location: /install');
            exit;
        }
        if ($state === InstallState::READY) {
            header('Location: /');
            exit;
        }

        $siteName = trim($_POST['site_name'] ?? '');
        $adminName = trim($_POST['admin_name'] ?? '');
        $adminEmail = trim($_POST['admin_email'] ?? '');
        $adminPassword = (string) ($_POST['admin_password'] ?? '');

        if ($siteName === '' || $adminName === '' || $adminEmail === '' || strlen($adminPassword) < 8) {
            View::render('install/setup', ['error' => 'Merci de remplir tous les champs (mot de passe : 8 caractères min.)', 'old' => $_POST]);
            return;
        }

        $pdo = Database::connection();

        $schema = file_get_contents(dirname(__DIR__, 2) . '/database/schema.sql');
        foreach (array_filter(array_map('trim', explode(';', $schema))) as $statement) {
            $pdo->exec($statement);
        }

        $passwordHash = password_hash($adminPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :hash, "ADMIN")
             ON DUPLICATE KEY UPDATE password_hash = :hash, role = "ADMIN"'
        );
        $stmt->execute(['name' => $adminName, 'email' => $adminEmail, 'hash' => $passwordHash]);

        $coreVersion = Config::get('app.core_version', '0.1.0');
        $stmt = $pdo->prepare(
            'INSERT INTO site_meta (id, installed, site_name, core_version) VALUES (1, 1, :name, :version)
             ON DUPLICATE KEY UPDATE installed = 1, site_name = :name'
        );
        $stmt->execute(['name' => $siteName, 'version' => $coreVersion]);

        header('Location: /login');
        exit;
    }
}
