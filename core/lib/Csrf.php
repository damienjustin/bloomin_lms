<?php

final class Csrf
{
    public static function token(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf_token'];
    }

    public static function field(): string
    {
        $token = htmlspecialchars(self::token(), ENT_QUOTES);
        return "<input type=\"hidden\" name=\"csrf_token\" value=\"{$token}\">";
    }

    public static function verify(): bool
    {
        $submitted = $_POST['csrf_token'] ?? '';
        return is_string($submitted) && hash_equals($_SESSION['csrf_token'] ?? '', $submitted);
    }

    public static function requireValid(): void
    {
        if (!self::verify()) {
            http_response_code(419);
            echo 'Session expirée, merci de recharger la page et réessayer.';
            exit;
        }
    }
}
