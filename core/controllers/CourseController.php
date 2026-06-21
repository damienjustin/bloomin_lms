<?php

final class CourseController
{
    public static function index(): void
    {
        $stmt = Database::connection()->query(
            "SELECT * FROM courses WHERE status = 'PUBLISHED' ORDER BY created_at DESC"
        );
        View::render('courses/index', ['courses' => $stmt->fetchAll()]);
    }

    public static function show(string $slug): void
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare('SELECT * FROM courses WHERE slug = :slug');
        $stmt->execute(['slug' => $slug]);
        $course = $stmt->fetch();

        if (!$course) {
            http_response_code(404);
            echo 'Cours introuvable.';
            return;
        }

        $stmt = $pdo->prepare('SELECT * FROM modules WHERE course_id = :id ORDER BY position ASC');
        $stmt->execute(['id' => $course['id']]);
        $modules = $stmt->fetchAll();

        $userId = Auth::user()['id'] ?? null;

        foreach ($modules as &$module) {
            $stmt = $pdo->prepare('SELECT * FROM lessons WHERE module_id = :id ORDER BY position ASC');
            $stmt->execute(['id' => $module['id']]);
            $lessons = $stmt->fetchAll();

            foreach ($lessons as &$lesson) {
                $lesson['completed'] = false;
                if ($userId) {
                    $progressStmt = $pdo->prepare(
                        'SELECT completed_at FROM lesson_progress WHERE user_id = :uid AND lesson_id = :lid'
                    );
                    $progressStmt->execute(['uid' => $userId, 'lid' => $lesson['id']]);
                    $progress = $progressStmt->fetch();
                    $lesson['completed'] = $progress && $progress['completed_at'] !== null;
                }
            }
            unset($lesson);
            $module['lessons'] = $lessons;
        }
        unset($module);

        $enrolled = false;
        if ($userId) {
            $stmt = $pdo->prepare('SELECT id FROM enrollments WHERE user_id = :uid AND course_id = :cid');
            $stmt->execute(['uid' => $userId, 'cid' => $course['id']]);
            $enrolled = (bool) $stmt->fetch();
        }

        View::render('courses/show', ['course' => $course, 'modules' => $modules, 'enrolled' => $enrolled]);
    }

    public static function enroll(): void
    {
        Auth::requireLogin();
        Csrf::requireValid();

        $courseId = (int) ($_POST['course_id'] ?? 0);
        $stmt = Database::connection()->prepare(
            'INSERT INTO enrollments (user_id, course_id) VALUES (:uid, :cid)
             ON DUPLICATE KEY UPDATE id = id'
        );
        $stmt->execute(['uid' => Auth::user()['id'], 'cid' => $courseId]);

        $slug = self::slugForCourse($courseId);
        header('Location: /courses/' . $slug);
        exit;
    }

    public static function completeLesson(int $lessonId): void
    {
        Auth::requireLogin();
        Csrf::requireValid();

        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO lesson_progress (user_id, lesson_id, completed_at) VALUES (:uid, :lid, NOW())
             ON DUPLICATE KEY UPDATE completed_at = NOW()'
        );
        $stmt->execute(['uid' => Auth::user()['id'], 'lid' => $lessonId]);

        $stmt = $pdo->prepare(
            'SELECT c.slug FROM lessons l
             JOIN modules m ON m.id = l.module_id
             JOIN courses c ON c.id = m.course_id
             WHERE l.id = :lid'
        );
        $stmt->execute(['lid' => $lessonId]);
        $slug = $stmt->fetchColumn() ?: '';

        header('Location: /courses/' . $slug);
        exit;
    }

    private static function slugForCourse(int $courseId): string
    {
        $stmt = Database::connection()->prepare('SELECT slug FROM courses WHERE id = :id');
        $stmt->execute(['id' => $courseId]);
        return (string) $stmt->fetchColumn();
    }
}
