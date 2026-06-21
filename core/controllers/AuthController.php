<?php

final class AuthController
{
    public static function showLogin(): void
    {
        View::render('auth/login', []);
    }

    public static function login(): void
    {
        Csrf::requireValid();

        $email = trim($_POST['email'] ?? '');
        $password = (string) ($_POST['password'] ?? '');

        $stmt = Database::connection()->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            View::render('auth/login', ['error' => 'Email ou mot de passe incorrect.']);
            return;
        }

        Auth::login($user);
        header('Location: /courses');
        exit;
    }

    public static function showRegister(): void
    {
        View::render('auth/register', []);
    }

    public static function register(): void
    {
        Csrf::requireValid();

        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = (string) ($_POST['password'] ?? '');

        if ($name === '' || $email === '' || strlen($password) < 8) {
            View::render('auth/register', ['error' => 'Merci de remplir tous les champs (mot de passe : 8 caractères min.)', 'old' => $_POST]);
            return;
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
        $stmt->execute(['email' => $email]);
        if ($stmt->fetch()) {
            View::render('auth/register', ['error' => 'Cet email est déjà utilisé.', 'old' => $_POST]);
            return;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :hash, "STUDENT")');
        $stmt->execute(['name' => $name, 'email' => $email, 'hash' => $hash]);

        header('Location: /login');
        exit;
    }

    public static function logout(): void
    {
        Auth::logout();
        header('Location: /');
        exit;
    }
}
