<?php
/**
 * Generate a password hash and a ready-to-run SQL snippet for the admins table.
 *
 * Usage:
 *   php scripts/generate_admin_hash.php "StrongPassword!" admin@example.com "Admin Name" admin
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Run this script via CLI only.\n");
    exit(1);
}

$password = $argv[1] ?? null;
$email = $argv[2] ?? 'admin@example.com';
$name = $argv[3] ?? 'System Admin';
$role = $argv[4] ?? 'admin';

if (!$password) {
    fwrite(STDERR, "Usage: php scripts/generate_admin_hash.php \"StrongPassword!\" admin@example.com \"Admin Name\" admin\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

echo "Password hash generated successfully.\n\n";
echo "Email : {$email}\n";
echo "Name  : {$name}\n";
echo "Role  : {$role}\n";
echo "Hash  : {$hash}\n\n";

echo "SQL snippet:\n";
echo "INSERT INTO admins (email, password_hash, role, name)\n";
echo "VALUES ('" . addslashes($email) . "', '" . addslashes($hash) . "', '" . addslashes($role) . "', '" . addslashes($name) . "')\n";
echo "ON DUPLICATE KEY UPDATE\n";
echo "  password_hash = VALUES(password_hash),\n";
echo "  role = VALUES(role),\n";
echo "  name = VALUES(name);\n";
