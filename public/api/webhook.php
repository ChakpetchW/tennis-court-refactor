<?php
/**
 * Omise Webhook Handler
 * Receives charge.complete events from Omise and finalizes bookings.
 * 
 * Steps:
 *  1. Verify HMAC-SHA256 signature
 *  2. On charge.complete + successful → update DB + send SMS
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/sms.php';

$payload   = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_OMISE_SIGNATURE'] ?? '';
$timestamp       = $_SERVER['HTTP_OMISE_SIGNATURE_TIMESTAMP'] ?? '';

// ---- 1. Verify Signature (Strict HMAC-SHA256) ----
if (!empty(OMISE_WEBHOOK_SECRET)) {
    // omise_webhook_secret is a Base64-encoded HMAC secret key
    $secret = base64_decode(OMISE_WEBHOOK_SECRET);
    
    // Payload for HMAC: <TIMESTAMP>.<RAW_BODY>
    $signedPayload = $timestamp . '.' . $payload;
    
    // Compute expected signature (hexadecimal string)
    $expected = hash_hmac('sha256', $signedPayload, $secret);
    
    // Handle potential comma-separated signatures during rotation
    $signatures = explode(',', $signatureHeader);
    $match = false;
    foreach ($signatures as $sig) {
        if (hash_equals($expected, trim($sig))) {
            $match = true;
            break;
        }
    }
    
    if (!$match) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid signature']);
        exit;
    }
}

$event = json_decode($payload, true);
$key   = $event['key']  ?? '';
$data  = $event['data'] ?? [];

error_log('[Webhook] Event: ' . $key . ' Status: ' . ($data['status'] ?? 'n/a'));

if ($key === 'charge.complete' && ($data['status'] ?? '') === 'successful') {
    $chargeId  = $data['id'];
    $meta      = $data['metadata'] ?? [];
    $bookingId = $meta['booking_id'] ?? null;
    $courtId   = $meta['court_id']   ?? null;
    $date      = $meta['date']       ?? date('Y-m-d');
    $hour      = $meta['hour']       ?? null;

    // ---- 2. Connect to DB ----
    try {
        $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $conn->exec("set names utf8mb4");
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'DB: ' . $e->getMessage()]);
        exit;
    }

    if (($meta['type'] ?? '') === 'topup') {
        $userId  = $meta['user_id'] ?? null;
        $amount  = $data['amount'] / 100; // in THB
        $txId    = $meta['transaction_id'] ?? null;

        if ($userId && $txId) {
            try {
                $conn->beginTransaction();

                // Check if transaction is already processed (Idempotency)
                $stmtTx = $conn->prepare("SELECT status FROM wallet_transactions WHERE id = ? FOR UPDATE");
                $stmtTx->execute([$txId]);
                $currentTx = $stmtTx->fetch(PDO::FETCH_ASSOC);

                if ($currentTx && $currentTx['status'] !== 'Paid') {
                    // 1. Mark Transaction as Paid
                    $conn->prepare("UPDATE wallet_transactions SET status='Paid' WHERE id=?")
                         ->execute([$txId]);
                    
                    // 2. Add Balance to User
                    $conn->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id=?")
                         ->execute([$amount, $userId]);

                    $conn->commit();
                    error_log('[Webhook] Top-up Successful: User #' . $userId . ' Amount: ' . $amount);
                } else {
                    $conn->rollBack();
                    error_log('[Webhook] Top-up skipped (already processed or not found): TX #' . $txId);
                }
            } catch (Exception $e) {
                if ($conn->inTransaction()) $conn->rollBack();
                error_log('[Webhook] Top-up Failed (DB Error): ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Database update failed']);
                exit;
            }
        }
        
        http_response_code(200);
        echo json_encode(['success' => true, 'type' => 'topup']);
        exit;
    }

    // ---- 3. Confirm Booking: pending → booked ----
    $stmt = $conn->prepare("SELECT b.*, u.name as customer_name, u.phone, c.name as court_name
                            FROM bookings b
                            JOIN users u ON b.user_id = u.id
                            JOIN courts c ON b.court_id = c.id
                            WHERE b.id = ?");
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($booking) {
        // Mark booking as Paid
        $conn->prepare("UPDATE bookings SET status='Paid', transaction_ref=? WHERE id=?")
             ->execute([$chargeId, $bookingId]);

        // Update Allotment: Ensure it's marked as booked by the real customer name
        $customerName = $booking['customer_name'] ?? 'Paid';
        $stmtAlloc = $conn->prepare("
            INSERT INTO allotments (court_id, date, hour, is_open, booked_by, pending_by) 
            VALUES (?, ?, ?, 0, ?, NULL)
            ON DUPLICATE KEY UPDATE is_open = 0, booked_by = VALUES(booked_by), pending_by = NULL
        ");
        $stmtAlloc->execute([$courtId, $date, $hour, $customerName]);

        // ---- 4. Send SMS ----
        $smsData = [
            'court_name'    => $booking['court_name'],
            'date'          => $booking['booking_date'],
            'time'          => $booking['booking_time'],
            'customer_name' => $booking['customer_name'],
            'booking_id'    => $bookingId,
        ];
        $msg = buildBookingConfirmSMS($smsData);
        sendSMS($booking['phone'], $msg, SMS_API_KEY, SMS_API_SECRET);

        error_log('[Webhook] Booking #' . $bookingId . ' confirmed. SMS sent to ' . $booking['phone']);
    }

    http_response_code(200);
    echo json_encode(['success' => true]);

} else {
    // Non-actionable event — acknowledge receipt
    http_response_code(200);
    echo json_encode(['received' => true]);
}
