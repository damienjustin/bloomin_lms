<?php

final class Config
{
    private static ?array $data = null;

    public static function load(): array
    {
        if (self::$data !== null) {
            return self::$data;
        }

        $path = dirname(__DIR__, 2) . '/config.php';
        self::$data = file_exists($path) ? require $path : [];

        return self::$data;
    }

    public static function exists(): bool
    {
        return file_exists(dirname(__DIR__, 2) . '/config.php');
    }

    public static function get(string $dotted, mixed $default = null): mixed
    {
        $data = self::load();
        $value = $data;

        foreach (explode('.', $dotted) as $key) {
            if (!is_array($value) || !array_key_exists($key, $value)) {
                return $default;
            }
            $value = $value[$key];
        }

        return $value;
    }

    public static function write(array $config): void
    {
        $path = dirname(__DIR__, 2) . '/config.php';
        $export = var_export($config, true);
        file_put_contents($path, "<?php\n\nreturn {$export};\n");
        self::$data = $config;
    }
}
