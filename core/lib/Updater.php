<?php

final class Updater
{
    public static function checkForUpdate(): array
    {
        $repo = Config::get('app.update_repo');
        $installedVersion = Config::get('app.core_version', '0.0.0');

        if (!$repo) {
            return ['error' => "Le dépôt GitHub n'est pas configuré (app.update_repo)."];
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: BloominLMS\r\nAccept: application/vnd.github+json\r\n",
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $url = "https://api.github.com/repos/{$repo}/releases/latest";
        $response = @file_get_contents($url, false, $context);

        if ($response === false) {
            return ['error' => 'Impossible de contacter l\'API GitHub.'];
        }

        $statusLine = $http_response_header[0] ?? '';
        if (!str_contains($statusLine, '200')) {
            return ['error' => "Erreur de l'API GitHub : {$statusLine}"];
        }

        $release = json_decode($response, true);
        $latestVersion = ltrim($release['tag_name'] ?? '', 'v');

        return [
            'installedVersion' => $installedVersion,
            'latestVersion' => $latestVersion,
            'updateAvailable' => $latestVersion !== '' && $latestVersion !== $installedVersion,
            'releaseUrl' => $release['html_url'] ?? null,
            'releaseNotes' => $release['body'] ?? '',
            'publishedAt' => $release['published_at'] ?? null,
        ];
    }
}
