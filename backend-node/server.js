const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Smart Parking API is running. Use the frontend at http://localhost:3008');
});

// Database setup
const db = new sqlite3.Database('./parking_system.db');

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS parking_spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT NOT NULL,
    price REAL NOT NULL,
    phone TEXT NOT NULL,
    available_slots INTEGER DEFAULT 1,
    total_slots INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    parking_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    total_price REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parking_id) REFERENCES parking_spaces(id)
  )`);

  // Insert sample data
  db.run(`INSERT OR IGNORE INTO users (name, email, password, phone, role) VALUES
    ('John Owner', 'owner@example.com', '$2b$10$examplehashedpassword', '+1234567890', 'owner'),
    ('Sarah User', 'user@example.com', '$2b$10$examplehashedpassword', '+1234567891', 'user')`);

  db.run(`INSERT OR IGNORE INTO parking_spaces (owner_id, latitude, longitude, address, price, phone, available_slots, total_slots) VALUES
    (1, 40.7128, -74.0060, '123 Main St, New York, NY 10001', 5.00, '+1234567890', 3, 3),
    (1, 40.7130, -74.0070, '456 Broadway, New York, NY 10002', 7.50, '+1234567890', 2, 2),
    (1, 40.7140, -74.0080, '789 Park Ave, New York, NY 10003', 10.00, '+1234567890', 1, 1)`);
});

// Auth routes
app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'user'], function(err) {
        if (err) {
          return res.json({ success: false, message: 'User already exists' });
        }
        res.json({ success: true, message: 'Registration successful', id: this.lastID, user_id: this.lastID, role: role || 'user' });
      });
  } catch (error) {
    res.json({ success: false, message: 'Registration failed' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
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
      role: user.role
    });
  });
});

// Parking routes
app.get('/api/parking', (req, res) => {
  const { lat, lng, radius } = req.query;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Get parking spaces that are not fully booked and don't have active bookings
  const query = `
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

  db.all(query, [now, now], (err, rows) => {
    if (err) {
      return res.json({ success: false, message: 'Failed to fetch parking' });
    }

    const parkingList = rows.map(row => ({
      ...row,
      distance: lat && lng ? calculateDistance(lat, lng, row.latitude, row.longitude) : 0
    })).filter(p => !radius || p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    res.json({ success: true, parking: parkingList });
  });
});

app.get('/api/nearby_parking', (req, res) => {
  const { lat, lng, radius } = req.query;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Get parking spaces that are not fully booked and don't have active bookings
  const query = `
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

  db.all(query, [now, now], (err, rows) => {
    if (err) {
      return res.json({ success: false, message: 'Failed to fetch parking' });
    }

    const parkingList = rows.map(row => ({
      ...row,
      distance: lat && lng ? calculateDistance(lat, lng, row.latitude, row.longitude) : 0
    })).filter(p => !radius || p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    res.json({ success: true, parking: parkingList });
  });
});

app.get('/api/parking/:id', (req, res) => {
  const parkingId = req.params.id;
  db.get(`SELECT p.*, u.name as owner_name, u.phone as owner_phone
          FROM parking_spaces p
          JOIN users u ON p.owner_id = u.id
          WHERE p.id = ?`, [parkingId], (err, row) => {
    if (err || !row) {
      return res.json({ success: false, message: 'Parking not found' });
    }
    res.json({ success: true, parking: row });
  });
});

app.post('/api/add_parking', (req, res) => {
  const { owner_id, address, latitude, longitude, price, phone, available_slots, total_slots } = req.body;
  
  if (!owner_id || !address || !latitude || !longitude || !price || !phone) {
    return res.json({ success: false, message: 'Missing required parking information' });
  }

  db.run(`INSERT INTO parking_spaces (owner_id, latitude, longitude, address, price, phone, available_slots, total_slots)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [owner_id, latitude, longitude, address, price, phone, available_slots || 1, total_slots || available_slots || 1], function(err) {
      if (err) {
        console.error('Add parking error:', err);
        return res.json({ success: false, message: 'Failed to add parking space' });
      }
      res.json({ success: true, message: 'Parking space added', parking_id: this.lastID });
    });
});

// Booking routes
app.post('/api/book', (req, res) => {
  const { user_id, parking_id, start_time, end_time } = req.body;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Check if parking is available at the requested time
  const availabilityQuery = `
    SELECT p.available_slots
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
    )
  `;

  db.get(availabilityQuery, [parking_id, start_time, end_time, start_time, end_time, start_time, end_time], (err, row) => {
    if (err || !row || row.available_slots <= 0) {
      return res.json({ success: false, message: 'Parking not available at requested time' });
    }

    // Calculate total price
    const start = new Date(start_time);
    const end = new Date(end_time);
    const hours = (end - start) / (1000 * 60 * 60);
    const priceQuery = 'SELECT price FROM parking_spaces WHERE id = ?';

    db.get(priceQuery, [parking_id], (err, priceRow) => {
      if (err) {
        return res.json({ success: false, message: 'Failed to calculate price' });
      }

      const totalPrice = hours * priceRow.price;

      db.run('INSERT INTO bookings (user_id, parking_id, start_time, end_time, total_price) VALUES (?, ?, ?, ?, ?)',
        [user_id, parking_id, start_time, end_time, totalPrice], function(err) {
          if (err) {
            return res.json({ success: false, message: 'Booking failed' });
          }

          res.json({
            success: true,
            message: 'Booking created',
            booking_id: this.lastID,
            total_price: totalPrice,
            start_time: start_time,
            end_time: end_time
          });
        });
    });
  });
});

app.put('/api/confirm_booking/:id', (req, res) => {
  const bookingId = req.params.id;
  const { status } = req.body;

  db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId], function(err) {
    if (err) {
      return res.json({ success: false, message: 'Failed to update booking' });
    }

    // If booking is confirmed, we don't decrement available_slots anymore
    // The time-based availability check will handle it

    res.json({ success: true, message: 'Booking updated' });
  });
});

app.get('/api/my_bookings', (req, res) => {
  const userId = req.query.user_id;

  db.all(`SELECT b.*, p.address, p.price, p.phone as owner_phone,
          strftime('%Y-%m-%d %H:%M:%S', b.start_time) as formatted_start,
          strftime('%Y-%m-%d %H:%M:%S', b.end_time) as formatted_end,
          CASE
            WHEN b.end_time < datetime('now') AND b.status = 'confirmed' THEN 'completed'
            ELSE b.status
          END as current_status
          FROM bookings b
          JOIN parking_spaces p ON b.parking_id = p.id
          WHERE b.user_id = ?
          ORDER BY b.created_at DESC`, [userId], (err, rows) => {
    if (err) {
      return res.json({ success: false, message: 'Failed to fetch bookings' });
    }

    // Update status for completed bookings
    rows.forEach(booking => {
      if (booking.current_status === 'completed' && booking.status !== 'completed') {
        db.run('UPDATE bookings SET status = ? WHERE id = ?', ['completed', booking.id]);
      }
    });

    res.json({ success: true, bookings: rows });
  });
});

app.get('/api/owner_bookings/:ownerId', (req, res) => {
  const ownerId = req.params.ownerId;

  db.all(`SELECT b.*, p.address, p.price, p.phone as owner_phone, u.name as user_name,
          strftime('%Y-%m-%d %H:%M:%S', b.start_time) as formatted_start,
          strftime('%Y-%m-%d %H:%M:%S', b.end_time) as formatted_end,
          CASE
            WHEN b.end_time < datetime('now') AND b.status = 'confirmed' THEN 'completed'
            ELSE b.status
          END as current_status
          FROM bookings b
          JOIN parking_spaces p ON b.parking_id = p.id
          JOIN users u ON b.user_id = u.id
          WHERE p.owner_id = ?
          ORDER BY b.created_at DESC`, [ownerId], (err, rows) => {
    if (err) {
      return res.json({ success: false, message: 'Failed to fetch owner bookings' });
    }

    // Update status for completed bookings
    rows.forEach(booking => {
      if (booking.current_status === 'completed' && booking.status !== 'completed') {
        db.run('UPDATE bookings SET status = ? WHERE id = ?', ['completed', booking.id]);
      }
    });

    res.json({ success: true, bookings: rows });
  });
});

app.get('/api/bookings/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(`SELECT b.*, p.address, p.price, p.phone as owner_phone
          FROM bookings b
          JOIN parking_spaces p ON b.parking_id = p.id
          WHERE b.user_id = ?
          ORDER BY b.created_at DESC`, [userId], (err, rows) => {
    if (err) {
      return res.json({ success: false, message: 'Failed to fetch bookings' });
    }
    
    res.json({ success: true, bookings: rows });
  });
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Periodic cleanup of expired bookings
setInterval(() => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.run(`UPDATE bookings SET status = 'completed'
          WHERE status = 'confirmed' AND end_time < ?`, [now], (err) => {
    if (err) {
      console.error('Error cleaning up expired bookings:', err);
    } else {
      console.log('Cleaned up expired bookings');
    }
  });
}, 60000); // Run every minute

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});