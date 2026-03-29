<?php
// API Entry Point for Tennis Court Booking Platform
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Sustainable Cache Management - No caching for the API endpoint
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Past date to force immediate expiration

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mailer.php';

if (DB_NAME === '' || DB_USER === '') {
    json_response(["error" => "Server configuration is incomplete"], 500);
}

start_app_session();

try {
    $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("set names utf8mb4");

    // Migration: Create audit_logs
    $conn->exec("CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(255),
        details TEXT,
        admin_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
} catch(PDOException $exception) {
    json_response(["error" => "Connection failed: " . $exception->getMessage()], 500);
}

$normalizePhoneForOtp = function ($phone) {
    $digits = preg_replace('/\D+/', '', (string) $phone);

    if (str_starts_with($digits, '0') && strlen($digits) === 10) {
        return '66' . substr($digits, 1);
    }

    if (str_starts_with($digits, '66')) {
        return $digits;
    }

    return $digits;
};

$extractOtpToken = function ($payload) {
    if (!is_array($payload)) {
        return null;
    }

    return $payload['token']
        ?? $payload['data']['token']
        ?? $payload['otp']['token']
        ?? null;
};

$callThaibulkSmsOtp = function ($endpoint, array $fields) {
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($fields),
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/x-www-form-urlencoded',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);

    $body = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    return [$body, $httpCode, $curlError];
};

$sendBookingNotifications = function (array $booking) {
    $notificationData = [
        'court_name' => $booking['court_name'] ?? '-',
        'date' => $booking['date'] ?? ($booking['booking_date'] ?? '-'),
        'time' => $booking['time'] ?? ($booking['booking_time'] ?? '-'),
        'customer_name' => $booking['customer_name'] ?? ($booking['user_name'] ?? '-'),
        'booking_id' => $booking['booking_id'] ?? ($booking['id'] ?? '-'),
        'payment_provider' => $booking['payment_provider'] ?? '-',
        'price' => $booking['price'] ?? 0,
    ];

    if (!empty($booking['email'])) {
        send_booking_confirmation_email($booking['email'], $notificationData);
    }
};

$requestedAction = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

switch($requestedAction) {
    case 'ping':
        echo json_encode(["ping" => "pong", "received" => $requestedAction]);
        break;

    case 'version':
        echo json_encode(["version" => "2.9.5 (Exact Date Fix)", "db" => DB_NAME]);
        break;

    case 'admin_session':
        $admin = get_admin_session_user();
        echo json_encode([
            "success" => (bool) $admin,
            "user" => $admin
        ]);
        break;

    case 'admin_logout':
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        echo json_encode(["success" => true]);
        break;

    case 'clear_opcache':
        $admin = require_admin_session();

        if (!function_exists('opcache_reset')) {
            json_response([
                "success" => false,
                "error" => "OPcache is not available on this server"
            ], 501);
        }

        if (!opcache_reset()) {
            json_response([
                "success" => false,
                "error" => "OPcache reset failed"
            ], 500);
        }

        $logStmt = $conn->prepare("INSERT INTO audit_logs (action, details, admin_name) VALUES (?, ?, ?)");
        $logStmt->execute([
            'OPCACHE_RESET',
            'Administrator cleared PHP OPcache',
            $admin['name'] ?? 'Admin'
        ]);

        echo json_encode([
            "success" => true,
            "message" => "PHP OPcache cleared successfully"
        ]);
        break;

    case 'get_mail_logs':
        require_admin_session();
        echo json_encode([
            "success" => true,
            "entries" => get_mail_log_entries(80),
        ]);
        break;

    case 'get_audit_logs':
        $admin = require_admin_session();
        $date = isset($_GET['date']) && !empty($_GET['date']) ? $_GET['date'] : null;
        // Debug logging for developers: Check your PHP error log
        if ($date) error_log("Admin requested Audit Logs for date: " . $date);

        if ($date) {
            // Use local system date for matching as server/browser are already aligned
            $stmt = $conn->prepare("SELECT * FROM audit_logs WHERE DATE(created_at) = ? ORDER BY created_at DESC LIMIT 500");
            $stmt->execute([$date]);
        } else {
            // Diagnostic: Only log system report if no date is specified (general view)
            $logStmt = $conn->prepare("INSERT INTO audit_logs (action, details, admin_name) VALUES (?, ?, ?)");
            $logStmt->execute(['SYSTEM_REPORT', 'Administrator viewed audit logs', $admin['name']]);
            $stmt = $conn->query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
        }
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'get_wallet_transactions':
        require_admin_session();
        $date = isset($_GET['date']) && !empty($_GET['date']) ? $_GET['date'] : null;
        if ($date) error_log("Admin requested Wallet TX for date: " . $date);

        if ($date) {
            // Use local system date for matching as server/browser are already aligned
            $stmt = $conn->prepare("
                SELECT wt.*, u.name as user_name, u.phone as user_phone 
                FROM wallet_transactions wt 
                LEFT JOIN users u ON wt.user_id = u.id 
                WHERE DATE(wt.created_at) = ?
                ORDER BY wt.created_at DESC 
            ");
            $stmt->execute([$date]);
        } else {
            $stmt = $conn->query("
                SELECT wt.*, u.name as user_name, u.phone as user_phone 
                FROM wallet_transactions wt 
                LEFT JOIN users u ON wt.user_id = u.id 
                ORDER BY wt.created_at DESC 
                LIMIT 200
            ");
        }
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
        break;

    case 'login':
        $data = get_json_input();
        $stmt = $conn->prepare("SELECT id, phone, name, surname, nickname, email, line_id, birthday, location, wallet_balance FROM users WHERE phone = ?");
        $stmt->execute([$data->phone]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($user ?: ["isRegistered" => false]);
        break;

    case 'request_otp':
        $data = get_json_input();
        $phone = trim($data->phone ?? '');
        $normalizedPhone = $normalizePhoneForOtp($phone);

        if ($normalizedPhone === '') {
            json_response(["success" => false, "error" => "Missing phone number"], 422);
        }

        if (OTP_API_KEY !== '' && OTP_API_SECRET !== '') {
            [$responseBody, $httpCode, $curlError] = $callThaibulkSmsOtp(
                'https://otp.thaibulksms.com/v2/otp/request',
                [
                    'key' => OTP_API_KEY,
                    'secret' => OTP_API_SECRET,
                    'msisdn' => $normalizedPhone,
                ]
            );

            if ($curlError) {
                json_response(["success" => false, "error" => "OTP provider request failed"], 502);
            }

            $decoded = json_decode($responseBody, true);
            $token = $extractOtpToken($decoded);

            if ($httpCode < 200 || $httpCode >= 300 || !$token) {
                json_response([
                    "success" => false,
                    "error" => $decoded['message'] ?? 'OTP provider rejected the request',
                    "provider_status" => $httpCode,
                ], 502);
            }

            $_SESSION['otp_phone'] = $phone;
            $_SESSION['otp_phone_normalized'] = $normalizedPhone;
            $_SESSION['otp_token'] = $token;
            $_SESSION['otp_requested_at'] = time();

            echo json_encode([
                "success" => true,
                "simulated" => false,
                "provider" => "thaibulksms",
                "provider_status" => $httpCode,
            ]);
            break;
        }

        if (OTP_WEBHOOK_URL === '') {
            echo json_encode(["success" => true, "simulated" => true]);
            break;
        }

        $method = strtoupper(OTP_METHOD ?: 'POST');
        $url = OTP_WEBHOOK_URL;
        $headers = ['Content-Type: application/json'];

        if (OTP_API_KEY !== '') {
            $headers[] = 'X-API-Key: ' . OTP_API_KEY;
        }
        if (OTP_API_SECRET !== '') {
            $headers[] = 'X-API-Secret: ' . OTP_API_SECRET;
        }

        $ch = curl_init();
        if ($method === 'GET') {
            $separator = str_contains($url, '?') ? '&' : '?';
            curl_setopt($ch, CURLOPT_URL, $url . $separator . 'phone=' . urlencode($phone));
        } else {
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['phone' => $phone]));
        }

        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
        ]);

        $responseBody = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            json_response(["success" => false, "error" => "OTP provider request failed"], 502);
        }

        $decoded = json_decode($responseBody, true);
        $providerAccepted = $httpCode >= 200 && $httpCode < 300;

        echo json_encode([
            "success" => $providerAccepted,
            "simulated" => false,
            "provider_status" => $httpCode,
            "provider_response" => is_array($decoded) ? $decoded : null
        ]);
        break;

    case 'verify_otp':
        $data = get_json_input();
        $phone = trim($data->phone ?? '');
        $pin = trim($data->pin ?? '');
        $normalizedPhone = $normalizePhoneForOtp($phone);

        if ($normalizedPhone === '' || $pin === '') {
            json_response(["success" => false, "error" => "Missing phone number or OTP PIN"], 422);
        }

        if (OTP_API_KEY !== '' && OTP_API_SECRET !== '') {
            $sessionToken = $_SESSION['otp_token'] ?? '';
            $sessionPhone = $_SESSION['otp_phone_normalized'] ?? '';

            if ($sessionToken === '' || $sessionPhone === '' || $sessionPhone !== $normalizedPhone) {
                json_response(["success" => false, "error" => "OTP session expired or mismatched phone number"], 409);
            }

            [$responseBody, $httpCode, $curlError] = $callThaibulkSmsOtp(
                'https://otp.thaibulksms.com/v2/otp/verify',
                [
                    'key' => OTP_API_KEY,
                    'secret' => OTP_API_SECRET,
                    'token' => $sessionToken,
                    'pin' => $pin,
                ]
            );

            if ($curlError) {
                json_response(["success" => false, "error" => "OTP verification request failed"], 502);
            }

            $decoded = json_decode($responseBody, true);
            $providerState = strtolower((string) ($decoded['status'] ?? $decoded['state'] ?? $decoded['result'] ?? ''));
            $isVerified = ($httpCode >= 200 && $httpCode < 300) &&
                !in_array($providerState, ['invalid', 'failed', 'expired', 'error'], true);

            if (!$isVerified) {
                json_response([
                    "success" => false,
                    "error" => $decoded['message'] ?? 'OTP verification failed',
                    "provider_status" => $httpCode,
                ], 401);
            }

            unset(
                $_SESSION['otp_phone'],
                $_SESSION['otp_phone_normalized'],
                $_SESSION['otp_token'],
                $_SESSION['otp_requested_at']
            );

            echo json_encode([
                "success" => true,
                "provider" => "thaibulksms",
                "provider_status" => $httpCode,
            ]);
            break;
        }

        echo json_encode([
            "success" => true,
            "simulated" => true,
        ]);
        break;

    case 'get_profile':
    case 'login_by_id':
        $userId = isset($_GET['id']) ? $_GET['id'] : (isset($_GET['user_id']) ? $_GET['user_id'] : null);
        if (!$userId) { echo json_encode(["error" => "No ID"]); break; }
        $stmt = $conn->prepare("SELECT id, phone, name, surname, nickname, email, line_id, birthday, location, wallet_balance FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($user ?: ["error" => "User not found"]);
        break;

    case 'register':
        $data = json_decode(file_get_contents("php://input"));
        try {
            $stmt = $conn->prepare("INSERT INTO users (phone, name, surname, nickname, email, line_id, birthday, location, wallet_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)");
            $stmt->execute([
                $data->phone, 
                $data->name, 
                $data->surname ?? '', 
                $data->nickname ?? '', 
                $data->email, 
                $data->line_id ?? '', 
                $data->birthday,
                $data->location ?? 'Tennis Court'
            ]);
            $data->id = $conn->lastInsertId();
            $data->wallet_balance = 0;
            echo json_encode($data);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                // Duplicate phone — return existing user instead
                $stmt2 = $conn->prepare("SELECT id, phone, name, surname, nickname, email, line_id, birthday, location, wallet_balance FROM users WHERE phone = ?");
                $stmt2->execute([$data->phone]);
                $existing = $stmt2->fetch(PDO::FETCH_ASSOC);
                if ($existing) {
                    echo json_encode(array_merge($existing, ["isRegistered" => true]));
                } else {
                    echo json_encode(["error" => "Duplicate phone"]);
                }
            } else {
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        break;

    case 'courts':
        $stmt = $conn->query("SELECT * FROM courts WHERE is_active = 1");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'get_all_status':
        $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
        
        $stmt = $conn->prepare("SELECT id, court_id, date, TIME_FORMAT(hour, '%H:%i') as hour, is_open, booked_by, pending_by FROM allotments WHERE date = ?");
        $stmt->execute([$date]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;
    case 'check_payment_status':
        // Called by frontend to detect when webhook or Omise has confirmed payment
        $id  = $_GET['id'] ?? $_GET['booking_id'] ?? null;
        $ref = $_GET['ref'] ?? null;
        
        // Debug logging
        $logFile = __DIR__ . '/debug_payment.txt';
        $logMsg = date('[Y-m-d H:i:s]') . " Check Status - ID: $id, REF: $ref\n";
        file_put_contents($logFile, $logMsg, FILE_APPEND);

        if (!$id && !$ref) {
            echo json_encode(["status" => "Error", "error" => "Missing identification (id or ref)"]);
            break;
        }

        // 1. Try to find the booking
        $sql = "SELECT b.*, u.name as user_name FROM bookings b JOIN users u ON b.user_id = u.id WHERE " . ($id ? "b.id = ?" : "b.transaction_ref = ?");
        $stmt = $conn->prepare($sql);
        $stmt->execute([$id ?? $ref]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$row) {
            file_put_contents($logFile, "  => Result: NotFound\n", FILE_APPEND);
            echo json_encode(["status" => "NotFound", "error" => "Booking not found", "id" => $id, "ref" => $ref]);
            break;
        }

        file_put_contents($logFile, "  => Found Booking #{$row['id']}, Status: {$row['status']}\n", FILE_APPEND);

        // 2. If already Paid/Confirmed, return immediately
        $status = strtolower($row['status']);
        if ($status === 'paid' || $status === 'confirmed' || $status === 'success') {
            file_put_contents($logFile, "  => Status is already $status. Returning success.\n", FILE_APPEND);
            echo json_encode($row);
            break;
        }

        // 3. Self-Healing: If still Pending but has a charge ID, check Omise directly
        $chargeId = $row['transaction_ref'] ?? $ref;
        if ($chargeId && strpos($chargeId, 'chrg_') === 0) {
            file_put_contents($logFile, "  => Checking Omise API for $chargeId...\n", FILE_APPEND);
            
            $ch = curl_init("https://api.omise.co/charges/$chargeId");
            curl_setopt_array($ch, [
                CURLOPT_USERPWD        => OMISE_SECRET_KEY . ':',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 5, // Faster timeout for better polling feel
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            ]);
            $raw = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr = curl_error($ch);
            curl_close($ch);
            
            file_put_contents($logFile, "  => Omise Response Code: $httpCode\n", FILE_APPEND);
            if ($curlErr) file_put_contents($logFile, "  => CURL Error: $curlErr\n", FILE_APPEND);

            $charge = json_decode($raw, true);
            
            // Check for SUCCESS conditions
            $isSuccessful = ($charge && isset($charge['status']) && $charge['status'] === 'successful');
            $isPaid       = ($charge && isset($charge['paid']) && $charge['paid'] === true);
            
            file_put_contents($logFile, "  => Status: " . ($charge['status'] ?? 'N/A') . " | Paid: " . ($charge['paid'] ? 'YES' : 'NO') . "\n", FILE_APPEND);

            if ($isSuccessful || $isPaid) {
                file_put_contents($logFile, "  => SUCCESS! Healing record to Paid.\n", FILE_APPEND);
                // Update Booking Status
                $conn->prepare("UPDATE bookings SET status='Paid', transaction_ref=? WHERE id=?")
                     ->execute([$chargeId, $row['id']]);
                
                // Update Allotment (Booked status)
                $userName = $row['user_name'] ?? 'Paid';
                $stmtAlloc = $conn->prepare("
                    INSERT INTO allotments (court_id, date, hour, is_open, booked_by) 
                    VALUES (?, ?, ?, 0, ?)
                    ON DUPLICATE KEY UPDATE is_open = 0, booked_by = VALUES(booked_by), pending_by = NULL
                ");
                $stmtAlloc->execute([$row['court_id'], $row['booking_date'], $row['booking_time'], $userName]);
                
                // LOG ACTION
                $logStmt = $conn->prepare("INSERT INTO audit_logs (action, details, admin_name) VALUES (?, ?, ?)");
                $logDetails = "Auto-Confirmed (Omise): " . $userName . " | " . $row['booking_date'] . " " . $row['booking_time'] . " | Ref: " . $chargeId;
                $logStmt->execute(['PAYMENT_AUTO', $logDetails, 'System']);

                $row['status'] = 'Paid';
                $row['transaction_ref'] = $chargeId;
            } else if (isset($charge['code'])) {
                file_put_contents($logFile, "  => Omise Error: " . $charge['message'] . "\n", FILE_APPEND);
            }
        }
        
        echo json_encode($row);
        break;

    case 'toggle_allotment':
        $admin = require_admin_session();
        $data = get_json_input();
        $stmt = $conn->prepare("SELECT id FROM allotments WHERE court_id = ? AND date = ? AND hour = ?");
        $stmt->execute([$data->court_id, $data->date, $data->hour]);
        $existing = $stmt->fetch();
        if ($existing) {
            $conn->prepare("UPDATE allotments SET is_open = NOT is_open WHERE id = ?")->execute([$existing['id']]);
        } else {
            $conn->prepare("INSERT INTO allotments (court_id, date, hour, is_open) VALUES (?, ?, ?, 0)")->execute([$data->court_id, $data->date, $data->hour]);
        }
        $logStmt = $conn->prepare("INSERT INTO audit_logs (action, details, admin_name) VALUES (?, ?, ?)");
        $details = "Toggled allotment court #{$data->court_id} on {$data->date} {$data->hour}";
        $logStmt->execute(['TOGGLE_ALLOTMENT', $details, $admin['name']]);
        echo json_encode(["success" => true]);
        break;

    case 'set_pending':
        $data = json_decode(file_get_contents("php://input"));
        $booking_id = null;
        if (isset($data->user_id) && $data->user_id > 0) {
            $stmt = $conn->prepare("INSERT INTO bookings (user_id, court_id, booking_date, booking_time, price, status) 
                                   VALUES (?, ?, ?, ?, ?, 'Pending')");
            $stmt->execute([
                $data->user_id, 
                $data->court_id, 
                $data->date, 
                $data->hour, 
                $data->price ?? 0
            ]);
            $booking_id = $conn->lastInsertId();
            echo json_encode(["success" => true, "booking_id" => (int)$booking_id]);
        } else {
            echo json_encode(["success" => false, "error" => "Invalid or missing user_id"]);
        }
        break;

    case 'clear_pending':
        $data = json_decode(file_get_contents("php://input"));
        $conn->prepare("UPDATE allotments SET pending_by = NULL WHERE court_id = ? AND date = ? AND hour = ?")
             ->execute([$data->court_id, $data->date, $data->hour]);
        echo json_encode(["success" => true]);
        break;

    case 'confirm_booking':
        $data = json_decode(file_get_contents("php://input"));
        
        // 1. Update allotments table
        $stmt = $conn->prepare("
            INSERT INTO allotments (court_id, date, hour, is_open, booked_by, pending_by) 
            VALUES (?, ?, ?, 0, ?, NULL)
            ON DUPLICATE KEY UPDATE is_open = 0, booked_by = VALUES(booked_by), pending_by = NULL
        ");
        $stmt->execute([$data->court_id, $data->date, $data->hour, $data->user_name ?? 'Booked']);

        // 2. Update existing booking if ID is provided, else insert new one
        if (isset($data->booking_id)) {
            $stmt = $conn->prepare("UPDATE bookings SET status='Paid', payment_provider=? WHERE id=?");
            $stmt->execute([$data->payment_provider ?? 'manual', $data->booking_id]);
        } else {
            $stmt = $conn->prepare("INSERT INTO bookings (user_id, court_id, booking_date, booking_time, price, status, payment_provider) VALUES (?, ?, ?, ?, ?, 'Paid', ?)");
            $stmt->execute([$data->user_id, $data->court_id, $data->date, $data->hour, $data->price, $data->payment_provider ?? 'manual']);
        }

        // 3. LOG ACTION
        $logStmt = $conn->prepare("INSERT INTO audit_logs (action, details, admin_name) VALUES (?, ?, ?)");
        $ref = $data->transaction_ref ?? $data->ref ?? 'N/A';
        $details = "Payment Confirmed for " . ($data->user_name ?? 'User') . " on " . $data->date . " " . $data->hour . " (฿" . ($data->price ?? 0) . ") | Ref: " . $ref;
        $logStmt->execute(['PAYMENT_CONFIRM', $details, 'System']);

        echo json_encode(["success" => true, "id" => $conn->lastInsertId(), "created" => true]);
        break;

    case 'get_admin_bookings':
        require_admin_session();
        $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
        // Fetch real bookings joined with user and court info (use LEFT JOIN for robustness)
        $stmt = $conn->prepare("
            SELECT b.*, u.name as user_name, u.phone as user_phone, c.name as court_name 
            FROM bookings b 
            LEFT JOIN users u ON b.user_id = u.id 
            LEFT JOIN courts c ON b.court_id = c.id 
            WHERE b.booking_date = ?
            ORDER BY b.created_at DESC
        ");
        $stmt->execute([$date]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'get_user_history':
        $userId = $_GET['user_id'] ?? null;
        if (!$userId) { echo json_encode(["error" => "Missing user_id"]); break; }
        
        $stmt = $conn->prepare("
            SELECT b.*, c.name as court_name, u.location as venue_name, b.booking_date, b.booking_time
            FROM bookings b 
            LEFT JOIN courts c ON b.court_id = c.id 
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        ");
        $stmt->execute([$userId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'delete_booking':
        $id = $_GET['id'] ?? null;
        if (!$id) { echo json_encode(["error" => "Missing ID"]); break; }
        
        // 1. Get booking details to clear allotment
        $stmt = $conn->prepare("SELECT court_id, booking_date, booking_time FROM bookings WHERE id = ?");
        $stmt->execute([$id]);
        $b = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($b) {
            // 2. Clear allotment
            $conn->prepare("UPDATE allotments SET booked_by=NULL, pending_by=NULL, is_open=1 WHERE court_id=? AND date=? AND hour=?")
                 ->execute([$b['court_id'], $b['booking_date'], $b['booking_time']]);
            
            // 3. Delete booking
            $conn->prepare("DELETE FROM bookings WHERE id = ?")->execute([$id]);
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => "Booking not found"]);
        }
        break;

    case 'admin_delete_booking':
        $admin = require_admin_session();
        $data = get_json_input();
        $id = $data->booking_id ?? null;

        // 1. Get details for log
        $stmt = $conn->prepare("SELECT b.*, u.name as user_name FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.id = ?");
        $stmt->execute([$id]);
        $b = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($b) {
            // 2. Clear allotment
            $conn->prepare("UPDATE allotments SET booked_by=NULL, pending_by=NULL, is_open=1 WHERE court_id=? AND date=? AND hour=?")
                 ->execute([$b['court_id'], $b['booking_date'], $b['booking_time']]);
            
            // 3. Delete booking
            $conn->prepare("DELETE FROM bookings WHERE id = ?")->execute([$id]);

            // 4. LOG ACTION
            $logStmt = $conn->prepare("INSERT INTO audit_logs (action, details, admin_name) VALUES (?, ?, ?)");
            $details = "Deleted booking #$id for {$b['user_name']} on {$b['booking_date']} {$b['booking_time']}";
            $logStmt->execute(['DELETE_BOOKING', $details, $admin['name']]);

            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => "Booking not found"]);
        }
        break;

    case 'get_rates':
        // Explicitly select price_per_hour as the source of truth
        $stmt = $conn->query("SELECT id, name, type, price_per_hour, price_per_hour as rate FROM courts WHERE is_active = 1");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'update_rate':
        $admin = require_admin_session();
        $data = get_json_input();
        $id = (int)$data->id;
        $val = (float)$data->rate;
        // Update price_per_hour (Main Source)
        $stmt = $conn->prepare("UPDATE courts SET price_per_hour = ? WHERE id = ?");
        $stmt->execute([$val, $id]);
        // Also try to update 'rate' column if it still exists (legacy support)
        try {
            @$conn->exec("UPDATE courts SET rate = $val WHERE id = $id");
        } catch (Exception $e) {}
        $logStmt = $conn->prepare("INSERT INTO audit_logs (action, details, admin_name) VALUES (?, ?, ?)");
        $details = "Updated court rate for court #$id to $val";
        $logStmt->execute(['UPDATE_RATE', $details, $admin['name']]);
        echo json_encode(["success" => true]);
        break;


    case 'get_wallet':
        $data = json_decode(file_get_contents("php://input"));
        $stmt = $conn->prepare("SELECT wallet_balance FROM users WHERE id = ? OR phone = ? LIMIT 1");
        $stmt->execute([$data->user_id ?? null, $data->phone ?? null]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(["wallet_balance" => $row ? (float)$row['wallet_balance'] : 0]);
        break;

    case 'topup_wallet':
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->amount) || $data->amount <= 0) {
            echo json_encode(["error" => "Invalid amount"]); break;
        }
        // Use += to be atomic-safe (handles concurrent requests)
        $stmt = $conn->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ? OR phone = ?");
        $stmt->execute([(float)$data->amount, $data->user_id ?? null, $data->phone ?? null]);
        // Return the new balance
        $stmt2 = $conn->prepare("SELECT wallet_balance FROM users WHERE id = ? OR phone = ? LIMIT 1");
        $stmt2->execute([$data->user_id ?? null, $data->phone ?? null]);
        $row = $stmt2->fetch(PDO::FETCH_ASSOC);
        echo json_encode(["success" => true, "wallet_balance" => (float)$row['wallet_balance']]);
        break;

    case 'process_payment_wallet':
        $data = json_decode(file_get_contents("php://input"));
        $userId = $data->user_id;
        $amount = (float)$data->amount;
        $bookingId = $data->booking_id ?? null;

        try {
            $conn->beginTransaction();

            // 1. Check wallet balance
            $stmt = $conn->prepare("SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE");
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user || $user['wallet_balance'] < $amount) {
                $conn->rollBack();
                echo json_encode(["success" => false, "error" => "Insufficient funds"]);
                break;
            }

            // 2. Deduct balance
            $stmt = $conn->prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?");
            $stmt->execute([$amount, $userId]);

            // 3. Update or Insert booking
            if ($bookingId) {
                $stmt = $conn->prepare("UPDATE bookings SET status='Paid', payment_provider='wallet' WHERE id=?");
                $stmt->execute([$bookingId]);
            } else {
                $stmt = $conn->prepare("INSERT INTO bookings (user_id, court_id, booking_date, booking_time, price, status, payment_provider) VALUES (?, ?, ?, ?, ?, 'Paid', 'wallet')");
                $stmt->execute([$userId, $data->court_id, $data->date, $data->hour, $amount]);
                $bookingId = $conn->lastInsertId();
            }

            // 4. Update allotment
            $stmt = $conn->prepare("
                INSERT INTO allotments (court_id, date, hour, is_open, booked_by, pending_by) 
                VALUES (?, ?, ?, 0, ?, NULL)
                ON DUPLICATE KEY UPDATE is_open = 0, booked_by = VALUES(booked_by), pending_by = NULL
            ");
            $stmt->execute([$data->court_id, $data->date, $data->hour, $data->user_name ?? 'Wallet']);

            // 5. LOG ACTION
            $logStmt = $conn->prepare("INSERT INTO audit_logs (action, details, admin_name) VALUES (?, ?, ?)");
            $details = "Wallet Payment: " . ($data->user_name ?? 'User') . " booked " . $data->date . " " . $data->hour . " (฿" . $amount . ")";
            $logStmt->execute(['WALLET_PAYMENT', $details, 'System']);

            $conn->commit();

            $stmt = $conn->prepare("
                SELECT 
                    b.id AS booking_id,
                    b.price,
                    b.booking_date AS date,
                    b.booking_time AS time,
                    b.payment_provider,
                    u.name AS customer_name,
                    u.phone,
                    u.email,
                    c.name AS court_name
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.id
                LEFT JOIN courts c ON b.court_id = c.id
                WHERE b.id = ?
                LIMIT 1
            ");
            $stmt->execute([$bookingId]);
            $bookingNotification = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($bookingNotification) {
                $sendBookingNotifications($bookingNotification);
            }

            echo json_encode(["success" => true, "booking_id" => $bookingId]);
        } catch (Exception $e) {
            $conn->rollBack();
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'check_topup_status':
        $chargeId = $_GET['charge_id'] ?? null;
        if (!$chargeId) {
            echo json_encode(["status" => "error", "message" => "Missing charge_id"]);
            break;
        }

        $normalizePaymentStatus = function ($status, $paid = null, $captured = null) {
            $normalized = strtolower(trim((string) $status));
            if (
                in_array($normalized, ['paid', 'confirmed', 'success', 'successful', 'captured', 'complete', 'completed'], true) ||
                $paid === true ||
                $captured === true
            ) {
                return 'Paid';
            }

            if ($normalized === '') {
                return 'Pending';
            }

            return ucfirst($normalized);
        };

        $getWalletBalanceAfter = function ($userId) use ($conn) {
            $stmtBalance = $conn->prepare("SELECT wallet_balance FROM users WHERE id = ? LIMIT 1");
            $stmtBalance->execute([$userId]);
            $walletBalance = $stmtBalance->fetchColumn();
            if ($walletBalance === false) {
                return null;
            }

            return (float) $walletBalance;
        };

        // 1. Check local DB first
        $stmt = $conn->prepare("SELECT status, user_id, amount FROM wallet_transactions WHERE charge_id = ?");
        $stmt->execute([$chargeId]);
        $tx = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tx) {
            echo json_encode(["status" => "NotFound"]);
            break;
        }

        $storedStatus = $normalizePaymentStatus($tx['status']);
        if ($storedStatus === 'Paid') {
            echo json_encode([
                "status" => "Paid",
                "wallet_balance_after" => $getWalletBalanceAfter($tx['user_id'])
            ]);
            break;
        }

        // 2. If Pending, ask Omise directly for real-time speed
        if ($storedStatus === 'Pending') {
            $ch = curl_init("https://api.omise.co/charges/" . $chargeId);
            curl_setopt_array($ch, [
                CURLOPT_USERPWD        => OMISE_SECRET_KEY . ':',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 5,
                CURLOPT_SSL_VERIFYPEER => false,
            ]);
            $resp = curl_exec($ch);
            curl_close($ch);

            if ($resp) {
                $omiseCharge = json_decode($resp, true);
                $remoteStatus = $normalizePaymentStatus(
                    $omiseCharge['status'] ?? '',
                    $omiseCharge['paid'] ?? null,
                    $omiseCharge['captured'] ?? null
                );

                if ($remoteStatus === 'Paid') {
                    // Start transaction to avoid double credit if webhook arrives at the same time
                    $conn->beginTransaction();
                    try {
                        // Re-check status to be absolutely sure
                        $stmt = $conn->prepare("SELECT status FROM wallet_transactions WHERE charge_id = ? FOR UPDATE");
                        $stmt->execute([$chargeId]);
                        $st = $stmt->fetchColumn();

                        if ($normalizePaymentStatus($st) === 'Pending') {
                            $stmt = $conn->prepare("UPDATE wallet_transactions SET status = 'Paid' WHERE charge_id = ?");
                            $stmt->execute([$chargeId]);

                            $stmt = $conn->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?");
                            $stmt->execute([$tx['amount'], $tx['user_id']]);
                        }
                        $conn->commit();
                        echo json_encode([
                            "status" => "Paid",
                            "wallet_balance_after" => $getWalletBalanceAfter($tx['user_id'])
                        ]);
                        break;
                    } catch (Exception $e) {
                        $conn->rollBack();
                    }
                }
            }
        }

        echo json_encode(["status" => $storedStatus]);
        break;

    case 'admin_login':
        $data = get_json_input();
        $stmt = $conn->prepare("SELECT id, email, password_hash, role, name FROM admins WHERE email = ?");
        $stmt->execute([$data->email]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($admin && password_verify($data->password, $admin['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int) $admin['id'];
            $_SESSION['admin_name'] = $admin['name'] ?? 'Admin';
            $_SESSION['admin_role'] = $admin['role'] ?? 'admin';
            $_SESSION['admin_email'] = $admin['email'] ?? null;
            unset($admin['password_hash']);
            echo json_encode(["success" => true, "user" => $admin]);
        } else {
            $_SESSION = [];
            echo json_encode(["success" => false, "error" => "Invalid email or password"]);
        }
        break;

    default:
        echo json_encode(["error" => "Invalid action: " . $requestedAction]);
        break;
}
?>
