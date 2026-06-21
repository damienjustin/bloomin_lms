<h1>Connexion</h1>

<?php if (!empty($error)): ?>
    <p class="error"><?= View::e($error) ?></p>
<?php endif; ?>

<form method="post" action="/login">
    <?= Csrf::field() ?>
    <input type="email" name="email" placeholder="Email" required>
    <input type="password" name="password" placeholder="Mot de passe" required>
    <button type="submit">Se connecter</button>
</form>
