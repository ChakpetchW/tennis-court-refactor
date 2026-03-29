<?php
/**
 * Minimal SMTP mailer for booking confirmation emails.
 * Uses MAIL_* values from config.php and supports LOGIN auth.
 */

if (!function_exists('mail_log_dir')) {
    function mail_log_dir() {
        return dirname(__DIR__) . DIRECTORY_SEPARATOR . '.runtime';
    }
}

if (!function_exists('mail_log_path')) {
    function mail_log_path() {
        return mail_log_dir() . DIRECTORY_SEPARATOR . 'mail.log';
    }
}

if (!function_exists('mail_log_event')) {
    function mail_log_event($level, $message, array $context = []) {
        $directory = mail_log_dir();
        if (!is_dir($directory)) {
            @mkdir($directory, 0775, true);
        }

        $entry = [
            'timestamp' => date('c'),
            'level' => strtoupper((string) $level),
            'message' => $message,
            'context' => $context,
        ];

        @file_put_contents(
            mail_log_path(),
            json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }
}

if (!function_exists('get_mail_log_entries')) {
    function get_mail_log_entries($limit = 100) {
        $path = mail_log_path();
        if (!is_readable($path)) {
            return [];
        }

        $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!$lines) {
            return [];
        }

        $slice = array_slice($lines, -1 * max(1, (int) $limit));
        $entries = [];

        foreach ($slice as $line) {
            $decoded = json_decode($line, true);
            if (is_array($decoded)) {
                $entries[] = $decoded;
            }
        }

        return array_reverse($entries);
    }
}

if (!function_exists('smtp_read_response')) {
    function smtp_read_response($socket) {
        $response = '';

        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }

        return $response;
    }
}

if (!function_exists('smtp_expect_code')) {
    function smtp_expect_code($response, array $expectedCodes) {
        $code = (int) substr((string) $response, 0, 3);
        return in_array($code, $expectedCodes, true);
    }
}

if (!function_exists('smtp_send_command')) {
    function smtp_send_command($socket, $command, array $expectedCodes) {
        fwrite($socket, $command . "\r\n");
        $response = smtp_read_response($socket);

        if (!smtp_expect_code($response, $expectedCodes)) {
            throw new RuntimeException(trim($response) ?: 'SMTP command failed');
        }

        return $response;
    }
}

if (!function_exists('smtp_encode_header')) {
    function smtp_encode_header($value) {
        return '=?UTF-8?B?' . base64_encode((string) $value) . '?=';
    }
}

if (!function_exists('mail_escape_html')) {
    function mail_escape_html($value) {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('build_booking_time_range')) {
    function build_booking_time_range(array $booking) {
        $startTime = (string) ($booking['time'] ?? '-');
        $timestamp = strtotime($startTime);
        if ($timestamp === false) {
            return $startTime;
        }

        return date('H:i', $timestamp) . ' - ' . date('H:i', $timestamp + 3600) . ' น.';
    }
}

if (!function_exists('format_booking_display_date')) {
    function format_booking_display_date($dateValue) {
        $timestamp = strtotime((string) $dateValue);
        if ($timestamp === false) {
            return (string) $dateValue;
        }

        return date('d/m/Y', $timestamp);
    }
}

if (!function_exists('format_payment_method_label')) {
    function format_payment_method_label($paymentProvider) {
        $provider = strtolower(trim((string) $paymentProvider));

        return match ($provider) {
            'promptpay', 'qr' => 'PromptPay',
            'wallet' => 'Wallet',
            'credit', 'card' => 'Credit / Debit Card',
            'omise' => 'Omise',
            default => $provider !== '' ? ucfirst($provider) : '-',
        };
    }
}

if (!function_exists('build_booking_confirmation_email_text')) {
    function build_booking_confirmation_email_text(array $booking) {
        return implode("\n", [
            'ยืนยันการจองสนาม Tennis Court',
            '',
            'ระบบได้รับการชำระเงินและยืนยันการจองของคุณเรียบร้อยแล้ว',
            'เลขที่การจอง: #' . ($booking['booking_id'] ?? '-'),
            'ชื่อผู้จอง: ' . ($booking['customer_name'] ?? '-'),
            'สนาม: ' . ($booking['court_name'] ?? '-'),
            'วันที่: ' . format_booking_display_date($booking['date'] ?? '-'),
            'เวลา: ' . build_booking_time_range($booking),
            'ช่องทางการชำระ: ' . format_payment_method_label($booking['payment_provider'] ?? ''),
            'ยอดชำระ: ฿' . number_format((float) ($booking['price'] ?? 0), 2),
            '',
            'หากต้องการตรวจสอบข้อมูลเพิ่มเติม กรุณาเข้าสู่ระบบที่เว็บไซต์ Tennis Court',
            'ขอบคุณที่ใช้บริการ Tennis Court',
        ]);
    }
}

if (!function_exists('build_booking_confirmation_email_html')) {
    function build_booking_confirmation_email_html(array $booking) {
        $bookingId = mail_escape_html('#' . ($booking['booking_id'] ?? '-'));
        $customerName = mail_escape_html($booking['customer_name'] ?? '-');
        $courtName = mail_escape_html($booking['court_name'] ?? '-');
        $date = mail_escape_html(format_booking_display_date($booking['date'] ?? '-'));
        $timeRange = mail_escape_html(build_booking_time_range($booking));
        $paymentMethod = mail_escape_html(format_payment_method_label($booking['payment_provider'] ?? ''));
        $amount = mail_escape_html('฿' . number_format((float) ($booking['price'] ?? 0), 2));

        return '<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ยืนยันการจองสนาม</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7f5;font-family:Tahoma,Arial,sans-serif;color:#17311f;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dce9de;box-shadow:0 18px 50px rgba(16,61,33,0.08);">
        <div style="background:#1f6b2d;padding:28px 32px;color:#ffffff;">
          <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Tennis Court</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.25;">ยืนยันการจองสนามเรียบร้อยแล้ว</h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.7;opacity:0.92;">
            ระบบได้รับการชำระเงินและล็อกช่วงเวลาการจองของคุณเรียบร้อยแล้ว
          </p>
        </div>

        <div style="padding:32px;">
          <div style="background:#f3fbf4;border:1px solid #d8eadb;border-radius:18px;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:13px;color:#51705a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">เลขที่การจอง</div>
            <div style="font-size:26px;font-weight:700;color:#1d4d29;">' . $bookingId . '</div>
          </div>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#62806a;font-size:14px;width:34%;">ชื่อผู้จอง</td>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#16311f;font-size:15px;font-weight:700;">' . $customerName . '</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#62806a;font-size:14px;">สนาม</td>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#16311f;font-size:15px;font-weight:700;">' . $courtName . '</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#62806a;font-size:14px;">วันที่</td>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#16311f;font-size:15px;font-weight:700;">' . $date . '</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#62806a;font-size:14px;">เวลา</td>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#16311f;font-size:15px;font-weight:700;">' . $timeRange . '</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#62806a;font-size:14px;">ช่องทางการชำระ</td>
              <td style="padding:12px 0;border-bottom:1px solid #edf2ee;color:#16311f;font-size:15px;font-weight:700;">' . $paymentMethod . '</td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#62806a;font-size:14px;">ยอดชำระ</td>
              <td style="padding:12px 0;color:#1d4d29;font-size:18px;font-weight:800;">' . $amount . '</td>
            </tr>
          </table>

          <div style="margin-top:26px;padding:18px 20px;background:#fff8ea;border:1px solid #f2dfb7;border-radius:16px;color:#6c5716;font-size:14px;line-height:1.7;">
            กรุณาเก็บอีเมลฉบับนี้ไว้เป็นหลักฐานการจอง หากต้องการตรวจสอบประวัติการจองหรือข้อมูลเพิ่มเติม สามารถเข้าสู่ระบบผ่านเว็บไซต์ Tennis Court ได้ตลอดเวลา
          </div>
        </div>

        <div style="padding:20px 32px;background:#fafcfb;border-top:1px solid #edf2ee;color:#6b7f70;font-size:12px;line-height:1.8;">
          อีเมลฉบับนี้ถูกส่งอัตโนมัติจากระบบ Tennis Court กรุณาอย่าตอบกลับอีเมลนี้โดยตรง
        </div>
      </div>
    </div>
  </body>
</html>';
    }
}

if (!function_exists('send_booking_confirmation_email')) {
    function send_booking_confirmation_email($toEmail, array $booking) {
        $baseContext = [
            'to' => $toEmail,
            'booking_id' => $booking['booking_id'] ?? null,
            'smtp_host' => MAIL_HOST,
            'smtp_port' => (int) (MAIL_PORT ?: 587),
            'smtp_encryption' => strtolower(trim((string) MAIL_ENCRYPTION)),
            'smtp_username' => MAIL_USERNAME,
            'from_address' => MAIL_FROM_ADDRESS,
        ];

        if (
            MAIL_HOST === '' ||
            MAIL_USERNAME === '' ||
            MAIL_PASSWORD === '' ||
            MAIL_FROM_ADDRESS === '' ||
            $toEmail === ''
        ) {
            mail_log_event('error', 'SMTP is not configured. Skipping booking confirmation email.', $baseContext);
            error_log('[MAIL] SMTP is not configured. Skipping booking confirmation email.');
            return ['success' => false, 'error' => 'SMTP is not configured'];
        }

        $port = (int) (MAIL_PORT ?: 587);
        $encryption = strtolower(trim((string) MAIL_ENCRYPTION));
        $transportHost = $encryption === 'ssl' ? 'ssl://' . MAIL_HOST : MAIL_HOST;
        mail_log_event('info', 'Starting booking confirmation email delivery', $baseContext);
        $socket = @stream_socket_client($transportHost . ':' . $port, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);

        if (!$socket) {
            mail_log_event('error', 'SMTP connection failed', $baseContext + [
                'socket_error_code' => $errno,
                'socket_error_message' => $errstr,
            ]);
            error_log('[MAIL] Connection failed: ' . $errstr);
            return ['success' => false, 'error' => 'SMTP connection failed'];
        }

        stream_set_timeout($socket, 15);

        try {
            $greeting = smtp_read_response($socket);
            if (!smtp_expect_code($greeting, [220])) {
                throw new RuntimeException(trim($greeting) ?: 'SMTP greeting failed');
            }

            smtp_send_command($socket, 'EHLO scaleup.co.th', [250]);

            if ($encryption === 'tls') {
                smtp_send_command($socket, 'STARTTLS', [220]);
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('Unable to start TLS encryption');
                }
                smtp_send_command($socket, 'EHLO scaleup.co.th', [250]);
            }

            smtp_send_command($socket, 'AUTH LOGIN', [334]);
            smtp_send_command($socket, base64_encode(MAIL_USERNAME), [334]);
            smtp_send_command($socket, base64_encode(MAIL_PASSWORD), [235]);

            smtp_send_command($socket, 'MAIL FROM:<' . MAIL_FROM_ADDRESS . '>', [250]);
            smtp_send_command($socket, 'RCPT TO:<' . $toEmail . '>', [250, 251]);
            smtp_send_command($socket, 'DATA', [354]);

            $subject = smtp_encode_header('ยืนยันการจองสนาม #' . ($booking['booking_id'] ?? '-'));
            $fromName = MAIL_FROM_NAME !== '' ? smtp_encode_header(MAIL_FROM_NAME) : MAIL_FROM_ADDRESS;
            $textBody = chunk_split(base64_encode(build_booking_confirmation_email_text($booking)));
            $htmlBody = chunk_split(base64_encode(build_booking_confirmation_email_html($booking)));
            $boundary = '=_CourtMail_' . bin2hex(random_bytes(12));
            $messageIdDomain = strstr(MAIL_FROM_ADDRESS, '@') ? substr(strrchr(MAIL_FROM_ADDRESS, '@'), 1) : 'localhost';
            $messageId = '<' . bin2hex(random_bytes(12)) . '@' . $messageIdDomain . '>';

            $message = implode("\r\n", [
                'From: ' . $fromName . ' <' . MAIL_FROM_ADDRESS . '>',
                'To: <' . $toEmail . '>',
                'Reply-To: <' . MAIL_FROM_ADDRESS . '>',
                'Subject: ' . $subject,
                'Date: ' . date(DATE_RFC2822),
                'Message-ID: ' . $messageId,
                'MIME-Version: 1.0',
                'X-Mailer: Tennis Court Booking Mailer',
                'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
                '',
                '--' . $boundary,
                'Content-Type: text/plain; charset=UTF-8',
                'Content-Transfer-Encoding: base64',
                '',
                $textBody,
                '--' . $boundary,
                'Content-Type: text/html; charset=UTF-8',
                'Content-Transfer-Encoding: base64',
                '',
                $htmlBody,
                '--' . $boundary . '--',
            ]);

            fwrite($socket, $message . "\r\n.\r\n");
            $dataResponse = smtp_read_response($socket);
            if (!smtp_expect_code($dataResponse, [250])) {
                throw new RuntimeException(trim($dataResponse) ?: 'SMTP data send failed');
            }

            smtp_send_command($socket, 'QUIT', [221]);
            fclose($socket);

            mail_log_event('success', 'Booking confirmation email sent successfully', $baseContext);
            error_log('[MAIL] Booking confirmation email sent to ' . $toEmail);
            return ['success' => true];
        } catch (Throwable $error) {
            mail_log_event('error', 'SMTP send failed', $baseContext + [
                'exception' => $error->getMessage(),
            ]);
            error_log('[MAIL] ' . $error->getMessage());
            fclose($socket);
            return ['success' => false, 'error' => $error->getMessage()];
        }
    }
}
