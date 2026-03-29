<?php
/**
 * SMS Helper - Thaibulksms
 * Called after a successful payment to notify the customer.
 */

function sendSMS($phone, $message, $apiKey, $apiSecret) {
    // Normalize 08xxxxxxxx -> 668xxxxxxxx
    $phone = preg_replace('/^0/', '66', $phone);
    $phone = preg_replace('/[^0-9]/', '', $phone);

    $url  = 'https://api-v2.thaibulksms.com/sms';
    $data = [
        'key'     => $apiKey,
        'secret'  => $apiSecret,
        'msisdn'  => $phone,
        'message' => $message,
        'force'   => 'standard',
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => 1,
        CURLOPT_POSTFIELDS     => json_encode($data),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $response = curl_exec($ch);
    $error    = curl_error($ch);
    curl_close($ch);

    if ($error) {
        error_log('[SMS] cURL Error: ' . $error);
        return false;
    }

    $result = json_decode($response, true);
    error_log('[SMS] Response: ' . $response);
    return $result;
}

/**
 * Build the booking confirmation message
 */
function buildBookingConfirmSMS($booking) {
    $timeEnd = date('H:00', strtotime($booking['time']) + 3600);

    return "ยืนยันการจองสนามสำเร็จ\n" .
           "สนาม: {$booking['court_name']}\n" .
           "วันที่: {$booking['date']}\n" .
           "เวลา: {$booking['time']}-{$timeEnd}\n" .
           "ชื่อผู้จอง: {$booking['customer_name']}\n" .
           "เลขที่การจอง: #{$booking['booking_id']}\n" .
           "ขอบคุณที่ใช้บริการ Tennis Court";
}
