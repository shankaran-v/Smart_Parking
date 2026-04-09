-- MySQL Connection and Schema Setup Script
-- Run this in MySQL Workbench or command line to connect and create tables

-- Connection details (for reference):
-- Host: localhost
-- Port: 3306
-- User: root
-- Password: 090626
-- Database: smart_parking_system

-- Connect to MySQL (run this first in your MySQL client)
-- mysql -h localhost -P 3306 -u root -p090626

-- Then run the following SQL commands:

CREATE DATABASE IF NOT EXISTS smart_parking_system;
USE smart_parking_system;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  role ENUM('owner','user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parking spaces table
CREATE TABLE IF NOT EXISTS parking_spaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  address TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  phone VARCHAR(50),
  available_slots INT DEFAULT 1,
  total_slots INT DEFAULT 1,
  status ENUM('active','inactive','maintenance') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  parking_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('pending','confirmed','rejected','cancelled','completed') DEFAULT 'pending',
  total_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parking_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  parking_id INT NOT NULL,
  rating TINYINT UNSIGNED CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parking_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data for testing
INSERT IGNORE INTO users (name, email, password, phone, address, role) VALUES
  ('John Owner', 'owner@example.com', '$2b$10$examplehashedpassword', '+1234567890', '123 Owner Lane, New York, NY', 'owner'),
  ('Sarah User', 'user@example.com', '$2b$10$examplehashedpassword', '+1234567891', '456 User Street, New York, NY', 'user');

INSERT IGNORE INTO parking_spaces (owner_id, latitude, longitude, address, price, phone, available_slots, total_slots) VALUES
  (1, 40.7128000, -74.0060000, '123 Main St, New York, NY 10001', 5.00, '+1234567890', 3, 3),
  (1, 40.7130000, -74.0070000, '456 Broadway, New York, NY 10002', 7.50, '+1234567890', 2, 2),
  (1, 40.7140000, -74.0080000, '789 Park Ave, New York, NY 10003', 10.00, '+1234567890', 1, 1);

-- Optional view for available parking
CREATE OR REPLACE VIEW available_parking AS
SELECT p.*, u.name AS owner_name, u.phone AS owner_phone
FROM parking_spaces p
JOIN users u ON p.owner_id = u.id
WHERE p.status = 'active' AND p.available_slots > 0;

-- To verify connection and data:
-- SELECT * FROM users;
-- SELECT * FROM parking_spaces;
-- SELECT * FROM bookings;
-- SELECT * FROM reviews;