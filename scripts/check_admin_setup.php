<?php
/**
 * Verify DB connectivity and inspect admin rows/password hash presence.
 *
 * Usage:
 *   php scripts/check_admin_setup.php
 */

require_once dirname(__DIR__) . '/public/api/config.php';

try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('set names utf8mb4');
} catch (Throwable $e) {
    fwrite(STDERR, "DB connection failed: {$e->getMessage()}\n");
    exit(1);
}

try {
    $stmt = $pdo->query("SELECT id, email, name, role, password_hash FROM admins ORDER BY id ASC LIMIT 20");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    fwrite(STDERR, "Query failed: {$e->getMessage()}\n");
    exit(1);
}

if (!$rows) {
    echo "No admin rows found in admins table.\n";
    exit(0);
}

foreach ($rows as $row) {
    $hash = $row['password_hash'] ?? '';
    $isBcryptStyle = str_starts_with($hash, '$2y$') || str_starts_with($hash, '$2a$') || str_starts_with($hash, '$argon');
    echo json_encode([
        'id' => (int) $row['id'],
        'email' => $row['email'],
        'name' => $row['name'],
        'role' => $row['role'],
        'hash_present' => $hash !== '',
        'hash_prefix' => substr($hash, 0, 10),
        'hash_looks_valid' => $isBcryptStyle,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
}
