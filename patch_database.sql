-- CLEAN SQL PATCH FOR BOOKING SYSTEM
-- Run this in your phpMyAdmin SQL tab

-- 1. Create Audit Logs table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `action` VARCHAR(255) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `admin_name` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add pricing columns to courts table
ALTER TABLE `courts` ADD COLUMN IF NOT EXISTS `price_per_hour` DECIMAL(10,2) DEFAULT 500.00;
ALTER TABLE `courts` ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) DEFAULT 1;

-- 3. Create wallet transactions table
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('Pending','Paid','Cancelled') DEFAULT 'Pending',
  `charge_id` VARCHAR(100) DEFAULT NULL,
  `payment_type` VARCHAR(50) DEFAULT 'promptpay',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
