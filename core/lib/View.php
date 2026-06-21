<?php

final class View
{
    public static function render(string $name, array $data = []): void
    {
        extract($data, EXTR_SKIP);
        $viewPath = dirname(__DIR__) . "/views/{$name}.php";

        ob_start();
        require $viewPath;
        $content = ob_get_clean();

        require dirname(__DIR__) . '/views/layout.php';
    }

    public static function e(?string $value): string
    {
        return htmlspecialchars($value ?? '', ENT_QUOTES);
    }
}
