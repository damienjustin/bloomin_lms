<?php

final class AdminController
{
    public static function courses(): void
    {
        if (!Auth::canManageCourses()) {
            Auth::requireAdmin();
            return;
        }

        $stmt = Database::connection()->query('SELECT * FROM courses ORDER BY created_at DESC');
        View::render('admin/courses', ['courses' => $stmt->fetchAll()]);
    }

    public static function createCourse(): void
    {
        if (!Auth::canManageCourses()) {
            Auth::requireAdmin();
            return;
        }
        Csrf::requireValid();

        $title = trim($_POST['title'] ?? '');
        $slug = trim($_POST['slug'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $status = in_array($_POST['status'] ?? '', ['DRAFT', 'PUBLISHED'], true) ? $_POST['status'] : 'DRAFT';

        if ($title === '' || !preg_match('/^[a-z0-9-]+$/', $slug)) {
            self::coursesWithError('Titre requis et slug au format "mon-cours" requis.');
            return;
        }

        $stmt = Database::connection()->prepare(
            'INSERT INTO courses (title, slug, description, status, author_id) VALUES (:title, :slug, :description, :status, :author_id)'
        );

        try {
            $stmt->execute([
                'title' => $title,
                'slug' => $slug,
                'description' => $description ?: null,
                'status' => $status,
                'author_id' => Auth::user()['id'],
            ]);
        } catch (PDOException $e) {
            self::coursesWithError('Ce slug est déjà utilisé.');
            return;
        }

        header('Location: /admin/courses');
        exit;
    }

    public static function createModule(int $courseId): void
    {
        if (!Auth::canManageCourses()) {
            Auth::requireAdmin();
            return;
        }
        Csrf::requireValid();

        $title = trim($_POST['title'] ?? '');
        if ($title === '') {
            header('Location: /admin/courses');
            exit;
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT COALESCE(MAX(position), 0) + 1 FROM modules WHERE course_id = :cid');
        $stmt->execute(['cid' => $courseId]);
        $position = (int) $stmt->fetchColumn();

        $stmt = $pdo->prepare('INSERT INTO modules (course_id, title, position) VALUES (:cid, :title, :position)');
        $stmt->execute(['cid' => $courseId, 'title' => $title, 'position' => $position]);

        header('Location: /admin/courses');
        exit;
    }

    public static function updates(): void
    {
        Auth::requireAdmin();
        View::render('admin/updates', ['info' => Updater::checkForUpdate()]);
    }

    private static function coursesWithError(string $error): void
    {
        $stmt = Database::connection()->query('SELECT * FROM courses ORDER BY created_at DESC');
        View::render('admin/courses', ['courses' => $stmt->fetchAll(), 'error' => $error]);
    }
}
