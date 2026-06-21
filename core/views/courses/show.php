<h1><?= View::e($course['title']) ?></h1>
<?php if ($course['description']): ?>
    <p><?= View::e($course['description']) ?></p>
<?php endif; ?>

<?php if (Auth::check()): ?>
    <form method="post" action="/enroll">
        <?= Csrf::field() ?>
        <input type="hidden" name="course_id" value="<?= (int) $course['id'] ?>">
        <button type="submit"><?= $enrolled ? "Inscrit ✓" : "S'inscrire" ?></button>
    </form>
<?php endif; ?>

<?php foreach ($modules as $module): ?>
    <h2><?= View::e($module['title']) ?></h2>
    <ul>
        <?php foreach ($module['lessons'] as $lesson): ?>
            <li>
                <?= View::e($lesson['title']) ?>
                <?php if (Auth::check()): ?>
                    <form method="post" action="/lessons/<?= (int) $lesson['id'] ?>/complete" style="display:inline">
                        <?= Csrf::field() ?>
                        <button type="submit" style="padding:0.2rem 0.6rem;font-size:0.8rem;">
                            <?= $lesson['completed'] ? 'Terminée ✓' : 'Marquer comme terminée' ?>
                        </button>
                    </form>
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
    </ul>
<?php endforeach; ?>
