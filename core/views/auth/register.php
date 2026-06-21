<h1>Créer un compte</h1>

<?php if (!empty($error)): ?>
    <p class="error"><?= View::e($error) ?></p>
<?php endif; ?>

<form method="post" action="/register">
    <?= Csrf::field() ?>
    <input name="name" placeholder="Nom" value="<?= View::e($old['name'] ?? '') ?>" required>
    <input type="email" name="email" placeholder="Email" value="<?= View::e($old['email'] ?? '') ?>" required>
    <input type="password" name="password" placeholder="Mot de passe (8 caractères min.)" minlength="8" required>
    <button type="submit">S'inscrire</button>
</form>
