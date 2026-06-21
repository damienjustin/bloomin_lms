<?php

final class InstallState
{
    public const NEEDS_DATABASE = 'needs-database';
    public const NEEDS_SETUP = 'needs-setup';
    public const READY = 'ready';

    public static function current(): string
    {
        if (!Config::exists()) {
            return self::NEEDS_DATABASE;
        }

        try {
            $pdo = Database::connection();
            $stmt = $pdo->query("SELECT installed FROM site_meta WHERE id = 1");
            $row = $stmt ? $stmt->fetch() : null;

            if ($row && (int) $row['installed'] === 1) {
                return self::READY;
            }

            return self::NEEDS_SETUP;
        } catch (Throwable) {
            // Can't connect, or the schema hasn't been created yet: both are
            // resolved from the setup step.
            return self::NEEDS_SETUP;
        }
    }
}
