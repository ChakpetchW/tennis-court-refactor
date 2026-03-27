<?php
// API Entry Point for Tennis Court Booking Platform
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit;
}

// Load shared config if available (production), else use inline fallback
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    $host     = DB_HOST; 
    $db_name  = DB_NAME;
    $username = DB_USER;
    $password = DB_PASS;
} else {
    $host = 'localhost'; $db_name = 'scaleupc_court';
    $username = 'scaleupc_court'; $password = 'ZmcpPgKGccdxtefU5MtD';
}

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
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
    echo json_encode(["error" => "Connection failed: " . $exception->getMessage()]);
    exit;
}

$requestedAction = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

switch($requestedAction) {
    case 'ping':
        echo json_encode(["ping" => "pong", "received" => $requestedAction]);
        break;

    case 'version':
        echo json_encode(["version" => "2.6 (Subdirectory Fix)", "db" => $db_name]);
        break;

    case 'get_audit_logs':
        // Diagnostic: Log that admin requested logs
        $logStmt = $conn->prepare("INSERT INTO audit_logs (action, details, admin_name) VALUES (?, ?, ?)");
        $logStmt->execute(['SYSTEM_REPORT', 'Administrator viewed audit logs', 'System']);
        
        $stmt = $conn->query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'get_wallet_transactions':
        $stmt = $conn->query("
            SELECT wt.*, u.name as user_name, u.phone as user_phone 
            FROM wallet_transactions wt 
            LEFT JOIN users u ON wt.user_id = u.id 
            ORDER BY wt.created_at DESC 
            LIMIT 200
        ");
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
        break;

    case 'login':
        $data = json_decode(file_get_contents("php://input"));
        $stmt = $conn->prepare("SELECT id, phone, name, surname, nickname, email, line_id, birthday, location, wallet_balance FROM users WHERE phone = ?");
        $stmt->execute([$data->phone]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($user ?: ["isRegistered" => false]);
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
        $data = json_decode(file_get_contents("php://input"));
        $stmt = $conn->prepare("SELECT id FROM allotments WHERE court_id = ? AND date = ? AND hour = ?");
        $stmt->execute([$data->court_id, $data->date, $data->hour]);
        $existing = $stmt->fetch();
        if ($existing) {
            $conn->prepare("UPDATE allotments SET is_open = NOT is_open WHERE id = ?")->execute([$existing['id']]);
        } else {
            $conn->prepare("INSERT INTO allotments (court_id, date, hour, is_open) VALUES (?, ?, ?, 0)")->execute([$data->court_id, $data->date, $data->hour]);
        }
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
        $data = json_decode(file_get_contents("php://input"));
        $id = $data->booking_id ?? null;
        $passwordAttempt = $data->password ?? '';
        
        // Verify against hardcoded or config password
        if ($passwordAttempt !== '1234') { // Default fallback, should be from config
            echo json_encode(["error" => "Invalid admin password"]); break;
        }

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
            $logStmt->execute(['DELETE_BOOKING', $details, $data->admin_name ?? 'Admin']);

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
        $data = json_decode(file_get_contents("php://input"));
        $id = (int)$data->id;
        $val = (float)$data->rate;
        // Update price_per_hour (Main Source)
        $stmt = $conn->prepare("UPDATE courts SET price_per_hour = ? WHERE id = ?");
        $stmt->execute([$val, $id]);
        // Also try to update 'rate' column if it still exists (legacy support)
        try {
            @$conn->exec("UPDATE courts SET rate = $val WHERE id = $id");
        } catch (Exception $e) {}
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

        // 1. Check local DB first
        $stmt = $conn->prepare("SELECT status, user_id, amount FROM wallet_transactions WHERE charge_id = ?");
        $stmt->execute([$chargeId]);
        $tx = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tx) {
            echo json_encode(["status" => "NotFound"]);
            break;
        }

        if ($tx['status'] === 'Paid') {
            echo json_encode(["status" => "Paid"]);
            break;
        }

        // 2. If Pending, ask Omise directly for real-time speed
        if ($tx['status'] === 'Pending') {
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
                if (isset($omiseCharge['status']) && $omiseCharge['status'] === 'successful') {
                    // Start transaction to avoid double credit if webhook arrives at the same time
                    $conn->beginTransaction();
                    try {
                        // Re-check status to be absolutely sure
                        $stmt = $conn->prepare("SELECT status FROM wallet_transactions WHERE charge_id = ? FOR UPDATE");
                        $stmt->execute([$chargeId]);
                        $st = $stmt->fetchColumn();

                        if ($st === 'Pending') {
                            $stmt = $conn->prepare("UPDATE wallet_transactions SET status = 'Paid' WHERE charge_id = ?");
                            $stmt->execute([$chargeId]);

                            $stmt = $conn->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?");
                            $stmt->execute([$tx['amount'], $tx['user_id']]);
                        }
                        $conn->commit();
                        echo json_encode(["status" => "Paid"]);
                        break;
                    } catch (Exception $e) {
                        $conn->rollBack();
                    }
                }
            }
        }

        echo json_encode(["status" => $tx['status']]);
        break;

    case 'admin_login':
        $data = json_decode(file_get_contents("php://input"));
        $stmt = $conn->prepare("SELECT id, email, password_hash, role, name FROM admins WHERE email = ?");
        $stmt->execute([$data->email]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($admin && password_verify($data->password, $admin['password_hash'])) {
            unset($admin['password_hash']);
            echo json_encode(["success" => true, "user" => $admin]);
        } else {
            echo json_encode(["success" => false, "error" => "Invalid email or password"]);
        }
        break;

    default:
        echo json_encode(["error" => "Invalid action: " . $requestedAction]);
        break;
}
?>
