<?php
/**
 * Lightweight smoke tests for deployed API endpoints.
 *
 * Usage:
 *   php scripts/smoke_test_api.php https://example.com/court
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Run this script via CLI only.\n");
    exit(1);
}

$baseUrl = rtrim($argv[1] ?? '', '/');
if ($baseUrl === '') {
    fwrite(STDERR, "Usage: php scripts/smoke_test_api.php https://example.com/court\n");
    exit(1);
}

$apiBase = $baseUrl . '/api/main_api.php';

function request_json($url, $method = 'GET', $payload = null) {
    $ch = curl_init($url);
    $headers = ['Accept: application/json'];

    if ($method === 'POST') {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload ?? new stdClass()));
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADER => true,
    ]);

    $raw = curl_exec($ch);
    if ($raw === false) {
        $error = curl_error($ch);
        curl_close($ch);
        return ['ok' => false, 'error' => $error];
    }

    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    $body = substr($raw, $headerSize);
    $decoded = json_decode($body, true);

    return [
        'ok' => true,
        'status' => $statusCode,
        'body' => $body,
        'json' => is_array($decoded) ? $decoded : null,
    ];
}

$checks = [
    [
        'label' => 'version endpoint',
        'request' => request_json($apiBase . '?action=version'),
        'assert' => fn($result) => $result['status'] === 200 && !empty($result['json']['version']),
    ],
    [
        'label' => 'admin_session unauthenticated',
        'request' => request_json($apiBase . '?action=admin_session'),
        'assert' => fn($result) => $result['status'] === 200 && isset($result['json']['success']) && $result['json']['success'] === false,
    ],
    [
        'label' => 'protected get_admin_bookings requires auth',
        'request' => request_json($apiBase . '?action=get_admin_bookings&date=' . date('Y-m-d')),
        'assert' => fn($result) => $result['status'] === 401,
    ],
    [
        'label' => 'protected get_audit_logs requires auth',
        'request' => request_json($apiBase . '?action=get_audit_logs'),
        'assert' => fn($result) => $result['status'] === 401,
    ],
];

$failed = false;

foreach ($checks as $check) {
    $result = $check['request'];

    if (!$result['ok']) {
        $failed = true;
        echo "[FAIL] {$check['label']} - request error: {$result['error']}\n";
        continue;
    }

    $passed = $check['assert']($result);
    echo ($passed ? '[PASS] ' : '[FAIL] ') . $check['label'] . " (HTTP {$result['status']})\n";

    if (!$passed) {
      $failed = true;
      echo "  Response body: {$result['body']}\n";
    }
}

exit($failed ? 1 : 0);
