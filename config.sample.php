<?php
/**
 * Sample configuration file.
 *
 * The install wizard (/install) writes the real config.php for you.
 * This file only exists as a reference / fallback for manual setups.
 */

return [
    'db' => [
        'host' => 'localhost',
        'port' => '3306',
        'database' => 'bloomin_lms',
        'user' => 'root',
        'password' => '',
    ],
    'app' => [
        // Random secret used to sign session cookies. Generate with:
        // php -r "echo bin2hex(random_bytes(32));"
        'secret' => 'change-me',
        'core_version' => '0.1.0',
        // owner/repo on GitHub, used by the admin "check for updates" page.
        'update_repo' => 'damienjustin/bloomin_lms',
    ],
];
