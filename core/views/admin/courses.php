<h1>Gestion des cours</h1>

<?php if (!empty($error)): ?><p class="error"><?= View::e($error) ?></p><?php endif; ?>
<?php if (!empty($success)): ?><p class="success"><?= View::e($success) ?></p><?php endif; ?>

<h2>Nouveau cours</h2>
<form method="post" action="/admin/courses">
    <?= Csrf::field() ?>
    <input name="title" placeholder="Titre" required>
    <input name="slug" placeholder="slug-du-cours" pattern="[a-z0-9-]+" required>
    <textarea name="description" placeholder="Description"></textarea>
    <select name="status">
        <option value="DRAFT">Brouillon</option>
        <option value="PUBLISHED">Publié</option>
    </select>
    <button type="submit">Créer le cours</button>
</form>

<h2>Cours existants</h2>
<?php foreach ($courses as $course): ?>
    <div class="card">
        <strong><?= View::e($course['title']) ?></strong>
        <span class="badge"><?= View::e($course['status']) ?></span>
        <p><a href="/courses/<?= View::e($course['slug']) ?>">/courses/<?= View::e($course['slug']) ?></a></p>

        <form method="post" action="/admin/courses/<?= (int) $course['id'] ?>/modules" style="margin-top:0.5rem;">
            <?= Csrf::field() ?>
            <input name="title" placeholder="Titre du module" required>
            <button type="submit">Ajouter un module</button>
        </form>
    </div>
<?php endforeach; ?>
