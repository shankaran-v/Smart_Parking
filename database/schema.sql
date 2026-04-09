-- SQLite schema for Smart Parking System

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('owner', 'user')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Parking spaces table
CREATE TABLE IF NOT EXISTS parking_spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT NOT NULL,
    price REAL NOT NULL,
    phone TEXT NOT NULL,
    available_slots INTEGER DEFAULT 1,
    total_slots INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    parking_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
    total_price REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parking_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parking_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parking_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
);

-- Insert sample data
INSERT OR IGNORE INTO users (name, email, password, phone, role) VALUES
('John Owner', 'owner@example.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', '+1234567890', 'owner'),
('Sarah User', 'user@example.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', '+1234567891', 'user');

INSERT OR IGNORE INTO parking_spaces (owner_id, latitude, longitude, address, price, phone, available_slots, total_slots) VALUES
(1, 40.7128, -74.0060, '123 Main St, New York, NY 10001', 5.00, '+1234567890', 3, 3),
(1, 40.7130, -74.0070, '456 Broadway, New York, NY 10002', 7.50, '+1234567890', 2, 2),
(1, 40.7140, -74.0080, '789 Park Ave, New York, NY 10003', 10.00, '+1234567890', 1, 1);

-- Create views for reporting
CREATE VIEW IF NOT EXISTS available_parking AS
SELECT p.*, u.name as owner_name, u.phone as owner_phone
FROM parking_spaces p
JOIN users u ON p.owner_id = u.id
WHERE p.status = 'active' AND p.available_slots > 0;