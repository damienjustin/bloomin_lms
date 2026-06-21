<?php

final class Database
{
    private static ?PDO $instance = null;

    public static function connection(): PDO
    {
        if (self::$instance === null) {
            $db = Config::get('db');
            self::$instance = self::connect($db['host'], $db['port'], $db['database'], $db['user'], $db['password']);
        }

        return self::$instance;
    }

    public static function connect(string $host, string $port, ?string $database, string $user, string $password): PDO
    {
        $dsn = "mysql:host={$host};port={$port}";
        if ($database) {
            $dsn .= ";dbname={$database}";
        }
        $dsn .= ';charset=utf8mb4';

        return new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
}
