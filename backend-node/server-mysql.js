require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Smart Parking API is running. Use the frontend at http://localhost:3008');
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '090626',
  database: process.env.DB_NAME || 'smart_parking_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

async function initDb() {
  await pool.query(`CREATE DATABASE IF NOT EXISTS ??`, [process.env.DB_NAME || 'smart_parking_system']);
  await pool.query(`USE ??`, [process.env.DB_NAME || 'smart_parking_system']);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      address TEXT,
      role ENUM('owner','user') DEFAULT 'user',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS parking_spaces (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      address TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      available_slots INT DEFAULT 1,
      total_slots INT DEFAULT 1,
      status ENUM('active','inactive','maintenance') DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      parking_id INT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status ENUM('pending','confirmed','rejected','cancelled','completed') DEFAULT 'pending',
      total_price DECIMAL(10,2),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parking_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    ALTER TABLE bookings
      MODIFY COLUMN status ENUM('pending','confirmed','rejected','cancelled','completed') DEFAULT 'pending'
  `);

  // Add columns if they don't exist
  try {
    await pool.query(`ALTER TABLE bookings ADD COLUMN total_price DECIMAL(10,2)`);
  } catch (err) {
    if (!err.message.includes('Duplicate column name')) throw err;
  }

  try {
    await pool.query(`ALTER TABLE bookings ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  } catch (err) {
    if (!err.message.includes('Duplicate column name')) throw err;
  }

  try {
    await pool.query(`ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  } catch (err) {
    if (!err.message.includes('Duplicate column name')) throw err;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      user_id INT NOT NULL,
      parking_id INT NOT NULL,
      rating TINYINT UNSIGNED,
      comment TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parking_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`INSERT IGNORE INTO users (name, email, password, phone, address, role) VALUES
    ('John Owner', 'owner@example.com', '$2b$10$examplehashedpassword', '+1234567890', '123 Owner Lane, New York, NY', 'owner'),
    ('Sarah User', 'user@example.com', '$2b$10$examplehashedpassword', '+1234567891', '456 User Street, New York, NY', 'user')`);

  await pool.query(`INSERT IGNORE INTO parking_spaces (owner_id, latitude, longitude, address, price, phone, available_slots, total_slots) VALUES
    (1, 40.7128, -74.0060, '123 Main St, New York, NY 10001', 5.00, '+1234567890', 3, 3),
    (1, 40.7130, -74.0070, '456 Broadway, New York, NY 10002', 7.50, '+1234567890', 2, 2),
    (1, 40.7140, -74.0080, '789 Park Ave, New York, NY 10003', 10.00, '+1234567890', 1, 1)`);
}

initDb().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

app.post('/api/register', async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'user', phone || '', address || '']
    );
    res.json({ success: true, message: 'Registration successful', id: result.insertId, user_id: result.insertId, role: role || 'user' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'User already exists' });
    }
    res.json({ success: false, message: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }
    res.json({
      success: true,
      message: 'Login successful',
      id: user.id,
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role
    });
  } catch (err) {
    res.json({ success: false, message: 'Login failed' });
  }
});

async function getAvailableParkingQuery(req, res, query) {
  const { lat, lng, radius } = req.query;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const [rows] = await pool.execute(query, [now, now]);
    const parkingList = rows.map(row => ({
      ...row,
      distance: lat && lng ? calculateDistance(lat, lng, row.latitude, row.longitude) : 0
    })).filter(p => !radius || p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
    res.json({ success: true, parking: parkingList });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch parking' });
  }
}

const parkingAvailabilityQuery = `
  SELECT p.*, u.name as owner_name, u.phone as owner_phone
  FROM parking_spaces p
  JOIN users u ON p.owner_id = u.id
  WHERE p.status = 'active'
  AND p.available_slots > 0
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.parking_id = p.id
    AND b.status = 'confirmed'
    AND b.start_time <= ?
    AND b.end_time > ?
  )
`;

app.get('/api/parking', (req, res) => getAvailableParkingQuery(req, res, parkingAvailabilityQuery));
app.get('/api/nearby_parking', (req, res) => getAvailableParkingQuery(req, res, parkingAvailabilityQuery));

app.get('/api/parking/:id', async (req, res) => {
  const parkingId = req.params.id;
  try {
    const [rows] = await pool.execute(`SELECT p.*, u.name as owner_name, u.phone as owner_phone
          FROM parking_spaces p
          JOIN users u ON p.owner_id = u.id
          WHERE p.id = ?`, [parkingId]);
    if (!rows[0]) {
      return res.json({ success: false, message: 'Parking not found' });
    }
    res.json({ success: true, parking: rows[0] });
  } catch (err) {
    res.json({ success: false, message: 'Parking not found' });
  }
});

app.post('/api/add_parking', async (req, res) => {
  const { owner_id, address, latitude, longitude, price, phone, available_slots, total_slots } = req.body;
  if (!owner_id || !address || !latitude || !longitude || !price || !phone) {
    return res.json({ success: false, message: 'Missing required parking information' });
  }
  try {
    const [result] = await pool.execute(
      `INSERT INTO parking_spaces (owner_id, latitude, longitude, address, price, phone, available_slots, total_slots)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [owner_id, latitude, longitude, address, price, phone, available_slots || 1, total_slots || available_slots || 1]
    );
    res.json({ success: true, message: 'Parking space added', parking_id: result.insertId });
  } catch (err) {
    res.json({ success: false, message: 'Failed to add parking space' });
  }
});

app.post('/api/book', async (req, res) => {
  const { user_id, parking_id, start_time, end_time } = req.body;
  try {
    const [availabilityRows] = await pool.execute(
      `SELECT p.available_slots
       FROM parking_spaces p
       WHERE p.id = ?
       AND p.status = 'active'
       AND p.available_slots > 0
       AND NOT EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.parking_id = p.id
         AND b.status = 'confirmed'
         AND (
           (b.start_time <= ? AND b.end_time > ?) OR
           (b.start_time < ? AND b.end_time >= ?) OR
           (? <= b.start_time AND ? > b.start_time)
         )
       )`,
      [parking_id, start_time, end_time, start_time, end_time, start_time, end_time]
    );

    if (!availabilityRows[0] || availabilityRows[0].available_slots <= 0) {
      return res.json({ success: false, message: 'Parking not available at requested time' });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    const hours = (end - start) / (1000 * 60 * 60);
    const [priceRow] = await pool.execute('SELECT price FROM parking_spaces WHERE id = ?', [parking_id]);
    if (!priceRow[0]) {
      return res.json({ success: false, message: 'Failed to calculate price' });
    }
    const totalPrice = hours * priceRow[0].price;

    const [result] = await pool.execute(
      'INSERT INTO bookings (user_id, parking_id, start_time, end_time, total_price) VALUES (?, ?, ?, ?, ?)',
      [user_id, parking_id, start_time, end_time, totalPrice]
    );

    res.json({
      success: true,
      message: 'Booking created',
      booking_id: result.insertId,
      total_price: totalPrice,
      start_time,
      end_time
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    console.error('Booking request body:', req.body);
    res.json({ success: false, message: 'Booking failed' });
  }
});

app.put('/api/confirm_booking/:id', async (req, res) => {
  const bookingId = req.params.id;
  const { status } = req.body;
  try {
    const [bookingRows] = await pool.execute('SELECT status, parking_id FROM bookings WHERE id = ?', [bookingId]);
    if (!bookingRows[0]) {
      return res.json({ success: false, message: 'Booking not found' });
    }

    const currentStatus = bookingRows[0].status;
    const parkingId = bookingRows[0].parking_id;

    if (currentStatus !== 'confirmed' && status === 'confirmed') {
      const [parkingRows] = await pool.execute('SELECT available_slots FROM parking_spaces WHERE id = ?', [parkingId]);
      if (!parkingRows[0] || parkingRows[0].available_slots <= 0) {
        return res.json({ success: false, message: 'No available slots to confirm booking' });
      }
      await pool.execute('UPDATE parking_spaces SET available_slots = available_slots - 1 WHERE id = ?', [parkingId]);
    }

    if (currentStatus === 'confirmed' && status !== 'confirmed') {
      await pool.execute('UPDATE parking_spaces SET available_slots = LEAST(available_slots + 1, total_slots) WHERE id = ?', [parkingId]);
    }

    await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);
    res.json({ success: true, message: 'Booking updated' });
  } catch (err) {
    console.error('Confirm booking error:', err);
    res.json({ success: false, message: 'Failed to update booking' });
  }
});

app.get('/api/my_bookings', async (req, res) => {
  const userId = req.query.user_id;
  try {
    const [rows] = await pool.execute(`SELECT b.*, p.address, p.price, p.phone as owner_phone,
          DATE_FORMAT(b.start_time, '%Y-%m-%d %H:%i:%s') as formatted_start,
          DATE_FORMAT(b.end_time, '%Y-%m-%d %H:%i:%s') as formatted_end,
          CASE
            WHEN b.end_time < NOW() AND b.status = 'confirmed' THEN 'completed'
            ELSE b.status
          END as status,
          b.status as db_status
          FROM bookings b
          JOIN parking_spaces p ON b.parking_id = p.id
          WHERE b.user_id = ?
          ORDER BY b.id DESC`, [userId]);

    for (const booking of rows) {
      if (booking.status === 'completed' && booking.db_status !== 'completed') {
        await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', ['completed', booking.id]);
      }
    }

    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('Error fetching user bookings:', err);
    res.json({ success: false, message: 'Failed to fetch bookings' });
  }
});

app.get('/api/owner_bookings/:ownerId', async (req, res) => {
  const ownerId = req.params.ownerId;
  try {
    const [rows] = await pool.execute(`SELECT b.*, p.address, p.price, p.phone as owner_phone, u.name as user_name, u.email as user_email, u.phone as user_phone,
          DATE_FORMAT(b.start_time, '%Y-%m-%d %H:%i:%s') as formatted_start,
          DATE_FORMAT(b.end_time, '%Y-%m-%d %H:%i:%s') as formatted_end,
          CASE
            WHEN b.end_time < NOW() AND b.status = 'confirmed' THEN 'completed'
            ELSE b.status
          END as status,
          b.status as db_status
          FROM bookings b
          JOIN parking_spaces p ON b.parking_id = p.id
          JOIN users u ON b.user_id = u.id
          WHERE p.owner_id = ?
          ORDER BY b.id DESC`, [ownerId]);

    for (const booking of rows) {
      if (booking.status === 'completed' && booking.db_status !== 'completed') {
        await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', ['completed', booking.id]);
      }
    }

    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('Error fetching owner bookings:', err);
    res.json({ success: false, message: 'Failed to fetch owner bookings' });
  }
});

app.get('/api/bookings/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await pool.execute(`SELECT b.*, p.address, p.price, p.phone as owner_phone
          FROM bookings b
          JOIN parking_spaces p ON b.parking_id = p.id
          WHERE b.user_id = ?
          ORDER BY b.id DESC`, [userId]);
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('Error fetching bookings by user:', err);
    res.json({ success: false, message: 'Failed to fetch bookings' });
  }
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lng2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

setInterval(async () => {
  try {
    const [expiredBookings] = await pool.execute(
      `SELECT id, parking_id FROM bookings WHERE status = 'confirmed' AND end_time < NOW()`
    );
    for (const booking of expiredBookings) {
      await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', ['completed', booking.id]);
      await pool.execute(
        'UPDATE parking_spaces SET available_slots = LEAST(available_slots + 1, total_slots) WHERE id = ?',
        [booking.parking_id]
      );
    }
    if (expiredBookings.length > 0) {
      console.log(`Cleaned up ${expiredBookings.length} expired bookings`);
    }
  } catch (err) {
    console.error('Error cleaning up expired bookings:', err);
  }
}, 60000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
