<h1>Installation — Étape 1/2</h1>
<p>Renseigne les informations de connexion à ta base MySQL.</p>

<?php if (!empty($error)): ?>
    <p class="error"><?= View::e($error) ?></p>
<?php endif; ?>

<form method="post" action="/install/database">
    <?= Csrf::field() ?>
    <input name="host" placeholder="Hôte (ex. localhost)" value="<?= View::e($old['host'] ?? 'localhost') ?>" required>
    <input name="port" placeholder="Port" value="<?= View::e($old['port'] ?? '3306') ?>" required>
    <input name="user" placeholder="Utilisateur" value="<?= View::e($old['user'] ?? '') ?>" required>
    <input type="password" name="password" placeholder="Mot de passe">
    <input name="database" placeholder="Nom de la base" value="<?= View::e($old['database'] ?? 'bloomin_lms') ?>" required>
    <button type="submit">Tester et enregistrer</button>
</form>
