<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

spl_autoload_register(function (string $class) {
    foreach (['lib', 'controllers'] as $dir) {
        $path = __DIR__ . "/{$dir}/{$class}.php";
        if (file_exists($path)) {
            require $path;
            return;
        }
    }
});

set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo '<h1>Erreur serveur</h1><p>Une erreur inattendue est survenue. Consulte les logs du serveur pour plus de détails.</p>';
});

Auth::start();
