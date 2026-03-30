<?php
/**
 * Omise Charge Creator
 * Creates PromptPay / Alipay / WeChat Pay charges via Omise API
 * 
 * POST params: { court_id, booking_id, amount, type, customer_name, phone, date, hour }
 * Returns: { charge_id, qr_code_uri, authorize_uri }
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/config.php';  // Contains OMISE_SECRET_KEY, DB creds
require_once __DIR__ . '/mailer.php';

$data = json_decode(file_get_contents('php://input'), true);

$type       = $data['type']       ?? 'promptpay'; // promptpay | alipay | wechat_pay
$amount     = $data['amount']     ?? 50000;        // in satangs (500 THB = 50000)
$booking_id = $data['booking_id'] ?? null;
$court_id   = $data['court_id']   ?? null;
$date       = $data['date']       ?? date('Y-m-d');
$hour       = $data['hour']       ?? '00:00';

if (!defined('DB_HOST') || !defined('OMISE_SECRET_KEY')) {
    echo json_encode(['error' => 'Configuration is missing or incomplete (config.php error)']);
    exit;
}

if (!$booking_id || !$court_id) {
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

// ---- DB connection ----
try {
    $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("set names utf8mb4");
} catch(PDOException $e) {
    echo json_encode(['error' => 'DB: ' . $e->getMessage()]); exit;
}

if ($type === 'credit' && isset($data['card'])) {
    // ---- Omise API: Create Charge with CARD TOKEN ----
    $chargePayload = [
        'amount'               => (int)$amount,
        'currency'             => 'thb',
        'card'                 => $data['card'],
        'return_uri'           => SITE_URL . '/?payment=success&booking_id=' . rawurlencode((string) $booking_id) . '&payment_method=' . rawurlencode((string) $type),
        'webhook_endpoints'    => [SITE_URL . '/api/webhook.php'],
        'metadata'             => [
            'booking_id' => $booking_id,
            'court_id'   => $court_id,
            'date'       => $date,
            'hour'       => $hour,
        ],
    ];
} else {
    // If we're here and type is 'credit', it means a card token was expected but not provided
    if ($type === 'credit') {
        echo json_encode([
            'error' => 'Card Token (card) is missing. Please ensure card details are correctly entered.',
            'debug' => [
                'type' => $type,
                'received_keys' => array_keys($data),
                'card_isset' => isset($data['card']),
                'raw_input_empty' => empty(file_get_contents('php://input'))
            ]
        ]);
        exit;
    }

    // ---- Omise API: Create Source (PromptPay, etc.) ----
    $sourcePayload = ['type' => $type, 'amount' => (int)$amount, 'currency' => 'thb'];
    $ch = curl_init('https://api.omise.co/sources');
    curl_setopt_array($ch, [
        CURLOPT_POST           => 1,
        CURLOPT_USERPWD        => OMISE_PUBLIC_KEY . ':',
        CURLOPT_POSTFIELDS     => json_encode($sourcePayload),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $curlRaw = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlRaw === false) {
        echo json_encode(['error' => 'Connection to Omise Source API failed: ' . $curlErr]);
        exit;
    }

    $sourceRes = json_decode($curlRaw, true);
    if (!$sourceRes || isset($sourceRes['code'])) {
        echo json_encode(['error' => 'Omise Source: ' . ($sourceRes['message'] ?? 'Unknown Error (Invalid JSON)')]);
        exit;
    }
    $sourceId = $sourceRes['id'];

    // ---- Omise API: Create Charge with SOURCE ----
    $chargePayload = [
        'amount'               => (int)$amount,
        'currency'             => 'thb',
        'source'               => $sourceId,
        'return_uri'           => SITE_URL . '/?payment=success&booking_id=' . rawurlencode((string) $booking_id) . '&payment_method=' . rawurlencode((string) $type),
        'webhook_endpoints'    => [SITE_URL . '/api/webhook.php'],
        'metadata'             => [
            'booking_id' => $booking_id,
            'court_id'   => $court_id,
            'date'       => $date,
            'hour'       => $hour,
        ],
    ];
}

$ch = curl_init('https://api.omise.co/charges');
curl_setopt_array($ch, [
    CURLOPT_POST           => 1,
    CURLOPT_USERPWD        => OMISE_SECRET_KEY . ':',
    CURLOPT_POSTFIELDS     => json_encode($chargePayload),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
]);
$curlRaw = curl_exec($ch);
$curlErr = curl_error($ch);
curl_close($ch);

if ($curlRaw === false) {
    echo json_encode(['error' => 'Connection to Omise Charge API failed: ' . $curlErr]);
    exit;
}

$chargeRes = json_decode($curlRaw, true);
if (!$chargeRes || isset($chargeRes['code'])) {
    echo json_encode(['error' => 'Omise Charge: ' . ($chargeRes['message'] ?? 'Unknown Error (Invalid JSON)')]);
    exit;
}

$status = 'Pending';
$paymentProvider = $type === 'credit' ? 'card' : $type;
if ($chargeRes['status'] === 'successful') {
    $status = 'Paid';
    
    // Also mark as Booked in allotments table
    $stmtAlloc = $conn->prepare("
        INSERT INTO allotments (court_id, date, hour, is_open, booked_by) 
        VALUES (?, ?, ?, 0, ?)
        ON DUPLICATE KEY UPDATE is_open = 0, booked_by = VALUES(booked_by)
    ");
    $stmtAlloc->execute([$court_id, $date, $hour, $data['customer_name'] ?? 'Paid']);
}

// Save charge to DB
$stmt = $conn->prepare("
    UPDATE bookings
    SET payment_provider=?,
        transaction_ref=?,
        status=?,
        paid_at = CASE
            WHEN ? = 'Paid' THEN COALESCE(paid_at, NOW())
            ELSE paid_at
        END
    WHERE id=?
");
$stmt->execute([$paymentProvider, $chargeRes['id'], $status, $status, $booking_id]);

if ($status === 'Paid') {
    $stmt = $conn->prepare("
        SELECT
            b.id AS booking_id,
            b.price,
            b.booking_date AS date,
            b.booking_time AS time,
            b.payment_provider,
            u.name AS customer_name,
            u.email,
            c.name AS court_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN courts c ON b.court_id = c.id
        WHERE b.id = ?
        LIMIT 1
    ");
    $stmt->execute([$booking_id]);
    $bookingNotification = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($bookingNotification && !empty($bookingNotification['email'])) {
        send_booking_confirmation_email_once($conn, $bookingNotification);
    }
}

echo json_encode([
    'success'       => true,
    'charge_id'     => $chargeRes['id'],
    'status'        => $status,
    'qr_code_uri'   => $chargeRes['source']['scannable_code']['image']['download_uri'] ?? null,
    'authorize_uri' => $chargeRes['authorize_uri'] ?? null,
    'payment_type'  => $type,
]);
