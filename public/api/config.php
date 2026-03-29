<?php
/**
 * Shared API configuration bootstrap.
 * Uses process/server environment first, then falls back to a local .env file.
 */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (!function_exists('load_env_file')) {
    function load_env_file($path) {
        if (!is_readable($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }

            [$key, $value] = array_pad(explode('=', $trimmed, 2), 2, '');
            $key = trim($key);
            if ($key === '') {
                continue;
            }

            if (getenv($key) !== false || isset($_ENV[$key]) || isset($_SERVER[$key])) {
                continue;
            }

            $value = trim($value);
            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            putenv("$key=$value");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

if (!function_exists('load_first_available_env_file')) {
    function load_first_available_env_file(array $paths) {
        foreach ($paths as $path) {
            if (!is_readable($path)) {
                continue;
            }

            load_env_file($path);
            return $path;
        }

        return null;
    }
}

if (!function_exists('env_value')) {
    function env_value($key, $default = '') {
        $value = getenv($key);
        if ($value !== false) {
            return $value;
        }

        if (isset($_ENV[$key])) {
            return $_ENV[$key];
        }

        if (isset($_SERVER[$key])) {
            return $_SERVER[$key];
        }

        return $default;
    }
}

if (!function_exists('define_env_constant')) {
    function define_env_constant($name, $default = '') {
        if (!defined($name)) {
            define($name, env_value($name, $default));
        }
    }
}

load_first_available_env_file([
    dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env',
    dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env',
]);

define_env_constant('DB_HOST', 'localhost');
define_env_constant('DB_NAME', '');
define_env_constant('DB_USER', '');
define_env_constant('DB_PASS', '');

define_env_constant('OMISE_PUBLIC_KEY', '');
define_env_constant('OMISE_SECRET_KEY', '');
define_env_constant('OMISE_WEBHOOK_SECRET', '');

define_env_constant('SMS_API_KEY', '');
define_env_constant('SMS_API_SECRET', '');

define_env_constant('OTP_WEBHOOK_URL', '');
define_env_constant('OTP_METHOD', 'POST');
define_env_constant('OTP_API_KEY', '');
define_env_constant('OTP_API_SECRET', '');

define_env_constant('MAIL_HOST', '');
define_env_constant('MAIL_PORT', '587');
define_env_constant('MAIL_USERNAME', '');
define_env_constant('MAIL_PASSWORD', '');
define_env_constant('MAIL_ENCRYPTION', 'tls');
define_env_constant('MAIL_FROM_ADDRESS', '');
define_env_constant('MAIL_FROM_NAME', '');

define_env_constant('SITE_URL', '');

if (!function_exists('start_app_session')) {
    function start_app_session() {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_name('court_admin_session');
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
            'use_strict_mode' => true,
        ]);
    }
}

if (!function_exists('json_response')) {
    function json_response($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }
}

if (!function_exists('get_json_input')) {
    function get_json_input() {
        static $decoded = null;
        if ($decoded !== null) {
            return $decoded;
        }

        $rawBody = file_get_contents('php://input');
        $decoded = json_decode($rawBody ?: '{}');
        if (!is_object($decoded)) {
            $decoded = (object) [];
        }

        return $decoded;
    }
}

if (!function_exists('get_admin_session_user')) {
    function get_admin_session_user() {
        start_app_session();

        if (empty($_SESSION['admin_id'])) {
            return null;
        }

        return [
            'id' => (int) $_SESSION['admin_id'],
            'name' => $_SESSION['admin_name'] ?? 'Admin',
            'role' => $_SESSION['admin_role'] ?? 'admin',
            'email' => $_SESSION['admin_email'] ?? null,
        ];
    }
}

if (!function_exists('require_admin_session')) {
    function require_admin_session() {
        $admin = get_admin_session_user();
        if (!$admin) {
            json_response(['error' => 'Unauthorized'], 401);
        }

        return $admin;
    }
}
