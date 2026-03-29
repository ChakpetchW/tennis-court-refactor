# Deploy And QA Checklist

## 1. Prepare Environment
- Copy `.env.example` to `.env` on the target server if `.env` does not already exist.
- Confirm `DB_*`, `OMISE_*`, `SMS_*`, `OTP_*`, and `SITE_URL` are set correctly.
- Confirm `.env.local` or deployment env includes `VITE_OMISE_PUBLIC_KEY`.

## 2. Rotate Previously Exposed Credentials
- Rotate `DB_PASS` in MySQL/user management.
- Rotate `OMISE_SECRET_KEY`, `OMISE_PUBLIC_KEY`, and `OMISE_WEBHOOK_SECRET` in the Omise dashboard.
- Rotate `SMS_API_KEY` and `SMS_API_SECRET` if real values were ever stored in code.
- Update `.env` and `.env.local` after each rotation.

## 3. Verify Admin Password Hashes
- Generate a replacement hash:
  - `php scripts/generate_admin_hash.php "NewStrongPassword!" admin@example.com "Admin Name" admin`
- Upsert the generated SQL in the target database.
- Verify current rows:
  - `php scripts/check_admin_setup.php`

## 4. Manual QA
- Admin login succeeds and page refresh keeps the session.
- Admin logout clears the session and subsequent admin API calls return `401`.
- Update a court rate from the admin UI and verify it persists.
- Toggle allotment from the admin UI and verify it persists.
- Delete a booking from the admin UI without re-entering a password.
- Open browser devtools during OTP request and verify no API key/secret is sent by the client.
- Complete wallet top-up via PromptPay and card flows.
- Complete booking checkout via PromptPay, wallet, and card where available.
- Confirm Omise webhook updates booking/payment records on the server.

## 5. Useful Commands
- `npm.cmd run test`
- `npm.cmd run lint`
- `npm.cmd run build`
- `php -l public/api/config.php`
- `php -l public/api/main_api.php`
- `php scripts/check_admin_setup.php`
- `php scripts/smoke_test_api.php https://your-domain.example/court`
