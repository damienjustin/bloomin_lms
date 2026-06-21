<?php

require __DIR__ . '/../core/bootstrap.php';

$path = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$path = $path === '' ? '/' : $path;
$method = $_SERVER['REQUEST_METHOD'];

// The install wizard must stay reachable regardless of state; everything
// else is gated behind it being finished.
$isInstallRoute = $path === '/install' || str_starts_with($path, '/install/');
if (!$isInstallRoute && InstallState::current() !== InstallState::READY) {
    header('Location: /install');
    exit;
}

$routes = [
    'GET /' => fn () => View::render('home'),
    'GET /install' => [InstallController::class, 'show'],
    'POST /install/database' => [InstallController::class, 'submitDatabase'],
    'POST /install/setup' => [InstallController::class, 'submitSetup'],

    'GET /login' => [AuthController::class, 'showLogin'],
    'POST /login' => [AuthController::class, 'login'],
    'GET /register' => [AuthController::class, 'showRegister'],
    'POST /register' => [AuthController::class, 'register'],
    'GET /logout' => [AuthController::class, 'logout'],

    'GET /courses' => [CourseController::class, 'index'],
    'POST /enroll' => [CourseController::class, 'enroll'],

    'GET /admin/courses' => [AdminController::class, 'courses'],
    'POST /admin/courses' => [AdminController::class, 'createCourse'],
    'GET /admin/updates' => [AdminController::class, 'updates'],
];

$key = "{$method} {$path}";

if (isset($routes[$key])) {
    $handler = $routes[$key];
    is_array($handler) ? $handler[0]::{$handler[1]}() : $handler();
    return;
}

if ($method === 'GET' && preg_match('#^/courses/([a-z0-9-]+)$#', $path, $m)) {
    CourseController::show($m[1]);
    return;
}

if ($method === 'POST' && preg_match('#^/lessons/(\d+)/complete$#', $path, $m)) {
    CourseController::completeLesson((int) $m[1]);
    return;
}

if ($method === 'POST' && preg_match('#^/admin/courses/(\d+)/modules$#', $path, $m)) {
    AdminController::createModule((int) $m[1]);
    return;
}

http_response_code(404);
echo '<h1>404</h1><p>Page introuvable.</p>';
