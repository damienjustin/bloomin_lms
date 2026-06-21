<h1>Mises à jour</h1>

<?php if (!empty($info['error'])): ?>
    <p class="error"><?= View::e($info['error']) ?></p>
<?php else: ?>
    <div class="card">
        <p>Version installée : <strong><?= View::e($info['installedVersion']) ?></strong></p>
        <p>Dernière version disponible : <strong><?= View::e($info['latestVersion']) ?></strong></p>
        <?php if ($info['updateAvailable']): ?>
            <p class="success">
                Une mise à jour est disponible.
                <a href="<?= View::e($info['releaseUrl']) ?>" target="_blank" rel="noopener noreferrer">Voir la release sur GitHub</a>
            </p>
        <?php else: ?>
            <p class="success">Le site est à jour.</p>
        <?php endif; ?>
    </div>
<?php endif; ?>
