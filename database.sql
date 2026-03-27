-- Database Setup Script for Tennis Court Booking Platform
-- Import this via phpMyAdmin

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `surname` VARCHAR(100) DEFAULT NULL,
  `nickname` VARCHAR(50),
  `email` VARCHAR(100),
  `line_id` VARCHAR(50) DEFAULT NULL,
  `birthday` DATE,
  `location` VARCHAR(255) DEFAULT 'Tennis Court',
  `wallet_balance` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Wallet top-up balance in THB',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migration: run this if your users table already exists
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `surname` VARCHAR(100) DEFAULT NULL;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `line_id` VARCHAR(50) DEFAULT NULL;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `location` VARCHAR(255) DEFAULT 'Tennis Court';
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `wallet_balance` DECIMAL(10,2) DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','staff') DEFAULT 'admin',
  `name` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Seed admin: (Removed for security - added manually)

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `action` VARCHAR(255) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `admin_name` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `courts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `type` ENUM('Tennis', 'Badminton') NOT NULL,
  `price_per_hour` DECIMAL(10,2) DEFAULT 500.00,
  `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial courts (Matched to Production DB)
INSERT IGNORE INTO `courts` (`id`, `name`, `type`, `price_per_hour`) VALUES
(1, 'North-1', 'Badminton', 111.00),
(2, 'North-2', 'Badminton', 500.00),
(3, 'North-3', 'Badminton', 200.00),
(4, 'Center-1', 'Badminton', 600.00),
(5, 'Center-2', 'Tennis', 500.00),
(6, 'South-1', 'Badminton', 500.00),
(7, 'South-2', 'Badminton', 500.00),
(8, 'South-3', 'Badminton', 500.00);

-- Seed mock user for testing
INSERT IGNORE INTO `users` (`phone`, `name`, `nickname`, `email`, `birthday`, `wallet_balance`) 
VALUES ('081-234-5678', 'จักรเพชร วิวัฒน์ชาติสุคนธ์', 'Aof', 'test@booking.co.th', '1990-01-01', 0.00);
