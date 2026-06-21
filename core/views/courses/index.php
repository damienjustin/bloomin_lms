<h1>Cours disponibles</h1>

<?php if (empty($courses)): ?>
    <p>Aucun cours publié pour le moment.</p>
<?php endif; ?>

<?php foreach ($courses as $course): ?>
    <div class="card">
        <a href="/courses/<?= View::e($course['slug']) ?>"><strong><?= View::e($course['title']) ?></strong></a>
        <?php if ($course['description']): ?>
            <p><?= View::e($course['description']) ?></p>
        <?php endif; ?>
    </div>
<?php endforeach; ?>
