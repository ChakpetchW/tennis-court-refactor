<?php
/**
 * ThaibulkSMS Webhook Receiver
 * Accepts optional callbacks from ThaibulkSMS and acknowledges receipt.
 *
 * This endpoint is intentionally lightweight because the current OTP flow
 * uses direct request/verify APIs and does not rely on async callbacks.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

$rawBody = file_get_contents('php://input') ?: '';
$decoded = json_decode($rawBody, true);

$payload = [
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET',
    'query' => $_GET,
    'body' => is_array($decoded) ? $decoded : $rawBody,
    'received_at' => date('c'),
];

error_log('[ThaibulkSMS webhook] ' . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

echo json_encode([
    'success' => true,
    'message' => 'Webhook received',
]);
