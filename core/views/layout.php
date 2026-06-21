<?php
$user = Auth::user();
?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bloomin LMS</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; margin: 0; color: #1a1a1a; background: #fafafa; }
        header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; background: #fff; border-bottom: 1px solid #e5e5e5; }
        header a { color: inherit; text-decoration: none; font-weight: 600; }
        nav a { margin-left: 1rem; color: #444; text-decoration: none; }
        main { max-width: 760px; margin: 0 auto; padding: 2rem 1.5rem; }
        h1 { font-size: 1.6rem; }
        form { display: flex; flex-direction: column; gap: 0.7rem; max-width: 420px; }
        input, textarea, select { padding: 0.6rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; }
        button { padding: 0.6rem 1.2rem; border: none; border-radius: 999px; background: #111; color: #fff; cursor: pointer; font-size: 1rem; }
        button:hover { background: #333; }
        .card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #fff; }
        .error { color: #b00020; }
        .success { color: #1a7a1a; }
        .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #fff3cd; font-size: 0.85rem; }
        ul { padding-left: 1.2rem; }
    </style>
</head>
<body>
<header>
    <a href="/">Bloomin LMS</a>
    <nav>
        <a href="/courses">Cours</a>
        <?php if ($user): ?>
            <?php if ($user['role'] === 'ADMIN'): ?>
                <a href="/admin/courses">Admin</a>
                <a href="/admin/updates">Mises à jour</a>
            <?php endif; ?>
            <a href="/logout">Déconnexion (<?= View::e($user['name']) ?>)</a>
        <?php else: ?>
            <a href="/login">Connexion</a>
            <a href="/register">Inscription</a>
        <?php endif; ?>
    </nav>
</header>
<main>
<?= $content ?>
</main>
</body>
</html>
