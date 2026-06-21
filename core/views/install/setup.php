<h1>Installation — Étape 2/2</h1>
<p>Connexion à la base réussie. Crée maintenant le compte administrateur et nomme ton site.</p>

<?php if (!empty($error)): ?>
    <p class="error"><?= View::e($error) ?></p>
<?php endif; ?>

<form method="post" action="/install/setup">
    <?= Csrf::field() ?>
    <input name="site_name" placeholder="Nom du site" value="<?= View::e($old['site_name'] ?? '') ?>" required>
    <input name="admin_name" placeholder="Nom de l'administrateur" value="<?= View::e($old['admin_name'] ?? '') ?>" required>
    <input type="email" name="admin_email" placeholder="Email administrateur" value="<?= View::e($old['admin_email'] ?? '') ?>" required>
    <input type="password" name="admin_password" placeholder="Mot de passe (8 caractères min.)" minlength="8" required>
    <button type="submit">Terminer l'installation</button>
</form>
