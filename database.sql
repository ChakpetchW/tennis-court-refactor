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

CREATE TABLE IF NOT EXISTS `courts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `type` ENUM('Tennis', 'Badminton') NOT NULL,
  `price_per_hour` DECIMAL(10,2) DEFAULT 500.00,
  `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `court_id` INT NOT NULL,
  `booking_date` DATE NOT NULL,
  `booking_time` TIME NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `status` ENUM('Pending','Paid','Cancelled') DEFAULT 'Pending',
  `payment_provider` ENUM('omise','2c2p','wallet','manual') DEFAULT 'omise',
  `transaction_ref` VARCHAR(100) DEFAULT NULL COMMENT 'charge ID from gateway',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`court_id`) REFERENCES `courts`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `allotments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `court_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `hour` TIME NOT NULL,
  `is_open` TINYINT(1) DEFAULT 1,
  `booked_by` VARCHAR(100) DEFAULT NULL,
  `pending_by` VARCHAR(100) DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `court_date_hour` (`court_id`, `date`, `hour`),
  FOREIGN KEY (`court_id`) REFERENCES `courts`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('Pending','Paid','Cancelled') DEFAULT 'Pending',
  `charge_id` VARCHAR(100) DEFAULT NULL,
  `payment_type` VARCHAR(50) DEFAULT 'promptpay',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial courts
INSERT IGNORE INTO `courts` (`id`, `name`, `type`) VALUES
(1, 'North-1', 'Badminton'),
(2, 'North-2', 'Badminton'),
(3, 'North-3', 'Badminton'),
(4, 'Center-1', 'Badminton'),
(5, 'Center-2', 'Tennis'),
(6, 'South-1', 'Badminton'),
(7, 'South-2', 'Badminton'),
(8, 'South-3', 'Badminton');

-- Seed mock user for testing
INSERT IGNORE INTO `users` (`phone`, `name`, `nickname`, `email`, `birthday`, `wallet_balance`) 
VALUES ('081-234-5678', 'จักรเพชร วิวัฒน์ชาติสุคนธ์', 'Aof', 'test@booking.co.th', '1990-01-01', 0.00);
