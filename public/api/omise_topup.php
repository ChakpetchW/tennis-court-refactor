<?php
/**
 * Omise Top-up Creator
 * Creates PromptPay / Credit Card charges for wallet top-up
 * 
 * POST params: { user_id, amount, type, card (if credit) }
 * Returns: { success, charge_id, qr_code_uri, authorize_uri }
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/config.php';

$data = json_decode(file_get_contents('php://input'), true);

$user_id = $data['user_id'] ?? null;
$amount  = $data['amount']  ?? 0; // in THB (converted to satangs later)
$type    = $data['type']    ?? 'promptpay'; // promptpay | credit

if (!$user_id || $amount <= 0) {
    echo json_encode(['error' => 'Invalid parameters']);
    exit;
}

$amountSatang = (int)($amount * 100);

try {
    $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("set names utf8mb4");

    // 1. Create a pending transaction record
    $stmt = $conn->prepare("INSERT INTO wallet_transactions (user_id, amount, status, payment_type) VALUES (?, ?, 'Pending', ?)");
    $stmt->execute([$user_id, $amount, $type]);
    $transaction_id = $conn->lastInsertId();

    $chargePayload = [
        'amount'   => $amountSatang,
        'currency' => 'thb',
        'metadata' => [
            'type'           => 'topup',
            'user_id'        => $user_id,
            'transaction_id' => $transaction_id
        ],
        'return_uri'        => SITE_URL . '/?topup=success&amt=' . $amount,
        'webhook_endpoints' => [SITE_URL . '/api/webhook.php'],
    ];

    if ($type === 'credit' && isset($data['card'])) {
        $chargePayload['card'] = $data['card'];
    } else {
        // Create source for PromptPay
        $sourcePayload = ['type' => 'promptpay', 'amount' => $amountSatang, 'currency' => 'thb'];
        $ch = curl_init('https://api.omise.co/sources');
        curl_setopt_array($ch, [
            CURLOPT_POST           => 1,
            CURLOPT_USERPWD        => OMISE_PUBLIC_KEY . ':',
            CURLOPT_POSTFIELDS     => json_encode($sourcePayload),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
        ]);
        $sourceRes = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (!$sourceRes || isset($sourceRes['code'])) {
            echo json_encode(['error' => 'Source error: ' . ($sourceRes['message'] ?? 'Unknown')]);
            exit;
        }
        $chargePayload['source'] = $sourceRes['id'];
    }

    // 2. Create Charge
    $ch = curl_init('https://api.omise.co/charges');
    curl_setopt_array($ch, [
        CURLOPT_POST           => 1,
        CURLOPT_USERPWD        => OMISE_SECRET_KEY . ':',
        CURLOPT_POSTFIELDS     => json_encode($chargePayload),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $chargeRes = json_decode(curl_exec($ch), true);
    curl_close($ch);

    if (!$chargeRes || isset($chargeRes['code'])) {
        echo json_encode(['error' => 'Charge error: ' . ($chargeRes['message'] ?? 'Unknown')]);
        exit;
    }

    // 3. Update transaction with charge ID
    $stmt = $conn->prepare("UPDATE wallet_transactions SET charge_id = ? WHERE id = ?");
    $stmt->execute([$chargeRes['id'], $transaction_id]);

    // 4. IMMEDIATE UPDATE if successful (common for non-3DS cards)
    if (isset($chargeRes['status']) && $chargeRes['status'] === 'successful') {
        $conn->prepare("UPDATE wallet_transactions SET status = 'Paid' WHERE id = ?")
             ->execute([$transaction_id]);
        
        $conn->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?")
             ->execute([$amount, $user_id]);
    }

    echo json_encode([
        'success'       => true,
        'status'        => $chargeRes['status'] ?? 'pending',
        'charge_id'     => $chargeRes['id'],
        'qr_code_uri'   => $chargeRes['source']['scannable_code']['image']['download_uri'] ?? null,
        'authorize_uri' => $chargeRes['authorize_uri'] ?? null
    ]);

} catch(PDOException $e) {
    echo json_encode(['error' => 'DB: ' . $e->getMessage()]);
}
?>
